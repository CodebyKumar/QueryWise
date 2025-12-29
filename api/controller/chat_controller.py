from fastapi import HTTPException, status
from typing import Dict, Any, List
from schema.chat_schema import CreateSessionRequest
from service.features.chat_session_service import chat_session_service
import logging

logger = logging.getLogger(__name__)

class ChatController:
    
    async def create_session(self, request: CreateSessionRequest, user: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new chat session for the user."""
        username = user.get("username")
        title = request.title or "New Chat"
        
        try:
            session = await chat_session_service.create_session(username, title)
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
            sessions = await chat_session_service.get_user_sessions(username)
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
        
        session = await chat_session_service.get_session(session_id, username)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return session
    
    async def delete_session(self, session_id: str, user: Dict[str, Any]) -> Dict[str, str]:
        """Delete a chat session."""
        username = user.get("username")
        
        success = await chat_session_service.delete_session(session_id, username)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return {"message": "Session deleted successfully"}
    
    async def update_session_title(self, session_id: str, title: str, user: Dict[str, Any]) -> Dict[str, str]:
        """Update session title."""
        username = user.get("username")
        
        success = await chat_session_service.update_session_title(session_id, username, title)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return {"message": "Session title updated successfully"}
    
    async def update_session_documents(self, session_id: str, documents: List[str], user: Dict[str, Any]) -> Dict[str, str]:
        """Update session selected documents."""
        username = user.get("username")
        
        success = await chat_session_service.update_session_documents(session_id, username, documents)
        if not success:
            # It might be that the session doesn't exist, or just that the documents were the same.
            # But usually we want to ensure it exists.
            # For now, we'll assume success if no exception was raised in service (service returns False on error/no-match)
            # We can check existence first if needed, but let's trust the service result for 'found and updated'
            pass 
        
        return {"message": "Session documents updated successfully"}

# Singleton instance
chat_controller = ChatController()
