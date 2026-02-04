from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlmodel import SQLModel


class BoardBase(SQLModel):
    name: str
    slug: str
    gateway_id: UUID | None = None


class BoardCreate(BoardBase):
    pass


class BoardUpdate(SQLModel):
    name: str | None = None
    slug: str | None = None
    gateway_id: UUID | None = None


class BoardRead(BoardBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
