"""
Fills in the analytics page with complete, realistic data:
- Daily UserAttempt records for every day of each user's streak period
- Varied topic scores (Algebra, Biology, English, Economics, Programming)
- Completed lessons across multiple courses
- Dalton's full learning data
- Realistic score curves (improving over time for serious learners)
"""

import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction


# Maps usernames to intended streak days and approximate skill level (0.0–1.0)
USER_PROFILES = {
    "wanjiku_mwangi":   {"streak": 78, "skill": 0.82, "strong_topics": ["Algebra", "English"],     "weak_topics": ["Biology"]},
    "otieno_odhiambo":  {"streak": 45, "skill": 0.71, "strong_topics": ["Programming"],             "weak_topics": ["English"]},
    "aisha_farah":      {"streak": 62, "skill": 0.76, "strong_topics": ["English"],                 "weak_topics": ["Algebra"]},
    "kipchoge_rotich":  {"streak": 89, "skill": 0.91, "strong_topics": ["Algebra", "Biology"],      "weak_topics": []},
    "njeri_kamau":      {"streak": 28, "skill": 0.65, "strong_topics": ["Biology"],                 "weak_topics": ["Economics"]},
    "hassan_abdi":      {"streak": 55, "skill": 0.73, "strong_topics": ["Programming"],             "weak_topics": ["Economics"]},
    "zawadi_mutua":     {"streak": 19, "skill": 0.58, "strong_topics": ["Biology"],                 "weak_topics": ["Algebra"]},
    "baraka_omondi":    {"streak": 14, "skill": 0.51, "strong_topics": ["Algebra"],                 "weak_topics": ["English"]},
    "amina_waweru":     {"streak": 33, "skill": 0.67, "strong_topics": ["English"],                 "weak_topics": ["Programming"]},
    "silas_kiprotich":  {"streak": 41, "skill": 0.70, "strong_topics": ["Algebra", "Programming"],  "weak_topics": ["English"]},
    "faith_adhiambo":   {"streak": 70, "skill": 0.85, "strong_topics": ["Economics", "English"],    "weak_topics": ["Biology"]},
    "jabali_ndungu":    {"streak": 51, "skill": 0.79, "strong_topics": ["Programming"],             "weak_topics": ["Biology"]},
    "zipporah_chebet":  {"streak": 57, "skill": 0.80, "strong_topics": ["Algebra"],                 "weak_topics": ["Economics"]},
    "emmanuel_makokha": {"streak": 37, "skill": 0.68, "strong_topics": ["English"],                 "weak_topics": ["Programming"]},
    "lydia_nyambura":   {"streak": 10, "skill": 0.48, "strong_topics": ["English"],                 "weak_topics": ["Algebra"]},
    "dalton":           {"streak": 24, "skill": 0.62, "strong_topics": ["Economics"],               "weak_topics": ["Programming"]},
}

# Courses each user should be enrolled in (title substrings)
USER_COURSES = {
    "wanjiku_mwangi":   ["KCSE Mathematics", "English Language", "Business Studies"],
    "otieno_odhiambo":  ["Python Programming", "KCSE Mathematics", "English Language"],
    "aisha_farah":      ["English Language", "Business Studies"],
    "kipchoge_rotich":  ["KCSE Mathematics", "KCSE Biology", "Business Studies", "English Language"],
    "njeri_kamau":      ["KCSE Biology", "English Language", "KCSE Mathematics"],
    "hassan_abdi":      ["Python Programming", "KCSE Mathematics"],
    "zawadi_mutua":     ["KCSE Biology", "English Language"],
    "baraka_omondi":    ["KCSE Mathematics", "KCSE Biology"],
    "amina_waweru":     ["English Language", "Business Studies"],
    "silas_kiprotich":  ["KCSE Mathematics", "Python Programming", "English Language"],
    "faith_adhiambo":   ["Business Studies", "English Language", "KCSE Mathematics"],
    "jabali_ndungu":    ["Python Programming", "KCSE Mathematics", "English Language", "Business Studies"],
    "zipporah_chebet":  ["KCSE Mathematics", "KCSE Biology", "English Language"],
    "emmanuel_makokha": ["English Language", "KCSE Biology", "Python Programming"],
    "lydia_nyambura":   ["English Language", "Business Studies"],
    "dalton":           ["Business Studies", "English Language", "Python Programming"],
}

# Progress percentage per user per course keyword
USER_COURSE_PROGRESS = {
    "wanjiku_mwangi":   {"KCSE Mathematics": 95, "English Language": 70, "Business Studies": 45},
    "otieno_odhiambo":  {"Python Programming": 88, "KCSE Mathematics": 52, "English Language": 35},
    "aisha_farah":      {"English Language": 82, "Business Studies": 61},
    "kipchoge_rotich":  {"KCSE Mathematics": 100, "KCSE Biology": 90, "Business Studies": 75, "English Language": 85},
    "njeri_kamau":      {"KCSE Biology": 72, "English Language": 48, "KCSE Mathematics": 38},
    "hassan_abdi":      {"Python Programming": 91, "KCSE Mathematics": 44},
    "zawadi_mutua":     {"KCSE Biology": 55, "English Language": 30},
    "baraka_omondi":    {"KCSE Mathematics": 40, "KCSE Biology": 25},
    "amina_waweru":     {"English Language": 78, "Business Studies": 55},
    "silas_kiprotich":  {"KCSE Mathematics": 85, "Python Programming": 67, "English Language": 42},
    "faith_adhiambo":   {"Business Studies": 98, "English Language": 88, "KCSE Mathematics": 72},
    "jabali_ndungu":    {"Python Programming": 100, "KCSE Mathematics": 62, "English Language": 55, "Business Studies": 48},
    "zipporah_chebet":  {"KCSE Mathematics": 92, "KCSE Biology": 60, "English Language": 45},
    "emmanuel_makokha": {"English Language": 88, "KCSE Biology": 50, "Python Programming": 35},
    "lydia_nyambura":   {"English Language": 42, "Business Studies": 28},
    "dalton":           {"Business Studies": 68, "English Language": 52, "Python Programming": 30},
}


class Command(BaseCommand):
    help = 'Seeds complete analytics data: daily streaks, topic scores, lesson progress'

    def handle(self, *args, **options):
        from users.models import User, XPTransaction
        from assessments.models import Assessment, Question, UserAttempt
        from courses.models import Course, Lesson, UserProgress

        now = timezone.now()
        today = now.date()

        self.stdout.write(self.style.MIGRATE_HEADING('=== Analytics Data Seeder ===\n'))

        # Load all assessments indexed by topic
        assessments_by_topic = {}
        for a in Assessment.objects.prefetch_related('questions').all():
            if a.questions.exists():
                assessments_by_topic.setdefault(a.topic, []).append(a)

        all_topics = list(assessments_by_topic.keys())
        self.stdout.write(f'  Topics available: {all_topics}\n')

        # Load all courses indexed by title keyword
        all_courses = list(Course.objects.prefetch_related('lessons').all())

        def find_course(keyword):
            for c in all_courses:
                if keyword.lower() in c.title.lower():
                    return c
            return None

        def get_score_for_day(skill, topic, strong_topics, weak_topics, day_offset, total_days):
            """Generate a realistic score: improves over time, varies by topic strength."""
            base = skill
            if topic in strong_topics:
                base = min(1.0, skill + 0.12)
            elif topic in weak_topics:
                base = max(0.25, skill - 0.15)
            # Improvement arc: earlier days slightly lower
            progress_boost = (day_offset / max(total_days, 1)) * 0.08
            base = min(0.98, base + progress_boost)
            # Daily variance
            variance = random.uniform(-0.12, 0.12)
            score = max(0.20, min(0.99, base + variance))
            return round(score * 100, 1)

        def make_attempt(user, assessment, submitted_at, score_pct):
            """Build and return a UserAttempt object (not yet saved)."""
            questions = list(assessment.questions.all())
            if not questions:
                return None
            total_pts = sum(q.points for q in questions)
            earned_pts = max(0, round(total_pts * score_pct / 100))
            answers = {}
            question_results = {}
            for q in questions:
                correct = random.random() < (score_pct / 100)
                if q.question_type == 'mcq' and q.options:
                    answers[str(q.id)] = q.correct_answer if correct else random.choice(
                        [o for o in q.options if o != q.correct_answer] or q.options
                    )
                elif q.question_type == 'true_false':
                    answers[str(q.id)] = q.correct_answer if correct else ('False' if q.correct_answer == 'True' else 'True')
                else:
                    answers[str(q.id)] = q.correct_answer if correct else 'see working'
                question_results[str(q.id)] = {
                    'score': q.points if correct else 0,
                    'max_score': q.points,
                    'is_correct': correct,
                    'ai_graded': False,
                }
            time_mins = random.randint(6, min(assessment.time_limit_minutes - 1, 28))
            return UserAttempt(
                user=user,
                assessment=assessment,
                status='graded',
                score=f'{earned_pts}/{total_pts}',
                percentage=score_pct,
                answers=answers,
                question_results=question_results,
                is_public_result=random.random() > 0.3,
                submitted_at=submitted_at,
                time_taken_minutes=time_mins,
                time_taken_seconds=time_mins * 60 + random.randint(0, 59),
                xp_earned=int(score_pct / 100 * 50),
                started_at=submitted_at - timedelta(minutes=time_mins),
            )

        total_attempts_created = 0
        total_progress_updated = 0

        with transaction.atomic():
            for username, profile in USER_PROFILES.items():
                user = User.objects.filter(username=username).first()
                if not user:
                    self.stdout.write(self.style.WARNING(f'  [SKIP] {username} not found'))
                    continue

                streak_days = profile['streak']
                skill = profile['skill']
                strong_topics = profile['strong_topics']
                weak_topics = profile['weak_topics']
                streak_start = today - timedelta(days=streak_days - 1)

                # -- Build set of existing attempt dates to avoid duplicate-date spam --
                existing_dates = set(
                    UserAttempt.objects.filter(user=user, submitted_at__isnull=False)
                    .values_list('submitted_at__date', flat=True)
                )

                # -- Create one attempt per day for the full streak period --
                new_attempts = []
                topic_cycle = (all_topics * 20)[:streak_days]  # cycle through topics
                random.shuffle(topic_cycle)

                for day_offset in range(streak_days):
                    check_date = streak_start + timedelta(days=day_offset)
                    if check_date in existing_dates:
                        continue  # already has activity this day

                    # Pick topic — rotate through all topics for diversity
                    topic = topic_cycle[day_offset % len(all_topics)]
                    candidates = assessments_by_topic.get(topic, [])
                    if not candidates:
                        candidates = [a for al in assessments_by_topic.values() for a in al]
                    assessment = random.choice(candidates)

                    hour = random.randint(6, 23)
                    minute = random.randint(0, 59)
                    submitted_at = timezone.make_aware(
                        timezone.datetime(check_date.year, check_date.month, check_date.day, hour, minute)
                    )
                    score_pct = get_score_for_day(skill, topic, strong_topics, weak_topics, day_offset, streak_days)
                    attempt = make_attempt(user, assessment, submitted_at, score_pct)
                    if attempt:
                        new_attempts.append(attempt)
                        existing_dates.add(check_date)

                if new_attempts:
                    UserAttempt.objects.bulk_create(new_attempts, ignore_conflicts=False)
                    total_attempts_created += len(new_attempts)

                # -- Course enrollments and lesson completion --
                course_keywords = USER_COURSES.get(username, [])
                progress_targets = USER_COURSE_PROGRESS.get(username, {})

                for keyword in course_keywords:
                    course = find_course(keyword)
                    if not course:
                        continue
                    lessons = list(course.lessons.order_by('order'))
                    if not lessons:
                        continue

                    target_pct = progress_targets.get(keyword, random.randint(25, 85))
                    num_completed = max(1, round(len(lessons) * target_pct / 100))
                    completed_lessons = lessons[:num_completed]

                    # Compute last_accessed: more recent for higher-progress courses
                    days_since_access = max(0, random.randint(0, 3) if target_pct > 70 else random.randint(1, 8))
                    last_accessed = now - timedelta(days=days_since_access, hours=random.randint(0, 10))
                    started_at = now - timedelta(days=streak_days + random.randint(0, 14))

                    up, _ = UserProgress.objects.get_or_create(
                        user=user, course=course,
                        defaults={'progress_percentage': target_pct}
                    )
                    up.completed_lessons.set(completed_lessons)
                    actual_pct = round(len(completed_lessons) / len(lessons) * 100)
                    UserProgress.objects.filter(pk=up.pk).update(
                        progress_percentage=actual_pct,
                        last_accessed=last_accessed,
                        started_at=started_at,
                    )
                    total_progress_updated += 1

                # -- Verify streak now --
                attempt_dates = set(
                    UserAttempt.objects.filter(user=user, submitted_at__isnull=False)
                    .values_list('submitted_at__date', flat=True)
                )
                progress_dates_set = set(
                    UserProgress.objects.filter(user=user)
                    .values_list('last_accessed__date', flat=True)
                )
                active_dates = attempt_dates | progress_dates_set
                computed_streak = 0
                check = today
                while check in active_dates:
                    computed_streak += 1
                    check -= timedelta(days=1)

                lessons_total = sum(
                    up.completed_lessons.count()
                    for up in UserProgress.objects.filter(user=user)
                )
                courses_enrolled = UserProgress.objects.filter(user=user).count()
                attempts_total = UserAttempt.objects.filter(user=user).count()

                self.stdout.write(self.style.SUCCESS(
                    f'  ✓ {username:<22} streak={computed_streak:>3}d | '
                    f'attempts={attempts_total:>3} | courses={courses_enrolled} | '
                    f'lessons={lessons_total:>2} | xp={user.xp_points:,}'
                ))

        self.stdout.write('\n' + '=' * 65)
        self.stdout.write(self.style.SUCCESS('ANALYTICS DATA COMPLETE'))
        self.stdout.write('=' * 65)
        self.stdout.write(f'  New daily attempt records created : {total_attempts_created}')
        self.stdout.write(f'  Course progress records updated   : {total_progress_updated}')
        self.stdout.write(f'  Total UserAttempts in DB          : {UserAttempt.objects.count()}')
        self.stdout.write(f'  Total UserProgress in DB          : {UserProgress.objects.count()}')
        self.stdout.write('=' * 65)
        self.stdout.write('\n  The analytics page now shows:')
        self.stdout.write('    ✓ Real streak counts (7 – 89 days)')
        self.stdout.write('    ✓ Score history by week (last 12 weeks)')
        self.stdout.write('    ✓ Average score per topic (Algebra, Biology, English, Economics, Programming)')
        self.stdout.write('    ✓ Learning calendar with activity heatmap')
        self.stdout.write('    ✓ Course progress with lessons completed')
        self.stdout.write('    ✓ Recent activity feed (last 10 attempts)')
