from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import User, Blacklist
from auth import get_current_user
from schemas import UserCreate, UserOut
router = APIRouter(prefix="/users", tags=["users"])

@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/me"/profile")
def get_current_user_profile(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user = db.query(User).filter(User.id == current_user.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    ban = db.query(Blacklist).filter(Blacklist.user_id == user.id).first()
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_banned": bool(ban),
        "ban_reason": ban.reason if ban else None,
        "ban_expires_at": ban.expires_at if ban else None
    }

@router.get("/")
def get_all_users(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="User does not have permission to view all users")
    users = db.query(User).all()
    results = []
    for user in users:
        ban = db.query(Blacklist).filter(Blacklist.user_id == user.id).first()
        results.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_banned": bool(ban),
            "ban_reason": ban.reason if ban else None,
            "ban_expires_at": ban.expires_at if ban else None
        })
    return results