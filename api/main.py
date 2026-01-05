import logging
import os

# Disable tokenizers parallelism to avoid deadlocks/warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- Import routers and services ---
from routes.auth import router as auth_router
from routes.rag import router as rag_router
from routes.chat import router as chat_router
from routes.export import router as export_router
from routes.speech import router as speech_router
from routes.query_routes import router as query_router
from routes.visualization import router as visualization_router
from service.infrastructure.database_service import database_service
from service.rag.pinecone_service import pinecone_service
from service.rag.gemini_service import gemini_service
from service.features.sql_analysis_service import sql_analysis_service
from service.features.database_visualization_service import DatabaseVisualizationService
import service.features.database_visualization_service as viz_service_module

# --- Logging configuration ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# --- Lifespan context manager for startup/shutdown ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events.
    Only connects to database on startup to avoid serverless cold-start failures.
    """
    logger.info("Starting QueryWise API...")
    
    # Connect to MongoDB
    try:
        await database_service.connect()
        logger.info("Connected to MongoDB.")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}. Check DATABASE_URL environment variable.")

    # Initialize Pinecone
    try:
        if not pinecone_service.initialize():
            logger.warning("Pinecone initialization returned false. Check configuration.")
    except Exception as e:
        logger.error(f"Failed to initialize Pinecone: {e}")

    # Initialize Gemini
    try:
        if not await gemini_service.initialize_gemini():
            logger.warning("Gemini initialization returned false.")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini: {e}")

    logger.info("Initialized Groq service.")
    
    # Initialize Database Visualization Service
    try:
        viz_service_module.database_visualization_service = DatabaseVisualizationService(sql_analysis_service)
        logger.info("Initialized Database Visualization service.")
    except Exception as e:
        logger.error(f"Failed to initialize Database Visualization service: {e}")

    yield  # Application is running

    # Shutdown
    logger.info("Shutting down QueryWise API...")
    await database_service.close()
    logger.info("MongoDB connection closed.")

# --- FastAPI application ---
app = FastAPI(
    title="QueryWise API",
    description="Modular RAG backend with JWT auth, MongoDB, and Pinecone",
    version="1.0.0",
    lifespan=lifespan
)

# --- CORS middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Health check endpoints ---
@app.get("/")
async def root():
    return {"message": "QueryWise API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "QueryWise API"}

# --- Include API routers ---
app.include_router(auth_router)
app.include_router(rag_router)
app.include_router(chat_router)
app.include_router(export_router)
app.include_router(speech_router)
app.include_router(query_router)
app.include_router(visualization_router)

# --- Main entry point for local development ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
