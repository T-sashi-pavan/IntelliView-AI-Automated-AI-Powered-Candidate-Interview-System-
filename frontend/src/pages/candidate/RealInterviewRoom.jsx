import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Mic, MicOff, Brain, Clock, CheckCircle,
  Target, AlertCircle, Loader2, SkipForward
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProctoringEngine } from '../../services/proctoring';
import api from '../../services/api';

export default function RealInterviewRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [interviewData, setInterviewData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [completed, setCompleted] = useState(false);
  const [aborted, setAborted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [malpractice, setMalpractice] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [finalizedText, setFinalizedText] = useState('');
  const [asrStatus, setAsrStatus] = useState('');
  const [autoSubmitText, setAutoSubmitText] = useState('');
  const [proctorStatus, setProctorStatus] = useState('Camera Offline');
  const [proctorReady, setProctorReady] = useState(false);
  const [abortionReason, setAbortionReason] = useState('Multiple security violations');
  const [countdown, setCountdown] = useState(null);
  const [volLevel, setVolLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const [totalQ, setTotalQ] = useState(10);

  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const videoRef = useRef(null);
  const proctorRef = useRef(null);
  const timerRef = useRef(null);

  /* ─── Malpractice threshold ─────────────────────────────── */
  useEffect(() => {
    if (warningCount >= 10 && !completed && !malpractice) {
      setMalpractice(true);
      setAborted(true);
      setCompleted(true);
      teardownCamera();
      handleComplete(true, abortionReason, warningCount);
      toast.error('INTERVIEW ABORTED: Security violations exceeded limit.', { duration: 10000 });
    }
  }, [warningCount]);

  const teardownCamera = () => {
    if (proctorRef.current) proctorRef.current.stop();
    if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    document.body.classList.remove('fullscreen-interview');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (synthRef.current) synthRef.current.cancel();
    if (timerRef.current) clearInterval(timerRef.current);
    stopRecording();
  };

  useEffect(() => {
    if (completed) teardownCamera();
  }, [completed]);

  /* ─── Auto-submit effect ─────────────────────────────────── */
  useEffect(() => {
    if (autoSubmitText) {
      submitAnswer(autoSubmitText);
      setAutoSubmitText('');
    }
  }, [autoSubmitText]);

  /* ─── Volume polling ─────────────────────────────────────── */
  useEffect(() => {
    let animId;
    if (isRecording) {
      const poll = () => {
        if (proctorRef.current) setVolLevel(proctorRef.current.getCurrentVolume());
        animId = requestAnimationFrame(poll);
      };
      poll();
    } else setVolLevel(0);
    return () => cancelAnimationFrame(animId);
  }, [isRecording]);

  /* ─── Countdown to mic ───────────────────────────────────── */
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    } else {
      startRecording();
      setCountdown(null);
    }
  }, [countdown]);

  /* ─── Socket.io ──────────────────────────────────────────── */
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';
    socketRef.current = io(SOCKET_URL, { withCredentials: true, transports: ['websocket', 'polling'] });
    socketRef.current.on('partial_transcript', (data) => {
      if (data.isFinal) { setFinalizedText(p => (p + ' ' + data.text).trim()); setInterimText(''); }
      else setInterimText(data.text);
    });
    socketRef.current.on('final_transcript', (data) => {
      setFinalizedText(data.text);
      setInterimText('');
      setAsrStatus('Transcript refined.');
      setTimeout(() => { if (data.text.trim()) setAutoSubmitText(data.text); }, 1500);
    });
    socketRef.current.on('asr_error', (data) => toast.error(data.message));
    return () => {
      document.body.classList.remove('fullscreen-interview');
      socketRef.current?.disconnect();
      if (proctorRef.current) proctorRef.current.stop();
      if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    };
  }, []);

  /* ─── Camera + Proctoring init ───────────────────────────── */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { channelCount: 1, sampleRate: 16000 } });
        if (!mounted) return;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        if (!proctorRef.current) {
          proctorRef.current = new ProctoringEngine(videoRef.current, (event, score) => {
            toast.error(`${event.riskLevel === 'High' ? 'SECURITY' : 'Warning'}: ${event.message}`, { duration: 5000 });
            setAbortionReason(`Terminated due to: ${event.message}`);
            setWarningCount(p => p + (event.riskLevel === 'High' ? 1 : 0.5));
          }, setProctorStatus);
          await proctorRef.current.initialize();
          if (mounted) setProctorReady(true);
        }
      } catch {
        toast.error('Camera permissions required! Please allow and refresh.', { duration: 10000 });
      }
    })();
    return () => { mounted = false; if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop()); };
  }, []);

  /* ─── Tab switch detection ───────────────────────────────── */
  useEffect(() => {
    const handler = () => {
      if (document.hidden && !completed && !malpractice) {
        setAbortionReason('Terminated due to tab switching.');
        setWarningCount(p => {
          const next = p + 1;
          toast.error(`WARNING (${next}/10): Tab switching is a security violation!`, { duration: 5000, icon: '⚠️' });
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [completed, malpractice]);

  /* ─── Load session data ──────────────────────────────────── */
  useEffect(() => {
    api.get(`/candidates/session/${sessionId}`).then(r => {
      setSessionData(r.data.session);
      setInterviewData(r.data.session.interview);
      setTotalQ(r.data.session.interview?.numberOfQuestions || 10);
      const qs = r.data.session.questions || [];
      const unanswered = qs[r.data.session.currentQuestionIndex || 0];
      if (unanswered) { setCurrentQuestion(unanswered); setCurrentQIndex(r.data.session.currentQuestionIndex || 0); }
      setLoading(false);
    }).catch(() => { toast.error('Session not found'); navigate('/candidate'); });
  }, [sessionId]);

  /* ─── Timer countdown ────────────────────────────────────── */
  useEffect(() => {
    if (!currentQuestion || !sessionStarted || completed || malpractice || isSpeaking) return;
    const limit = currentQuestion.timeLimit || 120;
    setTimeLeft(limit);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); skipQuestion(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentQIndex, currentQuestion, sessionStarted, isSpeaking, completed]);

  /* ─── Auto-speak question when session starts ────────────── */
  useEffect(() => {
    if (currentQuestion && sessionStarted && document.fullscreenElement && !completed && !malpractice) {
      speakQuestion(currentQuestion.text);
    }
  }, [currentQIndex, sessionStarted]);

  const speakQuestion = (text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    setIsSpeaking(true);

    const sanitize = (t) => t
      .replace(/\bMERN\b/g, 'Mern').replace(/\bAI\b/g, 'A.I.').replace(/\bAPI\b/g, 'A.P.I.')
      .replace(/\bSQL\b/g, 'sequel').replace(/\bCSS\b/g, 'C.S.S.').replace(/\bHTML\b/g, 'H.T.M.L.')
      .replace(/\bHTTPS?\b/g, 'HTTP S').replace(/\bSocket\.IO\b/g, 'Socket I.O.');

    const utt = new SpeechSynthesisUtterance(sanitize(text));
    utt.rate = 1.15; utt.pitch = 1; utt.lang = 'en-IN';
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utt.voice = preferred;
    utt.onend = () => {
      setIsSpeaking(false);
      setCountdown(3);
    };
    synthRef.current.speak(utt);
  };

  const handleStartSession = async () => {
    if (!proctorReady) { toast.error('Please wait for AI models to finish loading.'); return; }
    try {
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen().catch(() => {});
      document.body.classList.add('fullscreen-interview');
      proctorRef.current.start();
      setSessionStarted(true);
    } catch { toast.error('Fullscreen permission required for proctoring.'); }
  };

  /* ─── Recording helpers ──────────────────────────────────── */
  const startRecording = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('start_asr', { sessionId });
    const stream = videoRef.current?.srcObject;
    if (!stream) return;
    const audioStream = new MediaStream(stream.getAudioTracks());
    const mr = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) socketRef.current?.emit('audio_chunk', { sessionId, chunk: e.data });
    };
    mr.start(250);
    setIsRecording(true);
    setFinalizedText(''); setInterimText(''); setAsrStatus('Listening...');
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    socketRef.current?.emit('stop_asr', { sessionId });
    setIsRecording(false);
    setAsrStatus('Processing...');
  };

  /* ─── Submit answer ──────────────────────────────────────── */
  const submitAnswer = async (text) => {
    if (malpractice || submitting) return;
    clearInterval(timerRef.current);
    if (isRecording) stopRecording();
    setSubmitting(true);
    try {
      const res = await api.post('/candidates/answer', {
        sessionId,
        questionIndex: currentQIndex,
        answer: text || '[No response]',
        timeTaken: (currentQuestion?.timeLimit || 120) - timeLeft,
      });
      setOverallScore(res.data.overallScore || 0);
      const nextIndex = currentQIndex + 1;
      if (nextIndex >= totalQ) {
        await handleComplete(false, '', warningCount);
      } else {
        const nextQ = res.data.nextQuestion || sessionData?.questions?.[nextIndex];
        if (nextQ) setCurrentQuestion(nextQ);
        setCurrentQIndex(nextIndex);
        setFinalizedText(''); setInterimText(''); setAnswerText(''); setAsrStatus('');
      }
    } catch { toast.error('Failed to submit answer'); }
    setSubmitting(false);
  };

  const skipQuestion = () => submitAnswer('[No response provided]');

  const handleSkipAIVoice = () => {
    if (synthRef.current) synthRef.current.cancel();
    setIsSpeaking(false);
    setCountdown(3);
  };

  /* ─── Complete session ───────────────────────────────────── */
  const handleComplete = async (isAborted = false, reason = '', warnings = 0) => {
    try {
      await api.post('/candidates/complete-real', {
        sessionId,
        warnings,
        aborted: isAborted,
        abortReason: reason,
      });
    } catch (err) { console.error('Complete error:', err); }
    setCompleted(true);
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const timerClass = timeLeft <= 10 ? 'danger' : timeLeft <= 30 ? 'warning' : '';
  const displayedText = (finalizedText + ' ' + interimText).trim() || answerText;

  /* ─── Sound Wave bars ────────────────────────────────────── */
  const SoundWaves = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
      {[...Array(12)].map((_, i) => {
        const height = isRecording && volLevel > 0 ? Math.max(3, Math.min(28, volLevel * 280 * (0.5 + Math.abs(Math.sin(i * 0.8))))) : 3;
        return <div key={i} style={{ width: 3, height, backgroundColor: isRecording ? '#3b82f6' : 'rgba(255,255,255,0.15)', borderRadius: 2, transition: 'height 0.1s ease' }} />;
      })}
    </div>
  );

  if (loading) return (
    <div className="loading-overlay">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 56, height: 56, margin: '0 auto 16px' }} />
        <p>Loading interview session...</p>
      </div>
    </div>
  );

  /* ─── Completion screens ─────────────────────────────────── */
  if (completed && aborted) return (
    <div className="loading-overlay" style={{ background: 'rgba(10,10,15,0.97)' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
        <h2 style={{ color: '#ef4444', marginBottom: 12 }}>Interview Terminated</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Your session was terminated due to security violations.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 32 }}>{abortionReason}</p>
        <p style={{ color: 'var(--text-secondary)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '16px 20px' }}>
          Your responses have been recorded. The recruiter will be notified of the security violation.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => navigate('/candidate')}>
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  if (completed && !aborted) return (
    <div className="loading-overlay" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 100%)' }}>
      <div style={{ textAlign: 'center', maxWidth: 500, padding: 40 }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
        <h2 style={{ fontSize: '2rem', marginBottom: 12, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Thank You!
        </h2>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 16, fontWeight: 500 }}>
          Interview Completed Successfully
        </h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 32 }}>
          Thank you for attending the <strong style={{ color: 'var(--accent-blue-light)' }}>{interviewData?.title}</strong> interview.
          Your responses have been recorded and will be evaluated by the recruiter.
          You will receive feedback and the next steps soon via email.
        </p>
        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 16, padding: '20px 28px', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>QUESTIONS ANSWERED</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{currentQIndex}/{totalQ}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>SESSION STATUS</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-green)' }}>✓ Submitted</div>
            </div>
          </div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/candidate')}>
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  /* ─── Pre-start screen ───────────────────────────────────── */
  if (!sessionStarted) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="glass-card animate-fade" style={{ maxWidth: 560, width: '100%', padding: 40, textAlign: 'center' }}>
        <div style={{ marginBottom: 28 }}>
          <img src="/AI_and_human_connection_symbol-removebg-preview.png" alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 16 }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>{interviewData?.title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>AI-Proctored Interview Session</p>
        </div>

        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', background: '#000', marginBottom: 24 }}>
          <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, textAlign: 'center' }}>
            <span style={{ background: 'rgba(0,0,0,0.7)', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', color: proctorReady ? '#10b981' : '#f59e0b' }}>
              {proctorStatus}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12 }}>
            <Clock size={16} style={{ marginBottom: 4 }} /> <br />{interviewData?.timePerQuestion || 60}s/question
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12 }}>
            <Target size={16} style={{ marginBottom: 4 }} /> <br />{interviewData?.numberOfQuestions || 10} questions
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12 }}>
            <Brain size={16} style={{ marginBottom: 4 }} /> <br />AI Proctored
          </div>
        </div>

        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: '#ef4444' }}>📋 Interview Rules:</strong>
          <ul style={{ margin: '8px 0 0 16px', lineHeight: 1.8 }}>
            <li>Stay in Fullscreen mode throughout the interview</li>
            <li>Do not switch tabs or minimize the window</li>
            <li>Only one person should be visible in the camera</li>
            <li>No mobile phones or external notes allowed</li>
          </ul>
        </div>

        <button
          className="btn btn-primary btn-lg w-full"
          onClick={handleStartSession}
          disabled={!proctorReady}
        >
          {proctorReady ? <><CheckCircle size={18} style={{ marginRight: 8 }} /> Begin Interview</> : <><Loader2 size={18} className="spin" style={{ marginRight: 8 }} /> Loading AI Models...</>}
        </button>
      </div>
    </div>
  );

  /* ─── Active Interview UI ────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/AI_and_human_connection_symbol-removebg-preview.png" alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{interviewData?.title}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Question {currentQIndex + 1} / {totalQ}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div className={`timer-display ${timerClass}`}>{formatTime(timeLeft)}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>TIME LEFT</div>
          </div>
          <div style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: 20, background: warningCount > 5 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.1)', color: warningCount > 5 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
            ⚠ {warningCount.toFixed(0)}/10
          </div>
          <div style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600 }}>
            ● LIVE
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)' }}>
        <div style={{ height: '100%', width: `${((currentQIndex) / totalQ) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', transition: 'width 0.5s ease' }} />
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, minHeight: 0 }}>
        {/* Left: Camera + proctoring */}
        <div style={{ borderRight: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', padding: 24, gap: 16 }}>
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', flex: '0 0 auto', aspectRatio: '16/9' }}>
            <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} /> PROCTORED
            </div>
            <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' }}>
              <span style={{ background: 'rgba(0,0,0,0.6)', padding: '3px 12px', borderRadius: 20, fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>
                {proctorStatus}
              </span>
            </div>
          </div>

          {/* Sound waves */}
          <div style={{ background: 'var(--bg-glass)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>{isRecording ? <Mic size={18} color="#3b82f6" /> : <MicOff size={18} color="var(--text-muted)" />}</div>
            <SoundWaves />
            <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: isRecording ? '#3b82f6' : 'var(--text-muted)', fontWeight: 600 }}>
              {isRecording ? '● REC' : 'STANDBY'}
            </div>
          </div>

          {/* ASR status */}
          {asrStatus ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '6px 12px', background: 'rgba(59,130,246,0.05)', borderRadius: 8 }}>
              {asrStatus}
            </div>
          ) : null}

          {/* Countdown overlay */}
          {countdown !== null && countdown > 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{countdown}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Get ready to speak...</div>
            </div>
          )}
        </div>

        {/* Right: Question + controls */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: 28, gap: 20 }}>
          {/* AI Speaking indicator */}
          {isSpeaking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12 }}>
              <Brain size={16} color="#8b5cf6" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>AI Interviewer is speaking...</span>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '3px 10px' }} onClick={handleSkipAIVoice}>
                Skip Voice
              </button>
            </div>
          )}

          {/* Question card */}
          <div style={{ background: 'var(--bg-glass)', borderRadius: 16, padding: '20px 24px', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Brain size={14} color="var(--accent-purple-light)" />
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                Question {currentQIndex + 1}
              </span>
            </div>
            <h3 style={{ lineHeight: 1.6, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              {currentQuestion?.text}
            </h3>
          </div>

          {/* Answer display */}
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--border-primary)', minHeight: 120 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MicOff size={12} /> Your Answer
            </div>
            {displayedText ? (
              <p style={{ lineHeight: 1.7, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{displayedText}</p>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                {countdown !== null && countdown > 0 ? 'Preparing microphone...' : isRecording ? 'Listening... Speak your answer.' : 'Audio recording will start automatically.'}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={skipQuestion}
              disabled={submitting || isSpeaking || countdown !== null}
              style={{ color: 'var(--text-muted)' }}
            >
              <SkipForward size={15} /> Skip
            </button>
            <button
              className={`btn btn-primary w-full${submitting ? ' btn-loading' : ''}`}
              onClick={() => { if (isRecording) stopRecording(); else submitAnswer(displayedText); }}
              disabled={submitting || isSpeaking || countdown !== null}
            >
              {submitting ? (
                <><span className="spinner spinner-sm" /> Processing...</>
              ) : isRecording ? (
                <><MicOff size={16} /> Stop & Submit</>
              ) : (
                <>{currentQIndex + 1 >= totalQ ? '✓ Finish Interview' : 'Submit Answer'}</>
              )}
            </button>
          </div>

          {/* Warning message */}
          {timeLeft <= 30 && !isSpeaking && countdown === null && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, fontSize: '0.8rem', color: '#fbbf24' }}>
              <AlertCircle size={16} /> Time is running out — submit your answer soon!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
