import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['application', 'interview_invite', 'system'], default: 'system' },
  title: String,
  message: String,
  data: {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
    resumeUrl: String,
    resumeAnalysis: {
      score: Number,
      feedback: String,
      matchPercentage: Number,
      pros: [String],
      cons: [String]
    }
  },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
