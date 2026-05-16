from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, hash_password, verify_password
from db import get_db
from models import Blacklist, User
from schemas import ChangePasswordRequest, UserProfileOut, UserProfileUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfileOut)
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
        "ban_expires_at": ban.expires_at if ban else None,
    }


@router.put("/me", response_model=UserProfileOut)
def update_current_user_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(User).filter(User.username == payload.username, User.id != user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username is already taken")

    user.username = payload.username
    db.commit()
    db.refresh(user)

    ban = db.query(Blacklist).filter(Blacklist.user_id == user.id).first()
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_banned": bool(ban),
        "ban_reason": ban.reason if ban else None,
        "ban_expires_at": ban.expires_at if ban else None,
    }


@router.put("/me/password")
def change_current_user_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")

    user = db.query(User).filter(User.id == current_user.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
