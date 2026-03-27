import mongoose from 'mongoose';

const interviewRequestSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resumeUrl: { type: String, required: true },
  resumeText: String, // Extracted text if any
  status: { type: String, enum: ['pending', 'granted', 'revoked'], default: 'pending' },
  message: String,
  requestDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure a candidate can only have one active request per interview
interviewRequestSchema.index({ candidate: 1, interview: 1 }, { unique: true });

export default mongoose.model('InterviewRequest', interviewRequestSchema);
