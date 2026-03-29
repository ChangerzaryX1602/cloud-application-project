from __future__ import annotations

from pydantic import BaseModel


class PermissionResponse(BaseModel):
    name: str
    doctype: str
    role: str
    permlevel: int = 0
    read: bool = False
    write: bool = False
    create: bool = False
    delete: bool = False
    submit: bool = False
    cancel: bool = False
    amend: bool = False

    model_config = {"from_attributes": True}


class PermissionCreate(BaseModel):
    doctype: str
    role: str
    permlevel: int = 0
    read: bool = False
    write: bool = False
    create: bool = False
    delete: bool = False
    submit: bool = False
    cancel: bool = False
    amend: bool = False


class PermissionUpdate(BaseModel):
    read: bool | None = None
    write: bool | None = None
    create: bool | None = None
    delete: bool | None = None
    submit: bool | None = None
    cancel: bool | None = None
    amend: bool | None = None


class PermissionListResponse(BaseModel):
    data: list[PermissionResponse]
    total: int
