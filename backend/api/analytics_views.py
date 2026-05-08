"""
Analytics API views for EduReach
"""
from datetime import timedelta, date

from django.db.models import Count, Avg, Sum, Q
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from rest_framework.permissions import AllowAny

from courses.models import Course, Lesson, UserProgress, ContentPurchase, CreatorTip
from assessments.models import Assessment, UserAttempt
from users.models import User, XPTransaction, SiteVisit


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _iso_week(dt):
    """Return ISO week string like '2026-W03' for a datetime/date value."""
    return dt.strftime('%Y-W%V')


def _weeks_ago(n):
    """Return the datetime n weeks before the start of the current week (Monday)."""
    today = timezone.now().date()
    monday = today - timedelta(days=today.weekday())
    return monday - timedelta(weeks=n)


def _build_week_buckets(n=12):
    """Return an ordered list of ISO week strings for the last n weeks (oldest first)."""
    buckets = []
    for i in range(n - 1, -1, -1):
        week_start = _weeks_ago(i)
        buckets.append(week_start.strftime('%Y-W%V'))
    return buckets


def _calculate_streak(user):
    """
    Count consecutive days of activity ending today.
    Activity = any UserAttempt.submitted_at or UserProgress.last_accessed for the user.
    """
    today = timezone.now().date()

    # Collect all active dates
    attempt_dates = set(
        UserAttempt.objects.filter(user=user, submitted_at__isnull=False)
        .values_list('submitted_at__date', flat=True)
    )
    progress_dates = set(
        UserProgress.objects.filter(user=user)
        .values_list('last_accessed__date', flat=True)
    )
    active_dates = attempt_dates | progress_dates

    streak = 0
    check_date = today
    while check_date in active_dates:
        streak += 1
        check_date -= timedelta(days=1)
    return streak


# ---------------------------------------------------------------------------
# Visitor tracking  (no auth required — works for guests and anon users)
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def track_visit(request):
    """
    POST /api/analytics/track/
    Lightweight session ping. Called by the frontend on load and navigation.
    Body: { session_id, is_guest, page, referrer? }
    Creates a new SiteVisit row or updates last_seen + page on an existing one.
    """
    session_id = (request.data.get('session_id') or '').strip()[:64]
    if not session_id:
        return Response({'ok': False}, status=400)

    is_guest = bool(request.data.get('is_guest', False))
    page = (request.data.get('page') or '')[:100]
    referrer = (request.data.get('referrer') or '')[:500]
    user = request.user if request.user.is_authenticated else None

    visit, created = SiteVisit.objects.get_or_create(
        session_id=session_id,
        defaults={
            'user': user,
            'is_guest': is_guest,
            'page': page,
            'referrer': referrer,
        }
    )

    if not created:
        # Update mutable fields; detect conversion (was guest, now registered)
        update_fields = ['page', 'last_seen']
        visit.page = page
        if user and not visit.user_id:
            visit.user = user
            update_fields.append('user')
        if is_guest != visit.is_guest and not is_guest and visit.is_guest:
            # Session transitioned from guest → registered
            visit.converted = True
            update_fields.append('converted')
        if user and not is_guest and visit.is_guest:
            visit.is_guest = False
            update_fields.append('is_guest')
        visit.save(update_fields=update_fields)

    return Response({'ok': True, 'created': created})


# ---------------------------------------------------------------------------
# Learner analytics
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def learner_analytics(request):
    """
    GET /api/analytics/learner/
    Returns the full learning analytics dashboard for the authenticated user.
    """
    user = request.user
    now = timezone.now()

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    courses_enrolled = UserProgress.objects.filter(user=user).count()

    completed_lessons_count = 0
    for up in UserProgress.objects.filter(user=user).prefetch_related('completed_lessons'):
        completed_lessons_count += up.completed_lessons.count()

    assessments_taken = UserAttempt.objects.filter(
        user=user,
        status__in=[UserAttempt.Status.SUBMITTED, UserAttempt.Status.GRADED]
    ).count()

    avg_score_agg = UserAttempt.objects.filter(
        user=user,
        status=UserAttempt.Status.GRADED
    ).aggregate(avg=Avg('percentage'))
    average_score = round(avg_score_agg['avg'] or 0.0, 2)

    streak_days = _calculate_streak(user)

    summary = {
        'total_courses_enrolled': courses_enrolled,
        'total_lessons_completed': completed_lessons_count,
        'total_assessments_taken': assessments_taken,
        'average_score': average_score,
        'total_xp': user.xp_points,
        'current_level': user.level,
        'streak_days': streak_days,
    }

    # ------------------------------------------------------------------
    # Score history – last 12 weeks
    # ------------------------------------------------------------------
    twelve_weeks_ago = now - timedelta(weeks=12)

    graded_with_pct = UserAttempt.objects.filter(
        user=user, status=UserAttempt.Status.GRADED, submitted_at__gte=twelve_weeks_ago
    ).values('submitted_at', 'percentage').order_by('submitted_at')

    week_scores_data: dict[str, list] = {}
    for a in graded_with_pct:
        wk = _iso_week(a['submitted_at'])
        week_scores_data.setdefault(wk, []).append(a['percentage'])

    score_history = []
    for wk_label in _build_week_buckets(12):
        scores = week_scores_data.get(wk_label, [])
        score_history.append({
            'week': wk_label,
            'average_score': round(sum(scores) / len(scores), 2) if scores else 0.0,
            'count': len(scores),
        })

    # ------------------------------------------------------------------
    # XP history – last 12 weeks
    # ------------------------------------------------------------------
    xp_transactions = XPTransaction.objects.filter(
        user=user, created_at__gte=twelve_weeks_ago
    ).values('created_at', 'amount').order_by('created_at')

    week_xp_data: dict[str, int] = {}
    for tx in xp_transactions:
        wk = _iso_week(tx['created_at'])
        week_xp_data[wk] = week_xp_data.get(wk, 0) + tx['amount']

    xp_history = [
        {'week': wk, 'xp': week_xp_data.get(wk, 0)}
        for wk in _build_week_buckets(12)
    ]

    # ------------------------------------------------------------------
    # Course progress
    # ------------------------------------------------------------------
    course_progress = []
    for up in UserProgress.objects.filter(user=user).select_related('course'):
        total_lessons = up.course.lessons.count()
        completed = up.completed_lessons.count()
        course_progress.append({
            'course_id': up.course.id,
            'course_title': up.course.title,
            'progress_percentage': up.progress_percentage,
            'completed_lessons': completed,
            'total_lessons': total_lessons,
            'last_accessed': up.last_accessed.isoformat() if up.last_accessed else None,
        })

    # ------------------------------------------------------------------
    # Assessment performance by topic
    # ------------------------------------------------------------------
    topic_data: dict[str, dict] = {}
    for attempt in UserAttempt.objects.filter(
        user=user,
        status=UserAttempt.Status.GRADED
    ).select_related('assessment'):
        topic = attempt.assessment.topic or 'Uncategorised'
        if topic not in topic_data:
            topic_data[topic] = {'count': 0, 'total_pct': 0.0}
        topic_data[topic]['count'] += 1
        topic_data[topic]['total_pct'] += attempt.percentage

    assessment_by_topic = [
        {
            'topic': topic,
            'count': vals['count'],
            'average_score': round(vals['total_pct'] / vals['count'], 2) if vals['count'] else 0.0,
        }
        for topic, vals in topic_data.items()
    ]

    # ------------------------------------------------------------------
    # Recent activity – last 10 attempts
    # ------------------------------------------------------------------
    recent_attempts = UserAttempt.objects.filter(
        user=user,
        status__in=[UserAttempt.Status.SUBMITTED, UserAttempt.Status.GRADED]
    ).select_related('assessment').order_by('-submitted_at')[:10]

    recent_activity = [
        {
            'id': a.id,
            'assessment_title': a.assessment.title,
            'score_percentage': round(a.percentage, 2),
            'submitted_at': a.submitted_at.isoformat() if a.submitted_at else None,
            'xp_earned': a.xp_earned,
        }
        for a in recent_attempts
    ]

    # ------------------------------------------------------------------
    # Learning calendar – last 90 days
    # ------------------------------------------------------------------
    ninety_days_ago = now - timedelta(days=90)

    attempt_activity_dates = set(
        UserAttempt.objects.filter(
            user=user,
            submitted_at__gte=ninety_days_ago,
            submitted_at__isnull=False,
        ).values_list('submitted_at__date', flat=True)
    )

    progress_activity_dates = set(
        UserProgress.objects.filter(
            user=user,
            last_accessed__gte=ninety_days_ago,
        ).values_list('last_accessed__date', flat=True)
    )

    # Count per day (attempts + progress touches)
    day_counts: dict[date, int] = {}
    for a in UserAttempt.objects.filter(
        user=user,
        submitted_at__gte=ninety_days_ago,
        submitted_at__isnull=False,
    ).values('submitted_at__date').annotate(cnt=Count('id')):
        d = a['submitted_at__date']
        day_counts[d] = day_counts.get(d, 0) + a['cnt']

    for p in UserProgress.objects.filter(
        user=user,
        last_accessed__gte=ninety_days_ago,
    ).values('last_accessed__date').annotate(cnt=Count('id')):
        d = p['last_accessed__date']
        day_counts[d] = day_counts.get(d, 0) + p['cnt']

    all_active_dates = attempt_activity_dates | progress_activity_dates

    learning_calendar = []
    for i in range(89, -1, -1):
        check_date = (now - timedelta(days=i)).date()
        learning_calendar.append({
            'date': check_date.strftime('%Y-%m-%d'),
            'has_activity': check_date in all_active_dates,
            'count': day_counts.get(check_date, 0),
        })

    # ------------------------------------------------------------------
    # XP by category
    # ------------------------------------------------------------------
    xp_by_cat = (
        XPTransaction.objects
        .filter(user=user)
        .values('category')
        .annotate(total_xp=Sum('amount'))
        .order_by('-total_xp')
    )
    xp_by_category = [
        {'category': row['category'], 'total_xp': row['total_xp'] or 0}
        for row in xp_by_cat
    ]

    return Response({
        'summary': summary,
        'score_history': score_history,
        'xp_history': xp_history,
        'course_progress': course_progress,
        'assessment_by_topic': assessment_by_topic,
        'recent_activity': recent_activity,
        'learning_calendar': learning_calendar,
        'xp_by_category': xp_by_category,
    })


# ---------------------------------------------------------------------------
# Instructor analytics
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def instructor_analytics(request):
    """
    GET /api/analytics/instructor/
    Returns analytics for courses owned by the authenticated user.
    """
    user = request.user
    now = timezone.now()
    owned_courses = Course.objects.filter(owner=user)

    # ------------------------------------------------------------------
    # Course stats
    # ------------------------------------------------------------------
    course_stats = []
    for course in owned_courses.prefetch_related('lessons', 'user_progress', 'purchases'):
        enrolled_count = course.user_progress.count()
        lesson_count = course.lessons.count()

        progress_records = course.user_progress.all()
        if progress_records.exists():
            avg_prog_agg = progress_records.aggregate(avg=Avg('progress_percentage'))
            avg_progress = round(avg_prog_agg['avg'] or 0.0, 2)
            completed_count = progress_records.filter(progress_percentage=100).count()
            completion_rate = round((completed_count / enrolled_count * 100), 2) if enrolled_count else 0.0
        else:
            avg_progress = 0.0
            completion_rate = 0.0

        total_revenue_agg = course.purchases.aggregate(rev=Sum('amount'))
        total_revenue = float(total_revenue_agg['rev'] or 0)

        course_stats.append({
            'course_id': course.id,
            'title': course.title,
            'enrolled_count': enrolled_count,
            'completion_rate': completion_rate,
            'avg_progress': avg_progress,
            'total_revenue': total_revenue,
            'lesson_count': lesson_count,
        })

    # ------------------------------------------------------------------
    # Assessment stats
    # ------------------------------------------------------------------
    owned_assessments = Assessment.objects.filter(creator=user)
    assessment_stats = []

    for assessment in owned_assessments.prefetch_related('attempts', 'questions'):
        attempts = assessment.attempts.filter(
            status__in=[UserAttempt.Status.SUBMITTED, UserAttempt.Status.GRADED]
        )
        attempt_count = attempts.count()
        graded_attempts = assessment.attempts.filter(status=UserAttempt.Status.GRADED)
        graded_count = graded_attempts.count()

        avg_score_agg = graded_attempts.aggregate(avg=Avg('percentage'))
        avg_score = round(avg_score_agg['avg'] or 0.0, 2)

        # AI vs manual grading heuristic: essay/short_answer questions imply AI grading
        question_types = list(
            assessment.questions.values_list('question_type', flat=True)
        )
        has_ai_questions = any(qt in ('essay', 'short_answer') for qt in question_types)
        ai_graded_count = graded_count if has_ai_questions else 0
        manual_graded_count = graded_count - ai_graded_count

        # Score distribution in 10-point buckets
        ranges = [
            ('0-10', 0, 10), ('10-20', 10, 20), ('20-30', 20, 30),
            ('30-40', 30, 40), ('40-50', 40, 50), ('50-60', 50, 60),
            ('60-70', 60, 70), ('70-80', 70, 80), ('80-90', 80, 90),
            ('90-100', 90, 101),
        ]
        score_distribution = []
        for label, low, high in ranges:
            cnt = graded_attempts.filter(percentage__gte=low, percentage__lt=high).count()
            score_distribution.append({'range': label, 'count': cnt})

        assessment_stats.append({
            'id': assessment.id,
            'title': assessment.title,
            'attempt_count': attempt_count,
            'avg_score': avg_score,
            'graded_count': graded_count,
            'ai_graded_count': ai_graded_count,
            'manual_graded_count': manual_graded_count,
            'score_distribution': score_distribution,
        })

    # ------------------------------------------------------------------
    # Revenue summary
    # ------------------------------------------------------------------
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (month_start - timedelta(days=1)).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )

    all_purchases = ContentPurchase.objects.filter(course__in=owned_courses)
    total_revenue_agg = all_purchases.aggregate(total=Sum('amount'))
    total_revenue = float(total_revenue_agg['total'] or 0)

    total_tips_agg = CreatorTip.objects.filter(to_creator=user).aggregate(total=Sum('amount'))
    total_tips = float(total_tips_agg['total'] or 0)

    revenue_this_month_agg = all_purchases.filter(
        created_at__gte=month_start
    ).aggregate(total=Sum('amount'))
    revenue_this_month = float(revenue_this_month_agg['total'] or 0)

    revenue_last_month_agg = all_purchases.filter(
        created_at__gte=last_month_start, created_at__lt=month_start
    ).aggregate(total=Sum('amount'))
    revenue_last_month = float(revenue_last_month_agg['total'] or 0)

    by_course_revenue = []
    for course in owned_courses:
        rev_agg = ContentPurchase.objects.filter(course=course).aggregate(total=Sum('amount'))
        by_course_revenue.append({
            'course_title': course.title,
            'revenue': float(rev_agg['total'] or 0),
        })

    revenue_summary = {
        'total_revenue': total_revenue,
        'total_tips': total_tips,
        'revenue_this_month': revenue_this_month,
        'revenue_last_month': revenue_last_month,
        'by_course': by_course_revenue,
    }

    # ------------------------------------------------------------------
    # Top learners across all instructor courses
    # ------------------------------------------------------------------
    enrolled_user_ids = (
        UserProgress.objects.filter(course__in=owned_courses)
        .values_list('user_id', flat=True)
        .distinct()
    )

    top_learners_raw = (
        User.objects.filter(id__in=enrolled_user_ids)
        .annotate(
            courses_enrolled=Count(
                'course_progress',
                filter=Q(course_progress__course__in=owned_courses),
                distinct=True,
            )
        )
        .order_by('-xp_points')[:10]
    )

    top_learners = []
    for learner in top_learners_raw:
        # Average score across graded attempts on instructor's assessments
        avg_score_agg = UserAttempt.objects.filter(
            user=learner,
            assessment__creator=user,
            status=UserAttempt.Status.GRADED,
        ).aggregate(avg=Avg('percentage'))
        top_learners.append({
            'username': learner.username,
            'total_xp': learner.xp_points,
            'courses_enrolled': learner.courses_enrolled,
            'avg_score': round(avg_score_agg['avg'] or 0.0, 2),
        })

    # ------------------------------------------------------------------
    # Summary totals
    # ------------------------------------------------------------------
    total_students = (
        UserProgress.objects.filter(course__in=owned_courses)
        .values('user').distinct().count()
    )
    avg_completion_rate = 0.0
    if course_stats:
        rates = [c['completion_rate'] for c in course_stats]
        avg_completion_rate = round(sum(rates) / len(rates), 2)

    summary = {
        'total_courses': owned_courses.count(),
        'total_students': total_students,
        'total_assessments': owned_assessments.count(),
        'avg_completion_rate': avg_completion_rate,
    }

    return Response({
        'course_stats': course_stats,
        'assessment_stats': assessment_stats,
        'revenue_summary': revenue_summary,
        'top_learners': top_learners,
        'summary': summary,
    })


# ---------------------------------------------------------------------------
# Admin analytics
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_analytics(request):
    """
    GET /api/analytics/admin/
    Platform-wide analytics. Admin-only.
    """
    user = request.user
    if not (user.is_staff or user.is_superuser or getattr(user, 'tier', None) == 'admin'):
        return Response(
            {'detail': 'Admin access required.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (month_start - timedelta(days=1)).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    thirty_days_ago = now - timedelta(days=30)
    twelve_weeks_ago = now - timedelta(weeks=12)

    # ------------------------------------------------------------------
    # User stats
    # ------------------------------------------------------------------
    total_users = User.objects.count()

    tier_counts = (
        User.objects.values('tier')
        .annotate(count=Count('id'))
        .order_by('tier')
    )
    by_tier = {row['tier']: row['count'] for row in tier_counts}

    new_this_month = User.objects.filter(date_joined__gte=month_start).count()

    # Active = had any attempt or progress touch in last 30 days
    active_attempt_users = set(
        UserAttempt.objects.filter(submitted_at__gte=thirty_days_ago)
        .values_list('user_id', flat=True)
    )
    active_progress_users = set(
        UserProgress.objects.filter(last_accessed__gte=thirty_days_ago)
        .values_list('user_id', flat=True)
    )
    active_last_30_days = len(active_attempt_users | active_progress_users)

    user_stats = {
        'total': total_users,
        'by_tier': by_tier,
        'new_this_month': new_this_month,
        'active_last_30_days': active_last_30_days,
    }

    # ------------------------------------------------------------------
    # Content stats
    # ------------------------------------------------------------------
    content_stats = {
        'total_courses': Course.objects.count(),
        'total_lessons': Lesson.objects.count(),
        'total_assessments': Assessment.objects.count(),
        'total_attempts': UserAttempt.objects.filter(
            status__in=[UserAttempt.Status.SUBMITTED, UserAttempt.Status.GRADED]
        ).count(),
    }

    # ------------------------------------------------------------------
    # Revenue stats
    # ------------------------------------------------------------------
    total_revenue_agg = ContentPurchase.objects.aggregate(total=Sum('amount'))
    total_revenue = float(total_revenue_agg['total'] or 0)

    rev_this_month_agg = ContentPurchase.objects.filter(
        created_at__gte=month_start
    ).aggregate(total=Sum('amount'))
    revenue_this_month = float(rev_this_month_agg['total'] or 0)

    rev_last_month_agg = ContentPurchase.objects.filter(
        created_at__gte=last_month_start, created_at__lt=month_start
    ).aggregate(total=Sum('amount'))
    revenue_last_month = float(rev_last_month_agg['total'] or 0)

    revenue_stats = {
        'total_all_time': total_revenue,
        'this_month': revenue_this_month,
        'last_month': revenue_last_month,
    }

    # ------------------------------------------------------------------
    # Activity trend – last 12 weeks
    # ------------------------------------------------------------------
    # New users per week
    new_users_qs = User.objects.filter(date_joined__gte=twelve_weeks_ago).values('date_joined')
    week_new_users: dict[str, int] = {}
    for row in new_users_qs:
        wk = _iso_week(row['date_joined'])
        week_new_users[wk] = week_new_users.get(wk, 0) + 1

    # Attempts per week
    attempts_qs = UserAttempt.objects.filter(
        submitted_at__gte=twelve_weeks_ago,
        submitted_at__isnull=False,
        status__in=[UserAttempt.Status.SUBMITTED, UserAttempt.Status.GRADED],
    ).values('submitted_at')
    week_attempts: dict[str, int] = {}
    for row in attempts_qs:
        wk = _iso_week(row['submitted_at'])
        week_attempts[wk] = week_attempts.get(wk, 0) + 1

    # Lessons completed per week – approximate via UserProgress.last_accessed
    # (A more precise approach would require a LessonCompletion through-table timestamp)
    lessons_qs = UserProgress.objects.filter(
        last_accessed__gte=twelve_weeks_ago
    ).values('last_accessed')
    week_lessons: dict[str, int] = {}
    for row in lessons_qs:
        wk = _iso_week(row['last_accessed'])
        week_lessons[wk] = week_lessons.get(wk, 0) + 1

    activity_trend = [
        {
            'week': wk,
            'new_users': week_new_users.get(wk, 0),
            'attempts': week_attempts.get(wk, 0),
            'lessons_completed': week_lessons.get(wk, 0),
        }
        for wk in _build_week_buckets(12)
    ]

    # ------------------------------------------------------------------
    # Tier distribution
    # ------------------------------------------------------------------
    tier_distribution = [
        {
            'tier': row['tier'],
            'count': row['count'],
            'percentage': round((row['count'] / total_users * 100), 2) if total_users else 0.0,
        }
        for row in tier_counts
    ]

    # ------------------------------------------------------------------
    # Visitor / traffic stats (SiteVisit)
    # ------------------------------------------------------------------
    seven_days_ago = now - timedelta(days=7)

    total_sessions_30d = SiteVisit.objects.filter(first_seen__gte=thirty_days_ago).count()
    total_sessions_7d  = SiteVisit.objects.filter(first_seen__gte=seven_days_ago).count()

    guest_sessions_30d = SiteVisit.objects.filter(first_seen__gte=thirty_days_ago, is_guest=True).count()
    anon_sessions_30d  = SiteVisit.objects.filter(
        first_seen__gte=thirty_days_ago, is_guest=False, user__isnull=True
    ).count()
    registered_sessions_30d = SiteVisit.objects.filter(
        first_seen__gte=thirty_days_ago, user__isnull=False
    ).count()

    conversions_30d = SiteVisit.objects.filter(
        first_seen__gte=thirty_days_ago, converted=True
    ).count()
    conversion_rate = round(conversions_30d / guest_sessions_30d * 100, 1) if guest_sessions_30d else 0.0

    # Top pages last 30 days
    top_pages = list(
        SiteVisit.objects
        .filter(first_seen__gte=thirty_days_ago)
        .exclude(page='')
        .values('page')
        .annotate(visits=Count('id'))
        .order_by('-visits')[:8]
    )

    # Daily visitor trend last 14 days
    daily_visits: dict[str, dict] = {}
    for i in range(13, -1, -1):
        d = (now - timedelta(days=i)).strftime('%Y-%m-%d')
        daily_visits[d] = {'date': d, 'total': 0, 'guests': 0, 'registered': 0, 'anon': 0}

    for sv in SiteVisit.objects.filter(first_seen__gte=now - timedelta(days=14)).values(
        'first_seen', 'is_guest', 'user_id'
    ):
        d = sv['first_seen'].strftime('%Y-%m-%d')
        if d in daily_visits:
            daily_visits[d]['total'] += 1
            if sv['user_id']:
                daily_visits[d]['registered'] += 1
            elif sv['is_guest']:
                daily_visits[d]['guests'] += 1
            else:
                daily_visits[d]['anon'] += 1

    visitor_stats = {
        'total_sessions_30d': total_sessions_30d,
        'total_sessions_7d': total_sessions_7d,
        'guest_sessions_30d': guest_sessions_30d,
        'anon_sessions_30d': anon_sessions_30d,
        'registered_sessions_30d': registered_sessions_30d,
        'conversions_30d': conversions_30d,
        'conversion_rate': conversion_rate,
        'top_pages': top_pages,
        'daily_trend': list(daily_visits.values()),
    }

    return Response({
        'user_stats': user_stats,
        'content_stats': content_stats,
        'revenue_stats': revenue_stats,
        'activity_trend': activity_trend,
        'tier_distribution': tier_distribution,
        'visitor_stats': visitor_stats,
    })
