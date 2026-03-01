"""
Token-efficient essay grading for assessments.
Uses a minimal prompt and low max_tokens for fast, cheap inference.
Counts against the user's monthly AI quota when user is provided.
"""
import re
import logging

logger = logging.getLogger(__name__)


def grade_essay_answer(reference_solution: str, student_answer: str, max_points: int, user=None) -> int:
    """
    Grade an essay (or long text) answer against a reference (model solution).
    Uses a single short prompt and max_tokens=8 for low latency and token conservation.
    When user is provided, checks monthly AI quota and increments usage after a successful call.
    Returns an integer score from 0 to max_points. Returns 0 on any error or if over quota.
    """
    if not reference_solution or not reference_solution.strip():
        return 0
    if max_points <= 0:
        return 0

    if user is not None:
        try:
            from .views import _check_ai_usage_quota
            allowed, _ = _check_ai_usage_quota(user)
            if not allowed:
                return 0
        except Exception:
            pass

    # Truncate to limit input tokens (reference + student)
    ref_max = 800
    ans_max = 600
    ref = (reference_solution.strip()[:ref_max] + '...') if len(reference_solution) > ref_max else reference_solution.strip()
    ans = (student_answer.strip()[:ans_max] + '...') if len(student_answer) > ans_max else student_answer.strip()

    prompt = (
        f"Reference answer:\n{ref}\n\nStudent answer:\n{ans}\n\n"
        f"Give only one integer from 0 to {max_points} (the score for the student). No explanation."
    )

    try:
        from .views import call_ai, _increment_ai_usage
        # Prefer OpenRouter for grading: often faster and cheaper for tiny outputs
        response = call_ai(prompt, max_tokens=8, prefer_openrouter=True)
        if user is not None:
            try:
                _increment_ai_usage(user)
            except Exception:
                pass
        text = (response or '').strip()
        # Extract first integer in range [0, max_points]
        match = re.search(r'\b(\d+)\b', text)
        if match:
            score = int(match.group(1))
            return max(0, min(max_points, score))
        return 0
    except Exception as e:
        logger.warning("Essay grading failed (assigning 0): %s", e)
        return 0
