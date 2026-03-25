import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateNextQuestionWithGroq = async ({ jobTitle, jobDescription, requiredSkills, experienceLevel, previousAnswers, isFirst, isLast }) => {
  if (isFirst) {
    return {
      text: "Please start by introducing yourself and giving a brief overview of your background.",
      type: "general",
      expectedKeywords: ["background", "experience"],
      difficulty: "easy"
    };
  }

  if (isLast) {
    return {
      text: "Do you have any questions for us about the role or the company?",
      type: "general",
      expectedKeywords: [],
      difficulty: "easy"
    };
  }

  const history = previousAnswers.map((a, i) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');

  const prompt = `You are an expert technical interviewer conducting an interview for:
Job Title: ${jobTitle}
Description: ${jobDescription}
Required Skills: ${requiredSkills.join(', ')}
Experience Level: ${experienceLevel}

Here is the candidate's previous history:
${history || 'None yet.'}

Based on the candidate's previous answers, generate ONE highly relevant, adaptive follow-up question. If they missed something, probe deeper. If they did well, ask a harder or different topic question from the required skills.
Return ONLY a JSON object with this exact structure:
{
  "text": "Your adaptive question here",
  "type": "behavioral|technical|situational",
  "expectedKeywords": ["keyword1", "keyword2"],
  "difficulty": "easy|medium|hard"
}
Only return the JSON, no other text.`;

  try {
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : '{"text": "Could you elaborate on your experience?"}');
  } catch (err) {
    return { text: "Could you elaborate more on your skills?", type: "general", difficulty: "medium" };
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

export const generateFinalFeedbackWithGemini = async ({ sessionData, jobTitle }) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const answersText = sessionData.answers.map((a, i) =>
    `Q${i+1}: ${a.question}\nA: ${a.answer}\nScore: ${a.score}/100`
  ).join('\n\n');

  const prompt = `You are an expert career coach. Analyze this interview performance for a ${jobTitle} position and provide comprehensive feedback:

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
