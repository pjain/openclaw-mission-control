from __future__ import annotations

from dataclasses import dataclass, field
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import pytest

from app.api import board_groups


@dataclass
class _FakeSession:
    executed: list[Any] = field(default_factory=list)
    committed: int = 0

    async def exec(self, statement: Any) -> None:
        self.executed.append(statement)

    async def execute(self, statement: Any) -> None:
        self.executed.append(statement)

    async def commit(self) -> None:
        self.committed += 1


@pytest.mark.asyncio
async def test_delete_board_group_cleans_group_memory_first(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    group_id = uuid4()

    async def _fake_require_group_access(*_args: Any, **_kwargs: Any) -> None:
        return None

    monkeypatch.setattr(board_groups, "_require_group_access", _fake_require_group_access)

    session = _FakeSession()
    ctx = SimpleNamespace(member=object())

    await board_groups.delete_board_group(group_id=group_id, session=session, ctx=ctx)

    statement_tables = [statement.table.name for statement in session.executed]
    assert statement_tables == ["boards", "board_group_memory", "board_groups"]
    assert session.committed == 1
