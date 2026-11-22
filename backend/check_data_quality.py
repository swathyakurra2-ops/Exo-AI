# Import pandas for loading and analysing the CSV dataset.
import pandas as pd

# Load the cleaned Kepler dataset into a DataFrame.
df = pd.read_csv("cleankepler.csv")

# List the columns whose data quality will be checked.
columns = [
    "koi_prad",
    "koi_teq",
    "koi_insol",
    "koi_steff",
    "koi_srad",
    "koi_smass",
    "koi_disposition"
]

# Print the total number of rows and columns in the dataset.
print("DATASET SHAPE:", df.shape)
# Print the number of missing values in each selected column.
print("\nMISSING VALUES")
print(df[columns].isna().sum())

# Print the number of non-missing values in each selected column.
print("\nVALID VALUES")
print((df[columns].notna()).sum())

# Display summary statistics for the four selected numerical measurements.
print("\nNUMERICAL SUMMARY")
print(
    df[
        ["koi_prad", "koi_teq", "koi_insol", "koi_steff"]
    ].describe()
)

# Select rows where both insolation and stellar temperature measurements are present.
valid = df[
    ["koi_insol", "koi_steff"]
].notna().all(axis=1)

# Print how many rows have both measurements available.
print("\nRows with both insolation and stellar temperature:", valid.sum())
# Print how many rows are missing at least one of the two measurements.
print("Rows missing at least one of these measurements:", (~valid).sum())
