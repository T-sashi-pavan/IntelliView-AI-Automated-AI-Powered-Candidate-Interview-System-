from django.urls import path
from .views import StartMockInterviewView, SubmitAnswerView, GetSessionView

urlpatterns = [
    path('start/', StartMockInterviewView.as_view(), name='start_mock_interview'),
    path('session/<uuid:session_id>/', GetSessionView.as_view(), name='get_session'),
    path('session/<uuid:session_id>/submit/', SubmitAnswerView.as_view(), name='submit_answer'),
]

