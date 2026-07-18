import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------

class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    is_verified: bool
    profile_picture_url: Optional[str] = None
    has_password: bool = True  # False for Google-only accounts - drives "set a password" UI
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        # Derive has_password from the ORM object rather than storing it -
        # it's just "hashed_password is not None", never persisted itself.
        instance = super().model_validate(obj, *args, **kwargs)
        instance.has_password = bool(getattr(obj, "hashed_password", None))
        return instance


class GoogleAuthRequest(BaseModel):
    id_token: str


class GithubAuthRequest(BaseModel):
    code: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageOut(BaseModel):
    message: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)


# ---------- Contact form ----------

class ContactRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    message: str = Field(min_length=10, max_length=4000)


# ---------- Interview sessions ----------

class SessionCreate(BaseModel):
    role: str = Field(min_length=2, max_length=120, examples=["Backend Engineer"])
    topic: str = Field(min_length=2, max_length=120, examples=["System Design"])
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    num_questions: int = Field(default=5, ge=3, le=20)


class AnswerOut(BaseModel):
    id: uuid.UUID
    content: str
    score: Optional[float]
    feedback: Optional[str]

    class Config:
        from_attributes = True


class QuestionOut(BaseModel):
    id: uuid.UUID
    order_index: int
    content: str
    answer: Optional[AnswerOut] = None

    class Config:
        from_attributes = True


class SessionOut(BaseModel):
    id: uuid.UUID
    role: str
    topic: str
    difficulty: str
    status: str
    overall_score: Optional[float]
    overall_feedback: Optional[str]
    preparation_strategy: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime]
    questions: List[QuestionOut] = []

    class Config:
        from_attributes = True


class SessionSummaryOut(BaseModel):
    """Lighter payload used for the dashboard / history list."""
    id: uuid.UUID
    role: str
    topic: str
    difficulty: str
    status: str
    overall_score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Answers ----------

class AnswerSubmit(BaseModel):
    content: str = Field(min_length=1)


class SessionCompleteOut(BaseModel):
    overall_score: float
    overall_feedback: str
