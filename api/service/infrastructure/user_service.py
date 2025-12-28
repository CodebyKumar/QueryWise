from typing import Optional, Dict, Any
from service.infrastructure.database_service import database_service
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

class UserService:
    """Service for managing users in MongoDB."""

    def __init__(self):
        pass

    async def get_collection(self):
        if database_service.db is None:
            await database_service.connect()
        return database_service.db.users

    async def create_user(self, username: str, hashed_password: str, email: Optional[str] = None) -> Dict[str, Any]:
        """Create a new user in MongoDB."""
        try:
            collection = await self.get_collection()
            
            # Check if username already exists
            existing_user = await collection.find_one({"username": username})
            if existing_user:
                raise ValueError(f"Username '{username}' is already taken")
            
            # Generate unique user_id
            user_id = str(uuid.uuid4())
            
            user_data = {
                "user_id": user_id,
                "username": username,
                "hashed_password": hashed_password,
                "email": email,
                "created_at": datetime.utcnow().isoformat(),
                "is_active": True
            }
            
            result = await collection.insert_one(user_data)
            
            # Return user data with proper simple types
            user_data["_id"] = str(result.inserted_id)
            return user_data
            
        except Exception as e:
            logger.error(f"Error creating user {username}: {e}")
            raise e

    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Retrieve a user by username."""
        try:
            collection = await self.get_collection()
            user = await collection.find_one({"username": username})
            
            if user:
                user["_id"] = str(user["_id"])
                return user
            return None
            
        except Exception as e:
            logger.error(f"Error fetching user {username}: {e}")
            return None

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a user by user_id."""
        try:
            collection = await self.get_collection()
            user = await collection.find_one({"user_id": user_id})
            
            if user:
                user["_id"] = str(user["_id"])
                return user
            return None
            
        except Exception as e:
            logger.error(f"Error fetching user by id {user_id}: {e}")
            return None

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieve a user by email."""
        try:
            if not email:
                return None
                
            collection = await self.get_collection()
            user = await collection.find_one({"email": email})
            
            if user:
                user["_id"] = str(user["_id"])
                return user
            return None
            
        except Exception as e:
            logger.error(f"Error fetching user by email {email}: {e}")
            return None

# Singleton instance
user_service = UserService()
