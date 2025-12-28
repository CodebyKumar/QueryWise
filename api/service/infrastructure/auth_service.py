from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from lib.config import settings
from service.infrastructure.user_service import user_service
from schema.token_schema import TokenData
import logging
import hashlib
import secrets
import base64

# Password hashing using Python's built-in hashlib (more reliable than bcrypt)
def _hash_password_with_salt(password: str, salt: bytes) -> str:
    """Hash password with salt using PBKDF2-SHA256"""
    password_bytes = password.encode('utf-8')
    hash_bytes = hashlib.pbkdf2_hmac('sha256', password_bytes, salt, 100000)
    return base64.b64encode(salt + hash_bytes).decode('ascii')

def _verify_password_with_salt(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    try:
        decoded = base64.b64decode(hashed.encode('ascii'))
        salt = decoded[:16]  # First 16 bytes are salt
        stored_hash = decoded[16:]  # Rest is the hash
        
        password_bytes = password.encode('utf-8')
        new_hash = hashlib.pbkdf2_hmac('sha256', password_bytes, salt, 100000)
        
        return secrets.compare_digest(stored_hash, new_hash)
    except Exception:
        return False

# HTTP Bearer token scheme
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return _verify_password_with_salt(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password using PBKDF2-SHA256"""
    # Generate a random salt
    salt = secrets.token_bytes(16)
    return _hash_password_with_salt(password, salt)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt

def verify_token(token: str) -> Optional[TokenData]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        token_data = TokenData(user_id=user_id)
        return token_data
    except JWTError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """FastAPI dependency to get the current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(credentials.credentials)
    if token_data is None:
        raise credentials_exception
    
    # Use user_service to fetch user from MongoDB
    user = await user_service.get_user_by_id(user_id=token_data.user_id)
    if user is None:
        raise credentials_exception
    
    return user

async def authenticate_user(username: str, password: str):
    """Authenticate a user with username and password"""
    # Use user_service to fetch user from MongoDB
    user = await user_service.get_user_by_username(username)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user