from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Body
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List, Optional
from schema.rag_schema import DocumentPayload, QueryRequest, QueryResponse
from controller.rag_controller import rag_controller
from service.infrastructure.auth_service import get_current_user

router = APIRouter(
    prefix="/rag",
    tags=["RAG Service"],
    responses={404: {"description": "Not found"}},
)

@router.post("/delete-documents", summary="Delete documents and their vectors for the user")
async def delete_documents(
    filenames: list = Body(..., embed=True, description="List of filenames to delete"),
    current_user: dict = Depends(get_current_user)
):
    """Delete documents and all related vector data for the user."""
    return await rag_controller.delete_documents(filenames, current_user)

@router.post(
    "/upload-and-index",
    status_code=status.HTTP_201_CREATED,
    summary="Upload and index a file"
)
async def upload_and_index_file(
    file: UploadFile = File(..., description="The document file to be indexed (pdf, docx, html, md, txt)."),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Accepts a file, extracts its text content, and then processes it
    through the indexing module.

    This is a protected endpoint and requires authentication.
    """
    return await rag_controller.upload_and_index_file(file, current_user)


@router.post(
    "/index",
    status_code=status.HTTP_201_CREATED,
    summary="Index document from text payload"
)
async def index_document(
    document: DocumentPayload,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Accepts document content as a JSON payload and processes it through the
    indexing module.

    This is a protected endpoint and requires authentication.
    """
    return await rag_controller.process_and_index_document(document, current_user)


@router.post(
    "/query",
    response_model=QueryResponse,
    summary="Ask a question to the RAG system"
)
async def query_documents(
    query_request: QueryRequest,
    session_id: Optional[str] = Query(None, description="Session ID to save conversation"),
    documents: Optional[List[str]] = Query(None, description="List of document IDs to filter retrieval"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Accepts a user query and orchestrates the full RAG pipeline:
    1.  **Pre-retrieval**: Enhances the query.
    2.  **Retrieval**: Fetches relevant documents.
    3.  **Post-retrieval**: Reranks documents for relevance.
    4.  **Generation**: Creates a final answer based on the context.

    Optionally provide session_id to save the conversation to a chat session.
    Optionally provide documents list to filter retrieval to specific documents.

    This is a protected endpoint and requires authentication.
    """
    return await rag_controller.orchestrate_rag_flow(query_request, current_user, session_id, documents)


@router.post(
    "/query-stream",
    summary="Ask a question to the RAG system with streaming response"
)
async def query_documents_stream(
    query_request: QueryRequest,
    session_id: Optional[str] = Query(None, description="Session ID to save conversation"),
    documents: Optional[List[str]] = Query(None, description="List of document IDs to filter retrieval"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Streaming version of /rag/query delivering response tokens as Server-Sent Events.
    """
    return StreamingResponse(
        rag_controller.orchestrate_rag_flow_stream(query_request, current_user, session_id, documents),
        media_type="text/event-stream"
    )


@router.get(
    "/documents",
    summary="List all indexed documents"
)
async def list_documents(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns a list of all indexed documents with their metadata.
    
    This is a protected endpoint and requires authentication.
    """
    return await rag_controller.get_indexed_documents(current_user)


@router.get("/health", summary="Health Check")
async def rag_health_check():
    """
    Simple health check endpoint to confirm the RAG service is running.
    """
    return {
        "status": "healthy",
        "service": "rag",
        "message": "RAG service is operational"
    }

