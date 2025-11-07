# Modular RAG API Documentation

## Overview
A production-ready FastAPI backend implementing an advanced Modular RAG (Retrieval-Augmented Generation) system with JWT authentication, vector search, and intelligent document processing.

**Version:** 1.0.0  
**Base URL:** `http://localhost:8000`  
**Tech Stack:** FastAPI, Python 3.13, Google Gemini AI, FAISS Vector Store

---

## Architecture

### Project Structure
```
api/
├── main.py                    # Application entry point & lifespan management
├── controller/                # Business logic layer
│   ├── auth_controller.py     # Authentication logic
│   └── rag_controller.py      # RAG orchestration logic
├── routes/                    # API endpoint definitions
│   ├── auth.py                # Auth routes
│   └── rag.py                 # RAG routes
├── service/                   # External service integrations
│   ├── auth_service.py        # JWT & password handling
│   ├── gemini_service.py      # Google Gemini AI integration
│   ├── pinecone_service.py    # FAISS vector store (Pinecone simulation)
│   ├── rag_modules_service.py # Core RAG modules implementation
│   └── file_processing_service.py # Document text extraction
├── schema/                    # Pydantic data models
│   ├── user_schema.py         # User & auth models
│   ├── token_schema.py        # JWT token models
│   └── rag_schema.py          # RAG request/response models
├── lib/                       # Utilities & configuration
│   ├── config.py              # Environment settings
│   └── utils.py               # Helper functions
└── data/                      # Persistent storage
    ├── faiss_index.bin        # Vector embeddings
    ├── metadata_store.json    # Document metadata
    └── parent_chunks.json     # Large context chunks
```

---

## Core Features

### 1. Authentication System
- **JWT-based authentication** with secure token generation
- **Password hashing** using bcrypt
- **User registration & login** with validation
- **Protected routes** requiring Bearer token authentication
- **Token expiration** (configurable, default: 30 minutes)

### 2. Modular RAG Pipeline
Advanced RAG implementation with 5 specialized modules:

#### **Indexing Module**
- **Small-to-Big Chunking Strategy**
  - Parent chunks (1000 chars) for context
  - Child chunks (300 chars) for precise retrieval
  - Sentence-level splitting for semantic coherence
- **Vector embeddings** via Google Gemini (768 dimensions)
- **Metadata preservation** with document lineage tracking

#### **Pre-Retrieval Module**
- **HyDE (Hypothetical Document Embeddings)**
  - Generates hypothetical answers to queries
  - Improves semantic matching accuracy
  - Bridges vocabulary gap between query and documents

#### **Retrieval Module**
- **Hybrid retrieval approach**
  - Searches child chunks for precision
  - Returns parent chunks for context
  - FAISS vector similarity search
- **Configurable top-k results** (1-10 documents)

#### **Post-Retrieval Module**
- **Model-based reranking**
  - Uses Gemini as cross-encoder
  - Evaluates query-document relevance
  - Filters top 5 most relevant chunks

#### **Generation Module**
- **Context-aware answer generation**
- **Strict grounding** in retrieved documents
- **Fallback handling** for missing information

### 3. Document Processing
Supports multiple file formats:
- **PDF** (.pdf) - Text extraction from pages
- **Word** (.docx) - Paragraph extraction
- **HTML** (.html) - Clean text extraction
- **Markdown** (.md) - Converted to text
- **Plain Text** (.txt) - Direct processing

### 4. Vector Storage
- **FAISS-based local vector store** (simulating Pinecone)
- **Persistent storage** with JSON metadata
- **Parent-child chunk linking** for context preservation
- **Efficient similarity search** with cosine distance

---

## API Endpoints

### General Endpoints

#### `GET /`
Welcome message and API status.

**Response:**
```json
{
  "message": "Welcome to the Modular RAG API"
}
```

#### `GET /health`
Health check for API availability.

**Response:**
```json
{
  "status": "healthy",
  "message": "API is operational"
}
```

---

### Authentication Endpoints

#### `POST /signup`
Register a new user account.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "secure_password123",
  "email": "john@example.com"
}
```

**Validation Rules:**
- Username: 3-50 characters, alphanumeric with underscores/hyphens
- Password: 6-128 characters
- Email: Optional, valid email format

**Response (201):**
```json
{
  "message": "User registered successfully",
  "username": "john_doe",
  "email": "john@example.com"
}
```

**Errors:**
- `400` - Username already exists
- `422` - Validation error

---

#### `POST /login`
Authenticate and receive access token.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "secure_password123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Errors:**
- `401` - Invalid credentials

---

#### `GET /me`
Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "user": {
    "username": "john_doe",
    "email": "john@example.com",
    "created_at": "2025-11-07T10:30:00",
    "is_active": true
  }
}
```

**Errors:**
- `401` - Invalid or expired token

---

### RAG Endpoints

#### `POST /rag/upload-and-index`
Upload and index a document file.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request (Form Data):**
- `file`: Document file (pdf, docx, html, md, txt)

**Response (201):**
```json
{
  "message": "Document 'filename' indexed successfully."
}
```

**Errors:**
- `401` - Unauthorized
- `415` - Unsupported file type
- `500` - Indexing failed

---

#### `POST /rag/index`
Index document from JSON payload.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Machine Learning Basics",
  "content": "Machine learning is a subset of artificial intelligence...",
  "metadata": {
    "author": "John Doe",
    "category": "AI"
  }
}
```

**Response (201):**
```json
{
  "message": "Document 'Machine Learning Basics' indexed successfully."
}
```

---

#### `POST /rag/query`
Query the RAG system with a question.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "What is machine learning?",
  "top_k": 5
}
```

**Parameters:**
- `query` (required): User's question
- `top_k` (optional): Number of source documents (1-10, default: 5)

**Response (200):**
```json
{
  "answer": "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed...",
  "sources": [
    {
      "id": "parent_abc123",
      "content": "Machine learning is a subset of artificial intelligence...",
      "title": "Machine Learning Basics",
      "score": 0.92
    }
  ]
}
```

**Errors:**
- `401` - Unauthorized
- `500` - Query processing failed

---

#### `GET /rag/documents`
Get list of all indexed documents.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "documents": [
    {
      "title": "AIB_phase1",
      "filename": "AIB_phase1.pdf",
      "chunks": 5,
      "indexed": true
    },
    {
      "title": "Machine Learning Basics",
      "filename": "ml_basics.docx",
      "chunks": 12,
      "indexed": true
    }
  ],
  "total": 2
}
```

**Errors:**
- `401` - Unauthorized
- `500` - Server error

---

#### `GET /rag/health`
Health check for RAG service.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "rag",
  "message": "RAG service is operational"
}
```

---

### Chat Session Endpoints

#### `POST /chat/sessions`
Create a new chat session.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "My Chat Session"
}
```

**Response (201):**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john_doe",
  "title": "My Chat Session",
  "messages": [],
  "created_at": "2025-11-07T10:30:00",
  "updated_at": "2025-11-07T10:30:00"
}
```

---

#### `GET /chat/sessions`
Get all chat sessions for the authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "sessions": [
    {
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "title": "What is machine learning?",
      "messages": [...],
      "created_at": "2025-11-07T10:30:00",
      "updated_at": "2025-11-07T10:35:00"
    }
  ],
  "total": 1
}
```

---

#### `GET /chat/sessions/{session_id}`
Get a specific chat session with all messages.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john_doe",
  "title": "What is machine learning?",
  "messages": [
    {
      "role": "user",
      "content": "What is machine learning?",
      "timestamp": "2025-11-07T10:30:00",
      "sources": null
    },
    {
      "role": "assistant",
      "content": "Machine learning is...",
      "timestamp": "2025-11-07T10:30:05",
      "sources": [...]
    }
  ],
  "created_at": "2025-11-07T10:30:00",
  "updated_at": "2025-11-07T10:30:05"
}
```

**Errors:**
- `401` - Unauthorized
- `404` - Session not found

---

#### `DELETE /chat/sessions/{session_id}`
Delete a chat session.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Session deleted successfully"
}
```

**Errors:**
- `401` - Unauthorized
- `404` - Session not found

---

#### `PATCH /chat/sessions/{session_id}/title`
Update the title of a chat session.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "New Session Title"
}
```

**Response (200):**
```json
{
  "message": "Session title updated successfully"
}
```

**Errors:**
- `400` - Title is required
- `401` - Unauthorized
- `404` - Session not found

---

## Configuration

### Environment Variables
Create a `.env` file in the `api/` directory:

```env
# JWT Configuration
JWT_SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Service Keys
GOOGLE_API_KEY=your-google-gemini-api-key
PINECONE_API_KEY=optional-for-future-use

# Embedding Settings
EMBEDDING_DIM=768

# Application
ENVIRONMENT=development
```

### Key Settings
- **JWT_SECRET_KEY**: Secret for signing tokens (change in production!)
- **GOOGLE_API_KEY**: Required for Gemini embeddings & generation
- **ACCESS_TOKEN_EXPIRE_MINUTES**: Token validity duration
- **EMBEDDING_DIM**: Vector dimension (768 for Gemini embedding-001)

---

## Setup & Installation

### Prerequisites
- Python 3.11+
- uv package manager

### Installation Steps

1. **Navigate to API directory:**
```bash
cd api
```

2. **Create virtual environment:**
```bash
uv venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. **Install dependencies:**
```bash
uv sync
```

4. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

5. **Run the server:**
```bash
python main.py
# Or: uvicorn main:app --reload
```

Server runs at: `http://localhost:8000`  
API docs: `http://localhost:8000/docs`

---

## Usage Examples

### Authentication Flow
```bash
# 1. Register
curl -X POST http://localhost:8000/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123","email":"test@example.com"}'

# 2. Login
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# Response: {"access_token":"eyJ...","token_type":"bearer"}
```

### Document Indexing
```bash
# Upload file
curl -X POST http://localhost:8000/rag/upload-and-index \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf"

# Index JSON
curl -X POST http://localhost:8000/rag/index \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Doc","content":"This is test content..."}'
```

### Querying
```bash
curl -X POST http://localhost:8000/rag/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is the main topic?","top_k":3}'
```

---

## Technical Details

### RAG Pipeline Flow
1. **User submits query** → Pre-retrieval enhancement (HyDE)
2. **Enhanced query** → Embedding generation
3. **Vector search** → Retrieve child chunks (top 2k)
4. **Fetch parent chunks** → Get full context
5. **Rerank** → Model-based relevance scoring
6. **Generate answer** → Context-aware response with sources

### Chunking Strategy
- **Parent chunks**: 1000 characters, 100 char overlap
- **Child chunks**: Sentence-level splits (min 20 chars)
- **Linking**: Each child references parent ID
- **Storage**: Children in FAISS, parents in JSON store

### Security Features
- Password hashing with bcrypt (cost factor 12)
- JWT tokens with expiration
- Protected routes with dependency injection
- Input validation with Pydantic
- CORS middleware for frontend integration

---

## Error Handling

### Common Error Codes
- **400** - Bad Request (validation errors, duplicate user)
- **401** - Unauthorized (invalid/expired token)
- **404** - Not Found
- **415** - Unsupported Media Type (invalid file format)
- **422** - Unprocessable Entity (schema validation)
- **500** - Internal Server Error (service failures)

### Error Response Format
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Performance Considerations

- **Embedding generation**: ~1-2s per document chunk
- **Vector search**: <100ms for typical queries
- **Reranking**: ~500ms for 10 documents
- **End-to-end query**: 2-4 seconds typical

### Optimization Tips
- Index documents in batches during off-peak hours
- Use appropriate `top_k` values (3-5 recommended)
- Monitor FAISS index size for memory usage
- Consider caching for frequently asked queries

---

## Future Enhancements

- Database integration (PostgreSQL/MongoDB)
- Real Pinecone cloud vector store
- Multi-user document isolation
- Advanced query analytics
- Streaming response generation
- Document update/deletion endpoints
- Batch indexing API
- Query history tracking

---

## Support & Troubleshooting

### Common Issues

**Issue**: "Failed to initialize Gemini service"  
**Solution**: Check GOOGLE_API_KEY in .env file

**Issue**: "No documents retrieved"  
**Solution**: Ensure documents are indexed first via /rag/index or /rag/upload-and-index

**Issue**: Token expired  
**Solution**: Login again to get a new access token

### Logs
Application logs include:
- Service initialization status
- User authentication events
- Document indexing progress
- Query processing steps
- Error stack traces

Check console output for detailed debugging information.

---

**Last Updated:** November 7, 2025  
**Maintained By:** Development Team
