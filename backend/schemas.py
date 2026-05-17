from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
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


class UserProfileOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    is_banned: bool
    ban_reason: Optional[str] = None
    ban_expires_at: Optional[datetime] = None


class UserProfileUpdate(BaseModel):
    username: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

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
    replies: List[Any] = []

    class Config:
        from_attributes = True


#report schemas
class ReportingFlagOut(BaseModel):
    userId: int
    userName: str
    reason: str
    timestamp: datetime


class ReportCreate(BaseModel):
    reason: str
    thread_id: Optional[int] = None
    comment_id: Optional[int] = None
    reported_user_id: Optional[int] = None

class ReportOut(BaseModel):
    id: int
    reporter_id: int
    reported_user_id: Optional[int] = None
    thread_id: Optional[int] = None
    comment_id: Optional[int] = None
    status: str
    priority: str
    created_at: datetime

    comment_content: Optional[str] = None
    author_id: Optional[int] = None
    author_name: Optional[str] = None
    thread_title: Optional[str] = None

    flags: list[ReportingFlagOut] = []
    class Config:
        from_attributes = True


    class Config:
        from_attributes = True

#Admin schemas
class AdminReportOut(BaseModel):
    report_id: int
    comment_id: int
    comment_content: str
    author_id: int
    author_name: str
    thread_title: str
    reason: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True
#Financial summary schemas

class FinancialSummaryCreate(BaseModel):
    report_date: str
    summary_text: str
    market_tone: str
    source_urls: Optional[str] = None

class FinancialSummaryOut(BaseModel):
    id: int
    report_date: str
    summary_text: str
    market_tone: str
    source_urls: Optional[str] = None
    created_at: datetime
    sectors: List["SectorPerformanceOut"] = []

    class Config:
        from_attributes = True

class SectorPerformanceCreate(BaseModel):
    report_date: str
    summary_text: str
    market_tone: str
    source_urls: Optional[str] = None
    sector_name: str

class SectorPerformanceOut(BaseModel):
    id: int
    report_date: str
    summary_text: str
    source_urls: Optional[str] = None
    created_at: datetime
    sector_name: str

    class Config:
        from_attributes = True
