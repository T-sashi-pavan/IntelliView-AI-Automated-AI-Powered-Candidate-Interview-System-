import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, select: false },
  googleId: { type: String, sparse: true },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['candidate', 'recruiter', 'admin'], default: 'candidate' },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpiry: Date,
  company: String,
  jobTitle: String,
  recruiterJobTitle: String,
  candidateJobTitle: String,
  bio: String,
  recruiterBio: String,
  candidateBio: String,
  skills: [String],
  resumeUrl: String,
  resumeText: String,
  avatar: { type: String, default: '' },
  recruiterAvatar: { type: String, default: '' },
  candidateAvatar: { type: String, default: '' },
  totalInterviewsAttended: { type: Number, default: 0 },
  totalInterviewsCreated: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 },
  lastLogin: Date,
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationToken;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpiry;
  return obj;
};

export default mongoose.model('User', userSchema);
