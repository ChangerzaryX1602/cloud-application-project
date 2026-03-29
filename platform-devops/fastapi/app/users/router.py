from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.jwt import get_current_user, require_role
from app.erpnext.client import erpnext_client
from app.users.schemas import UserCreate, UserListResponse, UserResponse, UserUpdate

logger = structlog.get_logger(__name__)

router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(get_current_user)],
)


def _normalize_user(raw: dict[str, Any]) -> UserResponse:
    """Convert an ERPNext User document dict to a ``UserResponse``."""
    doc = raw.get("data", raw)  # unwrap {"data": {...}} if present
    raw_roles: list[Any] = doc.get("roles", [])

    # ERPNext returns roles as [{"role": "System Manager"}, ...]
    role_names: list[str] = []
    for r in raw_roles:
        if isinstance(r, dict):
            role_names.append(r.get("role", ""))
        elif isinstance(r, str):
            role_names.append(r)

    return UserResponse(
        email=doc.get("name") or doc.get("email", ""),
        full_name=doc.get("full_name"),
        enabled=doc.get("enabled"),
        last_login=doc.get("last_login"),
        last_ip=doc.get("last_ip"),
        roles=[r for r in role_names if r],
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=UserListResponse,
    summary="List users",
)
async def list_users(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=200, description="Results per page"),
    search: str = Query("", description="Search by email / full_name"),
    role: str = Query("", description="Filter by role name"),
) -> UserListResponse:
    """Return a paginated list of ERPNext users."""
    filters: list[list[str]] = []

    if search:
        # Use a broad OR filter – ERPNext supports wildcards with %
        filters.append(["User", "email", "like", f"%{search}%"])

    if role:
        filters.append(["Has Role", "role", "=", role])

    start = (page - 1) * page_size

    result = await erpnext_client.list_users(
        filters=filters if filters else None,
        limit=page_size,
        start=start,
    )

    raw_list: list[dict[str, Any]] = result.get("data", [])

    user_names = [u.get("name", "") for u in raw_list if u.get("name")]
    roles_map = await erpnext_client.list_user_roles(user_names)

    users = []
    for u in raw_list:
        user = _normalize_user(u)
        user.roles = roles_map.get(u.get("name", ""), [])
        users.append(user)

    return UserListResponse(data=users, total=len(users))


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
    dependencies=[Depends(require_role("System Manager"))],
)
async def create_user(
    body: UserCreate,
) -> UserResponse:
    """Create a new user in ERPNext."""
    # Build the ERPNext User document payload
    payload: dict[str, Any] = {
        "doctype": "User",
        "email": body.email,
        "first_name": body.full_name,
        "full_name": body.full_name,
        "send_welcome_email": 1 if body.send_welcome_email else 0,
        "roles": [{"role": r} for r in body.roles],
    }
    result = await erpnext_client.create_user(payload)
    logger.info("user_created", email=body.email)
    return _normalize_user(result)


@router.get(
    "/{email:path}",
    response_model=UserResponse,
    summary="Get a single user",
)
async def get_user(email: str) -> UserResponse:
    """Fetch a single ERPNext user by email address."""
    try:
        result = await erpnext_client.get_user(email)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{email}' not found",
        ) from exc
    return _normalize_user(result)


@router.put(
    "/{email:path}",
    response_model=UserResponse,
    summary="Update a user",
    dependencies=[Depends(require_role("System Manager"))],
)
async def update_user(email: str, body: UserUpdate) -> UserResponse:
    """Update a user's fields in ERPNext."""
    payload: dict[str, Any] = {}

    if body.full_name is not None:
        payload["full_name"] = body.full_name
        payload["first_name"] = body.full_name

    if body.enabled is not None:
        payload["enabled"] = 1 if body.enabled else 0

    if body.roles is not None:
        payload["roles"] = [{"role": r} for r in body.roles]

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fields to update",
        )

    result = await erpnext_client.update_user(email, payload)
    logger.info("user_updated", email=email)
    return _normalize_user(result)


@router.delete(
    "/{email:path}",
    summary="Disable a user (soft delete)",
    dependencies=[Depends(require_role("System Manager"))],
)
async def disable_user(email: str) -> dict[str, str]:
    """Soft-disable a user by setting ``enabled=0`` in ERPNext.

    We never hard-delete users to preserve audit trail integrity.
    """
    await erpnext_client.update_user(email, {"enabled": 0})
    logger.info("user_disabled", email=email)
    return {"message": "User disabled"}
