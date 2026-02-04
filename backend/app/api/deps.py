from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from fastapi import Depends, HTTPException, status
from sqlmodel import Session

from app.core.agent_auth import AgentAuthContext, get_agent_auth_context_optional
from app.core.auth import AuthContext, get_auth_context, get_auth_context_optional
from app.db.session import get_session
from app.models.agents import Agent
from app.models.boards import Board
from app.models.tasks import Task
from app.models.users import User
from app.services.admin_access import require_admin


def require_admin_auth(auth: AuthContext = Depends(get_auth_context)) -> AuthContext:
    require_admin(auth)
    return auth


@dataclass
class ActorContext:
    actor_type: Literal["user", "agent"]
    user: User | None = None
    agent: Agent | None = None


def require_admin_or_agent(
    auth: AuthContext | None = Depends(get_auth_context_optional),
    agent_auth: AgentAuthContext | None = Depends(get_agent_auth_context_optional),
) -> ActorContext:
    if auth is not None:
        require_admin(auth)
        return ActorContext(actor_type="user", user=auth.user)
    if agent_auth is not None:
        return ActorContext(actor_type="agent", agent=agent_auth.agent)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)


def get_board_or_404(
    board_id: str,
    session: Session = Depends(get_session),
) -> Board:
    board = session.get(Board, board_id)
    if board is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return board


def get_task_or_404(
    task_id: str,
    board: Board = Depends(get_board_or_404),
    session: Session = Depends(get_session),
) -> Task:
    task = session.get(Task, task_id)
    if task is None or task.board_id != board.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return task
