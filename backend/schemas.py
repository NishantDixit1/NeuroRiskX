"""Request/response schemas for auth and history."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from auth import MIN_PASSWORD_LENGTH


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=MIN_PASSWORD_LENGTH, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class AssessmentResponse(BaseModel):
    id: int
    risk_score: float
    risk_band: str
    flagged: bool
    inputs: dict
    top_features: list
    created_at: datetime

    model_config = {"from_attributes": True}
