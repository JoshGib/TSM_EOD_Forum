from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from auth import hash_password
from db import SessionLocal, engine, Base
from models import User
from routes import auth, reports, admin, threads, comments, blacklist, users
import models
app = FastAPI()

@app.on_event("startup")
def startup():
    admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@example.com")
    admin_username = os.getenv("SEED_ADMIN_USERNAME", "admin")
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "password")

    db = SessionLocal()
    try:
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            seeded_admin = User(
                username=admin_username,
                email=admin_email,
                hashed_password=hash_password(admin_password),
                role="admin",
            )
            db.add(seeded_admin)
            db.commit()
            print(f"Seeded admin user: {admin_email}")
    finally:
        db.close()

    print("Website started - DB handled by Alembic migrations")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","https://tsmforumfeed-yeww6.ondigitalocean.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(blacklist.router)
app.include_router(admin.router)
app.include_router(threads.router)
app.include_router(comments.router)
app.include_router(users.router)

@app.get("/")
def read_root():
    return {"message": "Backend is running"}
    
