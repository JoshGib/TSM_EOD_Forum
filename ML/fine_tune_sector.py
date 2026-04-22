"""""
Student: Joshua Gibaja 
This file is made to process 'fine_tune_batches.csv' and build training and testing datasets
for a sector based summiraztion model.
"""
import pandas as pd
from datasets import Dataset
from sklearn.model_selection import train_test_split
from transformers import (
    BartTokenizer,
    BartForConditionalGeneration,
    Trainer,
    TrainingArguments,
    DataCollatorForSeq2Seq
)


# Load CSV
train_df = pd.read_csv("fine_tune_batches.csv")

# Keep only needed columns (trade day is not neeeded)
train_df = train_df[[
    "combined_article_summaries",
    "generated_eod_summary"
]].dropna()



# Split train/validation
train_texts, val_texts = train_test_split(
    train_df,
    test_size=0.15,
    random_state=42
)

train_dataset = Dataset.from_pandas(train_texts.reset_index(drop=True))
val_dataset = Dataset.from_pandas(val_texts.reset_index(drop=True))

# Load model and tokenizer
model_name = "facebook/bart-large-cnn"

tokenizer = BartTokenizer.from_pretrained(model_name)
model = BartForConditionalGeneration.from_pretrained(model_name)

def preprocess(example):
    inputs = tokenizer(
        example["combined_article_summaries"],
        max_length=1024,
        truncation=True
    )

    targets = tokenizer(
        example["generated_eod_summary"],
        max_length=700,
        truncation=True
    )


    inputs["labels"] = targets["input_ids"]
    return inputs
train_dataset = train_dataset.map(preprocess, batched=False)
val_dataset = val_dataset.map(preprocess, batched=False)

#training arugments learning rate and batch size are very low to avoid overfitting on such a small dataset, and to allow the model to learn slowly from the new data without forgetting the general summarization capabilities it already has. The number of epochs is set to 3 to give the model enough passes through the data while monitoring for overfitting. 
#The save strategy is set to "epoch" to save the model after each epoch, allowing us to keep track of its performance and revert to the best version if needed. 
#The load_best_model_at_end option ensures that we end up with the best performing model based on validation loss. 
training_args = TrainingArguments(
    output_dir="./bart_sector_model",
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=1,
    per_device_eval_batch_size=1,
    num_train_epochs=3,
    weight_decay=0.01,
    save_total_limit=2,
    logging_steps=5,
    load_best_model_at_end=True,
    fp16=True
)

data_collator = DataCollatorForSeq2Seq(
    tokenizer=tokenizer,
    model=model
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    data_collator=data_collator,
    processing_class=tokenizer
)

trainer.train()

model.save_pretrained("./eod_sector_bart")
tokenizer.save_pretrained("./eod_sector_bart")