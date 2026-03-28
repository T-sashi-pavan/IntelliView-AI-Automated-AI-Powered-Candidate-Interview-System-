import PyPDF2
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import MockSession, MockQuestion
from groq import Groq
import json
import whisper
import tempfile
import os
import requests
from django.http import HttpResponse

class WhisperTranscriptionView(APIView):
    def post(self, request):
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response({'message': 'No audio file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
                for chunk in audio_file.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
            
            # Use Groq Whisper (insanely fast, 0 hallucinations)
            client = Groq(api_key=settings.GROQ_API_KEY)
            with open(tmp_path, "rb") as f:
                transcription = client.audio.transcriptions.create(
                    file=(os.path.basename(tmp_path), f.read()),
                    model="whisper-large-v3-turbo",
                    response_format="json"
                )
            
            # Cleanup
            os.remove(tmp_path)
            
            return Response({'text': transcription.text.strip()})
        except Exception as e:
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)
            return Response({'message': f"Groq Whisper Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SuggestRoleView(APIView):
    def post(self, request):
        resume_file = request.FILES.get('resume')
        if not resume_file:
            return Response({'message': 'Missing resume'}, status=status.HTTP_400_BAD_REQUEST)
        
        resume_text = ""
        try:
            reader = PyPDF2.PdfReader(resume_file)
            for page in reader.pages:
                resume_text += page.extract_text()
        except:
            return Response({'message': 'Failed to parse PDF'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client = Groq(api_key=settings.GROQ_API_KEY)
            prompt = f"""Analyze the following resume text and suggest 3-5 professional job roles that would be a good fit for this candidate.
Return ONLY a JSON object with a list of roles.
Resume: {resume_text[:3000]}
Format: {{"roles": ["Role 1", "Role 2", "Role 3"]}}
"""
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            roles = json.loads(completion.choices[0].message.content).get('roles', [])
            return Response({'roles': roles})
        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StartMockInterviewView(APIView):
    def post(self, request):
        job_role = request.data.get('jobRole')
        experience = request.data.get('experience', 'entry')
        questions_count = int(request.data.get('questions', 5))
        time_limit = int(request.data.get('timeLimit', 180))
        voice_id = request.data.get('voiceId', 'MmiGAbOYCaIFzgNItUWa')
        resume_file = request.FILES.get('resume')

        if not resume_file or not job_role:
            return Response({'message': 'Missing resume or job role'}, status=status.HTTP_400_BAD_REQUEST)

        resume_text = ""
        try:
            reader = PyPDF2.PdfReader(resume_file)
            for page in reader.pages:
                resume_text += page.extract_text()
        except:
            resume_text = "Standard resume profile."

        session = MockSession.objects.create(
            job_role=job_role,
            experience_level=experience,
            total_questions=questions_count,
            time_per_question=time_limit,
            voice_id=voice_id,
            resume_text=resume_text
        )

        # First question is ALWAYS Self-Intro as requested
        first_question = f"Welcome! I am your AI interviewer for the {job_role} position. To start off, could you please introduce yourself and tell me about your background as it relates to this role?"
        
        MockQuestion.objects.create(
            session=session,
            question_text=first_question,
            order=1
        )
        
        return Response({
            'sessionId': str(session.id),
            'firstQuestion': first_question,
            'message': 'Mock Interview Started'
        })

class GetSessionView(APIView):
    def get(self, request, session_id):
        try:
            session = MockSession.objects.get(id=session_id)
            questions = session.questions.all().order_by('order')
            
            data = {
                'id': str(session.id),
                'jobRole': session.job_role,
                'experience': session.experience_level,
                'totalQuestions': session.total_questions,
                'timeLimit': session.time_per_question,
                'voiceId': session.voice_id,
                'questions': [
                    {
                        'id': q.id,
                        'text': q.question_text,
                        'answer': q.answer_text,
                        'feedback': q.feedback,
                        'score': q.score,
                        'level': q.level,
                        'order': q.order,
                        'isAnswered': q.is_answered
                    } for q in questions
                ]
            }
            return Response(data)
        except MockSession.DoesNotExist:
            return Response({'message': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

class StartRealInterviewView(APIView):
    """Start a real recruiter interview session using JSON body (resume already in DB)."""
    def post(self, request):
        job_role = request.data.get('jobRole', '')
        job_description = request.data.get('jobDescription', '')
        experience = request.data.get('experience', 'mid')
        questions_count = int(request.data.get('questions', 5))
        time_limit = int(request.data.get('timeLimit', 180))
        resume_text = request.data.get('resumeText', '')
        required_skills = request.data.get('requiredSkills', [])

        if not job_role:
            return Response({'message': 'Missing job role'}, status=status.HTTP_400_BAD_REQUEST)

        # Build enriched resume context for question generation
        skills_str = ', '.join(required_skills) if required_skills else ''
        enriched_context = f"""
Job Role: {job_role}
Job Description: {job_description[:500]}
Required Skills: {skills_str}
Experience Level: {experience}
Candidate Resume:
{resume_text[:2000] if resume_text else 'No resume provided. Ask general role-related questions.'}
"""

        session = MockSession.objects.create(
            job_role=job_role,
            experience_level=experience,
            total_questions=questions_count,
            time_per_question=time_limit,
            voice_id='MmiGAbOYCaIFzgNItUWa',
            resume_text=enriched_context
        )

        first_question = f"Welcome! I am your AI interviewer for the {job_role} position. To begin, could you please introduce yourself and walk me through your background as it relates to this role?"
        
        MockQuestion.objects.create(
            session=session,
            question_text=first_question,
            order=1
        )
        
        return Response({
            'sessionId': str(session.id),
            'firstQuestion': first_question,
            'message': 'Real Interview Session Started'
        })

class SubmitAnswerView(APIView):

    def post(self, request, session_id):
        try:
            session = MockSession.objects.get(id=session_id)
            question_id = request.data.get('questionId')
            answer_text = request.data.get('answerText')

            question = MockQuestion.objects.get(id=question_id, session=session)
            
            client = Groq(api_key=settings.GROQ_API_KEY)
            
            # Identify if we are in the Wrap-Up/Feedback phase where scores shouldn't technically count
            # Use the question's own order to determine if it's a technical or wrap-up question.
            # Wrap-up only applies when the question being answered was created AFTER the total_questions limit.
            current_count = session.questions.count()
            is_wrapup_phase = question.order > session.total_questions

            if not answer_text.strip() or answer_text.strip().lower() == "no response provided.":
                eval_res = {
                    "score": 0,
                    "level": "weak",
                    "feedback": "The candidate failed to provide an answer or their microphone did not transmit any speech within the time limit."
                }
            elif is_wrapup_phase:
                # Do not deduct points or assign metrics for generic conversation during wrap-up
                eval_res = {
                    "score": 0,
                    "level": "neutral",
                    "feedback": "Conversational feedback acknowledged."
                }
            else:
                # 1. Evaluate Answer (1-10 score, level, short feedback)
                eval_prompt = f"""Evaluate the candidate's answer based on relevance, technical accuracy, and concise clarity.
The candidate may only have 30 to 60 seconds to answer, so DO NOT penalize for briefness. If their short answer captures the core technical concepts correctly, give them a high score (8-10). Be generous if they hit the target keywords.

Question: {question.question_text}
Answer: {answer_text}

Return JSON: 
{{
  "score": 1-10,
  "level": "weak/medium/strong",
  "feedback": "short 1-2 sentence explanation"
}}
"""
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": eval_prompt}],
                    response_format={"type": "json_object"}
                )
                eval_res = json.loads(completion.choices[0].message.content)
            
            question.answer_text = answer_text
            question.feedback = eval_res.get('feedback', '')
            question.score = eval_res.get('score', 0)
            question.level = eval_res.get('level', 'medium')
            question.is_answered = True
            if is_wrapup_phase:
                question.score = 0  # ensure it doesn't affect averages randomly
            
            question.save()

            # Detect if user is asking questions back or if session is in "prolong" mode
            user_asking_questions = any(token in answer_text.lower() for token in ['?', 'what about', 'can you tell me', 'how does', 'why'])
            
            # Determine if we should generate the next adaptive technical question
            if not is_wrapup_phase:
                # Check if THIS was the last technical question (order == total_questions)
                if question.order >= session.total_questions:
                    # Transition to wrap-up
                    transition_prompt = f"""The technical portion of the mock interview for {session.job_role} is now complete.
Provide a natural, professional transition message acknowledging the end of technical questions.
Then ask for the candidate's feedback on the experience and if they have any questions for the 'interviewer' about the role or company.
Avoid a generic list format; keep it conversational and friendly.

Return JSON: {{"question": "Transition and initial wrap-up question here"}}
"""
                    trans_comp = client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[{"role": "user", "content": transition_prompt}],
                        response_format={"type": "json_object"}
                    )
                    wrapup_text = json.loads(trans_comp.choices[0].message.content).get('question', 'That concludes our technical discussion. How did you find the experience, and do you have any questions for me?')
                    
                    new_q = MockQuestion.objects.create(
                        session=session,
                        question_text=wrapup_text,
                        order=current_count + 1
                    )
                    return Response({'success': True, 'nextQuestion': {'id': new_q.id, 'text': new_q.question_text}, 'completed': False})

                # ADAPTIVE TECHNICAL QUESTION GENERATION (more questions remain)
                prev_q_a = session.questions.filter(is_answered=True).order_by('order')
                history = "\n".join([f"Q: {q.question_text}\nA: {q.answer_text}\nQuality: {q.level}" for q in prev_q_a])
                
                next_prompt = f"""You are conducting a professional mock interview for a {session.job_role} ({session.experience_level}).
Strict Rules:
1. Focus ONLY on role-relevant skills.
2. Do NOT ask questions from unrelated skills.
3. Use candidate resume + previous answers to generate next question.
4. Avoid repeating questions.
5. Questions must be logical follow-ups or deeper technical dives based on the last answer quality ({question.level}).
6. No hallucination: do NOT assume skills not provided in the resume.

Candidate Resume:
{session.resume_text[:1500]}

Previous Q&A:
{history}

Generate exactly ONE high-quality, professional, interview-level follow-up question.
Return JSON: {{"question": "Next question here"}}
"""
                next_comp = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": next_prompt}],
                    response_format={"type": "json_object"}
                )
                next_res = json.loads(next_comp.choices[0].message.content)
                next_question_text = next_res.get('question', 'Tell me more about your recent project.')
                
                new_q = MockQuestion.objects.create(
                    session=session,
                    question_text=next_question_text,
                    order=current_count + 1
                )
                return Response({'success': True, 'nextQuestion': {'id': new_q.id, 'text': new_q.question_text}, 'completed': False})

            # If we are here, we are ALREADY in the wrap-up/feedback phase and answering a wrap-up question
            if user_asking_questions:
                # PROLONG: Answer user questions and ask if they have more
                prolong_prompt = f"""The candidate has asked questions or provided feedback during the wrap-up of their interview for {session.job_role}.
Question/Feedback: {answer_text}

Respond professionally, answering their questions about the role or AI-driven platform.
Then ask a follow-up: "Do you have any more questions or feedback, or are we ready to conclude the session?"
Be conversational.

Return JSON: {{"question": "Your response and follow-up question here"}}
"""
                prolong_comp = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": prolong_prompt}],
                    response_format={"type": "json_object"}
                )
                prolong_text = json.loads(prolong_comp.choices[0].message.content).get('question', 'Glad to hear. Do you have any more questions before we wrap up?')
                
                new_q = MockQuestion.objects.create(
                    session=session,
                    question_text=prolong_text,
                    order=current_count + 1
                )
                return Response({'success': True, 'nextQuestion': {'id': new_q.id, 'text': new_q.question_text}, 'completed': False})

            # Conclusion (User doesn't have more questions)
            return Response({'success': True, 'completed': True, 'message': "Thank you for your valuable feedback! It's been a pleasure conducting this session with you. Your performance report is now ready. We wish you the absolute best in your career!"})

        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GenerateFinalMockFeedbackView(APIView):
    def get(self, request, session_id):
        try:
            warnings = int(request.GET.get('warnings', 0))
            session = MockSession.objects.get(id=session_id)
            qa_list = session.questions.filter(is_answered=True).order_by('order')
            history = "\n".join([f"Q: {q.question_text}\nA: {q.answer_text}\nScore: {q.score}/10" for q in qa_list])

            client = Groq(api_key=settings.GROQ_API_KEY)
            prompt = f"""Review this mock interview performance and provide areas of improvement for the candidate.
Job Role: {session.job_role}
Performance History:
{history}

{'IMPORTANT: The candidate switched tabs multiple times causing an abortion. Mention malpractice/security policy in summary.' if warnings >= 3 else ''}

Provide a JSON object with:
{{
  "overallSummary": "summary here",
  "strengths": ["list of strengths"],
  "improvements": ["specific areas to improve technical or soft skills"],
  "finalScore": 0-10
}}
"""
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            report = json.loads(completion.choices[0].message.content)
            
            # Apply penalty
            original_score = report.get('finalScore', 0)
            report['finalScore'] = max(0, original_score - warnings)
            
            return Response(report)
        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ElevenLabsTTSView(APIView):
    def post(self, request):
        text = request.data.get('text')
        voice_id = request.data.get('voiceId', 'MmiGAbOYCaIFzgNItUWa')
        api_key = getattr(settings, 'ELEVEN_LABS_API_KEY', None)
        
        if not api_key:
            return Response({'message': 'ElevenLabs API Key not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": api_key
        }
        data = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        }

        
        try:
            response = requests.post(url, json=data, headers=headers)
            if response.status_code == 200:
                return HttpResponse(response.content, content_type="audio/mpeg")
            else:
                return Response({'message': 'ElevenLabs API error', 'details': response.text}, status=response.status_code)
        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MockHistoryView(APIView):
    def get(self, request):
        try:
            sessions = MockSession.objects.all().order_by('-created_at')[:20]
            data = []
            for s in sessions:
                # calculate mock final score based on questions
                questions = s.questions.filter(is_answered=True)
                total_score = sum([q.score for q in questions])
                max_score = len(questions) * 10 if questions else 10
                overallScore = int((total_score / max_score) * 100) if max_score > 0 else 0

                data.append({
                    '_id': str(s.id),
                    'isMock': True,
                    'interview': {
                        'title': f"Mock: {s.job_role}",
                        'jobDescription': f"Adaptive Engine | Level: {s.experience_level}"
                    },
                    'overallScore': overallScore,
                    'status': 'completed' if questions.count() >= s.total_questions else 'partial',
                    'answers': [1] * questions.count(),
                    'createdAt': s.created_at.isoformat()
                })
            return Response({'sessions': data})
        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
