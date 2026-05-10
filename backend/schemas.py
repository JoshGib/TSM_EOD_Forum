from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

#user schemas
class UserSignup(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        from_attributes = True

#thread schemas
class ThreadCreate(BaseModel):
    title: str
    category: str
    content: str

class ThreadOut(BaseModel):
    id: int
    title: str
    category: str
    content: str
    views: int
    likes_count: int
    is_pinned: bool
    is_locked: bool
    created_at: datetime
    user_id: int 
    author_username: str
    replies_count: int

    class Config:
        from_attributes = True

#comment schemas
class CommentCreate(BaseModel):
    content: str
    thread_id: int
    parent_comment_id: Optional[int] = None

class CommentOut(BaseModel):
    id: int
    content: str
    thread_id: int
    parent_comment_id: Optional[int] = None
    created_at: datetime
    user_id: int
    username: str
    replies: list = []

    class Config:
        from_attributes = True


#report schemas
class ReportCreate(BaseModel):
    reason: str
    thread_id: Optional[int] = None
    comment_id: Optional[int] = None
    reported_user_id: Optional[int] = None