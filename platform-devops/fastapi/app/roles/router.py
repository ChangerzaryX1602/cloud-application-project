from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, Depends, status

from app.auth.jwt import get_current_user, require_role
from app.erpnext.client import erpnext_client
from app.roles.schemas import (
    RoleListResponse,
    RoleProfileCreate,
    RoleProfileListResponse,
    RoleProfileResponse,
    RoleProfileUpdate,
    RoleResponse,
)

logger = structlog.get_logger(__name__)

router = APIRouter(
    prefix="/roles",
    tags=["roles"],
    dependencies=[Depends(get_current_user)],
)


def _normalize_role_profile(raw: dict[str, Any]) -> RoleProfileResponse:
    """Convert an ERPNext Role Profile document to ``RoleProfileResponse``."""
    doc = raw.get("data", raw)
    raw_roles: list[Any] = doc.get("roles", [])

    role_names: list[str] = []
    for r in raw_roles:
        if isinstance(r, dict):
            # Child-table rows: {"role": "..."}
            role_names.append(r.get("role", ""))
        elif isinstance(r, str):
            role_names.append(r)

    return RoleProfileResponse(
        name=doc.get("name", ""),
        roles=[r for r in role_names if r],
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=RoleListResponse,
    summary="List all ERPNext roles",
)
async def list_roles() -> RoleListResponse:
    """Return all Role documents from ERPNext."""
    result = await erpnext_client.list_roles()
    raw: list[dict[str, Any]] = result.get("data", [])
    return RoleListResponse(data=[RoleResponse(name=r.get("name", "")) for r in raw])


@router.get(
    "/profiles/",
    response_model=RoleProfileListResponse,
    summary="List all role profiles",
)
async def list_role_profiles() -> RoleProfileListResponse:
    """Return all Role Profile documents from ERPNext."""
    result = await erpnext_client.list_role_profiles()
    raw: list[dict[str, Any]] = result.get("data", [])
    return RoleProfileListResponse(data=[_normalize_role_profile(r) for r in raw])


@router.post(
    "/profiles/",
    response_model=RoleProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a role profile",
    dependencies=[Depends(require_role("System Manager"))],
)
async def create_role_profile(body: RoleProfileCreate) -> RoleProfileResponse:
    """Create a new Role Profile in ERPNext."""
    payload: dict[str, Any] = {
        "doctype": "Role Profile",
        "role_profile": body.name,
        "roles": [{"role": r} for r in body.roles],
    }
    result = await erpnext_client.create_role_profile(payload)
    logger.info("role_profile_created", name=body.name)
    return _normalize_role_profile(result)


@router.put(
    "/profiles/{name:path}/",
    response_model=RoleProfileResponse,
    summary="Update a role profile",
    dependencies=[Depends(require_role("System Manager"))],
)
async def update_role_profile(name: str, body: RoleProfileUpdate) -> RoleProfileResponse:
    """Update the roles of an existing Role Profile in ERPNext."""
    payload: dict[str, Any] = {
        "roles": [{"role": r} for r in body.roles],
    }
    result = await erpnext_client.update_role_profile(name, payload)
    logger.info("role_profile_updated", name=name)
    return _normalize_role_profile(result)
