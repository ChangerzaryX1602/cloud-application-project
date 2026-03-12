from __future__ import annotations

from pydantic import BaseModel, Field


class RoleResponse(BaseModel):
    name: str

    model_config = {"from_attributes": True}


class RoleProfileCreate(BaseModel):
    name: str
    roles: list[str] = Field(default_factory=list)


class RoleProfileUpdate(BaseModel):
    roles: list[str]


class RoleProfileResponse(BaseModel):
    name: str
    roles: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}
