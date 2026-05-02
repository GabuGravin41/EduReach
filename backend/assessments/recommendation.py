"""
Personalised assessment recommendation engine.

Algorithm:
  For each (topic, difficulty) pair in the user's learnable space:
    - Compute mastery_score = avg_score × confidence  (confidence ramps 0→1 over 5 attempts)
    - Compute recency       = days_since_last / 14 (capped at 1.0; 1.0 = never seen)
    - priority             = weakness × 0.65 + recency × 0.35

Difficulty gates:
  comp_tp not shown until comp_oe mastery ≥ 0.35 for that topic
  imo     not shown until comp_tp mastery ≥ 0.50 for that topic

New users (no mastery data at all) get one intro assessment per topic at comp_oe.
"""

import random
from datetime import datetime

from django.utils import timezone

MATH_TOPICS = ['Geometry', 'Algebra', 'Combinatorics', 'Number Theory']
DIFF_LEVELS  = ['comp_oe', 'comp_tp', 'imo']

DIFF_LABELS = {
    'cee':     'School Level',
    'comp_oe': 'Competition',
    'comp_tp': 'Proof Writing',
    'imo':     'IMO Level',
}


def recommend_assessments(user, limit: int = 6) -> list[dict]:
    """
    Returns up to `limit` dicts, each containing:
      assessment, topic, difficulty, priority, mastery_pct, reason
    """
    from .models import Assessment, UserAttempt

    mastery: dict = user.topic_mastery or {}
    now = timezone.now()

    # IDs the user has already finished
    attempted_ids: set[int] = set(
        UserAttempt.objects.filter(
            user=user,
            status__in=['submitted', 'graded'],
        ).values_list('assessment_id', flat=True)
    )

    candidates: list[tuple[float, str, str]] = []

    for topic in MATH_TOPICS:
        for diff in DIFF_LEVELS:
            entry = mastery.get(f'{topic}_{diff}', {})
            attempts  = entry.get('attempts', 0)
            avg_score = entry.get('avg_score', 0.0)

            # Confidence ramps 0→1 over first 5 attempts
            confidence   = min(attempts / 5.0, 1.0)
            mastery_score = avg_score * confidence

            # Recency 0→1: 1.0 = never seen or seen >14 days ago
            last_seen_str = entry.get('last_seen')
            if last_seen_str:
                try:
                    last_seen = datetime.fromisoformat(last_seen_str)
                    if last_seen.tzinfo is None:
                        last_seen = timezone.make_aware(last_seen)
                    recency = min((now - last_seen).days / 14.0, 1.0)
                except (ValueError, TypeError):
                    recency = 1.0
            else:
                recency = 1.0

            # Gate: comp_tp requires comp_oe mastery ≥ 0.35
            if diff == 'comp_tp':
                oe = mastery.get(f'{topic}_comp_oe', {})
                oe_m = oe.get('avg_score', 0.0) * min(oe.get('attempts', 0) / 5.0, 1.0)
                if oe_m < 0.35:
                    continue

            # Gate: imo requires comp_tp mastery ≥ 0.50
            if diff == 'imo':
                tp = mastery.get(f'{topic}_comp_tp', {})
                tp_m = tp.get('avg_score', 0.0) * min(tp.get('attempts', 0) / 5.0, 1.0)
                if tp_m < 0.50:
                    continue

            priority = (1.0 - mastery_score) * 0.65 + recency * 0.35
            candidates.append((priority, topic, diff))

    # New user: no candidates passed any gate → seed with comp_oe for all topics
    if not candidates:
        candidates = [(1.0, topic, 'comp_oe') for topic in MATH_TOPICS]

    candidates.sort(key=lambda x: -x[0])

    recommended: list[dict] = []
    seen_topics: dict[str, int] = {}

    for priority, topic, diff in candidates:
        if len(recommended) >= limit:
            break

        # Max 2 recs per topic; second rec only if priority still meaningful
        topic_count = seen_topics.get(topic, 0)
        if topic_count >= 2:
            continue
        if topic_count == 1 and priority < 0.50:
            continue

        qs = (
            Assessment.objects
            .filter(is_public=True, difficulty_level=diff)
            .filter(tags__contains=[topic])
            .exclude(id__in=attempted_ids)
        )
        total = qs.count()
        if total == 0:
            continue

        assessment = qs[random.randint(0, max(0, total - 1))]

        entry = mastery.get(f'{topic}_{diff}', {})
        mastery_pct = round(entry.get('avg_score', 0.0) * 100)

        recommended.append({
            'assessment': assessment,
            'topic':       topic,
            'difficulty':  diff,
            'priority':    round(priority, 3),
            'mastery_pct': mastery_pct,
            'reason':      _build_reason(topic, diff, entry),
        })
        seen_topics[topic] = topic_count + 1

    return recommended


def update_topic_mastery(user, assessment, percentage: float) -> None:
    """
    Called after an attempt is graded.
    `percentage` is 0–100.
    Updates the user's topic_mastery JSON in-place and saves one field.
    """
    diff_level = assessment.difficulty_level
    if not diff_level:
        return

    TRACKED = {'Geometry', 'Algebra', 'Combinatorics', 'Number Theory', 'Physics'}
    topics = [t for t in (assessment.tags or []) if t in TRACKED]
    if not topics:
        return

    topic = topics[0]
    key   = f'{topic}_{diff_level}'
    score = percentage / 100.0  # normalise to 0→1

    mastery = dict(user.topic_mastery or {})
    entry = dict(mastery.get(key, {'attempts': 0, 'total_score': 0.0, 'avg_score': 0.0}))

    entry['attempts']    = entry.get('attempts', 0) + 1
    entry['total_score'] = entry.get('total_score', 0.0) + score
    entry['avg_score']   = entry['total_score'] / entry['attempts']
    entry['last_seen']   = timezone.now().isoformat()

    mastery[key] = entry
    user.topic_mastery = mastery
    user.save(update_fields=['topic_mastery'])


# ── Internal helpers ─────────────────────────────────────────────────────────

def _build_reason(topic: str, diff: str, entry: dict) -> str:
    attempts = entry.get('attempts', 0)
    avg      = entry.get('avg_score', 0.0)
    label    = DIFF_LABELS.get(diff, diff)

    if attempts == 0:
        return f'Start building your {topic} foundation'

    pct = round(avg * 100)
    if pct < 40:
        return f'Weak area: {topic} {label} — {pct}% avg'
    if pct < 65:
        return f'Room to grow: {topic} {label} — {pct}% avg'
    if pct < 80:
        return f'Good progress in {topic} — keep pushing'
    return f'Maintain your {topic} strength'
