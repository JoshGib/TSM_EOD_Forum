'''
    Student: Joshua Gibaja
    This file is made to filter through 'yahoo_finance_felixdrinkall.000.parqut' and selects based on secctor ket words and releavance score to then create batches of 5 articles per sector per day that are then passed to be split for the pipeline. 
    Keep in mind the data is from 2017-2023 so key words reflect global even durring those time periods. 
'''

import pandas as pd
import json
import re




# Load data
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

consumer_discretionary_keywords = [
    "retail", "sales", "consumer spending", "ecommerce",
    "luxury", "automakers", "auto sales",
    "travel", "leisure", "restaurants",
    "nike", "tesla", "amazon", "home depot", "mcdonalds"
]

information_technology_keywords = [
    "semiconductor", "chip", "chips", "ai", "artificial intelligence",
    "cloud", "software", "hardware",
    "cybersecurity", "data center", "gpu", "graphics",
    "nvidia", "apple", "microsoft", "amd", "intel"
]

health_care_keywords = [
    "pharmaceutical", "pharma", "biotech",
    "clinical trial", "fda", "drug",
    "vaccine", "vaccines", "medical device",
    "health insurance",
    "pfizer", "moderna", "johnson & johnson", "unitedhealth"
]

utilities_keywords = [
    "electric", "utility", "power", "grid",
    "natural gas", "water utility",
    "renewable",
    "nextera", "duke energy", "southern company"
]

industrials_keywords = [
    "aerospace", "defense", "manufacturing",
    "infrastructure", "construction", "machinery",
    "supply chain", "logistics", "rail",
    "boeing", "lockheed martin", "caterpillar", "ups"
]

consumer_staples_keywords = [
    "food", "beverage", "household", "personal care",
    "grocery", "consumer goods",
    "pricing power", "defensive",
    "procter & gamble", "coca cola", "pepsico", "walmart", "costco"
]

communication_services_keywords = [
    "social media", "streaming", "advertising",
    "telecom", "wireless", "broadband",
    "meta", "google", "alphabet", "netflix", "disney", "verizon"
]

energy_keywords = [
    "oil", "crude", "brent", "natural gas",
    "opec", "production",
    "energy demand", "refining", "exploration",
    "exxon", "chevron", "conocophillips"
]

financials_keywords = [
    "bank", "banks", "interest rate", "interest rates", "lending",
    "loan", "loans", "loan growth", "credit", "credit card",
    "mortgage", "investment banking", "asset management",
    "dividend", "dividends", "capital", "yield",
    "Federal Reserve", "Fed", "FDIC",
    "inflation", "recession",
    "JPMorgan", "Goldman Sachs", "Morgan Stanley", "Citigroup",
    "Bank of America", "Wells Fargo", "PNC", "Capital One",
    "Paycheck Protection Program", "PPP",
    "SBA", "stimulus", "CARES Act",
    "loan forgiveness", "Basel", "stress test",
    "cryptocurrency", "crypto", "fintech"
]

materials_keywords = [
    "commodity", "metals", "mining",
    "copper", "gold", "steel", "chemicals",
    "lithium", "fertilizer",
    "dow", "dupont", "freeport mcmoran"
]

real_estate_keywords = [
    "reit", "real estate investment trust",
    "commercial real estate", "housing",
    "home prices", "mortgage",
    "office space", "rental",
    "prologis", "american tower", "realty income"
]

# Junk / PR / research spam
junk_keywords = [
    "globenewswire", "pr newswire", "accesswire", "cnw", "newswire",
    "sample report", "request customization", "customization",
    "market research", "report covers", "buy this report",
    "download free sample", "download sample", "instant purchase",
    "contact us", "about us", "media advisory", "business wire",
    "research report", "pipeline assessment", "table of contents",
    "request for sample", "click here", "phone:", "email:", "web:", "best deals for christmas and after"
]


sector_keywords = {
    "consumer_discretionary": consumer_discretionary_keywords,
    "information_technology": information_technology_keywords,
    "health_care": health_care_keywords,
    "utilities": utilities_keywords,
    "industrials": industrials_keywords,
    "consumer_staples": consumer_staples_keywords,
    "communication_services": communication_services_keywords,
    "energy": energy_keywords,
    "financials": financials_keywords,
    "materials": materials_keywords,
    "real_estate": real_estate_keywords
}

text_lower = df["text"].str.lower()

# Remove obvious junk first
junk_mask = text_lower.apply(lambda x: any(k in x for k in junk_keywords))
df = df[~junk_mask].copy()


def relevance_score(text, keywords_list=None):
    text = str(text).lower()
    score = 0

    for kw in keywords_list:
        pattern = r"\b" + re.escape(kw) + r"\b"
        if re.search(pattern, text):
            score += 1

    return score
batches = []

for sector, kw_list in sector_keywords.items():
    
    score_col = f"relevance_score_{sector}"
    
    df[score_col] = df["text"].apply(relevance_score, args=(kw_list,))
    
    df_sector = df[df[score_col] >= 1].copy()
    
    for date, group in df_sector.groupby("trade_day"):
        
        if len(group) >= 5:
            top5 = (
                group
                .sort_values(by=score_col, ascending=False)
                .head(5)
                .reset_index(drop=True)
            )
            
            total_score = top5[score_col].sum()
            batches.append({
                "date": date,
                "sector": sector,
                "total_score": total_score,
                "url_1": top5.loc[0, "url"],
                "url_2": top5.loc[1, "url"],
                "url_3": top5.loc[2, "url"],
                "url_4": top5.loc[3, "url"],
                "url_5": top5.loc[4, "url"],
                "article_1": top5.loc[0, "text"],
                "article_2": top5.loc[1, "text"],
                "article_3": top5.loc[2, "text"],
                "article_4": top5.loc[3, "text"],
                "article_5": top5.loc[4, "text"]
            })

batches_df = pd.DataFrame(batches)

batches_df.to_csv("sector_batches.csv", index=False)
