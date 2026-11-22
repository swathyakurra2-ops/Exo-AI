"""
Stellar Intelligence Module for EXO-AI
Derives host-star properties from available Kepler catalogue columns.

Scientific sources:
  Morgan-Keenan spectral classification:
    Gray & Corbally (2009), Stellar Spectral Classification, Princeton UP
  Luminosity from Stefan-Boltzmann law:
    Luminosity = 4 * pi * R² * sigma * T⁴
  Habitable zone input:
    Kopparapu et al. (2014), ApJ Letters 787, L29

Available Kepler columns used:
  koi_steff   : effective temperature (K)
  koi_slogg   : log surface gravity (cgs)
  koi_srad    : stellar radius (solar radii)
  koi_smass   : stellar mass (solar masses)
  koi_smet    : stellar metallicity [Fe/H]
  ra, dec     : sky coordinates
  koi_kepmag  : Kepler magnitude (proxy for brightness)
"""

import math
from typing import Optional

# Physical constants
SOLAR_LUMINOSITY = 3.828e26   # W
SOLAR_RADIUS_M   = 6.957e8    # m
SIGMA_SB         = 5.670373e-8  # W m⁻² K⁻⁴
SOLAR_TEMP_K     = 5778.0      # K
SOLAR_MASS_KG    = 1.989e30    # kg


def _safe(val) -> Optional[float]:
    if val is None:
        return None
    try:
        f = float(val)
        return f if math.isfinite(f) else None
    except (TypeError, ValueError):
        return None


def spectral_class(t_eff_k: Optional[float]) -> str:
    """
    Assign MK spectral type from effective temperature.
    Temperature boundaries from Gray & Corbally (2009) and
    standard spectroscopic references.
    Returns the class letter and a brief description.
    """
    if t_eff_k is None:
        return "Unknown"
    t = t_eff_k
    if t >= 30000:
        return "O"
    if t >= 10000:
        return "B"
    if t >= 7500:
        return "A"
    if t >= 6000:
        return "F"
    if t >= 5200:
        return "G"
    if t >= 3700:
        return "K"
    if t >= 2400:
        return "M"
    return "L/T/Y (cool dwarf)"


def spectral_description(cls: str) -> str:
    descriptions = {
        "O": "Very hot, massive blue star. Main sequence lifetime ~millions of years.",
        "B": "Hot blue-white star. Relatively short-lived.",
        "A": "White or blue-white star. Moderate temperature.",
        "F": "Yellow-white star, slightly hotter than the Sun.",
        "G": "Yellow dwarf (Sun-like). Long main sequence lifetime. Favourable for HZ planets.",
        "K": "Orange dwarf, cooler than the Sun. Long-lived; often considered promising for habitability searches.",
        "M": "Red dwarf. Very common, long-lived. HZ planets orbit very close to star; flare activity is a concern.",
        "L/T/Y (cool dwarf)": "Very cool brown dwarf region. HZ conditions are extreme.",
    }
    return descriptions.get(cls, "")


def luminosity_solar(r_solar: Optional[float], t_eff_k: Optional[float]) -> Optional[float]:
    """
    Stellar luminosity in solar units using the Stefan-Boltzmann law.
    L/L_sun = (R/R_sun)² × (T/T_sun)⁴
    """
    r = _safe(r_solar)
    t = _safe(t_eff_k)
    if r is None or t is None or r <= 0 or t <= 0:
        return None
    return (r ** 2) * ((t / SOLAR_TEMP_K) ** 4)


def luminosity_watts(l_solar: Optional[float]) -> Optional[float]:
    if l_solar is None:
        return None
    return l_solar * SOLAR_LUMINOSITY


def luminosity_class(logg: Optional[float]) -> str:
    """
    Approximate luminosity class from log surface gravity (cgs).
    Based on standard spectroscopic calibrations.
    logg ~ 4.0–4.5 → main sequence (dwarf)
    logg ~ 2.5–4.0 → subgiant/giant
    logg < 2.5     → bright giant / supergiant
    """
    g = _safe(logg)
    if g is None:
        return "Unknown"
    if g >= 4.0:
        return "V (Main Sequence / Dwarf)"
    if g >= 3.0:
        return "IV–III (Subgiant / Giant)"
    if g >= 2.0:
        return "II (Bright Giant)"
    return "I (Supergiant)"


def habitable_zone_note(spectral: str) -> str:
    """
    Brief note about HZ implications for the spectral type.
    """
    notes = {
        "G": "Sun-like star. Habitable zone at Earth-like orbital distances (~0.9–1.5 AU).",
        "K": "K dwarf. Habitable zone slightly closer than Earth's orbit. Considered promising for life searches.",
        "M": "M dwarf. Habitable zone is very close (~0.1–0.4 AU). Tidal locking and stellar flares are concerns.",
        "F": "F dwarf, slightly hotter than Sun. HZ is further out and may be short-lived.",
        "A": "A star. Main sequence lifetime too short for life as we know it to develop.",
        "B": "B star. Very short-lived and intensely energetic — not favourable for HZ habitability.",
        "O": "O star. Extreme UV and short lifetime — extremely hostile environment.",
    }
    return notes.get(spectral, "Insufficient data for HZ note.")


def analyse_star(row: dict) -> dict:
    """
    Derive all available stellar properties from a planet-record dict.
    Returns a dict of stellar parameters, classifications, and interpretations.

    Input dict keys (from cleankepler.csv / data_loader output):
      koi_steff, koi_slogg, koi_srad, koi_smass, koi_smet, koi_kepmag
    """
    t_eff  = _safe(row.get("koi_steff"))
    logg   = _safe(row.get("koi_slogg"))
    r_sol  = _safe(row.get("koi_srad"))
    m_sol  = _safe(row.get("koi_smass"))
    met    = _safe(row.get("koi_smet"))
    kepmag = _safe(row.get("koi_kepmag"))

    # Derived
    l_solar  = luminosity_solar(r_sol, t_eff)
    l_watts  = luminosity_watts(l_solar)
    sp_class = spectral_class(t_eff)
    lum_cls  = luminosity_class(logg)
    sp_desc  = spectral_description(sp_class)
    hz_note  = habitable_zone_note(sp_class)

    missing = []
    if t_eff is None:   missing.append("effective temperature")
    if logg is None:    missing.append("surface gravity")
    if r_sol is None:   missing.append("stellar radius")
    if m_sol is None:   missing.append("stellar mass")

    return {
        # Raw catalogue values
        "effectiveTemp_K":       t_eff,
        "logg_cgs":              logg,
        "radius_solar":          r_sol,
        "mass_solar":            m_sol,
        "metallicity_dex":       met,
        "kepler_magnitude":      kepmag,
        # Derived
        "luminosity_solar":      l_solar,
        "luminosity_watts":      l_watts,
        # Classification
        "spectral_class":        sp_class,
        "spectral_description":  sp_desc,
        "luminosity_class":      lum_cls,
        "hz_note":               hz_note,
        # Data quality
        "missing_parameters":    missing,
        # Reference
        "reference": (
            "Spectral classification: Gray & Corbally (2009). "
            "Luminosity: Stefan-Boltzmann law. "
            "Catalogue data: NASA Kepler Input Catalog."
        ),
    }
