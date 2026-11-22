"""
Ranking Engine for EXO-SCAN
Three independent ranking systems:
  1. HITE-Based Ranking
  2. Kopparapu-Based Ranking
  3. Integrated HITE + Kopparapu Ranking

This ranking framework is a project-specific prioritisation tool.
It is NOT a published scientific model.
"""

import numpy as np
import pandas as pd


# ──────────────────────────────────────────────────────────────
# RANKING 1: HITE-Based Ranking
# ──────────────────────────────────────────────────────────────

def build_hite_ranking(hite_df: pd.DataFrame) -> pd.DataFrame:
    """
    Rank planets by HITE score.

    hite_df must contain columns:
      planet_name, HITE_H, HITE_H_prime, rocky_probability, calc_type, status

    Returns a new DataFrame with columns:
      HITE_Rank, planet_name, HITE_H, HITE_H_prime,
      rocky_probability, calc_type, data_completeness

    H and H' are NEVER mixed in the same rank column.
    Planets with insufficient data appear in a separate section.
    """
    df = hite_df.copy()

    # Eligible: has a calculated HITE_H or HITE_H_prime
    has_h       = df["HITE_H"].notna() & np.isfinite(df["HITE_H"])
    has_h_prime = df["HITE_H_prime"].notna() & np.isfinite(df["HITE_H_prime"])
    eligible    = has_h | has_h_prime

    eligible_df   = df[eligible].copy()
    ineligible_df = df[~eligible].copy()

    # Sort by HITE_H first (constrained), then H' for planets without H
    # Use the best available score for sorting only — rank columns remain separate
    eligible_df["_sort_score"] = eligible_df["HITE_H"].combine_first(eligible_df["HITE_H_prime"])
    eligible_df = eligible_df.sort_values("_sort_score", ascending=False).reset_index(drop=True)
    eligible_df["HITE_Rank"]      = range(1, len(eligible_df) + 1)
    eligible_df["Ranking_Status"] = "Ranked"

    ineligible_df["HITE_Rank"]      = None
    ineligible_df["Ranking_Status"] = "Insufficient data"
    ineligible_df["_sort_score"]    = np.nan

    combined = pd.concat([eligible_df, ineligible_df], ignore_index=True)

    keep_cols = [
        "HITE_Rank", "planet_name", "HITE_H", "HITE_H_prime",
        "rocky_probability", "calc_type", "data_completeness",
        "planet_radius_earth", "planet_mass_earth",
        "stellar_luminosity", "semi_major_axis_au",
        "e_min", "f_min", "f_max", "Ranking_Status"
    ]
    available = [c for c in keep_cols if c in combined.columns]
    return combined[available]


# ──────────────────────────────────────────────────────────────
# RANKING 2: Kopparapu-Based Ranking
# ──────────────────────────────────────────────────────────────

# Priority order for Kopparapu classification
KOPPARAPU_PRIORITY = {
    "Within conservative habitable zone":          1,
    "Within optimistic HZ (outside conservative)": 2,
    "Within optimistic HZ (inside conservative)":  2,
    "Interior to inner HZ boundary":               3,
    "Exterior to outer HZ boundary":               4,
    "Outside model temperature range":             5,
    "Insufficient data":                           6,
    "Invalid data":                                6,
    "Inside inner boundary":                       3,
    "Beyond outer boundary":                       4,
}


def build_kopparapu_ranking(hz_df: pd.DataFrame) -> pd.DataFrame:
    """
    Rank planets by Kopparapu HZ classification.

    Primary sort: classification priority tier (conservative > optimistic > etc.)
    Secondary sort (within tier): geometric proximity to nearest conservative
                                  boundary — labelled as sorting aid only.

    hz_df must contain:
      kepoi_name, HZ_Classification, HZ_Inner_Flux, HZ_Outer_Flux,
      koi_insol, koi_steff, HZ_Inner_AU, HZ_Outer_AU, koi_sma
    """
    df = hz_df.copy()

    if "kepoi_name" not in df.columns:
        df["kepoi_name"] = "Unknown"

    # Priority tier
    df["_kop_priority"] = df["HZ_Classification"].map(KOPPARAPU_PRIORITY).fillna(6)

    # Geometric proximity: distance from centre of conservative HZ (sorting aid only)
    # Smaller = closer to centre
    def hz_centre_proximity(row):
        inner = row.get("HZ_Inner_AU", np.nan)
        outer = row.get("HZ_Outer_AU", np.nan)
        a     = row.get("koi_sma",     np.nan)
        if not all(np.isfinite([v if v is not None else np.nan for v in [inner, outer, a]])):
            return np.nan
        centre = (inner + outer) / 2.0
        return abs(a - centre) / centre if centre > 0 else np.nan

    df["_hz_proximity"] = df.apply(hz_centre_proximity, axis=1)

    df = df.sort_values(
        ["_kop_priority", "_hz_proximity"],
        ascending=[True, True],
        na_position="last"
    ).reset_index(drop=True)

    df["Kopparapu_Rank"] = range(1, len(df) + 1)
    df["Kopparapu_Priority_Group"] = df["_kop_priority"].map({
        1: "Conservative HZ",
        2: "Optimistic HZ",
        3: "Interior to HZ",
        4: "Exterior to HZ",
        5: "Outside model range",
        6: "Insufficient data",
    })

    keep_cols = [
        "Kopparapu_Rank", "kepoi_name", "HZ_Classification",
        "HZ_Inner_Flux", "HZ_Outer_Flux", "HZ_Inner_AU", "HZ_Outer_AU",
        "koi_sma", "Incident_Flux", "koi_steff",
        "Stellar_Luminosity_Solar", "In_Conservative_HZ", "In_Optimistic_HZ",
        "Kopparapu_Priority_Group",
        "HZ_Classification_Opt",
        "HZ_Inner_Flux_Optimistic", "HZ_Outer_Flux_Optimistic",
    ]
    available = [c for c in keep_cols if c in df.columns]
    return df[available]


# ──────────────────────────────────────────────────────────────
# RANKING 3: Integrated HITE + Kopparapu Ranking
# ──────────────────────────────────────────────────────────────

def build_integrated_ranking(
    hite_df: pd.DataFrame,
    hz_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Integrated candidate ranking combining HITE and Kopparapu results.

    Priority Groups (project-specific framework — NOT a published model):

    Group A: Conservative HZ + valid HITE  → sort by HITE_H desc
    Group B: Conservative HZ, no HITE
    Group C: Optimistic HZ + valid HITE    → sort by HITE_H desc
    Group D: Optimistic HZ, no HITE
    Group E: Outside optimistic HZ + valid HITE → sort by HITE_H desc
    Group F: Insufficient data

    IMPORTANT:
    - No HITE score is invented or substituted with zero.
    - H and H' are kept separate.
    - This ranking is reproducible and transparently documented.
    """
    # Merge on planet name
    hite = hite_df.copy()
    hz   = hz_df.copy()

    if "kepoi_name" in hz.columns:
        hz_name_col = "kepoi_name"
    elif "planet_name" in hz.columns:
        hz_name_col = "planet_name"
    else:
        raise ValueError("hz_df must contain a planet name column.")

    if "planet_name" not in hite.columns:
        raise ValueError("hite_df must contain 'planet_name' column.")

    merged = pd.merge(
        hite,
        hz.rename(columns={hz_name_col: "planet_name"}),
        on="planet_name",
        how="outer",
        suffixes=("_hite", "_hz")
    )

    # Determine group for each planet
    def assign_group(row):
        in_cons = row.get("In_Conservative_HZ", False)
        in_opt  = row.get("In_Optimistic_HZ",  False)
        h_val   = row.get("HITE_H", np.nan)
        has_h   = h_val is not None and np.isfinite(float(h_val)) if h_val is not None else False

        if in_cons and has_h:
            return "A"
        if in_cons:
            return "B"
        if in_opt and has_h:
            return "C"
        if in_opt:
            return "D"
        if has_h:
            return "E"
        return "F"

    merged["Priority_Group"] = merged.apply(assign_group, axis=1)

    # Group labels
    group_labels = {
        "A": "A: Conservative HZ + HITE",
        "B": "B: Conservative HZ (no HITE)",
        "C": "C: Optimistic HZ + HITE",
        "D": "D: Optimistic HZ (no HITE)",
        "E": "E: Outside optimistic HZ + HITE",
        "F": "F: Insufficient data",
    }
    merged["Priority_Group_Label"] = merged["Priority_Group"].map(group_labels)

    # Sort within groups
    group_order = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5}
    merged["_group_order"] = merged["Priority_Group"].map(group_order)

    # For groups with HITE, sort by HITE_H desc; else by HZ proximity
    merged["_sort_h"] = merged["HITE_H"].fillna(-1.0)
    merged = merged.sort_values(
        ["_group_order", "_sort_h"],
        ascending=[True, False],
        na_position="last"
    ).reset_index(drop=True)

    merged["Integrated_Rank"] = range(1, len(merged) + 1)

    # Also compute HITE ranks within the merged set for display
    hite_ranked = build_hite_ranking(hite)
    rank_map = dict(zip(hite_ranked["planet_name"], hite_ranked["HITE_Rank"]))
    merged["HITE_Rank"] = merged["planet_name"].map(rank_map)

    # Reason for ranking position
    def explain_rank(row):
        g      = row["Priority_Group"]
        h      = row.get("HITE_H", None)
        hp     = row.get("HITE_H_prime", None)
        hz_cls = row.get("HZ_Classification", "Unknown")

        if g == "A":
            return f"Group A: Inside conservative HZ; HITE H={h:.3f}" if pd.notna(h) else "Group A: Inside conservative HZ"
        elif g == "B":
            return "Group B: Inside conservative HZ but HITE could not be calculated"
        elif g == "C":
            return f"Group C: Inside optimistic HZ; HITE H={h:.3f}" if pd.notna(h) else "Group C: Inside optimistic HZ"
        elif g == "D":
            return "Group D: Inside optimistic HZ but HITE could not be calculated"
        elif g == "E":
            return f"Group E: Outside optimistic HZ; ranked by HITE H={h:.3f}" if pd.notna(h) else "Group E: HITE available"
        else:
            return "Group F: Insufficient observational data for either method"

    merged["Rank_Explanation"] = merged.apply(explain_rank, axis=1)

    keep_cols = [
        "Integrated_Rank", "planet_name", "Priority_Group", "Priority_Group_Label",
        "HITE_Rank", "HITE_H", "HITE_H_prime", "calc_type",
        "HZ_Classification", "In_Conservative_HZ", "In_Optimistic_HZ",
        "rocky_probability", "planet_radius_earth",
        "stellar_luminosity", "semi_major_axis_au",
        "e_min", "koi_steff", "Incident_Flux",
        "HZ_Inner_AU", "HZ_Outer_AU",
        "HZ_Classification_Opt",
        "HZ_Inner_Flux_Optimistic", "HZ_Outer_Flux_Optimistic",
        "Rank_Explanation",
    ]
    available = [c for c in keep_cols if c in merged.columns]
    return merged[available]
