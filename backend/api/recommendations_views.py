"""
Interest-based recommendation engine.
Uses the user's interests, learning_goal, and learner_type to surface
relevant assessments and courses they haven't interacted with yet.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recommendations(request):
    """
    GET /api/recommendations/

    Returns personalised assessment and course recommendations based on:
      1. User's explicit interests (comma-separated text field)
      2. User's learning_goal
      3. Assessments the platform community engages with most (social proof fallback)

    Response:
      {
        "assessments": [...],
        "courses": [...],
        "based_on": ["math", "physics"],   # tags that drove recommendations
        "is_personalised": true
      }
    """
    user = request.user

    # Derive interest tags
    raw = getattr(user, 'interests', '') or ''
    goal = getattr(user, 'learning_goal', '') or ''
    interest_tags = [t.strip().lower() for t in raw.split(',') if t.strip()]
    if goal:
        interest_tags.append(goal.lower())
    interest_tags = list(dict.fromkeys(interest_tags))  # dedupe, preserve order

    from assessments.models import Assessment, UserAttempt
    from courses.models import Course

    # Assessments the user has already attempted — exclude these
    attempted_ids = set(
        UserAttempt.objects.filter(user=user).values_list('assessment_id', flat=True)
    )

    limit = int(request.GET.get('limit', 8))

    if interest_tags:
        # Build a Q filter: topic contains any interest tag OR tags JSONField overlaps
        topic_q = Q()
        tag_q = Q()
        for tag in interest_tags:
            topic_q |= Q(topic__icontains=tag)
            topic_q |= Q(title__icontains=tag)
            tag_q |= Q(tags__contains=[tag])

        personalised_qs = (
            Assessment.objects
            .filter(is_public=True)
            .filter(topic_q | tag_q)
            .exclude(id__in=attempted_ids)
            .annotate(attempt_count=Count('attempts'))
            .order_by('-attempt_count', '-created_at')[:limit]
        )
        assessments = list(personalised_qs)
        is_personalised = bool(assessments)
    else:
        assessments = []
        is_personalised = False

    # Pad with popular assessments if we don't have enough
    if len(assessments) < limit:
        pad_ids = [a.id for a in assessments]
        popular = (
            Assessment.objects
            .filter(is_public=True)
            .exclude(id__in=attempted_ids | set(pad_ids))
            .annotate(attempt_count=Count('attempts'))
            .order_by('-attempt_count', '-created_at')[: limit - len(assessments)]
        )
        assessments = assessments + list(popular)

    # Courses — public, user not enrolled
    enrolled_ids = set(
        Course.objects.filter(enrollments__user=user).values_list('id', flat=True)
    ) if hasattr(Course, 'enrollments') else set()

    course_qs_base = Course.objects.filter(is_public=True).exclude(id__in=enrolled_ids)
    if interest_tags:
        course_q = Q()
        for tag in interest_tags:
            course_q |= Q(title__icontains=tag) | Q(description__icontains=tag)
        courses = list(course_qs_base.filter(course_q).order_by('-created_at')[:limit])
        if len(courses) < limit:
            courses += list(
                course_qs_base.exclude(id__in=[c.id for c in courses]).order_by('-created_at')[: limit - len(courses)]
            )
    else:
        courses = list(course_qs_base.order_by('-created_at')[:limit])

    def fmt_assessment(a):
        return {
            'id': a.id,
            'title': a.title,
            'topic': a.topic,
            'description': a.description[:200] if a.description else '',
            'question_count': a.questions.count(),
            'time_limit_minutes': a.time_limit_minutes,
            'share_token': str(a.share_token),
            'tags': a.tags or [],
            'institution': a.institution.name if a.institution_id else None,
            'source_year': a.source_year,
            'attempt_count': getattr(a, 'attempt_count', 0),
            'assessment_type': a.assessment_type,
        }

    def fmt_course(c):
        return {
            'id': c.id,
            'title': c.title,
            'description': (c.description or '')[:200],
            'lesson_count': c.lessons.count() if hasattr(c, 'lessons') else 0,
            'created_at': c.created_at.isoformat() if c.created_at else None,
        }

    return Response({
        'assessments': [fmt_assessment(a) for a in assessments],
        'courses': [fmt_course(c) for c in courses],
        'based_on': interest_tags,
        'is_personalised': is_personalised,
    })
