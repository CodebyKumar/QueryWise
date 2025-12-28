from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Username must be between 3 and 50 characters")
    password: str = Field(..., min_length=6, max_length=128, description="Password must be between 6 and 128 characters")
    email: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        # Check if password is too long for bcrypt (72 bytes)
        if len(v.encode('utf-8')) > 128:
            raise ValueError('Password is too long. Maximum length is 128 characters.')
        return v
    
    @validator('username')
    def validate_username(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, underscores, and hyphens')
        return v

class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)

class UserInDB(BaseModel):
    user_id: str
    username: str
    hashed_password: str
    email: Optional[str] = None
    created_at: datetime
    is_active: bool = True

class User(BaseModel):
    user_id: str
    username: str
    email: Optional[str] = None
    created_at: datetime
    is_active: bool = True