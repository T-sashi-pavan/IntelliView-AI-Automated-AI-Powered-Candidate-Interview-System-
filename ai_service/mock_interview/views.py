import PyPDF2
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import MockSession, MockQuestion
from groq import Groq
import json

class StartMockInterviewView(APIView):
    def post(self, request):
        job_role = request.data.get('jobRole')
        experience = request.data.get('experience', 'entry')
        questions_count = int(request.data.get('questions', 5))
        resume_file = request.FILES.get('resume')

        if not resume_file or not job_role:
            return Response({'message': 'Missing resume or job role'}, status=status.HTTP_400_BAD_REQUEST)

        # Parse Resume
        resume_text = ""
        try:
            reader = PyPDF2.PdfReader(resume_file)
            for page in reader.pages:
                resume_text += page.extract_text()
        except:
            resume_text = "Failed to parse pdf, plain text assumed."

        # Create Session
        session = MockSession.objects.create(
            job_role=job_role,
            experience_level=experience,
            total_questions=questions_count,
            resume_text=resume_text
        )

        try:
            # Generate first question using Groq
            client = Groq(api_key=settings.GROQ_API_KEY)
            prompt = f"""You are an expert technical interviewer. Based on the candidate's resume and job target, generate ONE difficult, engaging initial interview question. 
Job Role: {job_role} ({experience} level)
Resume: {resume_text[:2000]}

Return ONLY a JSON object containing the question.
Format: {{"question": "Your question here"}}
"""
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            response_json = json.loads(completion.choices[0].message.content)
            first_question = response_json.get('question', 'Tell me about yourself.')

            # Save the first question
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
            
        except Exception as e:
            return Response({'message': 'Failed to generate question', 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
                'questions': [
                    {
                        'id': q.id,
                        'text': q.question_text,
                        'answer': q.answer_text,
                        'feedback': q.feedback,
                        'score': q.score,
                        'order': q.order,
                        'isAnswered': q.is_answered
                    } for q in questions
                ]
            }
            return Response(data)
        except MockSession.DoesNotExist:
            return Response({'message': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

class SubmitAnswerView(APIView):
    def post(self, request, session_id):
        try:
            session = MockSession.objects.get(id=session_id)
            question_id = request.data.get('questionId')
            answer_text = request.data.get('answerText')

            question = MockQuestion.objects.get(id=question_id, session=session)
            
            # Use Groq to evaluate the answer
            client = Groq(api_key=settings.GROQ_API_KEY)
            eval_prompt = f"""Evaluate the candidate's answer for an interview.
Question: {question.question_text}
Answer: {answer_text}
Respond in JSON format: {{"feedback": "constructive feedback here", "score": 85}}
Score should be 0-100 based on accuracy, depth, and relevance.
"""
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": eval_prompt}],
                response_format={"type": "json_object"}
            )
            eval_res = json.loads(completion.choices[0].message.content)
            
            question.answer_text = answer_text
            question.feedback = eval_res.get('feedback', 'No feedback provided.')
            question.score = eval_res.get('score', 0)
            question.is_answered = True
            question.save()

            # Check if we should generate the next question
            current_count = session.questions.count()
            if current_count < session.total_questions:
                # Generate Adaptive Question
                prev_q_a = session.questions.filter(is_answered=True).order_by('order')
                history = "\n".join([f"Q: {q.question_text}\nA: {q.answer_text}" for q in prev_q_a])
                
                next_prompt = f"""You are conducting a technical interview for a {session.job_role} ({session.experience_level}).
Candidate Resume:
{session.resume_text[:1500]}

Previous Q&A:
{history}

Based on the resume and the candidate's previous answers, generate ONE highly relevant, adaptive question. If they missed something, probe deeper. If they did well, ask a harder or different topic question.
Return JSON: {{"question": "Next question here"}}
"""
                next_comp = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": next_prompt}],
                    response_format={"type": "json_object"}
                )
                next_res = json.loads(next_comp.choices[0].message.content)
                next_question_text = next_res.get('question', 'Tell me more.')
                
                new_q = MockQuestion.objects.create(
                    session=session,
                    question_text=next_question_text,
                    order=current_count + 1
                )
                
                return Response({'success': True, 'nextQuestion': {'id': new_q.id, 'text': new_q.question_text}, 'completed': False})
            
            return Response({'success': True, 'completed': True})

        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

