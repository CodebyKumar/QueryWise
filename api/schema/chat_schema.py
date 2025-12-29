from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ChatMessage(BaseModel):
    """Schema for a single chat message."""
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.now)
    sources: Optional[List[dict]] = Field(default=None, description="Source documents for assistant messages")

class ChatSession(BaseModel):
    """Schema for a chat session."""
    session_id: str = Field(..., description="Unique session identifier")
    username: str = Field(..., description="Username of the session owner")
    title: str = Field(default="New Chat", description="Session title")
    selected_documents: List[str] = Field(default_factory=list, description="List of document identifiers selected for this session")
    messages: List[ChatMessage] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class CreateSessionRequest(BaseModel):
    """Schema for creating a new chat session."""
    title: Optional[str] = Field(default="New Chat", description="Session title")

class SessionListResponse(BaseModel):
    """Schema for listing chat sessions."""
    sessions: List[dict]
    total: int
