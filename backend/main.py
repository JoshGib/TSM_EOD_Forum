from fastapi import APIRouter, Depends, HTTPException
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import engine, Base
from routes import auth, reports, admin, threads, comments, blacklist
import models
app = FastAPI()

@app.on_event("startup")
def startup():
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

@app.get("/")
def read_root():
    return {"message": "Backend is running"}
    



