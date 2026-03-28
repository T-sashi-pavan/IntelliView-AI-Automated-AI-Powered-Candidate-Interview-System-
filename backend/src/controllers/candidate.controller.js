import Session from '../models/session.model.js';
import Interview from '../models/interview.model.js';
import User from '../models/user.model.js';
import { evaluateAnswerWithGroq, generateFinalFeedbackWithGemini, generateDynamicQuestionWithGroq } from '../services/ai.service.js';

export const startSession = async (req, res) => {
  try {
    const { interviewLink } = req.body;
    const interview = await Interview.findOne({ interviewLink, status: 'active' });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found or not active.' });

    let session = await Session.findOne({ candidate: req.user._id, interview: interview._id });
    if (session && session.status === 'completed') {
      return res.status(400).json({ success: false, message: 'You have already completed this interview.' });
    }
    if (!session) {
      session = await Session.create({
        candidate: req.user._id,
        interview: interview._id,
        recruiter: interview.recruiter,
        status: 'in-progress',
        startedAt: new Date(),
        socketRoomId: `session_${interview._id}_${req.user._id}`,
        questions: [{
          text: "Please introduce yourself and walk me through your background.",
          type: "general",
          expectedKeywords: [],
          difficulty: "easy",
          timeLimit: interview.timePerQuestion || 60
        }],
      });
    }
    return res.json({ success: true, session, interview });
  } catch (err) {
    console.error('Start session error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { sessionId, questionIndex, answer, timeTaken } = req.body;
    const session = await Session.findById(sessionId).populate('interview');
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const question = session.questions[questionIndex];
    if (!question) return res.status(400).json({ success: false, message: 'Invalid question index.' });

    const evaluation = await evaluateAnswerWithGroq({
      question: question.text,
      answer,
      expectedKeywords: question.expectedKeywords,
      jobContext: `${session.interview.title} (${session.interview.employmentType || 'full-time'}, ${session.interview.workMode || 'onsite'})`,
    });

    const answerEntry = {
      question: question.text,
      questionType: question.type,
      answer,
      score: evaluation.score || 0,
      feedback: evaluation.feedback || '',
      keywordsMatched: evaluation.keywordsMatched || [],
      timeTaken: timeTaken || 0,
    };

    session.answers[questionIndex] = answerEntry;
    session.currentQuestionIndex = questionIndex + 1;

    const totalScore = session.answers.reduce((sum, a) => sum + (a?.score || 0), 0);
    session.overallScore = Math.round(totalScore / session.interview.numberOfQuestions);

    let nextQuestion = null;
    if (session.currentQuestionIndex < session.interview.numberOfQuestions) {
      const isFinalQuestion = session.currentQuestionIndex === session.interview.numberOfQuestions - 1;
      nextQuestion = await generateDynamicQuestionWithGroq({
        jobTitle: session.interview.title,
        jobDescription: session.interview.jobDescription,
        requiredSkills: session.interview.requiredSkills,
        experienceLevel: session.interview.experienceLevel,
        stipend: session.interview.stipend,
        jobDuration: session.interview.jobDuration,
        employmentType: session.interview.employmentType,
        workMode: session.interview.workMode,
        previousQA: session.answers,
        isFinalQuestion,
        timePerQuestion: session.interview.timePerQuestion
      });
      session.questions.push(nextQuestion);
    }

    await session.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(session.socketRoomId).emit('answer_evaluated', { questionIndex, score: evaluation.score, feedback: evaluation.feedback });
    }

    return res.json({ success: true, evaluation, overallScore: session.overallScore, nextQuestion });
  } catch (err) {
    console.error('Submit answer error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const completeSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await Session.findById(sessionId).populate('interview');
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const finalFeedback = await generateFinalFeedbackWithGemini({
      sessionData: session,
      jobTitle: session.interview.title,
      stipend: session.interview.stipend,
      jobDuration: session.interview.jobDuration,
      employmentType: session.interview.employmentType,
      workMode: session.interview.workMode
    });

    session.status = 'completed';
    session.completedAt = new Date();
    session.aiFeedback = finalFeedback.overallFeedback;
    session.strengths = finalFeedback.strengths || [];
    session.weaknesses = finalFeedback.weaknesses || [];
    if (finalFeedback.skillScores) {
      session.skillScores = new Map(Object.entries(finalFeedback.skillScores));
    }
    await session.save();

    // Update interview stats
    const interview = await Interview.findById(session.interview._id);
    if (interview) {
      const currentCount = interview.totalCandidates || 0;
      const currentAvg = interview.avgScore || 0;
      interview.totalCandidates = currentCount + 1;
      interview.avgScore = Math.round(((currentAvg * currentCount) + session.overallScore) / (currentCount + 1));
      await interview.save();
    }
    
    await User.findByIdAndUpdate(session.candidate, { $inc: { totalInterviewsAttended: 1 } });

    const io = req.app.get('io');
    if (io) {
      io.to(session.socketRoomId).emit('session_completed', { sessionId, overallScore: session.overallScore });
    }

    return res.json({ success: true, session, finalFeedback });
  } catch (err) {
    console.error('Complete session error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getSessionResult = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('interview', 'title jobDescription requiredSkills')
      .populate('candidate', 'name email avatar');
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    return res.json({ success: true, session });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getMySessions = async (req, res) => {
  try {
    const sessions = await Session.find({ candidate: req.user._id })
      .populate('interview', 'title jobDescription')
      .sort({ createdAt: -1 });
    return res.json({ success: true, sessions });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getAllCandidates = async (req, res) => {
  try {
    const sessions = await Session.find({ recruiter: req.user._id })
      .populate('candidate', 'name email avatar')
      .populate('interview', 'title')
      .sort({ overallScore: -1 });
    return res.json({ success: true, candidates: sessions });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
export const startRealInterview = async (req, res) => {
  try {
    const { interviewId } = req.body;
    const interview = await Interview.findById(interviewId);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });

    const candidate = await User.findById(req.user._id);
    const resumeText = candidate.resumeText || '';

    let session = await Session.findOne({ candidate: req.user._id, interview: interview._id });
    if (session && session.status === 'completed') {
      return res.status(400).json({ success: false, message: 'You have already completed this interview.' });
    }
    if (!session) {
      session = await Session.create({
        candidate: req.user._id,
        interview: interview._id,
        recruiter: interview.recruiter,
        status: 'in-progress',
        startedAt: new Date(),
        socketRoomId: `session_${interview._id}_${req.user._id}`,
        questions: [{
          text: "Please introduce yourself and walk me through your background and experience relevant to this role.",
          type: "general",
          expectedKeywords: interview.requiredSkills || [],
          difficulty: "easy",
          timeLimit: interview.timePerQuestion || 60,
        }],
        // store resume text for AI question generation
        resumeSnapshot: resumeText,
      });
    }
    return res.json({ success: true, session, interview, resumeText });
  } catch (err) {
    console.error('Start real interview error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const completeRealSession = async (req, res) => {
  try {
    const { sessionId, warnings = 0, aborted = false, abortReason = '', overallScore = 0 } = req.body;
    const session = await Session.findById(sessionId).populate('interview');
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    session.status = 'completed';
    session.completedAt = new Date();
    session.overallScore = overallScore;
    if (aborted) {
      session.aiFeedback = `Interview aborted due to security violations: ${abortReason}`;
    }
    await session.save();

    const interview = await Interview.findById(session.interview._id);
    if (interview) {
      const currentCount = interview.totalCandidates || 0;
      const currentAvg = interview.avgScore || 0;
      interview.totalCandidates = currentCount + 1;
      if (!aborted && overallScore > 0) {
        interview.avgScore = Math.round(((currentAvg * currentCount) + overallScore) / (currentCount + 1));
      }
      await interview.save();
    }

    await User.findByIdAndUpdate(session.candidate, { $inc: { totalInterviewsAttended: 1 } });

    return res.json({ success: true, session });
  } catch (err) {
    console.error('Complete real session error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
