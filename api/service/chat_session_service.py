import json
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)

class ChatSessionService:
    """Service for managing user chat sessions."""
    
    def __init__(self):
        self.sessions_path = "data/chat_sessions.json"
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self._load_sessions()
    
    def _load_sessions(self):
        """Load chat sessions from disk."""
        try:
            os.makedirs("data", exist_ok=True)
            if os.path.exists(self.sessions_path):
                with open(self.sessions_path, 'r') as f:
                    self.sessions = json.load(f)
                logger.info(f"Loaded {len(self.sessions)} chat sessions")
        except Exception as e:
            logger.error(f"Error loading chat sessions: {e}")
            self.sessions = {}
    
    def _save_sessions(self):
        """Save chat sessions to disk."""
        try:
            os.makedirs("data", exist_ok=True)
            with open(self.sessions_path, 'w') as f:
                json.dump(self.sessions, f, indent=2, default=str)
            logger.info("Saved chat sessions to disk")
        except Exception as e:
            logger.error(f"Error saving chat sessions: {e}")
    
    def create_session(self, username: str, title: str = "New Chat") -> Dict[str, Any]:
        """Create a new chat session for a user."""
        session_id = str(uuid.uuid4())
        session = {
            "session_id": session_id,
            "username": username,
            "title": title,
            "messages": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        self.sessions[session_id] = session
        self._save_sessions()
        logger.info(f"Created new session {session_id} for user {username}")
        return session
    
    def get_user_sessions(self, username: str) -> List[Dict[str, Any]]:
        """Get all sessions for a specific user."""
        user_sessions = [
            session for session in self.sessions.values()
            if session.get("username") == username
        ]
        # Sort by updated_at descending (most recent first)
        user_sessions.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return user_sessions
    
    def get_session(self, session_id: str, username: str) -> Optional[Dict[str, Any]]:
        """Get a specific session if it belongs to the user."""
        session = self.sessions.get(session_id)
        if session and session.get("username") == username:
            return session
        return None
    
    def add_message(self, session_id: str, username: str, role: str, content: str, sources: Optional[List[dict]] = None) -> bool:
        """Add a message to a session."""
        session = self.get_session(session_id, username)
        if not session:
            logger.warning(f"Session {session_id} not found for user {username}")
            return False
        
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "sources": sources
        }
        session["messages"].append(message)
        session["updated_at"] = datetime.now().isoformat()
        
        # Update title based on first user message if still "New Chat"
        if session["title"] == "New Chat" and role == "user" and len(session["messages"]) == 1:
            # Use first 50 chars of first message as title
            session["title"] = content[:50] + ("..." if len(content) > 50 else "")
        
        self._save_sessions()
        return True
    
    def delete_session(self, session_id: str, username: str) -> bool:
        """Delete a session if it belongs to the user."""
        session = self.get_session(session_id, username)
        if session:
            del self.sessions[session_id]
            self._save_sessions()
            logger.info(f"Deleted session {session_id} for user {username}")
            return True
        return False
    
    def update_session_title(self, session_id: str, username: str, title: str) -> bool:
        """Update session title."""
        session = self.get_session(session_id, username)
        if session:
            session["title"] = title
            session["updated_at"] = datetime.now().isoformat()
            self._save_sessions()
            return True
        return False

# Singleton instance
chat_session_service = ChatSessionService()
