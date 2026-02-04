from __future__ import annotations

from fastapi import APIRouter, Body, Depends, HTTPException, status

from app.api.deps import require_admin_auth
from app.core.auth import AuthContext
from app.core.config import settings
from app.integrations.openclaw_gateway import (
    OpenClawGatewayError,
    ensure_session,
    get_chat_history,
    openclaw_call,
    send_message,
)

router = APIRouter(prefix="/gateway", tags=["gateway"])


@router.get("/status")
async def gateway_status(auth: AuthContext = Depends(require_admin_auth)) -> dict[str, object]:
    gateway_url = settings.openclaw_gateway_url or "ws://127.0.0.1:18789"
    try:
        sessions = await openclaw_call("sessions.list")
        if isinstance(sessions, dict):
            sessions_list = list(sessions.get("sessions") or [])
        else:
            sessions_list = list(sessions or [])
        main_session = settings.openclaw_main_session_key
        main_session_entry: object | None = None
        main_session_error: str | None = None
        if main_session:
            try:
                ensured = await ensure_session(main_session, label="Main Agent")
                if isinstance(ensured, dict):
                    main_session_entry = ensured.get("entry") or ensured
            except OpenClawGatewayError as exc:
                main_session_error = str(exc)
        return {
            "connected": True,
            "gateway_url": gateway_url,
            "sessions_count": len(sessions_list),
            "sessions": sessions_list,
            "main_session_key": main_session,
            "main_session": main_session_entry,
            "main_session_error": main_session_error,
        }
    except OpenClawGatewayError as exc:
        return {
            "connected": False,
            "gateway_url": gateway_url,
            "error": str(exc),
        }


@router.get("/sessions")
async def list_sessions(auth: AuthContext = Depends(require_admin_auth)) -> dict[str, object]:
    try:
        sessions = await openclaw_call("sessions.list")
    except OpenClawGatewayError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    if isinstance(sessions, dict):
        sessions_list = list(sessions.get("sessions") or [])
    else:
        sessions_list = list(sessions or [])

    main_session = settings.openclaw_main_session_key
    main_session_entry: object | None = None
    if main_session:
        try:
            ensured = await ensure_session(main_session, label="Main Agent")
            if isinstance(ensured, dict):
                main_session_entry = ensured.get("entry") or ensured
        except OpenClawGatewayError:
            main_session_entry = None

    return {"sessions": sessions_list, "main_session_key": main_session, "main_session": main_session_entry}


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str, auth: AuthContext = Depends(require_admin_auth)
) -> dict[str, object]:
    try:
        sessions = await openclaw_call("sessions.list")
    except OpenClawGatewayError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    if isinstance(sessions, dict):
        sessions_list = list(sessions.get("sessions") or [])
    else:
        sessions_list = list(sessions or [])
    main_session = settings.openclaw_main_session_key
    if main_session and not any(
        session.get("key") == main_session for session in sessions_list
    ):
        try:
            await ensure_session(main_session, label="Main Agent")
            refreshed = await openclaw_call("sessions.list")
            if isinstance(refreshed, dict):
                sessions_list = list(refreshed.get("sessions") or [])
            else:
                sessions_list = list(refreshed or [])
        except OpenClawGatewayError:
            pass
    session = next((item for item in sessions_list if item.get("key") == session_id), None)
    if session is None and main_session and session_id == main_session:
        try:
            ensured = await ensure_session(main_session, label="Main Agent")
            if isinstance(ensured, dict):
                session = ensured.get("entry") or ensured
        except OpenClawGatewayError:
            session = None
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return {"session": session}


@router.get("/sessions/{session_id}/history")
async def get_session_history(
    session_id: str, auth: AuthContext = Depends(require_admin_auth)
) -> dict[str, object]:
    try:
        history = await get_chat_history(session_id)
    except OpenClawGatewayError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    if isinstance(history, dict) and isinstance(history.get("messages"), list):
        return {"history": history["messages"]}
    return {"history": list(history or [])}


@router.post("/sessions/{session_id}/message")
async def send_session_message(
    session_id: str,
    payload: dict = Body(...),
    auth: AuthContext = Depends(require_admin_auth),
) -> dict[str, bool]:
    content = payload.get("content")
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="content is required"
        )
    try:
        main_session = settings.openclaw_main_session_key
        if main_session and session_id == main_session:
            await ensure_session(main_session, label="Main Agent")
        await send_message(content, session_key=session_id)
    except OpenClawGatewayError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return {"ok": True}
