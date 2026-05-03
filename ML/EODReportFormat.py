import pandas as pd

df = pd.read_csv('test_original_generated_texts.csv', encoding='utf-8')

df['trade_day'] = pd.to_datetime(df['trade_day'])

df['overall_article_signal'] = df['overall_article_signal'].str.capitalize()

df['generated_eod_summary'] = df['generated_eod_summary'].str.strip()

df['url_list'] = df['urls'].str.split('|')

df = df.sort_values('trade_day').reset_index(drop=True)

print(df[['trade_day', 'generated_eod_summary', 'overall_article_signal','url_list']].to_string(index=False))

df.drop(columns=['daily_summary_sentiment','daily_summary_sentiment_score',
                 'combined_article_summaries']).to_csv('test_OGTexts_cleaned.csv',
                index=False, encoding='utf-8')
