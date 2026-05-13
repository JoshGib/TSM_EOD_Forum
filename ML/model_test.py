"""
Student: Joshua Gibaja
Model test using the 55 entries we had set aside and are now summarized and ready to use for a placeholder on the forum. 
generate report and csv with concated article summaries and uses the fine tune model. 

"""

import pandas as pd
from tqdm.auto import tqdm
from transformers import pipeline
from transformers.utils import logging

# Settings
INPUT_CSV = "test_original_texts.csv"

LONG_SUMMARIZER_MODEL = "./eod_summmary_bart"
SENTIMENT_MODEL = "ProsusAI/finbert"



TEST_OUTPUT = "test_original_generated_texts.csv"

logging.disable_progress_bar()
logging.set_verbosity_error()

# Load data
df = pd.read_csv(INPUT_CSV)


# Load models for training only
long_summarizer = pipeline(
    "summarization",
    model=LONG_SUMMARIZER_MODEL,
    tokenizer=LONG_SUMMARIZER_MODEL,
    device=-1,
    truncation=True
)

sentiment_model = pipeline(
    "sentiment-analysis",
    model=SENTIMENT_MODEL,
    device=-1,
    truncation=True
)
# Helper functions

def batch_get_sentiment(texts, batch_size=16):
    cleaned_texts = [str(t) if t else "" for t in texts]

    valid_idx = [i for i, t in enumerate(cleaned_texts) if t]
    valid_texts = [cleaned_texts[i] for i in valid_idx]

    outputs = [(None, None)] * len(cleaned_texts)

    if valid_texts:
        results = sentiment_model(valid_texts, batch_size=batch_size)
        for i, r in zip(valid_idx, results):
            outputs[i] = (r["label"], float(r["score"]))

    return outputs


def summarize_combined_text(text):
    


    result = long_summarizer(
        text,
        max_length=700,
        min_length=390,
        do_sample=False,
        truncation=True
    )

    return result[0]["summary_text"].strip()


def get_sentiment(text):
    r = sentiment_model(str(text))[0]
    return r["label"], float(r["score"])


def article_signal(label):
    if not label:
        return "unknown"
    label = label.lower()
    return "bullish" if label == "positive" else "bearish" if label == "negative" else "neutral"


test_daily_rows = []

for trade_day, row in tqdm(df.iterrows(), total=len(df)):
    combined_text = row["original_text"]

    daily_summary = summarize_combined_text(combined_text)
    label, score = get_sentiment(daily_summary)
    
    overall_signal = article_signal(label)

    test_daily_rows.append({
        "trade_day": row["trade_day"],
        "generated_eod_summary": daily_summary,
        "daily_summary_sentiment": label,
        "daily_summary_sentiment_score": score,
        "overall_article_signal": overall_signal,
        "combined_article_summaries": combined_text,
        "url": row["urls"]
    })

pd.DataFrame(test_daily_rows).to_csv(TEST_OUTPUT, index=False)

with open("test_reports.txt", "w", encoding="utf-8") as f:
    for row in test_daily_rows:
        f.write(f"{row['trade_day']}\n")
        f.write(row["generated_eod_summary"] + "\n\n")

print("Saved test outputs:")
print(TEST_OUTPUT)
print("test_reports.txt")