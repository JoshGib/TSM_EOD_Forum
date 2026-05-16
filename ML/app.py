"""
app.py
Standalone ML / report generator service.

Made by Reinald Peguero and Joshua Gibaja

Endpoints:
  POST /generate            — reads from Supabase, cleans the data,
                              writes test_OGTexts_cleaned.csv, generates test_reports.html
  GET  /test_reports.html   — returns the latest test_reports.html
  GET  /financial-summaries — JSON list of recent FinancialSummaryOut records
                              (consumed by EODReport.tsx Live Market Updates)
  GET  /health              — simple health check
"""

import ast
import os
from datetime import datetime
from typing import List

import pandas as pd
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    create_engine,
)
from sqlalchemy.orm import (
    Session,
    declarative_base,
    relationship,
    sessionmaker,
)

from schemas import FinancialSummaryOut

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Config
OUTPUT_CSV  = "/tmp/test_OGTexts_cleaned.csv"
OUTPUT_HTML = "/tmp/test_reports.html"

# Supabase Postgres connection
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Point this at your Supabase Postgres "
        "(use the pooled connection on port 6543 for app servers)."
    )

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class FinancialSummary(Base):
    __tablename__ = "financial_summaries"

    id           = Column(Integer, primary_key=True, index=True)
    report_date  = Column(String, nullable=False)
    summary_text = Column(String, nullable=False)
    market_tone  = Column(String, nullable=False)
    source_urls  = Column(String, nullable=True)
    created_at   = Column(DateTime(timezone=True), nullable=False)

    sectors = relationship(
        "SectorPerformance",
        back_populates="summary",
        cascade="all, delete-orphan",
    )


class SectorPerformance(Base):
    __tablename__ = "sector_performances"

    id                     = Column(Integer, primary_key=True, index=True)
    summary_id             = Column(Integer, ForeignKey("financial_summaries.id"))
    sector_name            = Column(String, nullable=False)
    performance_percentage = Column(String, nullable=False)
    is_positive            = Column(Boolean, nullable=False)

    summary = relationship("FinancialSummary", back_populates="sectors")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def load_from_db(limit: int = 5) -> pd.DataFrame:
    """Load the most-recent FinancialSummary rows from Supabase and return
    a DataFrame in the same shape the original CSV produced, so that
    clean_dataframe and df_to_html below keep working unchanged."""
    db = SessionLocal()
    try:
        rows = (
            db.query(FinancialSummary)
            .order_by(FinancialSummary.report_date.desc())
            #.limit(limit)
            .all()
        )
    finally:
        db.close()

    return pd.DataFrame([
        {
            "trade_day":              r.report_date,
            "overall_article_signal": r.market_tone,
            "generated_eod_summary":  r.summary_text,
            "url":                    r.source_urls or "",
        }
        for r in rows
    ])


app = FastAPI(title="TSM Forum EOD Report Generator")

# Allow localhost and DO frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://tsmforumfeed-yeww6.ondigitalocean.app",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Helpers
def signal_color(signal: str) -> str:
    """Return hex color for a given market signal."""
    s = str(signal).strip().lower()
    if s == "bullish":
        return "#27ae60"
    if s == "bearish":
        return "#e74c3c"
    return "#f39c12"  # Neutral

def build_url_list(url_cell) -> str:
    """Build an HTML <ul> of source links from a pipe-separated string."""
    raw = str(url_cell)
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
    return dt.strftime("%B %-d, %Y")

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Apply all cleaning to the raw DataFrame."""
    df = df.copy()
    df["trade_day"] = pd.to_datetime(df["trade_day"])
    df["overall_article_signal"] = df["overall_article_signal"].str.capitalize()
    df["generated_eod_summary"]  = df["generated_eod_summary"].str.strip()
    df["url_list"] = df["url"].str.split("|")
    df = df.sort_values("trade_day", ascending=False).reset_index(drop=True)
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

# Routes
@app.on_event("startup")
async def startup():
    print(f"Working directory: {os.getcwd()}")
    print(f"Files in directory: {os.listdir('.')}")

    try:
        raw_df = load_from_db(limit=5)
        print(f"DB loaded — columns: {raw_df.columns.tolist()}, rows: {len(raw_df)}")

        if raw_df.empty:
            print("WARNING: financial_summaries table is empty — skipping report generation")
            return

        df = clean_dataframe(raw_df)
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

@app.get("/health")
def health():
    """Health check — confirms the backend is running."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.post("/generate")
def generate():
    """
    Called by the frontend button click.
    1. Reads the top 5 records from Supabase
    2. Cleans them
    3. Overwrites OUTPUT_CSV
    4. Converts to OUTPUT_HTML
    """
    raw_df = load_from_db(limit=5)
    if raw_df.empty:
        raise HTTPException(
            status_code=404,
            detail="No financial summaries found in the database.",
        )

    df = clean_dataframe(raw_df)

    cols_to_drop = [c for c in DROP_COLS if c in df.columns]
    df.drop(columns=cols_to_drop).to_csv(OUTPUT_CSV, index=False, encoding="utf-8")

    html = df_to_html(df, total_reports=len(df))
    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)

    return {
        "status":       "success",
        "rows_written": len(df),
        "csv_output":   OUTPUT_CSV,
        "html_output":  OUTPUT_HTML,
        "timestamp":    datetime.utcnow().isoformat(),
    }

@app.get("/test_reports.html")
async def get_report():
    if os.path.exists(OUTPUT_HTML):
        return FileResponse(OUTPUT_HTML, media_type="text/html")
    raise HTTPException(status_code=404, detail="Report not found. Click Generate first.")

@app.get("/financial-summaries", response_model=List[FinancialSummaryOut])
def list_financial_summaries(
    limit: int = Query(4, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Returns the most-recent financial summaries from Supabase,
    sorted by report_date DESC. Consumed by the EODReport.tsx Live Market Updates panel.
    """
    rows = (
        db.query(FinancialSummary)
        .order_by(FinancialSummary.report_date.desc())
        .limit(limit)
        .all()
    )
    return rows

# Entry point (local dev: python app.py)
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
