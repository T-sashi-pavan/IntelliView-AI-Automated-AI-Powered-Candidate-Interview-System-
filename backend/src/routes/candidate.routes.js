import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  startSession, submitAnswer, completeSession,
  getSessionResult, getMySessions, getAllCandidates,
  startRealInterview, completeRealSession
} from '../controllers/candidate.controller.js';

const router = express.Router();

router.post('/start', protect, startSession);
router.post('/answer', protect, submitAnswer);
router.post('/complete', protect, completeSession);
router.post('/start-real', protect, startRealInterview);
router.post('/complete-real', protect, completeRealSession);
router.get('/my-sessions', protect, getMySessions);
router.get('/all', protect, getAllCandidates);
router.get('/session/:id', protect, getSessionResult);

export default router;

