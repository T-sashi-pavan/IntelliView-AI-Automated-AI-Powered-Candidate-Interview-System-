from django.db import models
import uuid

class MockSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_role = models.CharField(max_length=255)
    experience_level = models.CharField(max_length=50)
    total_questions = models.IntegerField(default=5)
    resume_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class MockQuestion(models.Model):
    session = models.ForeignKey(MockSession, related_name='questions', on_delete=models.CASCADE)
    question_text = models.TextField()
    answer_text = models.TextField(blank=True, null=True)
    feedback = models.TextField(blank=True, null=True)
    score = models.IntegerField(default=0)
    order = models.IntegerField(default=1)
    is_answered = models.BooleanField(default=False)
