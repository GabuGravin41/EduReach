"""
PIN-gated exam session views.
Teachers create sessions; students join anonymously with a display name.
"""
import random
import string
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import Assessment, Question, ExamSession, GuestAttempt


def _generate_pin(length=6):
    while True:
        pin = ''.join(random.choices(string.digits, k=length))
        if not ExamSession.objects.filter(pin=pin).exists():
            return pin


def _fmt_question(q: Question) -> dict:
    """Return question data safe for public consumption (no correct_answer)."""
    return {
        'id': q.id,
        'question_text': q.question_text,
        'question_type': q.question_type,
        'options': q.options or [],
        'marks': q.marks,
        'order': q.order,
    }


# ── Teacher endpoints (auth required) ────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_exam_session(request):
    """
    POST /api/assessments/exam-sessions/create/
    Body: { assessment_id, title?, expires_in_minutes? }
    """
    assessment_id = request.data.get('assessment_id')
    if not assessment_id:
        return Response({'error': 'assessment_id required'}, status=400)

    try:
        assessment = Assessment.objects.get(pk=assessment_id)
    except Assessment.DoesNotExist:
        return Response({'error': 'Assessment not found'}, status=404)

    # Only the owner or admin may create a session
    if assessment.created_by != request.user and not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=403)

    expires_at = None
    expires_in = request.data.get('expires_in_minutes')
    if expires_in:
        try:
            expires_at = timezone.now() + timezone.timedelta(minutes=int(expires_in))
        except (ValueError, TypeError):
            pass

    session = ExamSession.objects.create(
        assessment=assessment,
        created_by=request.user,
        pin=_generate_pin(),
        title=request.data.get('title', '') or assessment.title,
        expires_at=expires_at,
    )

    return Response({
        'id': session.id,
        'pin': session.pin,
        'title': session.title,
        'is_active': session.is_active,
        'expires_at': session.expires_at.isoformat() if session.expires_at else None,
        'created_at': session.created_at.isoformat(),
        'assessment': {'id': assessment.id, 'title': assessment.title},
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_exam_sessions(request):
    """GET /api/assessments/exam-sessions/mine/ — list teacher's sessions."""
    sessions = (
        ExamSession.objects
        .filter(created_by=request.user)
        .order_by('-created_at')
        .select_related('assessment')
    )
    data = []
    for s in sessions:
        data.append({
            'id': s.id,
            'pin': s.pin,
            'title': s.title,
            'is_active': s.is_active,
            'expires_at': s.expires_at.isoformat() if s.expires_at else None,
            'created_at': s.created_at.isoformat(),
            'assessment': {'id': s.assessment_id, 'title': s.assessment.title},
            'attempt_count': s.guest_attempts.count(),
        })
    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def toggle_exam_session(request, session_id):
    """PATCH /api/assessments/exam-sessions/<id>/toggle/ — activate/deactivate."""
    try:
        session = ExamSession.objects.get(pk=session_id, created_by=request.user)
    except ExamSession.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
    session.is_active = not session.is_active
    session.save(update_fields=['is_active'])
    return Response({'is_active': session.is_active})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def exam_session_results(request, session_id):
    """GET /api/assessments/exam-sessions/<id>/results/ — all guest attempts."""
    try:
        session = ExamSession.objects.get(pk=session_id, created_by=request.user)
    except ExamSession.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    attempts = session.guest_attempts.order_by('-submitted_at', '-started_at')
    data = []
    for a in attempts:
        data.append({
            'id': a.id,
            'display_name': a.display_name,
            'score': a.score,
            'percentage': a.percentage,
            'status': a.status,
            'started_at': a.started_at.isoformat(),
            'submitted_at': a.submitted_at.isoformat() if a.submitted_at else None,
            'question_results': a.question_results,
        })
    return Response({
        'session': {
            'id': session.id,
            'pin': session.pin,
            'title': session.title,
            'is_active': session.is_active,
            'assessment': {'id': session.assessment_id, 'title': session.assessment.title},
        },
        'attempts': data,
    })


# ── Public (student) endpoints ────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def join_exam_session(request):
    """
    GET /api/assessments/exam-sessions/join/?pin=123456
    Returns the session info + questions (no answers exposed).
    """
    pin = request.GET.get('pin', '').strip()
    if not pin:
        return Response({'error': 'pin required'}, status=400)

    try:
        session = ExamSession.objects.select_related('assessment').get(pin=pin)
    except ExamSession.DoesNotExist:
        return Response({'error': 'Invalid PIN'}, status=404)

    if not session.is_active:
        return Response({'error': 'This session is no longer active'}, status=410)

    if session.expires_at and session.expires_at < timezone.now():
        return Response({'error': 'This session has expired'}, status=410)

    questions = list(
        session.assessment.questions.order_by('order', 'id')
    )

    return Response({
        'session_id': session.id,
        'title': session.title,
        'assessment_title': session.assessment.title,
        'time_limit_minutes': session.assessment.time_limit_minutes,
        'question_count': len(questions),
        'questions': [_fmt_question(q) for q in questions],
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_guest_attempt(request):
    """
    POST /api/assessments/exam-sessions/submit/
    Body: { session_id, display_name, answers: { question_id: answer } }
    """
    session_id = request.data.get('session_id')
    display_name = (request.data.get('display_name') or '').strip()
    answers = request.data.get('answers', {})

    if not session_id or not display_name:
        return Response({'error': 'session_id and display_name required'}, status=400)

    try:
        session = ExamSession.objects.select_related('assessment').get(pk=session_id)
    except ExamSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)

    if not session.is_active:
        return Response({'error': 'Session is no longer active'}, status=410)

    # Guard: don't allow a second submission from the same display name
    if GuestAttempt.objects.filter(session=session, display_name=display_name, status='submitted').exists():
        return Response({'error': 'You have already submitted for this session'}, status=409)

    # Grade answers
    questions = {str(q.id): q for q in session.assessment.questions.all()}
    correct = 0
    total = len(questions)
    question_results = {}

    for qid_str, user_answer in answers.items():
        q = questions.get(qid_str)
        if q is None:
            continue
        if q.question_type in ('mcq', 'true_false'):
            is_correct = str(user_answer).strip().lower() == str(q.correct_answer or '').strip().lower()
            if is_correct:
                correct += 1
            question_results[qid_str] = {
                'correct': is_correct,
                'user_answer': user_answer,
                'correct_answer': q.correct_answer,
            }
        else:
            # Essay / short-answer — mark as pending review
            question_results[qid_str] = {
                'correct': None,
                'user_answer': user_answer,
                'correct_answer': None,
                'pending_review': True,
            }

    percentage = round((correct / total) * 100, 1) if total > 0 else 0.0

    attempt, _ = GuestAttempt.objects.get_or_create(
        session=session,
        display_name=display_name,
        defaults={
            'answers': answers,
            'question_results': question_results,
            'score': f'{correct}/{total}',
            'percentage': percentage,
            'status': 'submitted',
            'submitted_at': timezone.now(),
        },
    )
    # If already existed (in_progress), update it
    if attempt.status != 'submitted':
        attempt.answers = answers
        attempt.question_results = question_results
        attempt.score = f'{correct}/{total}'
        attempt.percentage = percentage
        attempt.status = 'submitted'
        attempt.submitted_at = timezone.now()
        attempt.save()

    return Response({
        'score': attempt.score,
        'percentage': attempt.percentage,
        'correct': correct,
        'total': total,
        'question_results': question_results,
    })
