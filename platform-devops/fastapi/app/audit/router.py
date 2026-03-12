from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, Depends, Query

from app.audit.schemas import AuditLogListResponse, AuditLogResponse
from app.auth.jwt import get_current_user
from app.erpnext.client import erpnext_client

logger = structlog.get_logger(__name__)

router = APIRouter(
    prefix="/audit-logs",
    tags=["audit-logs"],
    dependencies=[Depends(get_current_user)],
)


def _normalize_log(raw: dict[str, Any]) -> AuditLogResponse:
    return AuditLogResponse(
        name=raw.get("name", ""),
        user=raw.get("user"),
        operation=raw.get("operation"),
        reference_doctype=raw.get("reference_doctype"),
        reference_name=raw.get("reference_name"),
        creation=raw.get("creation"),
    )


@router.get(
    "/",
    response_model=AuditLogListResponse,
    summary="List audit log entries",
)
async def list_audit_logs(
    user: str = Query("", description="Filter by user email"),
    operation: str = Query("", description="Filter by operation type"),
    start_date: str = Query("", description="Filter from date (YYYY-MM-DD)"),
    end_date: str = Query("", description="Filter to date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(50, ge=1, le=200, description="Results per page"),
) -> AuditLogListResponse:
    """Return a paginated list of ERPNext Activity Log entries."""
    filters: list[list[str]] = []

    if user:
        filters.append(["Activity Log", "user", "=", user])

    if operation:
        filters.append(["Activity Log", "operation", "=", operation])

    if start_date:
        filters.append(["Activity Log", "creation", ">=", start_date])

    if end_date:
        # Include the full end_date day
        filters.append(["Activity Log", "creation", "<=", f"{end_date} 23:59:59"])

    start = (page - 1) * page_size

    result = await erpnext_client.list_activity_logs(
        filters=filters if filters else None,
        limit=page_size,
        start=start,
    )

    raw_list: list[dict[str, Any]] = result.get("data", [])
    logs = [_normalize_log(entry) for entry in raw_list]

    return AuditLogListResponse(data=logs, total=len(logs))
