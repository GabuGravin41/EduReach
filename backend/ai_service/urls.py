from django.urls import path
from .views import generate_quiz, chat, generate_study_plan, explain_concept

urlpatterns = [
    path('ai/generate-quiz/', generate_quiz, name='generate_quiz'),
    path('ai/chat/', chat, name='chat'),
    path('ai/study-plan/', generate_study_plan, name='generate_study_plan'),
    path('ai/explain/', explain_concept, name='explain_concept'),
]
