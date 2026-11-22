import pandas as pd

df = pd.read_csv("cleankepler.csv")

print("Dataset shape:", df.shape)

keywords = [
    "koi_prad",
    "koi_teq",
    "koi_insol",
    "koi_steff",
    "koi_srad",
    "koi_smass",
    "koi_slogg",
    "koi_srho",
    "koi_sma",
    "koi_dor",
    "koi_disposition"
]

for column in keywords:
    if column in df.columns:
        print(f"{column}: available")
    else:
        print(f"{column}: not available")