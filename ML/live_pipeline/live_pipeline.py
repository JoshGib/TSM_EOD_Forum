"""
Student: Joshua Gibaja

Live EOD stock market summarization pipeline using:
- NewsAPI article collection
- keyword filtering
- article summarization
- FinBERT sentiment analysis
- Fined tuned bart summarization of combined article summaries
This is a script meant to run at 5pm each day and will cycle through 2 hours of information from the news api to recover the full days worth of info. 
Originally I have hoped for the info to be real time and not laged behind by 2 days but without the API premium coverage I was unable to do so. 
This is currently running on azure with a timer trigger set for 5am eastern time.
If it wasnt for the fact that the free news tier didnt let me synch to real time 
The information wouuld have been synched for real time and not lagged by the day and at 5 am.
"""

from newsapi import NewsApiClient
from datetime import datetime, timedelta, timezone
from transformers import pipeline
from transformers.utils import logging
import pandas as pd
import requests
from dotenv import load_dotenv
import os
from zoneinfo import ZoneInfo

load_dotenv()

API_KEY = os.getenv("SECRET_KEY")

newsapi = NewsApiClient(api_key=API_KEY)

TOP_K_PER_DAY = 10

ARTICLE_SUMMARIZER_MODEL = "sshleifer/distilbart-cnn-12-6"
LONG_SUMMARIZER_MODEL = "./eod_summary_bart"
SENTIMENT_MODEL = "ProsusAI/finbert"

logging.disable_progress_bar()
logging.set_verbosity_error()

macro_query = (
    "s&p 500 OR nasdaq OR dow jones OR wall street OR "
    "u.s. stocks OR us stocks OR stock market OR "
    "federal reserve OR treasury yields OR "
    "stocks OR markets OR investors OR earnings OR "
    "fed OR inflation OR treasury OR economy OR "
    "economic OR rally OR selloff OR index OR indexes"
)

strong_market_keywords = [
    "s&p 500", "nasdaq", "dow jones", "wall street",
    "u.s. stocks", "us stocks", "stock market",
    "federal reserve", "treasury yields"
]

secondary_market_keywords = [
    "stocks", "markets", "investors", "earnings",
    "fed", "inflation", "treasury", "economy",
    "economic", "rally", "selloff", "index", "indexes"
]

junk_keywords = [
    "globenewswire", "pr newswire", "accesswire", "cnw", "newswire",
    "sample report", "request customization", "customization",
    "market research", "report covers", "buy this report",
    "download free sample", "download sample", "for instant purchase",
    "contact us", "about us", "media advisory", "business wire",
    "research report", "pipeline assessment", "table of contents",
    "request for sample", "click here", "phone:", "email:", "web:"
]

ny = ZoneInfo("America/New_York")

now = datetime.now(timezone.utc).astimezone(ny)

start_time_ny = (now - timedelta(days=3)).replace(
    hour=0, minute=0, second=0, microsecond=0
)

end_time_ny = start_time_ny + timedelta(days=1)


start_time = start_time_ny.astimezone(timezone.utc)
end_time = end_time_ny.astimezone(timezone.utc)


all_articles = []

current_start = start_time

while current_start < end_time:

    current_end = current_start + timedelta(hours=2)

    if current_end > end_time:
        current_end = end_time

    print(f"\nPulling:")
    print(current_start.isoformat())
    print(current_end.isoformat())

    url = "https://newsapi.org/v2/everything"

    params = {
        "apiKey": API_KEY,
        "from": current_start.isoformat(),
        "to": current_end.isoformat(),
        "q": macro_query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 100
    }

    response = requests.get(url, params=params)
    data = response.json()

    articles = data.get("articles", [])

    print(f"Articles pulled: {len(articles)}")

    all_articles.extend(articles)

    current_start = current_end

print(f"\nTotal collected: {len(all_articles)}")

df = pd.DataFrame(all_articles)

df = df[["url", "publishedAt", "content"]]
df = df.rename(columns={
    "content": "text",
    "publishedAt": "date"
})

df["date"] = pd.to_datetime(df["date"], utc=True)


df = df.dropna(subset=["date", "text"]).copy()

df["text"] = df["text"].astype(str).str.strip()

df = df[df["text"] != ""].copy()

df = df[["date", "text", "url"]]

df["date_et"] = df["date"].dt.tz_convert("America/New_York")
df["trade_day"] = df["date_et"].dt.date


text_lower = df["text"].str.lower()

junk_mask = text_lower.apply(
    lambda x: any(k in x for k in junk_keywords)
)

df = df[~junk_mask].copy()

if df.empty:
    raise ValueError(
        "All articles were removed by the junk filter."
    )

market_mask = text_lower.loc[df.index].apply(
    lambda x: any(
        k in x
        for k in strong_market_keywords + secondary_market_keywords
    )
)

df = df[market_mask].copy()

if df.empty:
    raise ValueError(
        "No market relevant articles remained after filtering."
    )


def relevance_score(text):

    text = str(text).lower()

    score = 0

    for kw in strong_market_keywords:
        if kw in text:
            score += 3

    for kw in secondary_market_keywords:
        if kw in text:
            score += 1

    return score


df["relevance_score"] = df["text"].apply(relevance_score)

df = df[df["relevance_score"] > 0].copy()

day_counts = df["trade_day"].value_counts()

valid_days = day_counts[day_counts >= 10]

valid_day_list = valid_days.index

df_final = df[df["trade_day"].isin(valid_day_list)].copy()

target_day = start_time_ny.date()

df = df_final[
    (df_final["date_et"] >= start_time_ny) &
    (df_final["date_et"] < end_time_ny)
]

print (f"Articles for {target_day}: {len(df)}")

df["date"] = pd.to_datetime(df["date"], errors="coerce")

df["trade_day"] = pd.to_datetime(
    df["trade_day"],
    errors="coerce"
).dt.date

df["text"] = df["text"].astype(str).str.strip()

df = df[df["text"] != ""].copy()

day_counts = df["trade_day"].value_counts()

valid_days = sorted(
    day_counts[day_counts >= TOP_K_PER_DAY].index
)


def select_top_k_articles(day_df):

    return day_df.sort_values(
        by=["relevance_score", "date"],
        ascending=[False, True]
    ).head(TOP_K_PER_DAY).copy()


day_df = select_top_k_articles(df)

day_df = day_df.sort_values("date")

article_summarizer = pipeline(
    "summarization",
    model=ARTICLE_SUMMARIZER_MODEL,
    device=-1
)

long_summarizer = pipeline(
    "summarization",
    model=LONG_SUMMARIZER_MODEL,
    tokenizer=LONG_SUMMARIZER_MODEL,
    device=-1
)

sentiment_model = pipeline(
    "sentiment-analysis",
    model=SENTIMENT_MODEL,
    device=-1
)

tokenizer = article_summarizer.tokenizer


def get_token_length(text):

    return len(
        tokenizer.encode(
            str(text),
            truncation=True
        )
    )


def batch_summarize_articles(texts, batch_size=8):

    results = article_summarizer(
        texts,
        max_length=90,
        min_length=50,
        do_sample=False,
        batch_size=batch_size,
        truncation=True
    )

    return [
        r.get("summary_text", "").strip()
        for r in results
    ]




def summarize_combined_text(text):

    result = long_summarizer(
        text,
        max_length=700,
        min_length=390,
        do_sample=False,
        truncation=True
    )

    return result[0]["summary_text"].strip()


def article_signal(label):

    if not label:
        return "unknown"

    label = label.lower()

    if label == "positive":
        return "bullish"

    elif label == "negative":
        return "bearish"

    return "neutral"


day_df = day_df.copy()

day_df["text"] = day_df["text"].astype(str).fillna("")

texts = day_df["text"].tolist()
urls = day_df["url"].tolist()

short_items = []
long_texts = []
long_indices = []

for idx, text in enumerate(texts):

    if get_token_length(text) < 90:
        short_items.append((idx, text))

    else:
        long_texts.append(text)
        long_indices.append(idx)

long_summaries = (
    batch_summarize_articles(long_texts)
    if long_texts else []
)

summaries = [""] * len(texts)

for idx, text in short_items:

    summaries[idx] = (
        str(text)
        .strip()
        .replace("\n", " ")
    )

for idx, summary in zip(long_indices, long_summaries):

    summaries[idx] = summary.strip()

day_df["summary"] = summaries


combined_text = "\n\n".join(
    f"Article {i+1}: {s}"
    for i, s in enumerate(day_df["summary"].tolist())
    if str(s).strip()
)

daily_summary = summarize_combined_text(
    combined_text
)

daily_sentiment = sentiment_model(
    daily_summary
)[0]

daily_label = daily_sentiment["label"]



overall_signal = article_signal(
    daily_label
)


combined_urls = " | ".join(urls)

final_output = {
    "report_date": day_df["trade_day"].iloc[0],
    "summary_text": daily_summary,
    "market_tone": overall_signal,
    "source_urls": combined_urls
}

day_df.to_csv(
    "live_article_details.csv",
    index=False
)

pd.DataFrame([final_output]).to_csv(
    "live_eod_summary.csv",
    index=False
)
