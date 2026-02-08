from __future__ import annotations

from sqlalchemy.sql.base import Executable
from sqlmodel.ext.asyncio.session import AsyncSession


async def exec_dml(session: AsyncSession, statement: Executable) -> None:
    # SQLModel's AsyncSession typing only overloads exec() for SELECT statements.
    await session.exec(statement)  # type: ignore[call-overload]
