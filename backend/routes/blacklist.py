from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Blacklist, User
from auth import get_current_user

router = APIRouter(prefix="/blacklist", tags=["blacklist"])

@router.post("/ban/{user_id}")
def ban_user(user_id: int, reason: str, is_permanent: bool = False, days: int = None, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="User does not have permission to ban users")
    user_to_ban = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
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
        banned_by_admin=current_user.get("user_id")
    )
    db.add(ban)
    db.commit()
    db.refresh(ban)
    return {"message": "User banned successfully", "user_id": user_id, "reason": reason, "is_permanent": is_permanent, "expires_at": expires_at}

@router.delete("/unban/{user_id}")
def unban_user(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="User does not have permission to unban users")
    ban = db.query(Blacklist).filter(Blacklist.user_id == user_id).first()
    if not ban:
        raise HTTPException(status_code=404, detail="Ban record not found for user")
    db.delete(ban)
    db.commit()
    return {"message": "User unbanned successfully", "user_id": user_id}

def is_user_banned(user_id: int, db: Session):
    ban = db.query(Blacklist).filter(Blacklist.user_id == user_id).first()
    if not ban:
        return False
    if ban.is_permanent:
        return True
    if ban.expires_at and ban.expires_at > datetime.utcnow():
        return True
    # If the ban has expired, remove it from the database
    db.delete(ban)
    db.commit()
    return False