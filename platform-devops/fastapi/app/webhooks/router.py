from __future__ import annotations

import json
from typing import Any

import structlog
from fastapi import APIRouter, Header, HTTPException, Request, status

from app.config import settings
from app.webhooks.processor import dispatch_webhook_event, verify_webhook_signature

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post(
    "/receive",
    summary="Receive ERPNext webhook events",
    status_code=status.HTTP_200_OK,
)
async def receive_webhook(
    request: Request,
    x_frappe_webhook_signature: str | None = Header(
        default=None,
        alias="X-Frappe-Webhook-Signature",
        description="HMAC-SHA256 signature from ERPNext",
    ),
) -> dict[str, str]:
    """Accept an inbound ERPNext webhook.

    Steps
    -----
    1. Read the raw request body.
    2. If ``WEBHOOK_SECRET`` is configured, verify the HMAC signature.
    3. Parse the JSON body and route to the appropriate event processor.
    4. Return ``{"status": "ok"}``.
    """
    raw_body: bytes = await request.body()

    # --- Signature verification -------------------------------------------
    if settings.WEBHOOK_SECRET:
        if not x_frappe_webhook_signature:
            logger.warning("webhook_missing_signature")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing webhook signature header",
            )
        if not verify_webhook_signature(
            raw_body,
            x_frappe_webhook_signature,
            settings.WEBHOOK_SECRET,
        ):
            logger.warning(
                "webhook_invalid_signature",
                signature=x_frappe_webhook_signature,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature",
            )

    # --- Parse body -------------------------------------------------------
    try:
        body: dict[str, Any] = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        logger.error("webhook_invalid_json", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON body",
        ) from exc

    doctype: str = body.get("doctype", "")
    event: str = body.get("event", "")
    doc: dict[str, Any] = body.get("doc", {})

    if not doctype or not event:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Webhook body must contain 'doctype' and 'event' fields",
        )

    await dispatch_webhook_event(doctype=doctype, event=event, doc=doc)

    return {"status": "ok"}
