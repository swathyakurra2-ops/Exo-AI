"""
HITE — Habitability Index for Transiting Exoplanets
Barnes, Meadows & Evans (2015), ApJ 814, 91.
DOI: 10.1088/0004-637X/814/2/91

Scientific implementation of the published HITE methodology.
HITE is a prioritisation metric, not proof of habitability.
"""

import numpy as np
import pandas as pd

# ──────────────────────────────────────────────────────────────
# Physical constants (SI unless noted)
# ──────────────────────────────────────────────────────────────
G               = 6.67428e-11    # Gravitational constant, m³ kg⁻¹ s⁻²
SIGMA           = 5.670373e-8    # Stefan–Boltzmann constant, W m⁻² K⁻⁴
EARTH_MASS      = 5.9722e24      # kg
EARTH_RADIUS    = 6.371e6        # m
SOLAR_RADIUS    = 6.957e8        # m
SOLAR_LUMINOSITY= 3.828e26       # W
SOLAR_TEMP      = 5778.0         # K
SOLAR_MASS      = 1.989e30       # kg
AU              = 1.496e11       # m  (1 astronomical unit)
SECONDS_PER_DAY = 86400.0
SECONDS_PER_HOUR= 3600.0

# ──────────────────────────────────────────────────────────────
# HITE grid parameters (Barnes et al. 2015)
# ──────────────────────────────────────────────────────────────
ALBEDO_MIN  = 0.05
ALBEDO_MAX  = 0.80
ECC_MIN     = 0.00
ECC_MAX     = 0.80
GRID_STEP   = 0.01   # resolution used in original paper

# Minimum emitted flux for habitability (W/m²)
F_MIN_WM2 = 67.0

# Pierrehumbert (2010) runaway greenhouse constants
# Used to calculate F_max given planetary surface gravity
PIERREHUMBERT_SIGMA_SB = 5.670373e-8  # same as SIGMA
PIERREHUMBERT_KAPPA    = 0.055        # m² kg⁻¹ (absorption coefficient)
PIERREHUMBERT_L_OVER_R = 5420.0       # K (L_vap/R_water_vapour)
PIERREHUMBERT_G_REF    = 9.8          # m s⁻² (reference surface gravity)

# Eccentricity probability polynomial (Barnes et al. 2015, eq. 2)
# p(e) = 0.1619 − 0.5352e + 0.6358e² − 0.2557e³
ECC_POLY = np.array([0.1619, -0.5352, 0.6358, -0.2557])  # coefficients: p0+p1*e+p2*e²+p3*e³


# ──────────────────────────────────────────────────────────────
# Required dataset columns
# ──────────────────────────────────────────────────────────────
HITE_REQUIRED_COLUMNS = [
    "koi_slogg",    # Stellar surface gravity  log(g) cgs
    "koi_srad",     # Stellar radius  (solar radii)
    "koi_steff",    # Stellar effective temperature (K)
    "koi_depth",    # Transit depth (ppm)
    "koi_period",   # Orbital period (days)
    "koi_duration", # Transit duration (hours)
]

HITE_OPTIONAL_COLUMNS = [
    "koi_impact",   # Impact parameter (enables e_min)
    "koi_smass",    # Stellar mass (solar masses)
    "koi_sma",      # Semi-major axis (AU)
]


def check_hite_columns(data: pd.DataFrame) -> list:
    """Return list of missing required column names."""
    return [c for c in HITE_REQUIRED_COLUMNS if c not in data.columns]


# ──────────────────────────────────────────────────────────────
# Step A: Stellar luminosity
# L/L_sun = (R/R_sun)^2 * (T/5778)^4
# ──────────────────────────────────────────────────────────────
def stellar_luminosity_solar(r_star_solar: float, t_star_k: float) -> float:
    """
    Calculate stellar luminosity in solar units.
    L/L_sun = (R_star/R_sun)^2 * (T_star/5778)^4
    Returns NaN for invalid inputs.
    """
    if not (np.isfinite(r_star_solar) and np.isfinite(t_star_k)):
        return np.nan
    if r_star_solar <= 0 or t_star_k <= 0:
        return np.nan
    return (r_star_solar ** 2) * ((t_star_k / SOLAR_TEMP) ** 4)


# ──────────────────────────────────────────────────────────────
# Step B: Planetary radius from transit depth
# Rp/Rstar = sqrt(depth_fraction)
# ──────────────────────────────────────────────────────────────
def calculate_planet_radius(data: pd.DataFrame) -> pd.DataFrame:
    """
    Estimate planetary radius from transit depth and stellar radius.
    koi_depth  : transit depth in ppm
    koi_srad   : stellar radius in solar radii
    Returns DataFrame with column 'planet_radius_earth' (Earth radii).
    """
    result = data.copy()
    depth_frac  = result["koi_depth"] / 1_000_000.0          # ppm → fraction
    radius_ratio = np.sqrt(depth_frac.clip(lower=0))         # Rp/Rstar
    result["planet_radius_earth"] = (
        radius_ratio * result["koi_srad"] * SOLAR_RADIUS / EARTH_RADIUS
    )
    invalid = (
        result["koi_depth"].isna() | result["koi_srad"].isna()
        | (result["koi_depth"] <= 0) | (result["koi_srad"] <= 0)
    )
    result.loc[invalid, "planet_radius_earth"] = np.nan
    return result


# ──────────────────────────────────────────────────────────────
# Step D: Planet mass from radius (Barnes et al. 2015)
# ──────────────────────────────────────────────────────────────
def planet_mass_earth(rp_earth: float) -> float:
    """
    Estimate planetary mass in Earth masses from planetary radius.
    Barnes et al. (2015) mass–radius relations:
      Rp ≤ 1 R_earth : Mp = Rp^3.268
      Rp >  1 R_earth : Mp = Rp^3.65
    Returns NaN for invalid inputs.
    NOTE: This is the empirical approximation in the original paper.
    """
    if not np.isfinite(rp_earth) or rp_earth <= 0:
        return np.nan
    if rp_earth <= 1.0:
        return rp_earth ** 3.268
    return rp_earth ** 3.65


# ──────────────────────────────────────────────────────────────
# Step E: Rocky planet probability
# ──────────────────────────────────────────────────────────────
def rocky_probability(rp_earth: float) -> float:
    """
    Empirical rocky planet probability from Barnes et al. (2015):
      Rp ≤ 1.5 R_earth  → p = 1
      1.5 < Rp < 2.5    → p = 2.5 − Rp  (linearly decreasing)
      Rp ≥ 2.5 R_earth  → p = 0
    This is an empirical approximation adopted in the original paper,
    not a universal physical law.
    """
    if not np.isfinite(rp_earth) or rp_earth <= 0:
        return np.nan
    if rp_earth <= 1.5:
        return 1.0
    if rp_earth >= 2.5:
        return 0.0
    return 2.5 - rp_earth


# ──────────────────────────────────────────────────────────────
# Step F: Eccentricity constraints from transit duration anomaly
# ──────────────────────────────────────────────────────────────
def circular_transit_duration(
    period_days: float,
    r_star_m: float,
    rp_m: float,
    b: float,
    a_m: float
) -> float:
    """
    Calculate circular transit duration Dc in hours.
    Dc = [sqrt((R_star + Rp)^2 - b^2 * R_star^2) / (pi * a)] * P

    Parameters are all in SI (metres, seconds).
    b is the impact parameter (dimensionless, 0 ≤ b ≤ 1).
    Returns NaN if geometry is invalid.
    """
    if not all(np.isfinite(x) for x in [period_days, r_star_m, rp_m, b, a_m]):
        return np.nan
    if a_m <= 0 or r_star_m <= 0:
        return np.nan

    period_s = period_days * SECONDS_PER_DAY

    # The term under the sqrt: (R_star + Rp)^2 - (b * R_star)^2
    discriminant = (r_star_m + rp_m)**2 - (b * r_star_m)**2
    if discriminant < 0:
        return np.nan

    dc_s = (np.sqrt(discriminant) / (np.pi * a_m)) * period_s
    return dc_s / SECONDS_PER_HOUR  # convert to hours


def eccentricity_minimum(d_obs_hours: float, d_circ_hours: float) -> float:
    """
    Calculate minimum orbital eccentricity from transit duration anomaly.
    Delta = D_obs / D_circ
    e_min = |( Delta^2 - 1 ) / ( Delta^2 + 1 )|

    Returns NaN if inputs are invalid.
    Clipped to [0, 0.8] to match HITE grid bounds.
    """
    if not (np.isfinite(d_obs_hours) and np.isfinite(d_circ_hours)):
        return np.nan
    if d_circ_hours <= 0:
        return np.nan
    delta = d_obs_hours / d_circ_hours
    e_min = abs((delta**2 - 1.0) / (delta**2 + 1.0))
    return min(e_min, ECC_MAX)


# ──────────────────────────────────────────────────────────────
# Step G: Eccentricity probability distribution
# p(e) = 0.1619 − 0.5352e + 0.6358e² − 0.2557e³
# ──────────────────────────────────────────────────────────────
def ecc_probability(e: np.ndarray) -> np.ndarray:
    """
    Eccentricity probability polynomial from Barnes et al. (2015).
    p(e) = 0.1619 - 0.5352*e + 0.6358*e^2 - 0.2557*e^3

    Negative values are clipped to zero to maintain valid probability weights.
    This treatment is required because the polynomial can go negative
    outside its intended domain; clipping is documented as a numerical
    correction, not a change to the physics.
    """
    p = ECC_POLY[0] + ECC_POLY[1]*e + ECC_POLY[2]*e**2 + ECC_POLY[3]*e**3
    return np.clip(p, 0.0, None)


# ──────────────────────────────────────────────────────────────
# Step I: Maximum emitted flux (Pierrehumbert runaway greenhouse)
# ──────────────────────────────────────────────────────────────
def max_habitability_flux(mp_earth: float, rp_earth: float) -> float:
    """
    Calculate maximum habitability flux (runaway greenhouse threshold)
    using the Pierrehumbert (2010) analytical expression.

    F_max = sigma * (PIERREHUMBERT_L_OVER_R / (2 * ln(P_ref/(kappa * g * sqrt(pi/2)))))^4

    This depends on surface gravity g = G*Mp/Rp².

    Returns F_max in W/m².
    Returns NaN for invalid inputs.

    NOTE: When the surface gravity is very low or mass is invalid,
    a fallback of NaN is returned rather than an arbitrary value.
    """
    if not (np.isfinite(mp_earth) and np.isfinite(rp_earth)):
        return np.nan
    if mp_earth <= 0 or rp_earth <= 0:
        return np.nan

    mp_kg = mp_earth * EARTH_MASS
    rp_m  = rp_earth * EARTH_RADIUS
    g     = G * mp_kg / (rp_m ** 2)   # surface gravity m/s²

    if g <= 0:
        return np.nan

    # Pierrehumbert (2010) runaway greenhouse flux:
    # F_OLR = sigma_sb * T_rad^4  where
    # T_rad = (L_vap/R) / (2 * ln(P0 / (kappa * g * sqrt(pi/2))))
    # For the purposes of HITE we use the approximation from Barnes et al.:
    # F_max ≈ sigma * (L_over_R / (2 * ln(P0/(kappa_eff * g * sqrt(pi/2)))))^4
    # Using reference values consistent with the original paper.

    # Reference atmospheric pressure P0 = 1e4 Pa (10 mbar, from Pierrehumbert 2010)
    P_ref = 1.0e4  # Pa

    inner = PIERREHUMBERT_KAPPA * g * np.sqrt(np.pi / 2.0)
    if inner <= 0:
        return np.nan

    log_term = np.log(P_ref / inner)
    if log_term <= 0:
        return np.nan

    T_rad = PIERREHUMBERT_L_OVER_R / (2.0 * log_term)
    f_max = SIGMA * T_rad**4

    # Physical sanity: F_max must be greater than F_min
    if f_max <= F_MIN_WM2:
        return np.nan

    return f_max


# ──────────────────────────────────────────────────────────────
# Step H & J: Albedo–eccentricity grid and habitability indicator
# ──────────────────────────────────────────────────────────────
def compute_hite_grid(
    l_star_solar: float,
    a_au: float,
    mp_earth: float,
    rp_earth: float,
    e_min: float = ECC_MIN,
    e_max: float = ECC_MAX,
) -> dict:
    """
    Compute the HITE H and H' values over the albedo–eccentricity grid.

    l_star_solar : stellar luminosity in solar units
    a_au         : semi-major axis in AU
    mp_earth     : planetary mass in Earth masses
    rp_earth     : planetary radius in Earth radii
    e_min        : minimum eccentricity (from transit duration anomaly)
    e_max        : maximum eccentricity (0.8 default)

    Returns dict with keys:
      'H'          : constrained HITE (uses e_min)
      'H_prime'    : unconstrained HITE (e_min = 0)
      'calc_type'  : 'H' or 'H_prime'
      'f_min'      : minimum habitability flux (W/m²)
      'f_max'      : maximum habitability flux (W/m²)
    """
    if not all(np.isfinite(v) and v > 0 for v in [l_star_solar, a_au, mp_earth, rp_earth]):
        return {"H": np.nan, "H_prime": np.nan, "calc_type": "insufficient_data",
                "f_min": F_MIN_WM2, "f_max": np.nan}

    # Convert L_star to watts, a to metres
    l_star_w = l_star_solar * SOLAR_LUMINOSITY
    a_m      = a_au * AU

    # Flux limits
    f_min = F_MIN_WM2
    f_max = max_habitability_flux(mp_earth, rp_earth)

    if not np.isfinite(f_max) or f_max <= f_min:
        return {"H": np.nan, "H_prime": np.nan, "calc_type": "insufficient_data",
                "f_min": f_min, "f_max": f_max}

    # Build grids
    albedos = np.arange(ALBEDO_MIN, ALBEDO_MAX + GRID_STEP/2, GRID_STEP)
    eccs    = np.arange(ECC_MIN,    ECC_MAX    + GRID_STEP/2, GRID_STEP)

    def integrate_hite(e_lower, e_upper):
        """Integrate H over eccentricity from e_lower to e_upper."""
        e_grid = eccs[(eccs >= e_lower - 1e-9) & (eccs <= e_upper + 1e-9)]
        if len(e_grid) == 0:
            return np.nan

        p_e = ecc_probability(e_grid)
        p_sum = p_e.sum()
        if p_sum <= 0:
            return np.nan

        h_sum = 0.0
        for e in e_grid:
            p_e_val = ecc_probability(np.array([e]))[0]
            if p_e_val <= 0:
                continue
            habitable_count = 0
            for A in albedos:
                # Emitted flux from planet at given albedo and eccentricity
                # F = L_star * (1 - A) / (16 * pi * a^2 * sqrt(1 - e^2))
                denom = 16.0 * np.pi * (a_m**2) * np.sqrt(1.0 - e**2)
                if denom <= 0:
                    continue
                F = l_star_w * (1.0 - A) / denom
                if f_min < F < f_max:
                    habitable_count += 1
            h_e = habitable_count / len(albedos)
            h_sum += h_e * p_e_val

        return h_sum / p_sum

    # H' : unconstrained (e from 0 to 0.8)
    h_prime = integrate_hite(ECC_MIN, ECC_MAX)

    # H : constrained (e from e_min to e_max)
    if np.isfinite(e_min) and e_min > ECC_MIN:
        h_constrained = integrate_hite(e_min, e_max)
        calc_type = "H"
    else:
        h_constrained = h_prime
        calc_type = "H_prime"

    # Both values must be in [0, 1]
    def clip_score(v):
        if v is None or not np.isfinite(v):
            return np.nan
        return float(np.clip(v, 0.0, 1.0))

    return {
        "H":         clip_score(h_constrained),
        "H_prime":   clip_score(h_prime),
        "calc_type": calc_type,
        "f_min":     f_min,
        "f_max":     f_max,
    }


# ──────────────────────────────────────────────────────────────
# Step K: Final HITE = H * p_rocky
# ──────────────────────────────────────────────────────────────
def compute_hite_for_planet(row: pd.Series) -> dict:
    """
    Compute all HITE components for a single planet row.
    Returns a dict of all intermediate and final values.
    """
    result = {
        "planet_name":         row.get("kepoi_name", "Unknown"),
        "stellar_radius":      np.nan,
        "stellar_temp":        np.nan,
        "stellar_logg":        np.nan,
        "stellar_luminosity":  np.nan,
        "orbital_period":      np.nan,
        "transit_depth":       np.nan,
        "transit_duration":    np.nan,
        "impact_parameter":    np.nan,
        "planet_radius_earth": np.nan,
        "planet_mass_earth":   np.nan,
        "semi_major_axis_au":  np.nan,
        "e_min":               np.nan,
        "e_max":               ECC_MAX,
        "rocky_probability":   np.nan,
        "f_min":               F_MIN_WM2,
        "f_max":               np.nan,
        "HITE_H":              np.nan,
        "HITE_H_prime":        np.nan,
        "calc_type":           "insufficient_data",
        "data_completeness":   0,
        "status":              "pending",
    }

    # --- Extract stellar parameters ---
    r_star = _safe_float(row.get("koi_srad"))
    t_star = _safe_float(row.get("koi_steff"))
    logg   = _safe_float(row.get("koi_slogg"))
    m_star = _safe_float(row.get("koi_smass"))

    result["stellar_radius"] = r_star
    result["stellar_temp"]   = t_star
    result["stellar_logg"]   = logg

    if not (np.isfinite(r_star) and np.isfinite(t_star)):
        result["status"] = "missing_stellar_parameters"
        return result

    # --- Stellar luminosity ---
    l_star = stellar_luminosity_solar(r_star, t_star)
    result["stellar_luminosity"] = l_star

    # --- Transit parameters ---
    period   = _safe_float(row.get("koi_period"))
    depth    = _safe_float(row.get("koi_depth"))
    duration = _safe_float(row.get("koi_duration"))
    b        = _safe_float(row.get("koi_impact"))

    result["orbital_period"]   = period
    result["transit_depth"]    = depth
    result["transit_duration"] = duration
    result["impact_parameter"] = b

    # --- Semi-major axis ---
    a_au = _safe_float(row.get("koi_sma"))
    if not np.isfinite(a_au):
        # Fallback: Kepler's 3rd law
        if np.isfinite(period) and np.isfinite(m_star) and m_star > 0:
            a_au = (m_star * (period / 365.25)**2) ** (1.0/3.0)
        else:
            result["status"] = "missing_orbital_distance"
            return result
    result["semi_major_axis_au"] = a_au

    # --- Planetary radius ---
    if np.isfinite(depth) and depth > 0 and np.isfinite(r_star):
        rp_earth = np.sqrt(depth / 1_000_000.0) * r_star * SOLAR_RADIUS / EARTH_RADIUS
    else:
        result["status"] = "missing_transit_depth"
        return result

    if not np.isfinite(rp_earth) or rp_earth <= 0:
        result["status"] = "invalid_planet_radius"
        return result

    result["planet_radius_earth"] = rp_earth

    # --- Planet mass ---
    mp_earth = planet_mass_earth(rp_earth)
    result["planet_mass_earth"] = mp_earth

    if not np.isfinite(mp_earth):
        result["status"] = "invalid_planet_mass"
        return result

    # --- Rocky probability ---
    p_rocky = rocky_probability(rp_earth)
    result["rocky_probability"] = p_rocky

    # --- Eccentricity minimum from transit duration anomaly ---
    e_min = 0.0
    if np.isfinite(duration) and np.isfinite(b) and np.isfinite(a_au):
        r_star_m = r_star * SOLAR_RADIUS
        rp_m     = rp_earth * EARTH_RADIUS
        a_m      = a_au * AU

        b_clamped = min(abs(b), 0.99)  # b must be in [0,1) for valid geometry

        d_circ = circular_transit_duration(period, r_star_m, rp_m, b_clamped, a_m)
        if np.isfinite(d_circ) and d_circ > 0:
            e_min = eccentricity_minimum(duration, d_circ)
            if not np.isfinite(e_min):
                e_min = 0.0

    result["e_min"] = e_min

    # --- Data completeness ---
    fields_present = sum([
        np.isfinite(r_star), np.isfinite(t_star), np.isfinite(l_star),
        np.isfinite(period), np.isfinite(depth),
        np.isfinite(duration), np.isfinite(b),
        np.isfinite(rp_earth), np.isfinite(mp_earth), np.isfinite(a_au),
    ])
    result["data_completeness"] = round(fields_present / 10.0 * 100, 1)

    # --- HITE grid calculation ---
    grid = compute_hite_grid(l_star, a_au, mp_earth, rp_earth, e_min, ECC_MAX)

    result["f_min"]     = grid["f_min"]
    result["f_max"]     = grid["f_max"]
    result["calc_type"] = grid["calc_type"]

    # Apply rocky probability to HITE scores
    h_raw       = grid["H"]
    h_prime_raw = grid["H_prime"]

    if np.isfinite(h_raw) and np.isfinite(p_rocky):
        result["HITE_H"] = float(np.clip(h_raw * p_rocky, 0.0, 1.0))

    if np.isfinite(h_prime_raw) and np.isfinite(p_rocky):
        result["HITE_H_prime"] = float(np.clip(h_prime_raw * p_rocky, 0.0, 1.0))

    result["status"] = "calculated"
    return result


def _safe_float(val) -> float:
    """Convert value to float; return NaN if invalid."""
    if val is None:
        return np.nan
    try:
        f = float(val)
        return f if np.isfinite(f) else np.nan
    except (TypeError, ValueError):
        return np.nan


# ──────────────────────────────────────────────────────────────
# Batch processing
# ──────────────────────────────────────────────────────────────
def compute_hite_batch(data: pd.DataFrame) -> pd.DataFrame:
    """
    Compute HITE for all planets in the DataFrame.
    Returns a new DataFrame with HITE results.

    Uses vectorised stellar luminosity and planet radius calculations
    where possible. The albedo-eccentricity grid is computed per-planet
    as it depends on individual planet parameters.
    """
    records = []
    for _, row in data.iterrows():
        records.append(compute_hite_for_planet(row))
    return pd.DataFrame(records)
