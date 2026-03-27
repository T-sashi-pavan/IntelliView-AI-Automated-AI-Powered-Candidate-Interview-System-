import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.middleware.js';
import User from '../models/user.model.js';
import upload from '../config/multer.js';
import pdf from 'pdf-parse-fork';
import { extractProfileFromResume } from '../services/ai.service.js';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

router.get('/profile', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed.' });
  }
});

// Separate multer instance for PDF
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  }
});

router.post('/profile/resume', protect, pdfUpload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    // 1. Parse PDF text
    const data = await pdf(req.file.buffer);
    const resumeText = data.text;

    // 2. Upload to Cloudinary (since we need it hosted)
    // Multer memory storage doesn't upload automatically, so we do it manually
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'interview-ai/resumes', resource_type: 'raw' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // 3. Extract profile info via AI
    const profileSuggestion = await extractProfileFromResume(resumeText);

    // 4. Update user
    const user = await User.findByIdAndUpdate(
      req.user._id, 
      { resumeUrl: result.secure_url, resumeText }, 
      { new: true }
    );

    res.json({ success: true, user, suggestion: profileSuggestion });
  } catch (err) {
    console.error('Resume upload/process error:', err);
    res.status(500).json({ success: false, message: 'Failed to process resume.' });
  }
});

router.post('/profile/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    const updateField = req.user.role === 'recruiter' ? 'recruiterAvatar' : 'candidateAvatar';
    const updateObj = { [updateField]: req.file.path, avatar: req.file.path }; // keeping avatar as fallback
    const user = await User.findByIdAndUpdate(req.user._id, updateObj, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Avatar upload failed.' });
  }
});

router.get('/all', protect, async (req, res) => {
  const users = await User.find({}).select('-password').sort({ createdAt: -1 });
  res.json({ success: true, users });
});

export default router;
