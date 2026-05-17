from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from auth import get_current_user
from models import Blacklist, Comment, Report, ReportingFlag, Thread, User

router = APIRouter(prefix="/admin", tags=["admin"])


def _is_admin(current_user: dict) -> bool:
    return current_user.get("role") == "admin"


class BlacklistRequest(BaseModel):
    reason: str
    is_permanent: bool = True
    days: int | None = None
    

@router.get("/reports")
def get_reports(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="User does not have permission to view reports")

    reports = db.query(Report).filter(Report.comment_id.isnot(None), Report.status == "pending").all()
    results = []
    for report in reports:
        comment = db.query(Comment).filter(Comment.id == report.comment_id).first()
        if not comment:
            continue
        user = db.query(User).filter(User.id == comment.user_id).first()
        thread = db.query(Thread).filter(Thread.id == comment.thread_id).first()
        flags = db.query(ReportingFlag).filter(ReportingFlag.report_id == report.id).all()
        results.append({
            "id": report.id,
            "comment_id": comment.id,
            "comment_content": comment.content,
            "author_id": user.id if user else None,
            "author_name": user.username if user else "Unknown",
            "thread_title": thread.title if thread else "Unknown Thread",
            "created_at": report.created_at,
            "status": report.status,
            "flags": [
                {
                    "user_id": f.user_id,
                    "user_name": f.user.username if f.user else "Unknown",
                    "reason": f.reason,
                    "timestamp": f.created_at,
                }
                for f in flags
            ],
        })
    return results

@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="User does not have permission to delete comments")
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.is_deleted = True
    comment.content = "[deleted by admin]"
    db.query(Report).filter(Report.comment_id == comment_id, Report.status == "pending").update({"status": "resolved"})
    db.commit()
    return {"message": "Comment deleted successfully"}

@router.post("/blacklist/{user_id}")
def ban_user(user_id: int, payload: BlacklistRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
        if not _is_admin(current_user):
            raise HTTPException(status_code=403, detail="User does not have permission to ban users")
        existing = db.query(Blacklist).filter(Blacklist.user_id == user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="User is already blacklisted")
        ban = Blacklist(
            user_id=user_id,
            reason=payload.reason,
            is_permanent=payload.is_permanent,
            banned_by_admin=current_user.get("user_id"),
        )
        db.add(ban)
        db.commit()
        return {"message": "User blacklisted successfully"}

@router.put("/reports/{report_id}/dismiss")
def dismiss_report(report_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="User does not have permission to dismiss reports")
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = "dismissed"
    db.commit()
    return {"message": "Report dismissed successfully"}
