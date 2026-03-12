from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class HasRole(BaseModel):
    role: str


class ERPNextUser(BaseModel):
    name: str
    email: str | None = None
    full_name: str | None = None
    enabled: int | bool | None = 1
    last_login: str | None = None
    last_ip: str | None = None
    roles: list[HasRole] = Field(default_factory=list)


class ERPNextRole(BaseModel):
    name: str


class ERPNextRoleProfile(BaseModel):
    name: str
    roles: list[Any] = Field(default_factory=list)


class ERPNextActivityLog(BaseModel):
    name: str
    user: str | None = None
    operation: str | None = None
    reference_doctype: str | None = None
    reference_name: str | None = None
    creation: str | None = None


class ERPNextListResponse(BaseModel):
    data: list[Any] = Field(default_factory=list)
