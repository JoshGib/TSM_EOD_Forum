"""
    Student: Joshua Gibaja

    This file is made to process 'filtered_articles.csv' and build training and testing datasets
    for a multi-day stock market summarization model.

    The pipeline first loads and cleans the article data by:
    - Reading the filtered CSV file
    - Converting 'date' and 'trade_day' into datetime format

    The valid trade days are then split into:
    - Test days: the first 55 valid trade days
    - Train days: all remaining valid trade days

    For each day:
    - The top 10 articles are selected
    - If 'relevance_score' exists, the highest scoring articles are chosen
    - Otherwise, the earliest articles are used

    For training days:
    - Each article is summarized using 'sshleifer/distilbart-cnn-12-6' if it is more than 90 tokens long, otherwise the original text is used
    - Sentiment is computed for each article summary using 'ProsusAI/finbert'
    - Sentiment labels are converted into bullish, bearish, or neutral article signals
    - The article summaries are combined into one text block
    - A final end-of-day market summary is generated using 'facebook/bart-large-cnn'
    - Sentiment is also computed for the final daily summary
    - Daily bullish, bearish, and neutral article counts are stored

    For test days:
    - Each article is summarized using 'sshleifer/distilbart-cnn-12-6' if they are more than 90 tokens long, otherwise the original text is used
    - combined article summaries are created but no sentiment is computed
    - The original article text is also stored for testing

    The final outputs created are:
    - train_article_details.csv
        Contains article-level summaries, sentiment labels, scores, and signals
    - train_daily_summaries.csv
        Contains the generated end-of-day summaries and overall sentiment metrics
    - train_reports.txt
        Contains a text report of all generated daily summaries (for display and reading)
    - test_original_texts.csv
        Contains original article text grouped by trade day for testing

    The output is meant to be used as training data for a model that can summarize
    stock market activity and produce end-of-day market outlooks.
"""


import pandas as pd
from tqdm.auto import tqdm
from transformers import pipeline
from transformers.utils import logging


# Settings
INPUT_CSV = "filtered_articles.csv"

ARTICLE_SUMMARIZER_MODEL = "sshleifer/distilbart-cnn-12-6"
LONG_SUMMARIZER_MODEL = "facebook/bart-large-cnn"
SENTIMENT_MODEL = "ProsusAI/finbert"

TOP_K_PER_DAY = 10
TEST_DAYS_COUNT = 55

TRAIN_DAILY_OUTPUT = "train_daily_summaries.csv"
TRAIN_ARTICLE_OUTPUT = "train_article_details.csv"
TEST_OUTPUT = "test_original_texts.csv"

logging.disable_progress_bar()
logging.set_verbosity_error()

# Load data
df = pd.read_csv(INPUT_CSV)

df["date"] = pd.to_datetime(df["date"], errors="coerce")
df["trade_day"] = pd.to_datetime(df["trade_day"], errors="coerce").dt.date
df["text"] = df["text"].astype(str).str.strip()
df = df[df["text"] != ""].copy()


day_counts = df["trade_day"].value_counts()
valid_days = sorted(day_counts[day_counts >= TOP_K_PER_DAY].index)


# Split days
test_days = valid_days[:TEST_DAYS_COUNT]
train_days = valid_days[TEST_DAYS_COUNT:]

print(f"Test days: {len(test_days)}")
print(f"Train days: {len(train_days)}")

# Load models for training 
article_summarizer = pipeline("summarization", model=ARTICLE_SUMMARIZER_MODEL, device=-1)
long_summarizer = pipeline("summarization", model=LONG_SUMMARIZER_MODEL, device=-1)
sentiment_model = pipeline("sentiment-analysis", model=SENTIMENT_MODEL, device=-1)
tokenizer = long_summarizer.tokenizer


def select_top_k_articles(day_df):
    return day_df.sort_values(
        by=["relevance_score", "date"],
        ascending=[False, True]
    ).head(TOP_K_PER_DAY).copy()


def batch_summarize_articles(texts, batch_size=8):

    valid_idx = [i for i, t in enumerate(texts) if t]
    valid_texts = [texts[i] for i in valid_idx]

    outputs = [""] * len(texts)

    if valid_texts:
        results = article_summarizer(
            valid_texts,
            max_length=90,
            min_length=50,
            do_sample=False,
            batch_size=batch_size,
            truncation=True
        )

        for i, r in zip(valid_idx, results):
            outputs[i] = r.get("summary_text", "").strip()

    return outputs


def batch_get_sentiment(texts, batch_size=10):
    outputs = [(None, None)] * len(texts)

    for start in range(0, len(texts), batch_size):
        batch_texts = [str(t) for t in texts[start:start + batch_size]]

        results = sentiment_model(
            batch_texts,
            truncation=True,   
            max_length=512
        )

        for i, r in enumerate(results):
            outputs[start + i] = (r["label"], float(r["score"]))

    return outputs


def summarize_combined_text(text):

    text = str(text)

    result = long_summarizer(
        text,
        max_length=700,
        min_length=390,
        do_sample=False,
        truncation=True
    )

    return result[0]["summary_text"].strip()



def get_token_length(text):
    return len(tokenizer.encode(text, truncation=True))


def article_signal(label):
    if not label:
        return "unknown"
    label = label.lower()
    return "bullish" if label == "positive" else "bearish" if label == "negative" else "neutral"


# Build test set 
test_rows = []

print("\nBuilding test set...")
for trade_day in tqdm(test_days):

    day_df = df[df["trade_day"] == trade_day].copy()
    day_df = select_top_k_articles(day_df)
    day_df = day_df.sort_values("date")

    texts = day_df["text"].tolist()
    urls = day_df["url"].tolist()

    # Split into short or long (90 tokens cut off)
    short_items = []
    long_texts = []
    long_indices = []

    for idx, text in enumerate(texts):
        if get_token_length(text) < 90:
            short_items.append((idx, text))
        else:
            long_texts.append(text)
            long_indices.append(idx)
    # Summarize only long texts
    long_summaries = batch_summarize_articles(long_texts, batch_size=8) if long_texts else []
    # Reconstruct summaries in correct order
    final_articles = [""] * len(texts)
    # Fill short (no summarization) 
    for idx, text in short_items:
        final_articles[idx] = str(text).strip().replace("\n", " ")
    # Fill long (summarized)
    for idx, summary in zip(long_indices, long_summaries):
        final_articles[idx] = summary.strip()

    combined_text = "\n\n".join(
        f"Article {i+1}: {t}" for i, t in enumerate(final_articles)
    )

    combined_urls = " | ".join(urls)

    test_rows.append({
        "trade_day": trade_day,
        "original_text": combined_text,
        "urls": combined_urls
    })

pd.DataFrame(test_rows).to_csv(TEST_OUTPUT, index=False)
print(f"Saved test file: {TEST_OUTPUT}")


# Build train set
train_article_rows = []
train_daily_rows = []

print("\nBuilding train set...")
for i, trade_day in enumerate(tqdm(train_days), start=1):

    day_df = df[df["trade_day"] == trade_day].copy()
    day_df = select_top_k_articles(day_df)

    # Article summaries
    texts = day_df["text"].tolist()
    # Split into short or long (90 tokens cut off)
    short_items = []
    long_texts = []
    long_indices = []

    for idx, text in enumerate(texts):
        if get_token_length(text) < 90:
            short_items.append((idx, text))
        else:
            long_texts.append(text)
            long_indices.append(idx)

    # Summarize only long texts
    long_summaries = batch_summarize_articles(long_texts, batch_size=8) if long_texts else []

    # Reconstruct summaries in correct order
    summaries = [""] * len(texts)

    # Fill short (no summarization)
    for idx, text in short_items:
        summaries[idx] = str(text).strip().replace("\n", " ")

    # Fill long (summarized)
    for idx, summary in zip(long_indices, long_summaries):
        summaries[idx] = summary.strip()

    day_df["summary"] = summaries

    # Sentiment
    sentiment = batch_get_sentiment(day_df["summary"].tolist())
    day_df["sentiment"] = [x[0] for x in sentiment]
    day_df["sentiment_score"] = [x[1] for x in sentiment]
    day_df["article_signal"] = day_df["sentiment"].apply(article_signal)

    # Combine summaries
    ordered = day_df.sort_values(
        ["relevance_score", "date"], ascending=[False, True]
    ) if "relevance_score" in day_df.columns else day_df.sort_values("date")

    combined = "\n\n".join(
        f"Article {i+1}: {s}"
        for i, s in enumerate(ordered["summary"].fillna("").tolist())
        if s.strip()
    )

    daily_summary = summarize_combined_text(combined)

    pos = (day_df["sentiment"] == "positive").sum()
    neg = (day_df["sentiment"] == "negative").sum()

    overall = "bullish" if pos > neg else "bearish" if neg > pos else "neutral"

    train_article_rows.append(day_df)

    train_daily_rows.append({
        "trade_day": trade_day,
        "generated_eod_summary": daily_summary,
        "combined_article_summaries": combined,
        "positive_articles": int(pos),
        "negative_articles": int(neg),
        "neutral_articles": int((day_df["sentiment"] == "neutral").sum()),
        "overall_article_signal": overall,
    })


# Save train outputs
pd.concat(train_article_rows).to_csv(TRAIN_ARTICLE_OUTPUT, index=False)
pd.DataFrame(train_daily_rows).to_csv(TRAIN_DAILY_OUTPUT, index=False)


