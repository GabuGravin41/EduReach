from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssessmentViewSet, QuestionViewSet, UserAttemptViewSet, recommend_assessments_view
from . import exam_session_views

router = DefaultRouter()
router.register(r'assessments', AssessmentViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'attempts', UserAttemptViewSet, basename='attempts')

urlpatterns = [
    path('', include(router.urls)),
    # PIN session — teacher
    path('exam-sessions/create/', exam_session_views.create_exam_session, name='create_exam_session'),
    path('exam-sessions/mine/', exam_session_views.my_exam_sessions, name='my_exam_sessions'),
    path('exam-sessions/<int:session_id>/toggle/', exam_session_views.toggle_exam_session, name='toggle_exam_session'),
    path('exam-sessions/<int:session_id>/results/', exam_session_views.exam_session_results, name='exam_session_results'),
    # PIN session — student (public)
    path('exam-sessions/join/', exam_session_views.join_exam_session, name='join_exam_session'),
    path('exam-sessions/submit/', exam_session_views.submit_guest_attempt, name='submit_guest_attempt'),
    # Personalised recommendations
    path('recommend/', recommend_assessments_view, name='recommend_assessments'),
]
