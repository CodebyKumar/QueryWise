from motor.motor_asyncio import AsyncIOMotorClient
from lib.config import settings
from lib.signature_guard import verify_signature
import logging
import os

verify_signature()  # Critical - DO NOT REMOVE
logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self.client = None
        self.db = None
        # Default to local if not set
        self.db_url = os.getenv("DATABASE_URL", "mongodb://localhost:27017")
        self.db_name = os.getenv("MONGO_DB_NAME", "rag_app_db")

    async def connect(self):
        """Connect to MongoDB."""
        try:
            logger.info(f"Connecting to MongoDB at {self.db_url.split('@')[-1] if '@' in self.db_url else 'localhost'}...")
            # Set a 5-second timeout for server selection to avoid hanging cold starts
            self.client = AsyncIOMotorClient(self.db_url, serverSelectionTimeoutMS=5000)
            self.db = self.client[self.db_name]
            
            # Ping with a timeout to verify connection
            import asyncio
            await asyncio.wait_for(self.client.admin.command('ping'), timeout=5.0)
            logger.info(f"Successfully connected to MongoDB database: {self.db_name}")
            
            # Create indexes (non-blocking)
            await self._create_indexes()
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise e

    async def _create_indexes(self):
        """Create necessary indexes."""
        try:
            # User Documents - Index by username
            await self.db.user_documents.create_index("username")

            # Users - Index by username and email
            await self.db.users.create_index("username", unique=True)
            await self.db.users.create_index("email", unique=True, sparse=True)
            
            # Chat Sessions - Index by session_id and username
            await self.db.chat_sessions.create_index("session_id", unique=True)
            await self.db.chat_sessions.create_index("username")
            
            # Parent Chunks - Index by id
            await self.db.parent_chunks.create_index("id", unique=True)
            

        except Exception as e:
            logger.error(f"Error creating indexes: {e}")

    async def close(self):
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

# Singleton instance
database_service = DatabaseService()
