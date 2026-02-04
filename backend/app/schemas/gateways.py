from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlmodel import SQLModel


class GatewayBase(SQLModel):
    name: str
    url: str
    main_session_key: str
    workspace_root: str
    skyll_enabled: bool = False


class GatewayCreate(GatewayBase):
    token: str | None = None


class GatewayUpdate(SQLModel):
    name: str | None = None
    url: str | None = None
    token: str | None = None
    main_session_key: str | None = None
    workspace_root: str | None = None
    skyll_enabled: bool | None = None


class GatewayRead(GatewayBase):
    id: UUID
    token: str | None = None
    created_at: datetime
    updated_at: datetime
