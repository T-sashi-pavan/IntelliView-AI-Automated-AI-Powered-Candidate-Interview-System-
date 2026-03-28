import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  question: { type: String, required: true },
  questionType: String,
  answer: { type: String, default: '' },
  score: { type: Number, default: 0, min: 0, max: 100 },
  feedback: String,
  keywordsMatched: [String],
  timeTaken: Number, // seconds
  isSkipped: { type: Boolean, default: false },
});

const sessionSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['scheduled', 'in-progress', 'completed', 'abandoned'], default: 'scheduled' },
  startedAt: Date,
  completedAt: Date,
  answers: [answerSchema],
  overallScore: { type: Number, default: 0 },
  skillScores: { type: Map, of: Number, default: {} },
  strengths: [String],
  weaknesses: [String],
  aiFeedback: String,
  questions: [mongoose.Schema.Types.Mixed],
  rank: Number,
  reportUrl: String,
  resumeSnapshot: { type: String, default: '' },
  currentQuestionIndex: { type: Number, default: 0 },
  socketRoomId: String,
}, { timestamps: true });

export default mongoose.model('Session', sessionSchema);
