"""
app.py
FastAPI backend hosted on Hugging Face Spaces by Reinald Peguero

Endpoints:
  POST /generate  — reads test_original_generated_texts.csv, cleans it,
                    appends/overwrites test_OGTexts_cleaned.csv, then converts
                    it to test_reports.html for the frontend at localhost:3000.
  GET  /reports   — returns the latest test_reports.html as an HTML response.
  GET  /health    — simple health check.
  GET  /db/health — database connectivity health check.

The frontend calls POST /generate when the user clicks the button.
"""

# Libraries
import ast
import os
from datetime import datetime

import pandas as pd
import uvicorn
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse

# SQLAlchemy
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker
#johana's change, next two lines
from models import FinancialSummary, SummarySource, SectorPerformance
from db import get_db
# Load environment variables from a local .env file if present.
# In production (e.g. Hugging Face Spaces), env vars come from the
# platform's secret store, so this is a no-op there.
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv is optional; fine to run without it

# Config
INPUT_CSV   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_original_generated_texts.csv")
OUTPUT_CSV = "/tmp/test_OGTexts_cleaned.csv"
OUTPUT_HTML = "/tmp/test_reports.html"

# Database (PostgreSQL via SQLAlchemy)
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://forum_user:password123@localhost:5432/forum_db",
)

# pool_pre_ping=True transparently recycles dead connections (useful when the
# DB restarts or sits behind a load balancer that drops idle conns).
engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    future=True,
)

#Johana: lets delete this and just import db
# Declarative Base for ORM models. 
#Base = declarative_base()

def get_db():
    """
    FastAPI dependency that yields a SQLAlchemy session and guarantees
    it is closed after the request, even on errors.

    Usage in a route:

        @app.get("/items")
        def list_items(db: Session = Depends(get_db)):
            return db.execute(text("SELECT 1")).scalar()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(title="TSM Forum EOD Report Generator")
#johana: add this to create new tables automatically
Base.metadata.create_all(bind=engine)   

# Allow localhost:3000 and Hugging Face
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://tsmforumfeed-yeww6.ondigitalocean.app"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Helpers
def signal_color(signal: str) -> str:
    """Return hex color for a given market signal."""
    s = str(signal).strip().lower()
    if s == "bullish":
        return "#27ae60" # blue
    if s == "bearish":
        return "#e74c3c" # red
    return "#f39c12"  # Neutral # orange

def build_url_list(url_cell) -> str:
    """Build an HTML <ul> of source links from a pipe-separated string."""
    raw = str(url_cell)
    # Handle both pipe-separated strings and Python list literals stored in CSV
    if raw.startswith("["):
        try:
            links = ast.literal_eval(raw)
        except Exception:
            links = [u.strip() for u in raw.split("|") if u.strip()]
    else:
        links = [u.strip() for u in raw.split("|") if u.strip() and u != "nan"]

    items = "".join(
        f'<li><a href="{u}" target="_blank">{u}</a></li>'
        for u in links
    )
    return f'<ul class="url-list">{items}</ul>'

def format_date(dt) -> str:
    """Format a datetime or date string to 'Month D, YYYY'."""
    if isinstance(dt, str):
        dt = pd.to_datetime(dt)
    return dt.strftime("%B %-d, %Y")   # %-d strips leading zero on Linux

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Apply all cleaning to the raw DataFrame."""
    df = df.copy()
    df["trade_day"] = pd.to_datetime(df["trade_day"])
    df["overall_article_signal"] = df["overall_article_signal"].str.capitalize()
    df["generated_eod_summary"]  = df["generated_eod_summary"].str.strip()
    df["url_list"] = df["url"].str.split("|")
    df = df.sort_values("trade_day").reset_index(drop=True)
    return df

def df_to_html(df: pd.DataFrame, total_reports: int) -> str:
    """Convert the cleaned DataFrame to an HTML string matching test_reports."""
    cards = ""
    for _, row in df.iterrows():
        pretty_date = format_date(row["trade_day"])
        signal      = str(row["overall_article_signal"]).strip()
        color       = signal_color(signal)
        summary     = str(row["generated_eod_summary"]).replace("&", "&amp;")
        url_block   = build_url_list(row.get("url", ""))

        cards += f"""
<div class="report-card" style="border-left-color: {color};">
<span class="date">{pretty_date}</span>
<div class="content">{summary}</div>
<div class="market-tone" style="border-left-color: {color};">
<strong>Market Tone:</strong> <span style="color:{color};text-transform:capitalize;">{signal}</span>
</div>
<div class="sources"><strong>Sources:</strong>{url_block}</div>
</div>
"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TSM Forum - Test Reports Archive</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; background-color: #f4f7f6; }}
        header {{ border-bottom: 3px solid #0056b3; margin-bottom: 30px; padding-bottom: 10px; }}
        h1 {{ color: #0056b3; margin-bottom: 5px; }}
        .report-card {{ background: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 25px; padding: 20px; border-left: 5px solid #0056b3; }}
        .date {{ font-weight: bold; color: #666; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; display: block; }}
        .content {{ margin-bottom: 15px; text-align: justify; white-space: pre-wrap; }}
        .market-tone {{ background: #eef2f7; padding: 12px; border-radius: 4px; font-style: italic; font-size: 0.95em; border-left: 3px solid #777; margin-bottom: 12px; }}
        .sources {{ margin-top: 12px; font-size: 0.8em; }}
        .sources strong {{ display: block; margin-bottom: 4px; color: #555; }}
        .url-list {{ margin: 0; padding-left: 18px; }}
        .url-list li {{ margin-bottom: 2px; word-break: break-all; }}
        .url-list a {{ color: #0056b3; text-decoration: none; }}
        .url-list a:hover {{ text-decoration: underline; }}
        footer {{ text-align: center; margin-top: 50px; color: #888; font-size: 0.8em; border-top: 1px solid #ddd; padding-top: 20px; }}
    </style>
</head>
<body>

<header>
    <h1>TSM Forum Feed</h1>
    <p>Financial News Summary &amp; Sentiment Archive &mdash; {total_reports} Reports</p>
</header>

{cards}

<footer>
    Made by Joshua Gibaja and Reinald Peguero
</footer>

</body>
</html>"""

# Drop columns that should not appear in the cleaned CSV
DROP_COLS = [
    "daily_summary_sentiment",
    "daily_summary_sentiment_score",
    "combined_article_summaries",
]

#johana: crete save_summary_to_db function to save the summaries to the database

def save_summary_to_db(df: pd.DataFrame, db: Session):
    """Save financial summaries and the source urls into the database."""
    for _, row in df.iterrows():
        report_date = row["trade_day"].date() 

        existing_summary = db.query(FinancialSummary).filter(FinancialSummary.report_date == report_date).first()
        if existing_summary:
            continue
            
        summary = FinancialSummary(
            report_date=str(row["trade_day"].date()),
            summary_text=row["generated_eod_summary"],
            market_tone=row["overall_article_tone"]
        )
        db.add(summary)
        db.flush()  # Get the ID of the inserted summary

        urls = str(row.get("url", ""))
        if urls.startswith("["):
            try:
                url_list = ast.literal_eval(urls)
            except Exception:
                url_list = [u.strip() for u in urls.split("|") if u.strip()]
        else:
            url_list = [u.strip() for u in urls.split("|") if u.strip()]

        for url in url_list:
            source = SummarySource(
                summary_id=summary.id,
                source_name=url.split("/")[2] if "://" in url else url,  
                source_url=url
            )
            db.add(source)

    db.commit()

# Routes
@app.on_event("startup")
async def startup():
    print(f"Working directory: {os.getcwd()}")
    print(f"Files in directory: {os.listdir('.')}")

    if not os.path.exists(INPUT_CSV):
        print(f"WARNING: {INPUT_CSV} not found — cannot generate report")
        return

    try:
        raw_df = pd.read_csv(INPUT_CSV, encoding="utf-8")
        print(f"CSV loaded — columns: {raw_df.columns.tolist()}, rows: {len(raw_df)}")

        df = clean_dataframe(raw_df)
        #johana: save summaries to the database on startup
        save_summary_to_db(df, db)
        print(f"Cleaned — rows: {len(df)}")

        cols_to_drop = [c for c in DROP_COLS if c in df.columns]
        df.drop(columns=cols_to_drop).to_csv(OUTPUT_CSV, index=False, encoding="utf-8")

        html = df_to_html(df, total_reports=len(df))
        print(f"HTML generated — length: {len(html)} chars")

        with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"SUCCESS: {OUTPUT_HTML} written with {len(df)} reports")

    except Exception as e:
        print(f"STARTUP ERROR: {e}")
        import traceback
        traceback.print_exc()

@app.on_event("startup")
async def startup_db():
    """
    Independent DB-connectivity probe. Runs after the CSV/HTML startup hook;
    a DB failure here will NOT prevent /generate or test_reports.html from
    working — those paths don't touch the database.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        # Mask the password when logging the DSN
        safe_dsn = DATABASE_URL
        if "@" in safe_dsn and "://" in safe_dsn:
            scheme, rest = safe_dsn.split("://", 1)
            creds, host = rest.split("@", 1)
            user = creds.split(":", 1)[0]
            safe_dsn = f"{scheme}://{user}:***@{host}"
        print(f"DB OK — connected to {safe_dsn}")
    except Exception as e:
        print(f"DB WARN: could not connect to PostgreSQL — {e}")
        print("        (the report pipeline will still run; DB-backed routes will return 503)")

@app.get("/health")
def health():
    """Health check — confirms the backend is running."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.get("/db/health")
def db_health(db: Session = Depends(get_db)):
    """Database health check — confirms PostgreSQL is reachable."""
    try:
        result = db.execute(text("SELECT 1")).scalar()
        return {"status": "ok", "result": result, "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unreachable: {e}")

@app.post("/generate")
#Johana" add db session dependency and save summaries to the database
def generate(db: Session = Depends(get_db)):
    """
    Called by the frontend button click.
    1. Reads INPUT_CSV
    2. Cleans it
    3. Overwrites OUTPUT_CSV
    4. Converts to OUTPUT_HTML
    Returns a JSON summary of what was written.
    """
    if not os.path.exists(INPUT_CSV):
        raise HTTPException(
            status_code=404,
            detail=f"Source file '{INPUT_CSV}' not found on the server."
        )

    # Read & clean
    raw_df = pd.read_csv(INPUT_CSV, encoding="utf-8")
    df     = clean_dataframe(raw_df)

    # Write cleaned CSV (overwrite each time)
    cols_to_drop = [c for c in DROP_COLS if c in df.columns]
    df.drop(columns=cols_to_drop).to_csv(OUTPUT_CSV, index=False, encoding="utf-8")

    # Convert to HTML
    html = df_to_html(df, total_reports=len(df))
    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)

    return {
        "status":        "success",
        "rows_written":  len(df),
        "csv_output":    OUTPUT_CSV,
        "html_output":   OUTPUT_HTML,
        "timestamp":     datetime.utcnow().isoformat(),
    }

# Update test_reports.html each click on button
@app.get("/test_reports.html")
async def get_report():
    if os.path.exists(OUTPUT_HTML):
        return FileResponse(OUTPUT_HTML, media_type="text/html")
    raise HTTPException(status_code=404, detail="Report not found. Click Generate first.")

# Entry point (local dev: python app.py)
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("app:app", host="0.0.0.0", port=7860, reload=True)
