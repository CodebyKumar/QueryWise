from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class DocumentPayload(BaseModel):
    """Schema for a document to be indexed."""
    content: str = Field(..., description="The main text content of the document.")
    title: Optional[str] = Field(None, description="The title of the document.")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata for the document.")

class QueryRequest(BaseModel):
    """Schema for a user's query."""
    query: str = Field(..., description="The user's question.")
    top_k: int = Field(5, gt=0, le=15, description="The number of source documents to return.")
    model: Optional[str] = Field("gemini-2.5-flash", description="The model to use for generation.")
    response_style: Optional[str] = Field("auto", description="Response style: 'auto' (detect from query), 'detailed', 'concise', or 'balanced'")
    retrieval_multiplier: Optional[int] = Field(4, gt=1, le=10, description="Multiplier for initial retrieval pool size (retrieves top_k * multiplier before reranking)")

class SourceDocument(BaseModel):
    """Schema representing a source document chunk used for the answer."""
    id: str
    content: str
    title: Optional[str] = None
    score: Optional[float] = None
    retrieval_score: Optional[float] = None

class QueryResponse(BaseModel):
    """Schema for the final RAG response."""
    answer: str = Field(..., description="The generated answer to the query.")
    sources: List[SourceDocument] = Field(..., description="A list of source documents that informed the answer.")
