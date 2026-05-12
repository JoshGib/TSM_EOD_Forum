from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from auth import get_current_user
from services import admin as admin_service

router = APIRouter(prefix="/admin", tags=["admin"])
@router.get("/reports")
def get_reports(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if not admin_service.is_admin(current_user):
        raise HTTPException(status_code=403, detail="User does not have permission to view reports")
    return admin_service.get_all_reports(db)

@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if not admin_service.is_admin(current_user):
        raise HTTPException(status_code=403, detail="User does not have permission to delete comments")
    return admin_service.delete_comment(db, comment_id)

@router.post("/blacklist/{user_id}")
def ban_user(user_id: int, reason: str, is_permanent: bool = False, days: int = None, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
        if not admin_service.is_admin(current_user):
            raise HTTPException(status_code=403, detail="User does not have permission to ban users")
        return admin_service.ban_user(db=db, user_id=user_id, reason=reason, admin_id=current_user.get("user_id"))

@router.put("/reports/{report_id}/dismiss")
def dismiss_report(report_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if not admin_service.is_admin(current_user):
        raise HTTPException(status_code=403, detail="User does not have permission to dismiss reports")
    return admin_service.dismiss_report(db, report_id)