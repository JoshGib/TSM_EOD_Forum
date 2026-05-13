"""
Student: Joshua Gibaja
Model test using the 339 entries for sectors we had set aside and are now summarized and ready to use for a placeholder on the forum.
generate report and csv with concated article summaries and uses the fine tune model.

"""

import pandas as pd
from tqdm.auto import tqdm
from transformers import pipeline
from transformers.utils import logging

# Settings
INPUT_CSV = "test_sector_batches.csv"

LONG_SUMMARIZER_MODEL = "./eod_sector_bart"



TEST_OUTPUT = "test_generated_batches.csv"

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
    truncation=True,
)


# Helper functions


def summarize_combined_text(text):    

    result = long_summarizer(
        text,
        max_length=350,
        min_length=150,
        do_sample=False,
        truncation=True
    )

    return result[0]["summary_text"].strip()



test_daily_rows = []

for idx, row in tqdm(df.iterrows(), total=len(df)):
    combined_text = row["original_articles"]

    daily_summary = summarize_combined_text(combined_text)


    test_daily_rows.append({
        "trade_day": row["date"],
        "generated_eod_summary": daily_summary,
        "sector": row["sector"],
        "url" : row["url"]
    })

pd.DataFrame(test_daily_rows).to_csv(TEST_OUTPUT, index=False)



print("Saved test outputs:")
print(TEST_OUTPUT)
