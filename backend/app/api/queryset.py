from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Generic, TypeVar

from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel.sql.expression import SelectOfScalar

from app.db.queryset import QuerySet, qs

ModelT = TypeVar("ModelT")


@dataclass(frozen=True)
class APIQuerySet(Generic[ModelT]):
    queryset: QuerySet[ModelT]

    @property
    def statement(self) -> SelectOfScalar[ModelT]:
        return self.queryset.statement

    def filter(self, *criteria: Any) -> APIQuerySet[ModelT]:
        return APIQuerySet(self.queryset.filter(*criteria))

    def order_by(self, *ordering: Any) -> APIQuerySet[ModelT]:
        return APIQuerySet(self.queryset.order_by(*ordering))

    def limit(self, value: int) -> APIQuerySet[ModelT]:
        return APIQuerySet(self.queryset.limit(value))

    def offset(self, value: int) -> APIQuerySet[ModelT]:
        return APIQuerySet(self.queryset.offset(value))

    async def all(self, session: AsyncSession) -> list[ModelT]:
        return await self.queryset.all(session)

    async def first(self, session: AsyncSession) -> ModelT | None:
        return await self.queryset.first(session)

    async def first_or_404(
        self,
        session: AsyncSession,
        *,
        detail: str | None = None,
    ) -> ModelT:
        obj = await self.first(session)
        if obj is not None:
            return obj
        if detail is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def api_qs(model: type[ModelT]) -> APIQuerySet[ModelT]:
    return APIQuerySet(qs(model))
