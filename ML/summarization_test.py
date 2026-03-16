'''
    Student: Reinald Peguero and Joshua Gibaja
    First-batch test using yahoo_finance_felixdrinkall:
    - inspect dataset
    - filter out junk / PR-style articles
    - keep U.S. market-relevant articles
    - choose one real trading day
    - rank articles by relevance
    - take the best 20 articles from that day
    - summarize each article with DistilBART
    - run sentiment analysis on each article summary
    - combine 20 article summaries into 1 large daily summary
    - create one overall end-of-day market sentiment report
'''

# import packages
import pandas as pd
import json
from tqdm.auto import tqdm
from transformers import pipeline
from transformers.utils import logging

# Disable logs/progress bars while running model
logging.disable_progress_bar()
logging.set_verbosity_error()

# -----------------------------
# LOAD DATA
# -----------------------------
df = pd.read_parquet("yahoo_finance_felixdrinkall.000.parquet")

# Save a preview for inspection
df.sample(min(100, len(df)), random_state=42).to_csv("dataset_preview_1.csv", index=False)

# Clean date column
df["date"] = pd.to_datetime(df["date"], errors="coerce")

# Drop rows missing key fields
df = df.dropna(subset=["date", "text"]).copy()
df["text"] = df["text"].astype(str).str.strip()
df = df[df["text"] != ""].copy()

# -----------------------------
# PARSE extra_fields JSON
# -----------------------------
def parse_extra_fields(x):
    if pd.isna(x):
        return {}
    try:
        return json.loads(x)
    except Exception:
        return {}

df["extra_fields_parsed"] = df["extra_fields"].apply(parse_extra_fields)

# Use calendar date only
df["trade_day"] = df["date"].dt.date


# FILTER ARTICLES

# Strong keywords for broad U.S. market coverage
strong_market_keywords = [
    "s&p 500", "nasdaq", "dow jones", "wall street",
    "u.s. stocks", "us stocks", "stock market",
    "federal reserve", "treasury yields"
]

# Secondary finance keywords
secondary_market_keywords = [
    "stocks", "markets", "investors", "earnings",
    "fed", "inflation", "treasury", "economy",
    "economic", "rally", "selloff", "index", "indexes"
]

# Junk / PR / research spam
junk_keywords = [
    "globenewswire", "pr newswire", "accesswire", "cnw", "newswire",
    "sample report", "request customization", "customization",
    "market research", "report covers", "buy this report",
    "download free sample", "download sample", "for instant purchase",
    "contact us", "about us", "media advisory", "business wire",
    "research report", "pipeline assessment", "table of contents",
    "request for sample", "click here", "phone:", "email:", "web:"
]

text_lower = df["text"].str.lower()

# Remove obvious junk first
junk_mask = text_lower.apply(lambda x: any(k in x for k in junk_keywords))
df = df[~junk_mask].copy()

if df.empty:
    raise ValueError("All articles were removed by the junk filter.")

# Keep only articles with at least one strong or secondary keyword
market_mask = text_lower.loc[df.index].apply(
    lambda x: any(k in x for k in strong_market_keywords + secondary_market_keywords)
)
df = df[market_mask].copy()

if df.empty:
    raise ValueError("No market-relevant articles remained after filtering.")

# SCORE ARTICLES FOR RELEVANCE
def relevance_score(text):
    text = str(text).lower()
    score = 0

    # Strong market phrases get more weight
    for kw in strong_market_keywords:
        if kw in text:
            score += 3

    # Secondary market phrases get less weight
    for kw in secondary_market_keywords:
        if kw in text:
            score += 1

    return score

df["relevance_score"] = df["text"].apply(relevance_score)

# Keep only rows that scored positively
df = df[df["relevance_score"] > 0].copy()

if df.empty:
    raise ValueError("No articles remained after relevance scoring.")


# MOCK DAY

# Need a day with at least 20 relevant articles
day_counts = df["trade_day"].value_counts()
valid_days = day_counts[day_counts >= 20]

if valid_days.empty:
    raise ValueError("No filtered day with at least 20 relevant articles was found.")

# Pick the day with the most relevant articles
mock_day = valid_days.index[0]

# Filter to that day and rank best articles first
df = df[df["trade_day"] == mock_day].copy()
df = df.sort_values(
    by=["relevance_score", "date"],
    ascending=[False, True]
).head(20).copy()

print(f"\nMock Day Selected: {mock_day}")
print(f"Articles selected after filtering and ranking: {len(df)}")


# LOAD MODELS

summarizer = pipeline(
    "summarization",
    model="sshleifer/distilbart-cnn-12-6",
    device=-1
)

sentiment_model = pipeline(
    "sentiment-analysis",
    model="ProsusAI/finbert",
    device=-1
)

# FUNCTIONS

def summarize_article(text):
    if pd.isna(text) or not str(text).strip():
        return ""

    text = str(text)[:3000]

    result = summarizer(
        text,
        max_length=120,
        min_length=40,
        do_sample=False
    )

    first = result[0]
    return first.get("summary_text", first.get("generated_text", "")).strip()

def summarize_daily_text(text):
    if not text or not str(text).strip():
        return ""

    text = str(text)[:3500]

    result = summarizer(
        text,
        max_length=250,
        min_length=120,
        do_sample=False
    )

    first = result[0]
    return first.get("summary_text", first.get("generated_text", "")).strip()

def get_sentiment(text):
    if not text or not str(text).strip():
        return None, None

    result = sentiment_model(str(text)[:512])[0]
    return result["label"], float(result["score"])

def article_signal(label):
    if label is None:
        return "unknown"
    label = label.lower()
    if label == "positive":
        return "bullish"
    if label == "negative":
        return "bearish"
    return "neutral"


# SUMMARIZE EACH ARTICLE

summaries = []
for text in tqdm(df["text"], total=len(df), desc="Summarizing articles"):
    summaries.append(summarize_article(text))

df["summary"] = summaries

# SENTIMENT ON ARTICLE SUMMARIES

df[["sentiment", "sentiment_score"]] = df["summary"].apply(
    lambda x: pd.Series(get_sentiment(x))
)

df["article_signal"] = df["sentiment"].apply(article_signal)


# CREATE ONE LARGE DAILY SUMMARY

combined_summaries = " ".join(df["summary"].dropna().astype(str).tolist())
daily_summary = summarize_daily_text(combined_summaries)


# DAILY SENTIMENT AGGREGATION

positive_count = int((df["sentiment"] == "positive").sum())
negative_count = int((df["sentiment"] == "negative").sum())
neutral_count = int((df["sentiment"] == "neutral").sum())
avg_sentiment_score = float(df["sentiment_score"].mean())

if positive_count > negative_count:
    overall_day_signal = "bullish"
elif negative_count > positive_count:
    overall_day_signal = "bearish"
else:
    overall_day_signal = "neutral"

daily_sentiment_label, daily_sentiment_score = get_sentiment(daily_summary)

# BUILD READABLE DAILY REPORT

report_lines = [
    f"End-of-Day Sentiment Report for {mock_day}",
    "=" * 50,
    "",
    "DAILY MARKET SUMMARY:",
    daily_summary,
    "",
    "DAILY SENTIMENT BREAKDOWN:",
    f"Positive articles: {positive_count}",
    f"Negative articles: {negative_count}",
    f"Neutral articles: {neutral_count}",
    f"Average article sentiment score: {avg_sentiment_score:.4f}",
    f"Overall article-based market signal: {overall_day_signal}",
    f"Final daily summary sentiment: {daily_sentiment_label} ({daily_sentiment_score:.4f})"
    if daily_sentiment_label is not None else
    "Final daily summary sentiment: unavailable"
]

daily_report_text = "\n".join(report_lines)


# DAILY SUMMARY TABLE
daily_summary_df = pd.DataFrame([{
    "trade_day": mock_day,
    "article_count": len(df),
    "positive_articles": positive_count,
    "negative_articles": negative_count,
    "neutral_articles": neutral_count,
    "avg_article_sentiment_score": avg_sentiment_score,
    "overall_article_signal": overall_day_signal,
    "daily_summary": daily_summary,
    "daily_summary_sentiment": daily_sentiment_label,
    "daily_summary_sentiment_score": daily_sentiment_score
}])

# DISPLAY
pd.set_option("display.max_columns", None)
pd.set_option("display.max_colwidth", 200)

print("\nARTICLE-LEVEL RESULTS")
print(df[[
    "date", "trade_day", "relevance_score", "text", "summary",
    "sentiment", "sentiment_score", "article_signal"
]].head(20))

print("\nFINAL DAILY SUMMARY")
print(daily_summary)

print("\nDAILY SUMMARY TABLE")
print(daily_summary_df)

print("\nREADABLE DAILY REPORT")
print(daily_report_text)

# SAVE OUTPUTS
df.to_csv("news_sentiment_summary.csv", index=False)
daily_summary_df.to_csv("daily_summary.csv", index=False)

with open("daily_report.txt", "w", encoding="utf-8") as f:
    f.write(daily_report_text)

print("\nSaved files:")
print("- dataset_preview_1.csv")
print("- news_sentiment_summary.csv")
print("- daily_summary.csv")
print("- daily_report.txt")