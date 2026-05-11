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
    comments = relationship('Comment', back_populates='owner')
    bans = relationship('Blacklist', foreign_keys='Blacklist.user_id', back_populates='user')


# Forum tables
class Thread(Base):
    __tablename__ = 'threads'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    views = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
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
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    thread_id = Column(Integer, ForeignKey('threads.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    parent_comment_id = Column(Integer, ForeignKey('comments.id'), nullable=True)

    owner = relationship('User', back_populates='comments')
    thread = relationship('Thread', back_populates='comments')


class Report(Base):
    __tablename__ = 'reports'
    id = Column(Integer, primary_key=True, index=True)
    reason = Column(Text, nullable=False)
    status = Column(String, default='pending', nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    reporter_id = Column(Integer, ForeignKey('users.id'))
    reported_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    thread_id = Column(Integer, ForeignKey('threads.id'), nullable=True)
    comment_id = Column(Integer, ForeignKey('comments.id'), nullable=True)

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
