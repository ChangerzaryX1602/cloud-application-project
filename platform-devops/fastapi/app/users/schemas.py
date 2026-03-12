from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    send_welcome_email: bool = False
    roles: list[str] = Field(default_factory=list)


class UserUpdate(BaseModel):
    full_name: str | None = None
    enabled: bool | None = None
    roles: list[str] | None = None


class UserResponse(BaseModel):
    email: str
    full_name: str | None = None
    enabled: bool | int | None = None
    last_login: str | None = None
    last_ip: str | None = None
    roles: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    data: list[UserResponse]
    total: int
