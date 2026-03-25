import Session from '../models/session.model.js';
import Interview from '../models/interview.model.js';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import { evaluateAnswerWithGroq, generateFinalFeedbackWithGemini, generateNextQuestionWithGroq } from '../services/ai.service.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import fs from 'fs';

export const applyForInterview = async (req, res) => {
  try {
    const { interviewId } = req.body;
    const interview = await Interview.findById(interviewId).populate('recruiter');
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });

    if (!req.file) return res.status(400).json({ success: false, message: 'Resume file is required.' });

    const fileBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(fileBuffer);
    const resumeText = data.text;

    // AI Analysis of Resume vs Job
    const analysisPrompt = `Analyze this resume against the job description.
Job Title: ${interview.title}
Job Description: ${interview.jobDescription}
Required Skills: ${interview.requiredSkills.join(', ')}

Resume Content:
${resumeText.substring(0, 4000)}

Provide a JSON response with:
{
  "score": <0-100 overall match>,
  "matchPercentage": <0-100>,
  "feedback": "<short summary of match>",
  "pros": ["<highlight1>", "<highlight2>"],
  "cons": ["<missing skill or gap>"],
  "skillScores": {"Skill A": 80, "Skill B": 50}
}
Only return JSON.`;

    const analysisResponse = await evaluateAnswerWithGroq({ 
      question: "Analyze resume", 
      answer: analysisPrompt, 
      expectedKeywords: [], 
      jobContext: "Resume Analysis" 
    });

    // Create Notification for Recruiter
    await Notification.create({
      recipient: interview.recruiter._id,
      sender: req.user._id,
      type: 'application',
      title: `New Application: ${interview.title}`,
      message: `${req.user.name} has applied for ${interview.title}.`,
      data: {
        interviewId,
        resumeUrl: req.file.path, // This is expected to be a Cloudinary URL or local path depending on setup.
        resumeAnalysis: analysisResponse
      }
    });

    // Cleanup local file if it was saved locally (assuming Cloudinary storage is used now)
    // fs.unlinkSync(req.file.path); 

    res.json({ success: true, message: 'Application submitted successfully! The recruiter will be notified.' });
  } catch (err) {
    console.error('Apply for interview error:', err);
    res.status(500).json({ success: false, message: 'Server error during application.' });
  }
};

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
      // Generate the first question (Self Intro)
      const firstQ = await generateNextQuestionWithGroq({
        jobTitle: interview.title,
        jobDescription: interview.jobDescription,
        requiredSkills: interview.requiredSkills,
        experienceLevel: interview.experienceLevel,
        previousAnswers: [],
        isFirst: true
      });

      session = await Session.create({
        candidate: req.user._id,
        interview: interview._id,
        recruiter: interview.recruiter,
        status: 'in-progress',
        startedAt: new Date(),
        socketRoomId: `session_${interview._id}_${req.user._id}`,
        dynamicQuestions: [{ ...firstQ, timeLimit: interview.duration || 60 }]
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

    const question = session.dynamicQuestions[questionIndex];
    if (!question) return res.status(400).json({ success: false, message: 'Invalid question index.' });

    const evaluation = await evaluateAnswerWithGroq({
      question: question.text,
      answer,
      expectedKeywords: question.expectedKeywords,
      jobContext: session.interview.title,
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

    // Generate next question if not at limit
    const totalLimit = session.interview.numberOfQuestions;
    if (session.currentQuestionIndex < totalLimit) {
      const isLast = session.currentQuestionIndex === totalLimit - 1;
      const nextQ = await generateNextQuestionWithGroq({
        jobTitle: session.interview.title,
        jobDescription: session.interview.jobDescription,
        requiredSkills: session.interview.requiredSkills,
        experienceLevel: session.interview.experienceLevel,
        previousAnswers: session.answers,
        isFirst: false,
        isLast: isLast
      });
      session.dynamicQuestions.push({ ...nextQ, timeLimit: session.interview.duration || 60 });
    }

    const totalQuestionsAskedSoFar = session.dynamicQuestions.length;
    const avgScore = session.answers.reduce((sum, a) => sum + (a?.score || 0), 0) / session.answers.filter(Boolean).length;
    session.overallScore = Math.round(avgScore || 0);

    await session.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(session.socketRoomId).emit('answer_evaluated', { 
        questionIndex, 
        score: evaluation.score, 
        feedback: evaluation.feedback,
        nextQuestion: session.dynamicQuestions[session.currentQuestionIndex]
      });
    }

    return res.json({ 
      success: true, 
      evaluation, 
      overallScore: session.overallScore,
      nextQuestion: session.dynamicQuestions[session.currentQuestionIndex]
    });
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
    await Interview.findByIdAndUpdate(session.interview._id, { $inc: { totalCandidates: 1 } });
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
