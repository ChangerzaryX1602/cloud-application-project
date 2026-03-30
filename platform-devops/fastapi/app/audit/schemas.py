from __future__ import annotations

from pydantic import BaseModel, Field


class AuditLogResponse(BaseModel):
    name: str
    user: str | None = None
    operation: str | None = None
    creation: str | None = None

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    data: list[AuditLogResponse]
    total: int
