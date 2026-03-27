import express from 'express';
import { protect, requireRole } from '../middleware/auth.middleware.js';
import {
  requestAccess,
  getRecruiterRequests,
  updateRequestStatus,
  getCandidateRequests
} from '../controllers/interviewRequest.controller.js';

const router = express.Router();

// Candidate requests access
router.post('/request', protect, requireRole('candidate'), requestAccess);
router.get('/my-requests', protect, requireRole('candidate'), getCandidateRequests);

// Recruiter manages requests
router.get('/recruiter', protect, requireRole('recruiter', 'admin'), getRecruiterRequests);
router.put('/update-status', protect, requireRole('recruiter', 'admin'), updateRequestStatus);

export default router;
