"""
Kopparapu Habitable Zone Model
Kopparapu et al. (2014), ApJ Letters 787, L29.
DOI: 10.1088/2041-8205/787/2/L29

Conservative and optimistic habitable zone boundaries
for the one-Earth-mass model.
"""

import numpy as np
import pandas as pd

# ──────────────────────────────────────────────────────────────
# Model parameters
# ──────────────────────────────────────────────────────────────
STELLAR_TEMP_MIN = 2600   # K  (valid range for this model)
STELLAR_TEMP_MAX = 7200   # K
SOLAR_TEMP       = 5780   # K  (reference temperature used in paper)
SOLAR_TEMP_HITE  = 5778.0 # K  (used in HITE stellar luminosity)
SOLAR_RADIUS     = 6.957e8  # m
SOLAR_LUMINOSITY = 3.828e26 # W

# ──────────────────────────────────────────────────────────────
# Kopparapu et al. (2014) coefficients — 1 Earth mass model
# Verified against Table 1 of the published paper.
#
# Format: (Seff_sun, a, b, c, d)
# Seff = Seff_sun + a*T' + b*T'^2 + c*T'^3 + d*T'^4
# where T' = T_eff - 5780
# ──────────────────────────────────────────────────────────────

# Conservative inner boundary: Runaway Greenhouse
RUNAWAY_GREENHOUSE = (
    1.107,
    1.332e-4,
    1.580e-8,
    -8.308e-12,
    -1.931e-15,
)

# Conservative outer boundary: Maximum Greenhouse
MAXIMUM_GREENHOUSE = (
    0.356,
    6.171e-5,
    1.698e-9,
    -3.198e-12,
    -5.575e-16,
)

# Optimistic inner boundary: Recent Venus
RECENT_VENUS = (
    1.776,
    2.136e-4,
    2.533e-8,
    -1.332e-11,
    -3.097e-15,
)

# Optimistic outer boundary: Early Mars
EARLY_MARS = (
    0.320,
    5.547e-5,
    1.526e-9,
    -2.874e-12,
    -5.011e-16,
)

# Classification labels
CLS_CONSERVATIVE   = "Within conservative habitable zone"
CLS_OPTIMISTIC_IN  = "Within optimistic HZ (inside conservative)"
CLS_OPTIMISTIC_OUT = "Within optimistic HZ (outside conservative)"
CLS_INTERIOR       = "Interior to inner HZ boundary"
CLS_EXTERIOR       = "Exterior to outer HZ boundary"
CLS_OUTSIDE_RANGE  = "Outside model temperature range"
CLS_INVALID        = "Insufficient data"


def calculate_flux_boundary(stellar_temp: float, coefficients: tuple) -> float:
    """
    Calculate the effective stellar flux at a habitable-zone boundary.
    Seff = Seff_sun + a*T' + b*T'^2 + c*T'^3 + d*T'^4
    where T' = T_eff - 5780 K
    Returns NaN for out-of-range or invalid temperatures.
    """
    if not np.isfinite(stellar_temp):
        return np.nan
    if not (STELLAR_TEMP_MIN <= stellar_temp <= STELLAR_TEMP_MAX):
        return np.nan
    s0, a, b, c, d = coefficients
    t = stellar_temp - SOLAR_TEMP
    return s0 + a*t + b*t**2 + c*t**3 + d*t**4


def stellar_luminosity_solar(r_star_solar: float, t_star_k: float) -> float:
    """
    Stellar luminosity in solar units.
    L/L_sun = (R/R_sun)^2 * (T/5778)^4
    """
    if not (np.isfinite(r_star_solar) and np.isfinite(t_star_k)):
        return np.nan
    if r_star_solar <= 0 or t_star_k <= 0:
        return np.nan
    return (r_star_solar**2) * ((t_star_k / SOLAR_TEMP_HITE)**4)


def hz_distances_au(l_star_solar: float, seff_inner: float, seff_outer: float):
    """
    Calculate conservative HZ inner and outer distances in AU.
    d_hz = sqrt(L_star / S_eff)
    Returns (inner_au, outer_au). Returns (NaN, NaN) for invalid inputs.
    """
    if not np.isfinite(l_star_solar) or l_star_solar <= 0:
        return np.nan, np.nan
    inner_au = np.sqrt(l_star_solar / seff_inner) if np.isfinite(seff_inner) and seff_inner > 0 else np.nan
    outer_au = np.sqrt(l_star_solar / seff_outer) if np.isfinite(seff_outer) and seff_outer > 0 else np.nan
    return inner_au, outer_au


def incident_flux(l_star_solar: float, a_au: float) -> float:
    """
    Incident stellar flux at orbital distance a_au.
    S = L_star / a^2   (in Earth flux units, since L is in solar units and a in AU)
    """
    if not (np.isfinite(l_star_solar) and np.isfinite(a_au) and l_star_solar > 0 and a_au > 0):
        return np.nan
    return l_star_solar / (a_au**2)


def classify_habitable_zone_full(
    stellar_temp: float,
    insolation: float,
) -> dict:
    """
    Full 5-tier Kopparapu classification using conservative and optimistic boundaries.

    Returns dict with:
      conservative_classification, optimistic_classification,
      hz_inner_flux_conservative, hz_outer_flux_conservative,
      hz_inner_flux_optimistic, hz_outer_flux_optimistic,
      in_conservative_hz, in_optimistic_hz
    """
    result = {
        "conservative_classification": CLS_INVALID,
        "optimistic_classification":   CLS_INVALID,
        "hz_inner_flux_conservative":  np.nan,
        "hz_outer_flux_conservative":  np.nan,
        "hz_inner_flux_optimistic":    np.nan,
        "hz_outer_flux_optimistic":    np.nan,
        "in_conservative_hz":          False,
        "in_optimistic_hz":            False,
    }

    if not (np.isfinite(stellar_temp) and np.isfinite(insolation)):
        return result
    if insolation < 0:
        return result
    if not (STELLAR_TEMP_MIN <= stellar_temp <= STELLAR_TEMP_MAX):
        result["conservative_classification"] = CLS_OUTSIDE_RANGE
        result["optimistic_classification"]   = CLS_OUTSIDE_RANGE
        return result

    # Calculate all four boundary fluxes
    f_inner_cons = calculate_flux_boundary(stellar_temp, RUNAWAY_GREENHOUSE)
    f_outer_cons = calculate_flux_boundary(stellar_temp, MAXIMUM_GREENHOUSE)
    f_inner_opt  = calculate_flux_boundary(stellar_temp, RECENT_VENUS)
    f_outer_opt  = calculate_flux_boundary(stellar_temp, EARLY_MARS)

    result["hz_inner_flux_conservative"] = f_inner_cons
    result["hz_outer_flux_conservative"] = f_outer_cons
    result["hz_inner_flux_optimistic"]   = f_inner_opt
    result["hz_outer_flux_optimistic"]   = f_outer_opt

    # Conservative classification
    if np.isfinite(f_inner_cons) and np.isfinite(f_outer_cons):
        if f_outer_cons <= insolation <= f_inner_cons:
            result["conservative_classification"] = CLS_CONSERVATIVE
            result["in_conservative_hz"] = True
        elif insolation > f_inner_cons:
            result["conservative_classification"] = CLS_INTERIOR
        else:
            result["conservative_classification"] = CLS_EXTERIOR

    # Optimistic classification
    if np.isfinite(f_inner_opt) and np.isfinite(f_outer_opt):
        if f_outer_opt <= insolation <= f_inner_opt:
            result["in_optimistic_hz"] = True
            if result["in_conservative_hz"]:
                result["optimistic_classification"] = CLS_CONSERVATIVE
            elif insolation > f_inner_cons:
                result["optimistic_classification"] = CLS_OPTIMISTIC_IN
            else:
                result["optimistic_classification"] = CLS_OPTIMISTIC_OUT
        elif insolation > f_inner_opt:
            result["optimistic_classification"] = CLS_INTERIOR
        else:
            result["optimistic_classification"] = CLS_EXTERIOR

    return result


# Legacy function — kept for backwards compatibility with app.py
def classify_habitable_zone(stellar_temp: float, insolation: float) -> str:
    """
    Backwards-compatible single-string conservative HZ classification.
    Returns one of:
      'Within conservative habitable zone'
      'Inside inner boundary'
      'Beyond outer boundary'
      'Outside model temperature range'
      'Invalid data'
    """
    if not (np.isfinite(stellar_temp) and np.isfinite(insolation)):
        return "Invalid data"
    if insolation < 0:
        return "Invalid data"
    if not (STELLAR_TEMP_MIN <= stellar_temp <= STELLAR_TEMP_MAX):
        return "Outside model temperature range"

    inner_flux = calculate_flux_boundary(stellar_temp, RUNAWAY_GREENHOUSE)
    outer_flux = calculate_flux_boundary(stellar_temp, MAXIMUM_GREENHOUSE)

    if outer_flux <= insolation <= inner_flux:
        return "Within conservative habitable zone"
    if insolation > inner_flux:
        return "Inside inner boundary"
    return "Beyond outer boundary"


def add_habitable_zone_columns(
    dataframe: pd.DataFrame,
    temperature_column: str = "koi_steff",
    insolation_column:  str = "koi_insol",
    radius_column:      str = "koi_srad",
    sma_column:         str = "koi_sma",
) -> pd.DataFrame:
    """
    Return a copy of the DataFrame with full Kopparapu HZ results.

    Added columns:
      HZ_Inner_Flux            : inner conservative boundary flux (Earth units)
      HZ_Outer_Flux            : outer conservative boundary flux
      HZ_Inner_Flux_Optimistic : inner optimistic boundary flux
      HZ_Outer_Flux_Optimistic : outer optimistic boundary flux
      HZ_Inner_AU              : inner conservative HZ distance (AU)
      HZ_Outer_AU              : outer conservative HZ distance (AU)
      HZ_Inner_AU_Optimistic   : inner optimistic HZ distance (AU)
      HZ_Outer_AU_Optimistic   : outer optimistic HZ distance (AU)
      Stellar_Luminosity_Solar  : derived stellar luminosity
      Incident_Flux            : planet's incident flux (Earth units)
      HZ_Classification        : conservative classification string
      HZ_Classification_Opt    : optimistic classification string
      In_Conservative_HZ       : boolean
      In_Optimistic_HZ         : boolean
      HZ_Distance_From_Inner   : |a_au - inner_au| / inner_au  (dimensionless proximity)
      HZ_Distance_From_Outer   : |a_au - outer_au| / outer_au
    """
    result = dataframe.copy()

    temps  = pd.to_numeric(result[temperature_column], errors="coerce")
    insols = pd.to_numeric(result[insolation_column],  errors="coerce")
    radii  = pd.to_numeric(result[radius_column],  errors="coerce") if radius_column in result.columns else pd.Series(np.nan, index=result.index)
    smas   = pd.to_numeric(result[sma_column],     errors="coerce") if sma_column in result.columns else pd.Series(np.nan, index=result.index)

    # Stellar luminosity
    if radius_column in result.columns:
        result["Stellar_Luminosity_Solar"] = [
            stellar_luminosity_solar(r, t)
            for r, t in zip(radii, temps)
        ]
    else:
        result["Stellar_Luminosity_Solar"] = np.nan

    # Incident flux: use koi_insol directly (it is already in Earth flux units)
    result["Incident_Flux"] = insols

    # Conservative boundaries
    result["HZ_Inner_Flux"] = temps.apply(
        lambda t: calculate_flux_boundary(t, RUNAWAY_GREENHOUSE)
    )
    result["HZ_Outer_Flux"] = temps.apply(
        lambda t: calculate_flux_boundary(t, MAXIMUM_GREENHOUSE)
    )

    # Optimistic boundaries
    result["HZ_Inner_Flux_Optimistic"] = temps.apply(
        lambda t: calculate_flux_boundary(t, RECENT_VENUS)
    )
    result["HZ_Outer_Flux_Optimistic"] = temps.apply(
        lambda t: calculate_flux_boundary(t, EARLY_MARS)
    )

    # HZ distances in AU
    lum = result["Stellar_Luminosity_Solar"]
    hz_inner_au, hz_outer_au, hz_inner_opt_au, hz_outer_opt_au = [], [], [], []

    for l, fi, fo, foi, foo in zip(
        lum,
        result["HZ_Inner_Flux"], result["HZ_Outer_Flux"],
        result["HZ_Inner_Flux_Optimistic"], result["HZ_Outer_Flux_Optimistic"]
    ):
        i, o = hz_distances_au(l, fi, fo)
        io, oo = hz_distances_au(l, foi, foo)
        hz_inner_au.append(i)
        hz_outer_au.append(o)
        hz_inner_opt_au.append(io)
        hz_outer_opt_au.append(oo)

    result["HZ_Inner_AU"]            = hz_inner_au
    result["HZ_Outer_AU"]            = hz_outer_au
    result["HZ_Inner_AU_Optimistic"] = hz_inner_opt_au
    result["HZ_Outer_AU_Optimistic"] = hz_outer_opt_au

    # Classifications (vectorised via row-wise apply for clarity)
    classifications = [
        classify_habitable_zone_full(t, s)
        for t, s in zip(temps, insols)
    ]

    result["HZ_Classification"]     = [c["conservative_classification"] for c in classifications]
    result["HZ_Classification_Opt"] = [c["optimistic_classification"]   for c in classifications]
    result["In_Conservative_HZ"]    = [c["in_conservative_hz"]          for c in classifications]
    result["In_Optimistic_HZ"]      = [c["in_optimistic_hz"]            for c in classifications]

    # Geometric proximity to conservative HZ boundaries
    prox_inner, prox_outer = [], []
    for a, hi, ho in zip(smas, result["HZ_Inner_AU"], result["HZ_Outer_AU"]):
        if np.isfinite(a) and np.isfinite(hi) and hi > 0:
            prox_inner.append(abs(a - hi) / hi)
        else:
            prox_inner.append(np.nan)
        if np.isfinite(a) and np.isfinite(ho) and ho > 0:
            prox_outer.append(abs(a - ho) / ho)
        else:
            prox_outer.append(np.nan)

    result["HZ_Distance_From_Inner"] = prox_inner
    result["HZ_Distance_From_Outer"] = prox_outer

    return result
