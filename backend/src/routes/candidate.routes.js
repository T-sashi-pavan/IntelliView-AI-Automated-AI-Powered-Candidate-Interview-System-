import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import multer from 'multer';
import {
  startSession, submitAnswer, completeSession,
  getSessionResult, getMySessions, getAllCandidates, applyForInterview
} from '../controllers/candidate.controller.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/apply', protect, upload.single('resume'), applyForInterview);

router.post('/start', protect, startSession);
router.post('/answer', protect, submitAnswer);
router.post('/complete', protect, completeSession);
router.get('/my-sessions', protect, getMySessions);
router.get('/all', protect, getAllCandidates);
router.get('/session/:id', protect, getSessionResult);

export default router;
