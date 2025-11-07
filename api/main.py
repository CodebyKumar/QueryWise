import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import your services and routers
from service.gemini_service import gemini_service
from service.pinecone_service import pinecone_service
from routes.auth import router as auth_router
from routes.rag import router as rag_router
from routes.chat import router as chat_router

# --- Basic Logging Configuration ---
# This will help you see the application startup and shutdown messages in the console.
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# --- Lifespan Event Handler ---
# This async context manager will handle startup and shutdown events.
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown events.
    Initializes required services on startup.
    """
    # --- Startup ---
    logger.info("Application startup: Initializing services...")
    
    # Initialize the Google Gemini client
    gemini_initialized = await gemini_service.initialize_gemini()
    if not gemini_initialized:
        logger.critical("Failed to initialize Gemini service. Application startup aborted.")
        # In a real-world scenario, you might want the app to fail to start
        # raise RuntimeError("Could not initialize Gemini Service")
    
    # Initialize the local FAISS vector store (simulating Pinecone)
    pinecone_initialized = await pinecone_service.initialize_pinecone()
    if not pinecone_initialized:
        logger.critical("Failed to initialize Pinecone (FAISS) service. Application startup aborted.")
        # raise RuntimeError("Could not initialize Pinecone Service")

    logger.info("Services initialized successfully.")
    
    yield  # --- The application is now running ---
    
    # --- Shutdown ---
    logger.info("Application shutdown: Cleaning up resources...")
    # Add any cleanup logic here if needed in the future (e.g., closing database connections)
    logger.info("Cleanup complete.")

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Modular RAG API",
    description="A FastAPI backend implementing the Modular RAG framework with JWT authentication and local vector storage.",
    version="1.0.0",
    lifespan=lifespan  # Attach the lifespan event handler
)

# --- CORS Middleware ---
# Allows frontend applications to communicate with your API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict this to your frontend's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Routers ---
# Include the authentication, RAG, and chat endpoints
app.include_router(auth_router)
app.include_router(rag_router) # The prefix is already defined in the router file
app.include_router(chat_router) # Chat session management

# --- Root and Health Check Endpoints ---
@app.get("/", tags=["General"])
async def root():
    return {"message": "Welcome to the Modular RAG API"}

@app.get("/health", tags=["General"])
async def health_check():
    return {"status": "healthy", "message": "API is operational"}

# --- Main Entry Point for Development ---
if __name__ == "__main__":
    import uvicorn
    # Use reload=True for development to automatically restart the server on code changes
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
