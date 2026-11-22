# Import pandas for reading and working with the CSV dataset.
import pandas as pd

# Import the function that calculates habitable-zone boundaries and classifications.
from kopparapu_hz import add_habitable_zone_columns


# 1. Load the existing dataset
# Read the cleaned Kepler dataset into a DataFrame.
df = pd.read_csv("cleankepler.csv")

# Print the original dataset dimensions (rows, columns).
print("Original dataset shape:", df.shape)


# 2. Apply the Kopparapu model
# Create a new DataFrame with habitable-zone results added as columns.
hz_df = add_habitable_zone_columns(df)


# 3. Display the classification counts
# Print a heading for the count of records in each HZ category.
print("\nHabitable-Zone Classification Counts")
print("------------------------------------")

# Count records in each classification, including missing values, and print the result.
print(
    hz_df["HZ_Classification"]
    .value_counts(dropna=False)
    .to_string()
)


# 4. Display the inner and outer flux boundaries
# Print a heading for a sample of the calculated results.
print("\nExample Results")
print("---------------")

# List the dataset identifiers, stellar measurements, HZ results, and disposition to display.
columns_to_show = [
    "kepid",
    "kepoi_name",
    "koi_steff",
    "koi_insol",
    "HZ_Inner_Flux",
    "HZ_Outer_Flux",
    "HZ_Classification",
    "koi_disposition",
]

# Keep only requested columns that are actually present in the DataFrame.
available_columns = [
    col for col in columns_to_show if col in hz_df.columns
]

# Print the first 15 records using only the available columns and omit row indices.
print(hz_df[available_columns].head(15).to_string(index=False))


# 5. Count confirmed planets in each classification
# Print a heading for confirmed-planet counts by HZ classification.
print("\nConfirmed Planets by Classification")
print("-----------------------------------")

# Filter the dataset to records whose disposition is exactly CONFIRMED.
confirmed = hz_df[
    hz_df["koi_disposition"] == "CONFIRMED"
]

# Count confirmed records in each HZ category, including missing values.
print(
    confirmed["HZ_Classification"]
    .value_counts(dropna=False)
    .to_string()
)


# 6. Save a separate results file
# Set the output filename for the dataset containing the HZ results.
output_file = "exoplanet_habitable_zone_results.csv"

# Save the results to a new CSV without writing the DataFrame index.
hz_df.to_csv(output_file, index=False)

# Confirm where the results were saved and that the original DataFrame was not overwritten.
print(f"\nResults saved to: {output_file}")
print("Original dataset was not modified.")
