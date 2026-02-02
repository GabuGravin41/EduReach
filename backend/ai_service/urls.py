from django.urls import path
from .views import generate_study_plan, explain_concept, summarize_chunks, chat, generate_quiz
from . import debug_views

urlpatterns = [
    # Production AI endpoints (use unified call_ai with Gemini primary, OpenRouter fallback)
    path('ai/generate-quiz/', generate_quiz, name='generate_quiz'),
    path('ai/chat/', chat, name='chat'),
    path('ai/study-plan/', generate_study_plan, name='generate_study_plan'),
    path('ai/explain/', explain_concept, name='explain_concept'),
    path('ai/summarize-chunks/', summarize_chunks, name='summarize_chunks'),

    # Debug endpoints (direct Gemini calls, for troubleshooting only)
    path('ai/debug/generate-quiz/', debug_views.generate_quiz, name='debug_generate_quiz'),
    path('ai/debug/chat/', debug_views.chat, name='debug_chat'),
]
