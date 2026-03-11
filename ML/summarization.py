'''
    Student: Reinald Peguero
'''
# import packages
import pandas as pd
from tqdm import tqdm
from transformers import pipeline
import re

# Disable logs/progress bars while running model
from transformers.utils import logging
from tqdm.auto import tqdm

# execute commands to disable logs/progress bars
tqdm.disable = True
logging.disable_progress_bar()
logging.set_verbosity_error()

# Load dataset
df = pd.read_parquet("sp500_daily_headlines.000.parquet")

# Use sample first
df = df.head(20).copy()

# Summarizer
summarizer = pipeline(
    "summarization",
    model="facebook/bart-large-cnn",
    device=-1
) # MACHINE PERFORMANCE: set device=0 for GPU or device=-1 for CPU

# This is the summarization function for individual datapoints
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

# set sentiment model
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

pattern = r"\b[A-Z]{3,4}\b" # regular expression for 3 to 4 capital letters

# Function to parse text for pattern
def extract_ticker(text):

    if pd.isna(text):
        return None

    matches = re.findall(pattern, text)

    if len(matches) == 0:
        return None
    return matches[0]   # take first ticker found


df["Ticker"] = df["text"].apply(extract_ticker)
df["date"] = pd.to_datetime(df["date"]).dt.date # show date only - no time
pd.set_option("display.max_columns", None) # Force to show all columns - no elipses

# echo results
print(df[["date", "summary", "sentiment", "Ticker", "sentiment_score"]].head(20))

tqdm.pandas()

# save
df.to_csv("news_sentiment_summary.csv", index=False)
