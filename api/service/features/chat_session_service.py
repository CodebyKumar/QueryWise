import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid
from service.infrastructure.database_service import database_service

logger = logging.getLogger(__name__)

class ChatSessionService:
    """Service for managing user chat sessions using MongoDB."""
    
    def __init__(self):
        pass

    async def get_collection(self):
        if database_service.db is None:
            await database_service.connect()
        return database_service.db.chat_sessions
    
    async def create_session(self, username: str, title: str = "New Chat") -> Dict[str, Any]:
        """Create a new chat session for a user."""
        try:
            collection = await self.get_collection()
            
            session_id = str(uuid.uuid4())
            session = {
                "session_id": session_id,
                "username": username,
                "title": title,
                "messages": [],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            await collection.insert_one(session)
            session.pop("_id", None)
            
            logger.info(f"Created new session {session_id} for user {username}")
            return session
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            return {}
    
    async def get_user_sessions(self, username: str) -> List[Dict[str, Any]]:
        """Get all sessions for a specific user."""
        try:
            collection = await self.get_collection()
            cursor = collection.find({"username": username}).sort("updated_at", -1)
            
            sessions = []
            async for sess in cursor:
                sess.pop("_id", None)
                sessions.append(sess)
            return sessions
        except Exception as e:
            logger.error(f"Error getting sessions for {username}: {e}")
            return []
    
    async def get_session(self, session_id: str, username: str) -> Optional[Dict[str, Any]]:
        """Get a specific session if it belongs to the user."""
        try:
            collection = await self.get_collection()
            session = await collection.find_one({"session_id": session_id, "username": username})
            if session:
                session.pop("_id", None)
                return session
            return None
        except Exception as e:
            logger.error(f"Error getting session {session_id}: {e}")
            return None
    
    async def add_message(self, session_id: str, username: str, role: str, content: str, sources: Optional[List[dict]] = None) -> bool:
        """Add a message to a session."""
        try:
            collection = await self.get_collection()
            
            # Create message object
            message = {
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat(),
                "sources": sources
            }
            
            # Update operation
            update_ops = {
                "$push": {"messages": message},
                "$set": {"updated_at": datetime.now().isoformat()}
            }
            
            # Logic to update title on first user message
            # REMOVED: Managed explicitly by controller to ensure correct API key usage
            
            result = await collection.update_one(
                {"session_id": session_id, "username": username},
                update_ops
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error adding message to {session_id}: {e}")
            return False
            
    async def update_session_title_if_needed(self, session_id: str, username: str, content: str, api_keys: Dict[str, str] = {}):
        """Helper to update title if it's currently 'New Chat'."""
        try:
            collection = await self.get_collection()
            session = await collection.find_one({"session_id": session_id, "username": username})
            
            if session and session.get("title") == "New Chat":
                from service.rag.gemini_service import gemini_service
                from service.rag.groq_service import groq_service
                
                groq_key = api_keys.get("groq_api_key") if isinstance(api_keys, dict) else None
                google_key = api_keys.get("google_api_key") if isinstance(api_keys, dict) else api_keys
                
                if groq_key:
                    new_title = await groq_service.generate_chat_title(content, api_key=groq_key)
                else:
                    new_title = await gemini_service.generate_chat_title(content, api_key=google_key)
                
                if new_title and new_title != "New Chat":
                    await collection.update_one(
                        {"session_id": session_id},
                        {"$set": {"title": new_title, "updated_at": datetime.now().isoformat()}}
                    )
                    logger.info(f"Auto-named session {session_id} to '{new_title}'")
        except Exception as e:
            logger.error(f"Error updating title: {e}")
    
    async def delete_session(self, session_id: str, username: str) -> bool:
        """Delete a session if it belongs to the user."""
        try:
            collection = await self.get_collection()
            result = await collection.delete_one({"session_id": session_id, "username": username})
            
            if result.deleted_count > 0:
                logger.info(f"Deleted session {session_id} for user {username}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting session: {e}")
            return False
    
    async def update_session_title(self, session_id: str, username: str, title: str) -> bool:
        """Update session title."""
        try:
            collection = await self.get_collection()
            result = await collection.update_one(
                {"session_id": session_id, "username": username},
                {"$set": {"title": title, "updated_at": datetime.now().isoformat()}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating session title: {e}")
            return False

    async def update_session_documents(self, session_id: str, username: str, documents: List[str]) -> bool:
        """Update selected documents for a session."""
        try:
            collection = await self.get_collection()
            result = await collection.update_one(
                {"session_id": session_id, "username": username},
                {"$set": {"selected_documents": documents, "updated_at": datetime.now().isoformat()}}
            )
            return result.modified_count > 0 or result.matched_count > 0
        except Exception as e:
            logger.error(f"Error updating session documents: {e}")
            return False

# Singleton instance
chat_session_service = ChatSessionService()
