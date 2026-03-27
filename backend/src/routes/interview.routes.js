import express from 'express';
import multer from 'multer';
import { protect, requireRole } from '../middleware/auth.middleware.js';
import {
  createInterview, generateQuestions, getInterviews,
  getInterviewById, getInterviewByLink, updateInterview,
  deleteInterview, getInterviewCandidates, inviteCandidates, getExploreInterviews,
  suggestJobDetails
} from '../controllers/interview.controller.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/link/:link', getInterviewByLink);
router.get('/explore', protect, requireRole('candidate'), getExploreInterviews);
router.get('/', protect, requireRole('recruiter', 'admin'), getInterviews);
router.post('/', protect, requireRole('recruiter', 'admin'), createInterview);
router.post('/ai-suggest', protect, requireRole('recruiter', 'admin'), suggestJobDetails);

router.get('/:id', protect, getInterviewById);
router.put('/:id', protect, requireRole('recruiter', 'admin'), updateInterview);
router.delete('/:id', protect, requireRole('recruiter', 'admin'), deleteInterview);
router.post('/:interviewId/generate-questions', protect, requireRole('recruiter', 'admin'), generateQuestions);
router.post('/:id/invite', protect, requireRole('recruiter', 'admin'), upload.single('file'), inviteCandidates);
router.get('/:id/candidates', protect, requireRole('recruiter', 'admin'), getInterviewCandidates);

export default router;
