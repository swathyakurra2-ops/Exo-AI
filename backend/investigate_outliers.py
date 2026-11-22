import pandas as pd

df = pd.read_csv("cleankepler.csv")

print("DATASET SHAPE:", df.shape)

print("\n1. DISPOSITION COUNTS")
print(df["koi_disposition"].value_counts(dropna=False))

print("\n2. LARGEST PLANET RADII")
print(
    df.nlargest(10, "koi_prad")[
        ["kepid", "kepoi_name", "koi_prad",
         "koi_teq", "koi_insol", "koi_steff",
         "koi_disposition"]
    ].to_string(index=False)
)

print("\n3. HIGHEST EQUILIBRIUM TEMPERATURES")
print(
    df.nlargest(10, "koi_teq")[
        ["kepid", "kepoi_name", "koi_prad",
         "koi_teq", "koi_insol", "koi_steff",
         "koi_disposition"]
    ].to_string(index=False)
)

print("\n4. HIGHEST INSOLATION VALUES")
print(
    df.nlargest(10, "koi_insol")[
        ["kepid", "kepoi_name", "koi_prad",
         "koi_teq", "koi_insol", "koi_steff",
         "koi_disposition"]
    ].to_string(index=False)
)

print("\n5. STARS OUTSIDE THE KOPPARAPU MODEL RANGE")

outside = df[
    (df["koi_steff"] < 2600)
    | (df["koi_steff"] > 7200)
]

print("Number outside range:", len(outside))

print(
    outside[
        ["kepid", "kepoi_name", "koi_steff",
         "koi_prad", "koi_insol", "koi_disposition"]
    ].head(15).to_string(index=False)
)

print("\n6. NUMERICAL SUMMARY")

columns = [
    "koi_prad",
    "koi_teq",
    "koi_insol",
    "koi_steff",
    "koi_srad",
    "koi_smass",
]

print(df[columns].describe(percentiles=[0.90, 0.95, 0.99]).to_string())