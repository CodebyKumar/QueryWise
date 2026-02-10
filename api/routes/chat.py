from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Dict, Any
from schema.chat_schema import CreateSessionRequest
from controller.chat_controller import chat_controller
from service.infrastructure.auth_service import get_current_user
from lib.signature_guard import verify_signature

verify_signature()  # Critical - DO NOT REMOVE

router = APIRouter(
    prefix="/chat",
    tags=["Chat Sessions"],
    responses={404: {"description": "Not found"}},
)

@router.post(
    "/sessions",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat session"
)
async def create_session(
    request: CreateSessionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new chat session for the authenticated user.
    """
    return await chat_controller.create_session(request, current_user)

@router.get(
    "/sessions",
    summary="Get all chat sessions"
)
async def get_sessions(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all chat sessions for the authenticated user.
    """
    return await chat_controller.get_user_sessions(current_user)

@router.get(
    "/sessions/{session_id}",
    summary="Get a specific chat session"
)
async def get_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific chat session with all messages.
    """
    return await chat_controller.get_session(session_id, current_user)

@router.delete(
    "/sessions/{session_id}",
    summary="Delete a chat session"
)
async def delete_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a chat session.
    """
    return await chat_controller.delete_session(session_id, current_user)

@router.patch(
    "/sessions/{session_id}/title",
    summary="Update session title"
)
async def update_session_title(
    session_id: str,
    request: Dict[str, str],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update the title of a chat session.
    """
    title = request.get("title", "")
    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title is required"
        )
    return await chat_controller.update_session_title(session_id, title, current_user)

@router.put(
    "/sessions/{session_id}/documents",
    summary="Update session selected documents"
)
async def update_session_documents(
    session_id: str,
    documents: list[str] = Body(..., embed=True),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update the list of selected documents for a chat session.
    """
    return await chat_controller.update_session_documents(session_id, documents, current_user)
