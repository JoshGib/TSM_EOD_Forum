"""
Student: Joshua Gibaja

This file is made to process 'sector_batches.csv' and build training and testing datasets
for a multi-sector stock market summarization model.


For training data:
- Each article is summarized using 'sshleifer/distilbart-cnn-12-6'
- The article-level summaries are combined into a structured sector-level input block
- A final end-of-day (EOD) sector summary is generated using 'facebook/bart-large-cnn'
- The model learns to map multi-article sector inputs → EOD financial summaries
- Outputs include article-level summaries, combined context, and final generated summaries

For test data:
- The same article summarization pipeline is applied
- No training labels are used during inference preparation
- Each sector-day contains:
  - Original articles
  - Generated article summaries
  - Combined sector context summary
  - Associated financial news URLs


The final outputs created are:

- train_sector_summaries.csv
    Contains: article_1 to article_5 (summarized articles), combined_article_summaries (summary of raw text), generated_eod_summary (final model target output)

- test_sector_batches.csv
    Contains: original_articles (raw article text), combined_article_summaries (summary of raw text), urls.

This dataset is designed for training transformer-based summarization models
to generate end-of-day financial sector summaries from multiple news articles.
"""



import pandas as pd
from tqdm.auto import tqdm
from transformers import pipeline
from transformers.utils import logging



ARTICLE_SUMMARIZER_MODEL = "sshleifer/distilbart-cnn-12-6"
LONG_SUMMARIZER_MODEL = "facebook/bart-large-cnn"

article_summarizer = pipeline(
    "summarization",
    model=ARTICLE_SUMMARIZER_MODEL,
    device=-1
)

long_summarizer = pipeline(
    "summarization",
    model=LONG_SUMMARIZER_MODEL,
    device=-1
)

logging.disable_progress_bar()
logging.set_verbosity_error()



df = pd.read_csv("sector_batches.csv")
test_df = pd.read_csv("test_original_generated_texts.csv")

df["date"] = pd.to_datetime(df["date"])
test_df["trade_day"] = pd.to_datetime(test_df["trade_day"])

test_days = test_df["trade_day"].drop_duplicates()



train_df = df[~df["date"].isin(test_days)].copy()
test_df_final = df[df["date"].isin(test_days)].copy()

train_df = train_df.copy()

train_df = train_df.sort_values(["sector", "total_score"], ascending=[True, False])

train_df = train_df.groupby("sector", as_index=False).head(30).reset_index(drop=True)




def summarize_articles(texts, batch_size=5):

    results = article_summarizer(
        texts,
        max_length=120,
        min_length=40,
        do_sample=False,
        batch_size=batch_size,
        truncation=True
    )

    outputs = [
        r.get("summary_text", "").strip()
        for r in results
    ]

    return outputs


# Long eod summarizer


def summarize_eod(text):


    text = str(text)

    result = long_summarizer(
        text,
        max_length=350,
        min_length=150,
        do_sample=False,
        truncation=True
    )

    return result[0]["summary_text"].strip()



# Build train set

train_rows = []

print("\nBuilding train set...")

for row in tqdm(train_df.itertuples(index=False), total=len(train_df), desc="Days"):

    articles = [
        row.article_1,
        row.article_2,
        row.article_3,
        row.article_4,
        row.article_5
    ]

    

    
    article_summaries = []

    for i, text in enumerate(tqdm(articles, desc="Summarizing articles", leave=False)):
        summary = summarize_articles([text])[0]
        article_summaries.append(summary)

    
    
    combined_text = "\n\n".join(
    f"Article {i+1}: {t}" for i, t in enumerate(article_summaries)
    )

    
    
    eod_summary = summarize_eod(combined_text)

    train_rows.append({
        "date": row.date,
        "sector": row.sector,
        "article_1": article_summaries[0],
        "article_2": article_summaries[1],
        "article_3": article_summaries[2],
        "article_4": article_summaries[3],
        "article_5": article_summaries[4],
        "combined_article_summaries": combined_text,
        "generated_eod_summary": eod_summary
    })

train_output = pd.DataFrame(train_rows)
train_output.to_csv("train_sector_summaries.csv", index=False)


test_rows = []

print("\nBuilding test set...")

for row in tqdm(test_df_final.itertuples(index=False), total=len(test_df_final), desc="Test Days"):

    articles = [
        row.article_1,
        row.article_2,
        row.article_3,
        row.article_4,
        row.article_5
    ]

    urls = [
        row.url_1,
        row.url_2,
        row.url_3,
        row.url_4,
        row.url_5
    ]

    article_summaries = []

    for text in tqdm(articles, desc="Summarizing test articles", leave=False):
        article_summaries.append(summarize_articles([text])[0])

    combined_text = "\n\n".join(
    f"Article {i+1}: {t}" for i, t in enumerate(article_summaries)
    )

    combined_urls = " | ".join([u for u in urls if pd.notna(u)])

    test_rows.append({
        "date": row.date,
        "sector": row.sector,
        "original_articles": articles,
        "article_urls": urls,
        "combined_article_summaries": combined_text,
        "urls": combined_urls
    })

test_output = pd.DataFrame(test_rows)
test_output.to_csv("test_sector_batches.csv", index=False)

print("\nSaved:")
print("- train_sector_summaries.csv")
print("- test_sector_batches.csv")