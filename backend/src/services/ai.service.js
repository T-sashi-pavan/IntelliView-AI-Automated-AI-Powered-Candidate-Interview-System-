import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateQuestionsWithGroq = async ({ jobTitle, jobDescription, requiredSkills, experienceLevel, numberOfQuestions }) => {
  const prompt = `You are an expert technical interviewer. Generate ${numberOfQuestions} interview questions for the following role:

Job Title: ${jobTitle}
Job Description: ${jobDescription}
Required Skills: ${requiredSkills.join(', ')}
Experience Level: ${experienceLevel}

Return a JSON array of question objects with this exact structure:
[
  {
    "text": "question text here",
    "type": "behavioral|technical|situational|general",
    "expectedKeywords": ["keyword1", "keyword2"],
    "difficulty": "easy|medium|hard",
    "timeLimit": 120
  }
]

Only return the JSON array, no other text.`;

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content || '[]';
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : '[]');
  } catch {
    return [];
  }
};

export const generateDynamicQuestionWithGroq = async ({ 
  jobTitle, jobDescription, requiredSkills, experienceLevel, 
  previousQA, isFinalQuestion, timePerQuestion, 
  stipend, jobDuration, employmentType, workMode 
}) => {
  if (isFinalQuestion) {
    return {
      text: "We've reached the end of the interview. Do you have any questions for me about the role, the company, or the specifics like the " + (employmentType || "position") + " terms?",
      type: "general",
      expectedKeywords: [],
      difficulty: "easy",
      timeLimit: timePerQuestion || 60
    };
  }

  const prompt = `You are an expert technical interviewer for a ${jobTitle} role.
Job Description: ${jobDescription}
Required Skills: ${requiredSkills.join(', ')}
Experience Level: ${experienceLevel}
Employment Details: ${employmentType || 'N/A'}, ${workMode || 'N/A'}, ${stipend ? `Stipend: ${stipend}` : ''}, ${jobDuration ? `Duration: ${jobDuration}` : ''}

Candidate's previous answers:
${previousQA.map((qa, i) => `Q${i+1}: ${qa.question}\nA${i+1}: ${qa.answer}\n`).join('')}

Generate exactly ONE follow-up interview question. It should logically follow from their previous answers if possible, or probe a new required skill if you have covered everything.
Do NOT repeat previous questions.

Return a JSON object with this exact structure:
{
  "text": "the question text here",
  "type": "behavioral|technical|situational|general",
  "expectedKeywords": ["keyword1", "keyword2", "keyword3"],
  "difficulty": "medium",
  "timeLimit": ${timePerQuestion || 60}
}

Only return the JSON object, no other text.`;

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content || '{}';
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
  } catch {
    return { text: "Can you elaborate more on your previous experience?", type: "general", timeLimit: timePerQuestion || 60, expectedKeywords: [], difficulty: "medium" };
  }
};

export const evaluateAnswerWithGroq = async ({ question, answer, expectedKeywords, jobContext }) => {
  if (!answer || answer.trim().length < 10) {
    return { score: 0, feedback: 'No meaningful answer provided.', keywordsMatched: [] };
  }

  const prompt = `You are an expert interview evaluator. Evaluate this interview answer:

Question: ${question}
Answer: ${answer}
Expected Keywords: ${expectedKeywords?.join(', ') || 'N/A'}
Job Context: ${jobContext || 'General'}

Provide a JSON response with:
{
  "score": <0-100>,
  "feedback": "<specific feedback on the answer>",
  "keywordsMatched": ["<matched keywords>"],
  "strengths": ["<strength1>"],
  "improvements": ["<area to improve>"]
}

Only return the JSON, no other text.`;

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content || '{}';
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
  } catch {
    return { score: 50, feedback: 'Could not evaluate answer.', keywordsMatched: [] };
  }
};

export const generateFinalFeedbackWithGemini = async ({ sessionData, jobTitle, stipend, jobDuration, employmentType, workMode }) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const answersText = sessionData.answers.map((a, i) =>
    `Q${i+1}: ${a.question}\nA: ${a.answer}\nScore: ${a.score}/100`
  ).join('\n\n');

  const prompt = `You are an expert career coach and hiring manager. Analyze this interview performance for a ${jobTitle} position (${employmentType || 'full-time'}, ${workMode || 'onsite'}) and provide comprehensive feedback.
Context: ${stipend ? `Stipend/Salary: ${stipend}, ` : ''} ${jobDuration ? `Duration: ${jobDuration}` : ''}

${answersText}

Overall Score: ${sessionData.overallScore}/100

Provide a JSON response:
{
  "overallFeedback": "<2-3 paragraph comprehensive feedback>",
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "weaknesses": ["<area1>", "<area2>"],
  "skillScores": {"Communication": 75, "Technical Knowledge": 80, "Problem Solving": 70},
  "recommendations": ["<action item 1>", "<action item 2>"],
  "hiringSuggestion": "strong_yes|yes|maybe|no"
}

Only return JSON.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
  } catch {
    return { overallFeedback: 'Interview completed successfully.', strengths: [], weaknesses: [] };
  }
};

export const extractProfileFromResume = async (resumeText) => {
  const prompt = `You are an expert HR recruitment specialist and AI resume parser. 
  Extract the following information from the resume text provided below:
  - Full Name
  - Job Title (A concise professional title based on experience)
  - Skills (A comma-separated string of technical and soft skills)
  - Bio (A 2-3 sentence professional summary)

  Resume Text:
  ${resumeText}

  Return exactly a JSON object with this structure:
  {
    "name": "extracted name",
    "jobTitle": "extracted job title",
    "skills": "skill1, skill2, skill3",
    "bio": "extracted professional summary"
  }
  Only return the JSON object, no other text.`;

  try {
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // low temperature for precise extraction
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
  } catch (err) {
    console.error('AI Profile Extraction Error:', err);
    return {};
  }
};

export const suggestJobDetailsWithGroq = async (jobTitle) => {
  const prompt = `You are an expert technical recruiter and AI assistant. The user wants to create an interview for the role: "${jobTitle}".
  Generate a professional job description and a list of required skills based on industry standards for this title.

  Return exactly a JSON object with this structure:
  {
    "jobDescription": "A comprehensive 2-3 paragraph job description detailing responsibilities and expectations.",
    "requiredSkills": "skill1, skill2, skill3, skill4",
    "experienceLevel": "mid"
  }
  NOTE: experienceLevel should be one of "entry", "mid", "senior", "lead".
  Only return the JSON object, no other text.`;

  try {
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
  } catch (err) {
    console.error('AI Job Suggestion Error:', err);
    return {};
  }
};
