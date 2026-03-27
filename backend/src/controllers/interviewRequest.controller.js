import InterviewRequest from '../models/interviewRequest.model.js';
import Interview from '../models/interview.model.js';
import User from '../models/user.model.js';
import { sendAccessRequestStatus } from '../services/email.service.js';

export const requestAccess = async (req, res) => {
  try {
    const { interviewId, message } = req.body;
    const interview = await Interview.findById(interviewId);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });

    // Check if user has resume
    if (!req.user.resumeUrl) {
      return res.status(400).json({ success: false, message: 'Please upload your resume in your profile first.' });
    }

    const request = await InterviewRequest.create({
      candidate: req.user._id,
      interview: interviewId,
      recruiter: interview.recruiter,
      resumeUrl: req.user.resumeUrl,
      resumeText: req.user.resumeText,
      message
    });

    return res.status(201).json({ success: true, request });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already requested access to this interview.' });
    }
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getRecruiterRequests = async (req, res) => {
  try {
    const requests = await InterviewRequest.find({ recruiter: req.user._id })
      .populate('candidate', 'name email avatar skills jobTitle resumeUrl resumeText')
      .populate('interview', 'title interviewLink')
      .sort({ createdAt: -1 });
    return res.json({ success: true, requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const { requestId, status } = req.body; // status: 'granted' or 'revoked'
    if (!['granted', 'revoked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const request = await InterviewRequest.findOne({ _id: requestId, recruiter: req.user._id })
      .populate('candidate', 'name email')
      .populate('interview', 'title interviewLink');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    request.status = status;
    await request.save();

    // Send email notification
    const fullLink = `${process.env.FRONTEND_URL}/candidate/attend?link=${request.interview.interviewLink}`;
    await sendAccessRequestStatus(
      request.candidate.email, 
      request.candidate.name, 
      request.interview.title, 
      status, 
      fullLink
    );

    return res.json({ success: true, request });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getCandidateRequests = async (req, res) => {
  try {
    const requests = await InterviewRequest.find({ candidate: req.user._id })
      .populate('interview', 'title status')
      .sort({ createdAt: -1 });
    return res.json({ success: true, requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
