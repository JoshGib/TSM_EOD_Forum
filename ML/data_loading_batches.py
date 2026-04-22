"""
    Student: Joshua Gibaja
    This file is just to process the fine tune sample with what was generated before in sample_sector_pipeline to then be used for the fine tuning section.
"""

import pandas as pd

#load data
Fine_tune_sample = pd.read_csv("train.csv") #After taking sample went back and edited chose to use whole sample
original_summary_200 = pd.read_csv("train_sector_summaries.csv")

Fine_tune_sample["date"] = pd.to_datetime(Fine_tune_sample["date"])
original_summary_200["date"] = pd.to_datetime(original_summary_200["date"])

#keep whats needed only
original_summary_200 = original_summary_200[["date", "sector" ,"combined_article_summaries"]]

#merge so only fine tune sample dates are selected
merged_df = pd.merge(
    original_summary_200,
    Fine_tune_sample,
    on=["date", "sector"],
    how="inner")
#get rid of second index 
merged_df = merged_df[["date", "sector", "combined_article_summaries", "generated_eod_summary"]]

#save
merged_df.to_csv('fine_tune_batches.csv', index=False)
