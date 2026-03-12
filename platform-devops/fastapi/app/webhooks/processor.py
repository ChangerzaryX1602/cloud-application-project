from __future__ import annotations

import hashlib
import hmac
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify an ERPNext HMAC-SHA256 webhook signature.

    Parameters
    ----------
    payload:
        Raw (bytes) request body.
    signature:
        Value of the ``X-Frappe-Webhook-Signature`` header (``sha256=<hex>``).
    secret:
        Shared HMAC secret configured in ERPNext and ``WEBHOOK_SECRET`` env var.

    Returns
    -------
    bool
        ``True`` if the signature is valid; ``False`` otherwise.
    """
    expected_hex = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    expected = f"sha256={expected_hex}"
    return hmac.compare_digest(expected, signature)


async def process_user_event(event: str, doc: dict[str, Any]) -> None:
    """Handle a User doctype webhook event.

    Parameters
    ----------
    event:
        ERPNext event name (e.g. ``after_insert``, ``on_update``, ``on_trash``).
    doc:
        The ERPNext document payload from the webhook body.
    """
    logger.info(
        "webhook_user_event",
        event=event,
        user=doc.get("name") or doc.get("email"),
        enabled=doc.get("enabled"),
    )
    # Future: invalidate user cache entries, broadcast SSE events, etc.


async def process_role_event(event: str, doc: dict[str, Any]) -> None:
    """Handle a Role / Role Profile doctype webhook event."""
    logger.info(
        "webhook_role_event",
        event=event,
        role=doc.get("name"),
    )
    # Future: refresh role cache.


async def dispatch_webhook_event(
    doctype: str,
    event: str,
    doc: dict[str, Any],
) -> None:
    """Route a webhook event to the appropriate processor.

    Parameters
    ----------
    doctype:
        ERPNext doctype name (e.g. ``User``, ``Role Profile``).
    event:
        ERPNext event name.
    doc:
        Document payload.
    """
    log = logger.bind(doctype=doctype, event=event)

    if doctype == "User":
        await process_user_event(event, doc)
    elif doctype in ("Role", "Role Profile"):
        await process_role_event(event, doc)
    else:
        log.debug("webhook_unhandled_doctype")
