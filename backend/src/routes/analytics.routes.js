import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { getRecruiterAnalytics, getCandidateAnalytics, getLeaderboard, grantResult, revokeResult } from '../controllers/analytics.controller.js';

const router = express.Router();

router.get('/recruiter', protect, getRecruiterAnalytics);
router.get('/candidate', protect, getCandidateAnalytics);
router.get('/leaderboard', protect, getLeaderboard);
router.post('/grant-result', protect, grantResult);
router.post('/revoke-result', protect, revokeResult);

export default router;
