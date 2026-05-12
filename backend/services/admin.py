from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException

from db import get_db
from models import Report, User, Thread, Comment, ReportingFlag

def is_admin(user:dict):
    return user.get("role") == "admin"

def get_admin_reports(db: Session):
    reports = db.query(Report).filter(Report.status == "pending").all()
    results = []
    for report in reports:
        comment = report.comment
        user = comment.author if comment else None
        thread = report.thread 
        flags = [{
            "userId": f.user_id,
            "userName": f.user.username if f and f.user else None,
            "reason": f.reason,
            "timestamp": f.created_at
        }]
        results.append({
            "id": report.id,
            "report_id": report.report_id,
            "reported_user_id": report.reported_user_id,
            "thread_id": report.thread_id,
            "comment_id": report.comment_id,
            "status": report.status,
            "priority": report.priority,
            "created_at": report.created_at,
            "comment_content": comment.content if comment else None,
            "author_id": user.id if user else None,
            "author_name": user.username if user else None,
            "thread_title": thread.title if thread else None,\

            "flags": flags
        })
    return results

def delete_comment(db: Session, comment_id: int):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted successfully"}

def ban_user(db: Session, user_id: int, reason: str, admin_id: int, is_permanent: bool = True, days: int = None):
    existing = db.query(Blacklist).filter(Blacklist.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already banned")
    expires_at = None
    if not is_permanent and days:
        expires_at = datetime.utcnow() + timedelta(days=days)
    ban = Blacklist(
        user_id=user_id,
        reason=reason,
        is_permanent=is_permanent,
        expires_at=expires_at,
        banned_by_admin=admin_id
    )
    db.add(ban)
    db.commit()
    refresh(ban)
    return {"message": "User banned successfully"}

    def dismiss_report(db: Session, report_id: int):
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        report.status = "dismissed"
        db.commit()
        db.refresh(report)
        return {"message": "Report dismissed successfully"}