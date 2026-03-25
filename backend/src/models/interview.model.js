import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['behavioral', 'technical', 'situational', 'general'], default: 'general' },
  expectedKeywords: [String],
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  timeLimit: { type: Number, default: 120 }, // seconds
});

const interviewSchema = new mongoose.Schema({
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  jobDescription: { type: String, required: true },
  requiredSkills: [String],
  experienceLevel: { type: String, enum: ['entry', 'mid', 'senior', 'lead'], default: 'mid' },
  duration: { type: Number, default: 30 }, // minutes
  numberOfQuestions: { type: Number, default: 10 },
  questions: [questionSchema],
  interviewLink: { type: String, unique: true, default: () => uuidv4() },
  status: { type: String, enum: ['draft', 'active', 'closed'], default: 'draft' },
  totalCandidates: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 },
  expiresAt: Date,
}, { timestamps: true });

export default mongoose.model('Interview', interviewSchema);
