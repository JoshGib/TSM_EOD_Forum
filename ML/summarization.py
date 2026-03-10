'''
    Student: Reinald Peguero
'''
import pandas as pd
from tqdm import tqdm
import torch
from transformers import pipeline
import re

# Load dataset
df = pd.read_parquet("sp500_daily_headlines.000.parquet")

# Summarizer
summarizer = pipeline(
    "summarization",
    model="facebook/bart-large-cnn",
    device=0 if torch.cuda.is_available() else -1
)

def summarize_article(text):
    if pd.isna(text) or not str(text).strip():
        return ""

    result = summarizer(
        str(text),
        max_length=60,
        min_length=20,
        do_sample=False
    )

    first = result[0]
    return first.get("summary_text", first.get("generated_text", ""))

summaries = []

for text in tqdm(df["text"], total=len(df)):
    summaries.append(summarize_article(text))

df["summary"] = summaries

print(df[["text", "summary"]].head())

# sentiment model
sentiment_model = pipeline(
    "sentiment-analysis",
    model="ProsusAI/finbert"
)

def get_sentiment(text):

    if text == "":
        return None, None

    result = sentiment_model(text)[0]

    return result["label"], result["score"]

df[["sentiment","sentiment_score"]] = df["summary"].apply(
    lambda x: pd.Series(get_sentiment(x))
)

# regular expression extracting ticker symbol from text
pattern = r"\b[A-Z]{3,4}\b"

def extract_ticker(text):

    if pd.isna(text):
        return None

    matches = re.findall(pattern, text)

    if len(matches) == 0:
        return None

    return matches[0]   # take first ticker found

df["Ticker"] = df["text"].apply(extract_ticker)

print(df[["date", "summary", "sentiment", "Ticker", "sentiment_score"]].head(10))

tqdm.pandas()

# save
df.to_sql("news_sentiment_summary.csv", index=False)

