from fastapi import HTTPException, status
from typing import Dict, Any, List
from schema.chat_schema import CreateSessionRequest
from service.chat_session_service import chat_session_service
import logging

logger = logging.getLogger(__name__)

class ChatController:
    
    async def create_session(self, request: CreateSessionRequest, user: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new chat session for the user."""
        username = user.get("username")
        title = request.title or "New Chat"
        
        try:
            session = chat_session_service.create_session(username, title)
            return session
        except Exception as e:
            logger.error(f"Error creating session for user {username}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create chat session"
            )
    
    async def get_user_sessions(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """Get all chat sessions for the user."""
        username = user.get("username")
        
        try:
            sessions = chat_session_service.get_user_sessions(username)
            return {
                "sessions": sessions,
                "total": len(sessions)
            }
        except Exception as e:
            logger.error(f"Error getting sessions for user {username}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve chat sessions"
            )
    
    async def get_session(self, session_id: str, user: Dict[str, Any]) -> Dict[str, Any]:
        """Get a specific chat session."""
        username = user.get("username")
        
        session = chat_session_service.get_session(session_id, username)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return session
    
    async def delete_session(self, session_id: str, user: Dict[str, Any]) -> Dict[str, str]:
        """Delete a chat session."""
        username = user.get("username")
        
        success = chat_session_service.delete_session(session_id, username)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return {"message": "Session deleted successfully"}
    
    async def update_session_title(self, session_id: str, title: str, user: Dict[str, Any]) -> Dict[str, str]:
        """Update session title."""
        username = user.get("username")
        
        success = chat_session_service.update_session_title(session_id, username, title)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return {"message": "Session title updated successfully"}

# Singleton instance
chat_controller = ChatController()
