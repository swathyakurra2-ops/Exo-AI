import pandas as pd

df = pd.read_csv("cleankepler.csv")

print("EXTREME VALUES BY DISPOSITION")
print("=" * 60)

# Investigate records with extremely large planet radii.
large_radius = df[df["koi_prad"] > 100]

print("\nRecords with radius > 100 Earth radii:")
print("Total:", len(large_radius))

print(
    large_radius["koi_disposition"]
    .value_counts(dropna=False)
)

# Investigate very high equilibrium temperatures.
high_temperature = df[df["koi_teq"] > 3000]

print("\nRecords with equilibrium temperature > 3000 K:")
print("Total:", len(high_temperature))

print(
    high_temperature["koi_disposition"]
    .value_counts(dropna=False)
)

# Investigate extremely high stellar flux.
high_insolation = df[df["koi_insol"] > 10000]

print("\nRecords with insolation > 10,000 Earth flux:")
print("Total:", len(high_insolation))

print(
    high_insolation["koi_disposition"]
    .value_counts(dropna=False)
)

# Inspect confirmed records with extreme measurements.
extreme_confirmed = df[
    (df["koi_disposition"] == "CONFIRMED")
    & (
        (df["koi_prad"] > 100)
        | (df["koi_teq"] > 3000)
        | (df["koi_insol"] > 10000)
    )
]

print("\nConfirmed records with at least one extreme value:")
print("Total:", len(extreme_confirmed))

columns = [
    "kepid",
    "kepoi_name",
    "koi_prad",
    "koi_teq",
    "koi_insol",
    "koi_steff",
    "koi_disposition",
]

print(extreme_confirmed[columns].to_string(index=False))