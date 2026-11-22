import pandas as pd

df = pd.read_csv("cleankepler.csv")

print("DATASET COLUMNS RELATED TO UNCERTAINTY OR QUALITY")
print("=" * 65)

keywords = [
    "err",
    "uncert",
    "flag",
    "disposition",
    "score",
    "impact",
    "snr",
    "mes",
    "radius",
    "prad",
]

for column in df.columns:
    if any(word in column.lower() for word in keywords):
        print(column)

print("\nSAMPLE OF EXTREME CONFIRMED OBJECTS")
print("=" * 65)

extreme = df[
    (df["koi_disposition"] == "CONFIRMED")
    & (
        (df["koi_prad"] > 100)
        | (df["koi_teq"] > 3000)
        | (df["koi_insol"] > 10000)
    )
]

possible_quality_columns = [
    column
    for column in df.columns
    if any(
        word in column.lower()
        for word in ["err", "flag", "score", "snr", "mes"]
    )
]

selected_columns = [
    "kepid",
    "kepoi_name",
    "koi_prad",
    "koi_teq",
    "koi_insol",
    "koi_steff",
    "koi_disposition",
]

selected_columns += possible_quality_columns

# Remove duplicate column names while preserving order.
selected_columns = list(dict.fromkeys(selected_columns))

print(extreme[selected_columns].head(10).to_string(index=False))