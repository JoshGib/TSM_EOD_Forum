from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
#from prisma import Prisma
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#db = Prisma()

# ML MODELS — commented out until needed
# from transformers import pipeline
# SUMMARIZER_MODEL = "sshleifer/distilbart-cnn-12-6"
# FINBERT_MODEL = "ProsusAI/finbert"
# def get_summarizer(): ...
# def get_sentiment_analyzer(): ...

#@app.on_event("startup")
#async def startup():
#    if not db.is_connected():
#        await db.connect()

#@app.on_event("shutdown")
#async def shutdown():
#    if db.is_connected():
#        await db.disconnect()

@app.get("/test_reports.html")
async def get_report():
    file_path = "test_reports.html"
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Report not found")
