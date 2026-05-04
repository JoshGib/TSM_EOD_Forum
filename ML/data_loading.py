"""
    Student: Joshua Gibaja
    This file is just to process the fine tune sample with what was generated before in sample_pipeline to then be used for the fine tuning section.
"""

import pandas as pd

#load data
Fine_tune_sample = pd.read_csv("fine_tune_sample.csv") #After running dor the train data set then idsolated only summaries to then edit by hand.
original_summary = pd.read_csv("train_daily_summaries.csv")

#keep whats needed only
original_summary = original_summary[["trade_day","combined_article_summaries"]]

#merge so only fine tunee sample dates are selected
merged_df = pd.merge(original_summary, Fine_tune_sample, on='trade_day', how='inner')

#get rid of second index 
merged_df = merged_df[["trade_day", "combined_article_summaries", "generated_eod_summary"]]

#save
merged_df.to_csv('fine_tune.csv', index=False)
