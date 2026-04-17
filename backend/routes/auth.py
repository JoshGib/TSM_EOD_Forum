from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from db import get_db
from db import SessionLocal
from models import User
from schemas import UserSignup, UserLogin
from auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])
# def get_db():

#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

@router.post("/signup")
def signup(user: UserSignup, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter((User.username == user.username) | (User.email == user.email) ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    hashed_password = hash_password(user.password)
    new_user = User(username=user.username, email=user.email, hashed_password=hashed_password)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"staus": "ok"}

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):

    print("LOGIN REQUEST:", user)
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Email not found")
    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid password")
    access_token = create_access_token({"user_id": db_user.id})
    return {"access_token": access_token, "token_type": "bearer", "username": db_user.username}