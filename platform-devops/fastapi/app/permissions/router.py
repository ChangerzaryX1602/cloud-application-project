from __future__ import annotations

from typing import Any

import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.jwt import get_current_user, require_role
from app.erpnext.client import erpnext_client
from app.permissions.schemas import (
    PermissionCreate,
    PermissionListResponse,
    PermissionResponse,
    PermissionUpdate,
)

logger = structlog.get_logger(__name__)

router = APIRouter(
    prefix="/permissions",
    tags=["permissions"],
    dependencies=[Depends(get_current_user)],
)


def _normalize(raw: dict[str, Any]) -> PermissionResponse:
    doc = raw.get("data", raw)
    return PermissionResponse(
        name=doc.get("name", ""),
        doctype=doc.get("parent", ""),
        role=doc.get("role", ""),
        permlevel=int(doc.get("permlevel") or 0),
        read=bool(doc.get("read")),
        write=bool(doc.get("write")),
        create=bool(doc.get("create")),
        delete=bool(doc.get("delete")),
        submit=bool(doc.get("submit")),
        cancel=bool(doc.get("cancel")),
        amend=bool(doc.get("amend")),
    )


@router.get("/", response_model=PermissionListResponse, summary="List permissions")
async def list_permissions(
    doctype: str = Query("", description="Filter by DocType name"),
    role: str = Query("", description="Filter by role name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> PermissionListResponse:
    result = await erpnext_client.list_custom_permissions(
        doctype=doctype or None,
        role=role or None,
        limit=page_size,
        start=(page - 1) * page_size,
    )
    raw_list: list[dict[str, Any]] = result.get("data", [])
    return PermissionListResponse(
        data=[_normalize(r) for r in raw_list],
        total=len(raw_list),
    )


@router.post(
    "/",
    response_model=PermissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a permission rule",
)
async def create_permission(
    body: PermissionCreate,
    current_user: dict[str, Any] = Depends(require_role("System Manager")),
) -> PermissionResponse:
    payload: dict[str, Any] = {
        "doctype": "Custom DocPerm",
        "parent": body.doctype,
        "role": body.role,
        "permlevel": body.permlevel,
        "read": int(body.read),
        "write": int(body.write),
        "create": int(body.create),
        "delete": int(body.delete),
        "submit": int(body.submit),
        "cancel": int(body.cancel),
        "amend": int(body.amend),
    }
    result = await erpnext_client.create_custom_permission(payload)
    perm = _normalize(result)
    await erpnext_client.log_permission_change(
        action="Created",
        perm_name=perm.name,
        doctype_name=body.doctype,
        role=body.role,
        user=current_user.get("email", ""),
    )
    logger.info("permission_created", doctype=body.doctype, role=body.role)
    return perm


@router.put(
    "/{name}",
    response_model=PermissionResponse,
    summary="Update a permission rule",
)
async def update_permission(
    name: str,
    body: PermissionUpdate,
    current_user: dict[str, Any] = Depends(require_role("System Manager")),
) -> PermissionResponse:
    payload: dict[str, Any] = {
        k: int(v) for k, v in body.model_dump(exclude_none=True).items()
    }
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fields to update",
        )
    try:
        result = await erpnext_client.update_custom_permission(name, payload)
    except httpx.HTTPStatusError as exc:
        detail = f"Failed to update custom permission '{name}'"
        try:
            err = exc.response.json()
            if isinstance(err, dict):
                detail = (
                    err.get("exception")
                    or err.get("_error_message")
                    or err.get("message")
                    or detail
                )
        except Exception:
            if exc.response.text:
                detail = exc.response.text[:500]
        raise HTTPException(status_code=exc.response.status_code, detail=detail) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cannot reach ERPNext service",
        ) from exc

    perm = _normalize(result)
    await erpnext_client.log_permission_change(
        action="Updated",
        perm_name=name,
        doctype_name=perm.doctype,
        role=perm.role,
        user=current_user.get("email", ""),
    )
    logger.info("permission_updated", name=name)
    return perm


@router.delete(
    "/{name}",
    summary="Delete a permission rule",
)
async def delete_permission(
    name: str,
    current_user: dict[str, Any] = Depends(require_role("System Manager")),
) -> dict[str, str]:
    # Fetch the custom record first so we can log doctype/role before deleting
    existing = await erpnext_client.list_custom_permissions()
    perm_doc = next(
        (r for r in existing.get("data", []) if r.get("name") == name), {}
    )
    await erpnext_client.delete_custom_permission(name)
    await erpnext_client.log_permission_change(
        action="Deleted",
        perm_name=name,
        doctype_name=perm_doc.get("parent", ""),
        role=perm_doc.get("role", ""),
        user=current_user.get("email", ""),
    )
    logger.info("permission_deleted", name=name)
    return {"message": "Permission deleted"}
