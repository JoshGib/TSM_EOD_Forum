from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db import Base


# siginup and login table
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default='user', nullable=False)  

    threads = relationship('Thread', back_populates='owner')
    comments = relationship('Comment', back_populates='user')
    bans = relationship('Blacklist', foreign_keys='Blacklist.user_id', back_populates='user')
    admin_bans = relationship('Blacklist', foreign_keys='Blacklist.banned_by_admin', overlaps="admin")

# Forum tables
class Thread(Base):
    __tablename__ = 'threads'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    views = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
    dislikes_count = Column(Integer, default=0)
    is_pinned = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, ForeignKey('users.id'))
    
    owner = relationship('User', back_populates='threads')
    comments = relationship('Comment', back_populates='thread')

class Comment(Base):
    __tablename__ = 'comments'
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    likes_count = Column(Integer, default=0)
    dislikes_count = Column(Integer, default=0)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    thread_id = Column(Integer, ForeignKey('threads.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    parent_comment_id = Column(Integer, ForeignKey('comments.id'), nullable=True)

    user = relationship('User', back_populates='comments')
    thread = relationship('Thread', back_populates='comments')
    replies = relationship('Comment', remote_side=[id])

class Report(Base):
    __tablename__ = 'reports'
    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey('users.id'))
    reported_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    thread_id = Column(Integer, ForeignKey('threads.id'), nullable=True)
    comment_id = Column(Integer, ForeignKey('comments.id'), nullable=True)
    status = Column(String, default='pending', nullable=False)
    priority = Column(String, default='low')
    created_at = Column(DateTime, default=datetime.utcnow)


    reporter = relationship('User', foreign_keys=[reporter_id])
    reported_user = relationship('User', foreign_keys=[reported_user_id])
    thread = relationship("Thread", foreign_keys=[thread_id])
    comment = relationship("Comment", foreign_keys=[comment_id])
    flags = relationship('ReportingFlag', back_populates='report', cascade='all, delete')
class Blacklist(Base):
    __tablename__ = 'blacklist'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    reason = Column(Text, nullable=False)
    is_permanent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    banned_by_admin = Column(Integer, ForeignKey('users.id'))

    user = relationship('User', foreign_keys=[user_id], back_populates='bans')
    admin = relationship('User', foreign_keys=[banned_by_admin], overlaps="admin_bans")

class ReportingFlag(Base):
    __tablename__ = 'reporting_flags'
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey('reports.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    reason = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship('Report', back_populates='flags')
    user = relationship('User')
    


#Financial summary tables

class FinancialSummary(Base):
    __tablename__ = 'financial_summaries'
    id = Column(Integer, primary_key=True, index=True)
    report_date = Column(String, unique=True, nullable=False)
    summary_text = Column(Text, nullable=False)
    market_tone = Column(String, nullable=False)
    source_urls = Column(Text, nullable=True)  
    created_at = Column(DateTime, default=datetime.utcnow)

    sectors = relationship('SectorPerformance', back_populates='summary', cascade='all, delete')    


class SectorPerformance(Base):
    __tablename__ = 'sector_performance'
    id = Column(Integer, primary_key=True, index=True)
    summary_id = Column(Integer, ForeignKey('financial_summaries.id'))
    sector_name = Column(String, nullable=False)
    is_positive = Column(Boolean, nullable=False)

    summary = relationship('FinancialSummary', back_populates='sectors')