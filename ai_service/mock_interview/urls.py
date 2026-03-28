from django.urls import path
from .views import (
    StartMockInterviewView, SubmitAnswerView, GetSessionView, 
    SuggestRoleView, GenerateFinalMockFeedbackView, WhisperTranscriptionView,
    ElevenLabsTTSView, MockHistoryView, StartRealInterviewView
)

urlpatterns = [
    path('start/', StartMockInterviewView.as_view(), name='start_mock_interview'),
    path('suggest-role/', SuggestRoleView.as_view(), name='suggest_role'),
    path('session/<uuid:session_id>/', GetSessionView.as_view(), name='get_session'),
    path('session/<uuid:session_id>/submit/', SubmitAnswerView.as_view(), name='submit_answer'),
    path('session/<uuid:session_id>/feedback/', GenerateFinalMockFeedbackView.as_view(), name='final_feedback'),
    path('asr/whisper/', WhisperTranscriptionView.as_view(), name='whisper_transcribe'),
    path('tts/elevenlabs/', ElevenLabsTTSView.as_view(), name='elevenlabs_tts'),
    path('history/', MockHistoryView.as_view(), name='mock_history'),
    path('real/start/', StartRealInterviewView.as_view(), name='start_real_interview'),
]
