from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from schema.user_schema import UserCreate, UserLogin, UserAPIKeysUpdate
from schema.token_schema import Token
from controller.auth_controller import auth_controller
from service.infrastructure.auth_service import get_current_user

router = APIRouter()

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    """
    Register a new user
    """
    return await auth_controller.register_user(user_data)

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """
    Authenticate user and return access token
    """
    return await auth_controller.login_for_access_token(user_credentials)

@router.get("/me")
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get current user information (Protected route)
    """
    # Remove sensitive information
    from lib.config import settings
    api_keys = current_user.get("api_keys", {})
    configured_providers = list(api_keys.keys())
    
    if settings.google_api_key and "google_api_key" not in configured_providers:
        configured_providers.append("google_api_key")
    if settings.groq_api_key and "groq_api_key" not in configured_providers:
        configured_providers.append("groq_api_key")
    if settings.sarvam_api_key and "sarvam_api_key" not in configured_providers:
        configured_providers.append("sarvam_api_key")

    user_info = {
        "username": current_user["username"],
        "email": current_user.get("email"),
        "created_at": current_user.get("created_at"),
        "is_active": current_user.get("is_active", True),
        "configured_providers": configured_providers
    }
    return {"user": user_info}

@router.put("/me/api-keys")
async def update_api_keys(
    api_keys_data: UserAPIKeysUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update API keys for the current user
    """
    return await auth_controller.update_api_keys(current_user["user_id"], api_keys_data)

@router.get("/health")
async def auth_health_check():
    """
    Health check endpoint for auth service
    """
    return {
        "status": "healthy",
        "service": "auth",
        "message": "Authentication service is operational"
    }