from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

from app.core.config import settings


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(BaseModel):
    email: str
    password: str = Field(..., max_length=30)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=30)


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


# Query History Schemas
class QueryHistoryBase(BaseModel):
    natural_question: str


class QueryHistoryCreate(QueryHistoryBase):
    generated_sql: str
    execution_result: Optional[str] = None
    error_message: Optional[str] = None


class QueryHistoryResponse(QueryHistoryBase):
    id: int
    user_id: int
    generated_sql: str
    execution_result: Optional[str]
    error_message: Optional[str]
    is_bookmarked: bool
    created_at: Optional[datetime] = None
    explanation: Optional[str] = None

    class Config:
        from_attributes = True


# Query Request/Response Schemas
class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=settings.MAX_QUESTION_LENGTH)
    connection_string: Optional[str] = None


class SchemaRequest(BaseModel):
    connection_string: Optional[str] = None


class QueryResponse(BaseModel):
    sql: str
    explanation: str
    result: Optional[List[dict]] = None
    error: Optional[str] = None
    columns: Optional[List[str]] = None


# Schema Introspection
class ColumnInfo(BaseModel):
    table_name: str
    column_name: str
    data_type: str
    is_nullable: str


class SchemaResponse(BaseModel):
    tables: List[dict]
