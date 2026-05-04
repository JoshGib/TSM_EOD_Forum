'''
    Student: Joshua Gibaja
    This file is made to filter through 'yahoo_finance_felixdrinkall.000.parqut' and sleect dates that only have more then 20 relevant articles based on akey word filter created and removal of junk words 
    then the outlput is a filtered csv meant to use as a sample to then train a model for summarization of the stock market.
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

# Lad data
df = pd.read_parquet("yahoo_finance_felixdrinkall.000.parquet")

# Clean date column
df["date"] = pd.to_datetime(df["date"], errors="coerce")

# Drop rows missing key fields
df = df.dropna(subset=["date", "text"]).copy()
df["text"] = df["text"].astype(str).str.strip()
df = df[df["text"] != ""].copy()

df['extra_fields'] = df['extra_fields'].apply(json.loads)
extra_df = pd.json_normalize(df['extra_fields'])

# Merge back into main dataframe
df = pd.concat([df.drop(columns=['extra_fields']), extra_df], axis=1)
df = df[["date", "text", "url"]]


# Use calendar date only
df["trade_day"] = df["date"].dt.date


# Filter

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

day_counts = df["trade_day"].value_counts()
valid_days = day_counts[day_counts >= 10]
valid_day_list = valid_days.index
df_final = df[df["trade_day"].isin(valid_day_list)].copy()
df_final.to_csv("filtered_articles.csv", index=False)
