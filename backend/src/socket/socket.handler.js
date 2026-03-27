import { handleASR } from './asr.handler.js';

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    
    // Initialise ASR handlers
    handleASR(socket, io);

    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
    });

    socket.on('interview_started', (data) => {
      socket.to(data.roomId).emit('interview_started', data);
    });

    socket.on('question_answered', (data) => {
      socket.to(data.roomId).emit('question_answered', data);
    });

    socket.on('ai_thinking', (data) => {
      io.to(data.roomId).emit('ai_thinking', { status: true });
    });

    socket.on('ai_done', (data) => {
      io.to(data.roomId).emit('ai_thinking', { status: false });
    });

    socket.on('voice_input_started', (data) => {
      io.to(data.roomId).emit('voice_status', { listening: true });
    });

    socket.on('voice_input_stopped', (data) => {
      io.to(data.roomId).emit('voice_status', { listening: false });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
};
