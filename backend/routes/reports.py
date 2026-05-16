from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Report, User, Thread, Comment, ReportingFlag
from schemas import ReportCreate, ReportOut
from auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


def _serialize_report(db: Session, report: Report):
    comment = db.query(Comment).filter(Comment.id == report.comment_id).first() if report.comment_id else None
    author = db.query(User).filter(User.id == comment.user_id).first() if comment else None
    thread = db.query(Thread).filter(Thread.id == report.thread_id).first() if report.thread_id else None
    flags = db.query(ReportingFlag).filter(ReportingFlag.report_id == report.id).all()

    return {
        "id": report.id,
        "reporter_id": report.reporter_id,
        "reported_user_id": report.reported_user_id,
        "thread_id": report.thread_id,
        "comment_id": report.comment_id,
        "status": report.status,
        "priority": report.priority,
        "created_at": report.created_at,
        "comment_content": comment.content if comment else None,
        "author_id": author.id if author else None,
        "author_name": author.username if author else None,
        "thread_title": thread.title if thread else None,
        "flags": [
            {
                "userId": f.user_id,
                "userName": f.user.username if f.user else "Unknown",
                "reason": f.reason,
                "timestamp": f.created_at,
            }
            for f in flags
        ],
    }

# create a report
@router.post("/", response_model=ReportOut)
def create_report(report: ReportCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    reporter_id = current_user.get("user_id")
    if not reporter_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    db_user = db.query(User).filter(User.id == reporter_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not (report.thread_id or report.comment_id or report.reported_user_id):
        raise HTTPException(status_code=400, detail="At least one of thread_id, comment_id, or reported_user_id must be provided")
    if report.thread_id:
        db_thread = db.query(Thread).filter(Thread.id == report.thread_id).first()
        if not db_thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        
    if report.comment_id:
        db_comment = db.query(Comment).filter(Comment.id == report.comment_id).first()
        if not db_comment:
            raise HTTPException(status_code=404, detail="Comment not found")
    if report.reported_user_id:
        db_reported_user = db.query(User).filter(User.id == report.reported_user_id).first()
        if not db_reported_user:
            raise HTTPException(status_code=404, detail="Reported user not found")
    existing_report = None
    if report.comment_id:
        existing_report = db.query(Report).filter(Report.comment_id == report.comment_id, Report.status == "pending").first()

    if existing_report:
        target_report = existing_report
    else:
        target_report = Report(
            reporter_id=reporter_id,
            thread_id=report.thread_id,
            comment_id=report.comment_id,
            reported_user_id=report.reported_user_id
        )
        db.add(target_report)
        db.flush()

    existing_flag = db.query(ReportingFlag).filter(
        ReportingFlag.report_id == target_report.id,
        ReportingFlag.user_id == reporter_id
    ).first()
    if existing_flag:
        raise HTTPException(status_code=400, detail="You already flagged this report")

    db.add(ReportingFlag(
        report_id=target_report.id,
        user_id=reporter_id,
        reason=report.reason
    ))
    db.commit()
    db.refresh(target_report)
    return _serialize_report(db, target_report)

# admin can view all reports
@router.get("/", response_model=list[ReportOut])
def get_reports(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="User does not have permission to view reports")
    reports = db.query(Report).filter(Report.comment_id != None, Report.status == "pending").all()
    results = []
    for report in reports:
        comment = db.query(Comment).filter(Comment.id == report.comment_id).first()
        if not comment:
            continue
        user = db.query(User).filter(User.id == comment.user_id).first()
        thread = db.query(Thread).filter(Thread.id == comment.thread_id).first()
        if not user or not thread:
            continue
        results.append({
            "report_id": report.id,
            "comment_id": report.comment_id,
            "comment_content": comment.content,
            "author_id": user.id,
            "author_name": user.username,
            "thread_title": thread.title,
            "reason": report.reason,
            "status": report.status,
            "created_at": report.created_at
        })
    return results

#dismiss a report
@router.put("/{report_id}/dismiss")
def dismiss_report(report_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="User does not have permission to dismiss reports")
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = "dismissed"
    db.commit()
    db.refresh(report)
    return {"message": "Report dismissed successfully"}

@router.get("/admin")
def get_admin_reports(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="User does not have permission to view admin reports")
    reports = db.query(Report).filter(Report.status == "pending").all()
    results = []
    for report in reports:
        comment =  report.comment
        user = comment.owner if comment else None
        thread = report.thread 

        flags = []
        for f in report.flags:
            flag_user = db.query(User).filter(User.id == f.user_id).first()
            flags.append({
                "userId": f.user_id,
                "userName": flag_user.username if flag_user else None,
                "reason": f.reason,
                "timestamp": f.created_at
            })


        results.append({
            "id": report.id,
            "reporter_id": report.reporter_id,
            "reported_user_id": report.reported_user_id,
            "thread_id": report.thread_id,
            "comment_id": report.comment_id,
            "status": report.status,
            "priority": report.priority,
            "created_at": report.created_at,
            "comment_content": comment.content if comment else None,
            "author_id": user.id if user else None,
            "author_name": user.username if user else None,
            "thread_title": thread.title if thread else None,
            "flags": flags
        })
    return results
# admin can update report status
@router.put("/{report_id}/status")
def update_report_status(report_id: int, status: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="User does not have permission to update report status")
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if status not in ["pending", "resolved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
    report.status = status
    db.commit()
    db.refresh(report)
    return {"message": "Report status updated successfully"}
