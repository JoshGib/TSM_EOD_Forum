from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from prisma import Prisma
import os
import bcrypt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = Prisma()

@app.on_event("startup")
async def startup():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("WARNING: DATABASE_URL is not set — DB routes will not work")
        return
    try:
        await db.connect()
        print("Database connected successfully")
    except Exception as e:
        print(f"Database connection failed: {e}")

@app.on_event("shutdown")
async def shutdown():
    if db.is_connected():
        await db.disconnect()

@app.get("/")
async def health_check():
    return {"status": "ok", "db_connected": db.is_connected()}

@app.get("/test_reports.html")
async def get_report():
    file_path = "test_reports.html"
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Report not found")

# --- USER ROUTES ---

@app.post("/users/register")
async def register_user(payload: dict):
    if not db.is_connected():
        raise HTTPException(status_code=503, detail="Database not available")
    name = payload.get("name")
    email = payload.get("email")
    password = payload.get("password")
    if not all([name, email, password]):
        raise HTTPException(status_code=400, detail="name, email and password required")
    existing = await db.user.find_unique(where={"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user = await db.user.create(data={"name": name, "email": email, "password": hashed})
    return {"id": user.id, "name": user.name, "email": user.email}

@app.post("/users/login")
async def login_user(payload: dict):
    if not db.is_connected():
        raise HTTPException(status_code=503, detail="Database not available")
    email = payload.get("email")
    password = payload.get("password")
    if not all([email, password]):
        raise HTTPException(status_code=400, detail="email and password required")
    user = await db.user.find_unique(where={"email": email})
    if not user or not bcrypt.checkpw(password.encode(), user.password.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"id": user.id, "name": user.name, "email": user.email}

# --- POST ROUTES ---

@app.post("/posts")
async def create_post(payload: dict):
    if not db.is_connected():
        raise HTTPException(status_code=503, detail="Database not available")
    user_id = payload.get("userId")
    content = payload.get("content")
    if not all([user_id, content]):
        raise HTTPException(status_code=400, detail="userId and content required")
    post = await db.post.create(data={"userId": user_id, "content": content})
    return post

@app.get("/posts")
async def get_posts():
    if not db.is_connected():
        raise HTTPException(status_code=503, detail="Database not available")
    posts = await db.post.find_many(include={"user": True}, order={"createdAt": "desc"})
    return posts

# --- EOD REPORT ROUTES ---

@app.post("/eod-reports")
async def create_eod_report(payload: dict):
    if not db.is_connected():
        raise HTTPException(status_code=503, detail="Database not available")
    date = payload.get("date")
    raw_content = payload.get("rawContent")
    if not all([date, raw_content]):
        raise HTTPException(status_code=400, detail="date and rawContent required")
    report = await db.eodreport.create(data={"date": date, "rawContent": raw_content})
    return report

@app.get("/eod-reports")
async def get_eod_reports():
    if not db.is_connected():
        raise HTTPException(status_code=503, detail="Database not available")
    reports = await db.eodreport.find_many(order={"date": "desc"})
    return reports
