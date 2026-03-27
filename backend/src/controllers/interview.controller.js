import Interview from '../models/interview.model.js';
import Session from '../models/session.model.js';
import { generateQuestionsWithGroq, suggestJobDetailsWithGroq } from '../services/ai.service.js';
import { sendInterviewLink } from '../services/email.service.js';
import xlsx from 'xlsx';
import fs from 'fs';

export const inviteCandidates = async (req, res) => {
  try {
    const { id } = req.params;
    const interview = await Interview.findById(id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Excel file is required.' });

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Cleanup uploaded file
    fs.unlinkSync(req.file.path);

    const fullLink = `${process.env.FRONTEND_URL}/candidate/attend?link=${interview.interviewLink}`;
    
    let sentCount = 0;
    for (const row of data) {
      // Look for keys like Email, email, EMAIL, etc.
      const rawEmail = row['Email'] || row['email'] || row['EMAIL'] || Object.values(row).find(v => typeof v === 'string' && v.includes('@'));
      const name = row['Name'] || row['name'] || row['NAME'] || 'Candidate';
      if (rawEmail) {
        try {
          await sendInterviewLink(rawEmail, name, interview.title, fullLink);
          sentCount++;
        } catch (e) { console.warn('Failed to send to', rawEmail, e.message); }
      }
    }

    return res.json({ success: true, message: `Successfully invited ${sentCount} candidates.` });
  } catch (err) {
    console.error('Invite candidates error:', err);
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: 'Failed to process Excel file and send invites.' });
  }
};

export const createInterview = async (req, res) => {
  try {
    const { 
      title, jobDescription, requiredSkills, experienceLevel, 
      timePerQuestion, numberOfQuestions,
      stipend, jobDuration, employmentType, workMode
    } = req.body;
    
    const interview = await Interview.create({
      recruiter: req.user._id,
      title,
      jobDescription,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : requiredSkills.split(',').map(s => s.trim()),
      experienceLevel,
      stipend,
      jobDuration,
      employmentType,
      workMode,
      timePerQuestion: Number(timePerQuestion) || 60,
      numberOfQuestions: Number(numberOfQuestions) || 10,
      status: 'active',
    });
    return res.status(201).json({ success: true, interview });
  } catch (err) {
    console.error('Create interview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create interview.' });
  }
};

export const suggestJobDetails = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Job title is required.' });

    const suggestion = await suggestJobDetailsWithGroq(title);
    return res.json({ success: true, suggestion });
  } catch (err) {
    console.error('Job details suggestion error:', err);
    return res.status(500).json({ success: false, message: 'Failed to suggest job details.' });
  }
};

export const generateQuestions = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const interview = await Interview.findOne({ _id: interviewId, recruiter: req.user._id });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });

    const questions = await generateQuestionsWithGroq({
      jobTitle: interview.title,
      jobDescription: interview.jobDescription,
      requiredSkills: interview.requiredSkills,
      experienceLevel: interview.experienceLevel,
      numberOfQuestions: interview.numberOfQuestions,
    });

    interview.questions = questions;
    interview.status = 'active';
    await interview.save();

    return res.json({ success: true, questions, interviewLink: interview.interviewLink });
  } catch (err) {
    console.error('Generate questions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate questions.' });
  }
};

export const getExploreInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ status: 'active', recruiter: { $ne: req.user._id } })
      .populate('recruiter', 'name company avatar')
      .select('-questions') // don't send questions to candidates exploring
      .sort({ createdAt: -1 });
    return res.json({ success: true, interviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ recruiter: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, interviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getInterviewById = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id).populate('recruiter', 'name email');
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    return res.json({ success: true, interview });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getInterviewByLink = async (req, res) => {
  try {
    const interview = await Interview.findOne({ interviewLink: req.params.link, status: 'active' })
      .populate('recruiter', 'name company');
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found or expired.' });
    return res.json({ success: true, interview });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const updateInterview = async (req, res) => {
  try {
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, recruiter: req.user._id },
      req.body,
      { new: true }
    );
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    return res.json({ success: true, interview });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const deleteInterview = async (req, res) => {
  try {
    await Interview.findOneAndDelete({ _id: req.params.id, recruiter: req.user._id });
    return res.json({ success: true, message: 'Interview deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getInterviewCandidates = async (req, res) => {
  try {
    const sessions = await Session.find({ interview: req.params.id })
      .populate('candidate', 'name email avatar')
      .sort({ overallScore: -1 });
    return res.json({ success: true, candidates: sessions });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
