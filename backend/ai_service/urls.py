from django.urls import path
from django.conf import settings
from .views import generate_study_plan, explain_concept, summarize_chunks, chat, generate_quiz, parse_questions

urlpatterns = [
    # Production AI endpoints (use unified call_ai with OpenRouter preferred by settings)
    path('ai/generate-quiz/', generate_quiz, name='generate_quiz'),
    path('ai/chat/', chat, name='chat'),
    path('ai/study-plan/', generate_study_plan, name='generate_study_plan'),
    path('ai/explain/', explain_concept, name='explain_concept'),
    path('ai/summarize-chunks/', summarize_chunks, name='summarize_chunks'),
    path('ai/parse-questions/', parse_questions, name='parse_questions'),
]

# Debug endpoints (direct Gemini calls, for local troubleshooting only).
# These rely on google.generativeai, which is not compatible with some production runtimes.
if getattr(settings, 'DEBUG', False):
    try:
        from . import debug_views

        urlpatterns += [
            path('ai/debug/generate-quiz/', debug_views.generate_quiz, name='debug_generate_quiz'),
            path('ai/debug/chat/', debug_views.chat, name='debug_chat'),
        ]
    except Exception:
        # If debug_views or google.generativeai cannot be imported, just skip debug routes.
        pass
