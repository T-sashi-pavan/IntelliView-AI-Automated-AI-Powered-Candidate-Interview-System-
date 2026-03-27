import pkg from "@deepgram/sdk";
const { createClient } = pkg;
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Memory storage for user audio buffers and deepgram connections
const userSessions = new Map();

export const handleASR = (socket, io) => {
  socket.on("start_asr", async (data) => {
    const { sessionId } = data;
    console.log(`ASR started for session: ${sessionId}`);

    // Initialize buffer and deepgram connection
    const dgConnection = deepgram.listen.live({
      model: "nova-2",
      language: "en-US",
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1000,
    });

    userSessions.set(socket.id, {
      sessionId,
      audioBuffer: [],
      dgConnection,
    });

    dgConnection.on("open", () => {
      console.log("Deepgram connection opened");
    });

    dgConnection.on("results", (data) => {
      const transcript = data.channel.alternatives[0].transcript;
      if (transcript) {
        // Emit live transcript to the client
        socket.emit("partial_transcript", {
          text: transcript,
          isFinal: data.is_final
        });
      }
    });

    dgConnection.on("error", (err) => {
      console.error("Deepgram Error:", err);
      socket.emit("asr_error", { message: "Live transcription failed" });
    });
  });

  socket.on("audio_chunk", (chunk) => {
    const session = userSessions.get(socket.id);
    if (session && session.dgConnection) {
      if (session.dgConnection.getReadyState() === 1) { // OPEN
        session.dgConnection.send(chunk);
      }
      session.audioBuffer.push(chunk);
    }
  });

  socket.on("stop_asr", async () => {
    const session = userSessions.get(socket.id);
    if (!session) return;

    console.log(`Stopping ASR for session: ${session.sessionId}`);

    // Close Deepgram
    if (session.dgConnection) {
      session.dgConnection.finish();
    }

    // Process Whisper final pass
    try {
      socket.emit("asr_status", { status: "processing_final", message: "Refining transcript with Whisper..." });

      const fullAudio = Buffer.concat(session.audioBuffer);
      
      if (fullAudio.length === 0) {
        socket.emit("final_transcript", { text: "No response provided." });
        console.log(`Final Whisper Transcript (Empty Buffer): No response provided.`);
        return;
      }

      const form = new FormData();
      // Whisper expects a file. We can name it blob.wav
      form.append("audio", fullAudio, {
        filename: "audio.wav",
        contentType: "audio/wav",
      });

      // Call Django service for Whisper
      const response = await axios.post("http://localhost:8001/api/mock/asr/whisper/", form, {
        headers: {
          ...form.getHeaders(),
        },
      });

      const finalText = response.data.text;
      socket.emit("final_transcript", { text: finalText });
      console.log(`Final Whisper Transcript: ${finalText}`);

    } catch (err) {
      console.error("Whisper Error:", err.message);
      socket.emit("asr_error", { message: "Final refinement failed, using live transcript." });
    } finally {
      userSessions.delete(socket.id);
    }
  });

  socket.on("disconnect", () => {
    const session = userSessions.get(socket.id);
    if (session && session.dgConnection) {
      session.dgConnection.finish();
    }
    userSessions.delete(socket.id);
  });
};
