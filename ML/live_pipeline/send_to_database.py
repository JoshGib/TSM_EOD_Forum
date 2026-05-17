"""
Student: Joshua Gibaja

"""
from fastapi import FastAPI
import pandas as pd
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

app = FastAPI()

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

def main():
    df = pd.read_csv("live_eod_summary.csv")

    print("CSV loaded:", len(df), "rows")

    required = [
        "report_date",
        "summary_text",
        "market_tone",
        "source_urls"
    ]

    df = df[required]

    df["report_date"] = df["report_date"].astype(str)
    df["summary_text"] = df["summary_text"].astype(str)
    df["market_tone"] = df["market_tone"].astype(str)
    df["source_urls"] = df["source_urls"].astype(str)

    df.to_sql(
        "financial_summaries",
        engine,
        if_exists="append",
        index=False
    )



if __name__ == "__main__":
    main()