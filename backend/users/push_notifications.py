"""
Web Push Notification Service
-------------------------------
Sends browser push notifications to subscribed users via the Web Push Protocol
(RFC 8030) using VAPID authentication (pywebpush library).

Subscriptions are stored in PushSubscription model (one per user/device).
The browser registers a subscription via POST /api/notifications/push/subscribe/
and the backend sends pushes here whenever an in-app notification is created.

VAPID keys must be set in settings (or .env):
    VAPID_PUBLIC_KEY  — URL-safe base64 uncompressed EC public key (P-256)
    VAPID_PRIVATE_KEY — PEM-encoded EC private key
    VAPID_ADMIN_EMAIL — mailto: claim for the VAPID JWT (e.g. admin@edureach.app)
"""

import json
import logging
from typing import Iterable

from django.conf import settings

logger = logging.getLogger(__name__)


def _get_vapid_settings() -> dict:
    """Return VAPID claims dict ready for pywebpush."""
    admin_email = getattr(settings, "VAPID_ADMIN_EMAIL", "admin@edureach.app")
    if not admin_email.startswith("mailto:"):
        admin_email = f"mailto:{admin_email}"
    return {
        "sub": admin_email,
    }


def send_web_push(subscription_info: dict, payload: dict) -> bool:
    """
    Send a single Web Push message.

    Args:
        subscription_info: dict with keys 'endpoint', 'keys' (p256dh, auth)
        payload: dict that will be JSON-serialised and sent as the push body.
                 Should have at least 'title' and 'body'.

    Returns:
        True on success, False on failure.
    """
    try:
        from pywebpush import webpush, WebPushException  # noqa: PLC0415

        private_key = getattr(settings, "VAPID_PRIVATE_KEY", None)
        if not private_key:
            logger.warning("VAPID_PRIVATE_KEY not configured — skipping web push.")
            return False

        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=private_key,
            vapid_claims=_get_vapid_settings(),
        )
        return True
    except Exception as exc:  # noqa: BLE001
        exc_name = type(exc).__name__
        # Log 410 Gone as info (subscription expired) rather than error
        status_code = getattr(exc, "response", None)
        if hasattr(status_code, "status_code") and status_code.status_code == 410:
            logger.info("Push subscription expired (410) — will be cleaned up.")
        else:
            logger.error("Web push failed (%s): %s", exc_name, exc)
        return False


def _build_payload(title: str, body: str, url: str = "/", icon: str = "/logo.svg", tag: str = "") -> dict:
    """Build a standard EduReach push payload."""
    return {
        "title": title,
        "body": body,
        "icon": icon,
        "badge": "/logo-no-name.jpeg",
        "url": url,
        "tag": tag or title[:32],
    }


def push_to_user(user, title: str, body: str, url: str = "/", tag: str = "") -> int:
    """
    Send a push notification to all active subscriptions for a user.

    Returns the number of successful pushes.
    """
    from .models import PushSubscription  # noqa: PLC0415 (avoid circular at module load)

    subscriptions = PushSubscription.objects.filter(user=user, is_active=True)
    if not subscriptions.exists():
        return 0

    payload = _build_payload(title, body, url=url, tag=tag)
    app_url = getattr(settings, "FRONTEND_URL", "https://edureach.app")
    # Prepend app URL if url is a relative path
    full_url = url if url.startswith("http") else f"{app_url}{url}"
    payload["url"] = full_url

    sent = 0
    dead_ids = []

    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            },
        }
        success = send_web_push(subscription_info, payload)
        if success:
            sent += 1
        else:
            # Mark as inactive if the push fails (likely expired/revoked)
            dead_ids.append(sub.id)

    if dead_ids:
        PushSubscription.objects.filter(id__in=dead_ids).update(is_active=False)

    return sent


def push_to_users(users: Iterable, title: str, body: str, url: str = "/", tag: str = "") -> int:
    """Send a push notification to a queryset/list of users. Returns total sent."""
    total = 0
    for user in users:
        total += push_to_user(user, title=title, body=body, url=url, tag=tag)
    return total
