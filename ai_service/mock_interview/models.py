from django.db import models
import uuid

class MockSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_role = models.CharField(max_length=255)
    experience_level = models.CharField(max_length=50)
    total_questions = models.IntegerField(default=5)
    time_per_question = models.IntegerField(default=180) # stores in seconds
    voice_id = models.CharField(max_length=100, default='MmiGAbOYCaIFzgNItUWa')
    resume_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class MockQuestion(models.Model):
    session = models.ForeignKey(MockSession, related_name='questions', on_delete=models.CASCADE)
    question_text = models.TextField()
    answer_text = models.TextField(blank=True, null=True)
    feedback = models.TextField(blank=True, null=True)
    score = models.IntegerField(default=0)
    level = models.CharField(max_length=20, blank=True, null=True) # weak/medium/strong
    order = models.IntegerField(default=1)
    is_answered = models.BooleanField(default=False)
