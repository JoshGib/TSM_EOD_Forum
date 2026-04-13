from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from transformers import pipeline
from prisma import Prisma
import os

app = FastAPI()

# 1. CORS CONFIGURATION
# This allows your localhost:3000 and Vercel to fetch the data
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = Prisma()

# 2. ML MODELS
# Using the pipeline API is cleaner for the 'summarization' task registration
PEGASUS_MODEL = "google/pegasus-xsum"
FINBERT_MODEL = "ProsusAI/finbert"

# Initialize pipelines
# Note: Ensure 'sentencepiece' is in your requirements.txt
summarizer = pipeline("text2text-generation", model=PEGASUS_MODEL)
sentiment_analyzer = pipeline("text-classification", model=FINBERT_MODEL)

@app.on_event("startup")
async def startup():
    if not db.is_connected():
        await db.connect()

@app.on_event("shutdown")
async def shutdown():
    if db.is_connected():
        await db.disconnect()

# 3. ROUTE TO SHOW YOUR TXT FILE
@app.get("/test_reports.html")
async def get_report():
    file_path = "test_reports.html"
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")

@app.post("/generate-forum-post")
async def generate_post(payload: dict):
    text = payload.get("text")
    user_id = payload.get("userId")
    
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    # Generate Summary
    #summary = summarizer(text, max_length=60, min_length=10, do_sample=False)
    #summary_text = "TSM Forum" #summary[0]['generated_text']

    # Analyze Sentiment
    sentiment = "positive" #sentiment_analyzer(summary_text)[0]

    return "TSM Forum", "positive", 0.99 #{
        #"summary": summary_text,
        #"sentiment": sentiment["label"]}
        #"confidence": sentiment["score"]
    #}