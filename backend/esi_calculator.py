"""
Earth Similarity Index (ESI) Calculator
Schulze-Makuch et al. (2011), Astrobiology 11(10), 1041-1052.
DOI: 10.1089/ast.2010.0592

ESI is a geometric mean of four similarity measures, each comparing
a planetary parameter to Earth's value using an exponential weight.

IMPORTANT:
  ESI measures similarity to Earth's physical characteristics.
  ESI does NOT measure habitability or the probability of life.
  A high ESI means Earth-like, not inhabited.

Formula:
  ESI = product_i [ 1 - |x_i - x_Earth_i| / (x_i + x_Earth_i) ]^(w_i / n)

where:
  x_i       : planetary parameter
  x_Earth_i : Earth reference value
  w_i       : weight exponent
  n         : total number of properties used
"""

import math
from typing import Optional

# ──────────────────────────────────────────────────────────────
# Earth reference values and weight exponents
# From Table 1 of Schulze-Makuch et al. (2011)
# ──────────────────────────────────────────────────────────────
EARTH_RADIUS_EARTH   = 1.0        # Earth radii (reference)
EARTH_DENSITY_GCM3   = 5.515      # g/cm³
EARTH_ESCAPE_KMS     = 11.186     # km/s
EARTH_TEMP_K         = 288.0      # K (mean surface temperature)

# Weight exponents from the paper
W_RADIUS   = 0.57
W_DENSITY  = 1.07
W_ESCAPE   = 0.70
W_TEMP     = 5.58

# Physical constants
G_SI          = 6.67428e-11   # m³ kg⁻¹ s⁻²
EARTH_RADIUS_M  = 6.371e6     # m
EARTH_MASS_KG   = 5.9722e24   # kg
EARTH_DENSITY   = 5515.0      # kg/m³  (5.515 g/cm³)
EARTH_ESCAPE_MS = 11186.0     # m/s


def _safe(val) -> Optional[float]:
    """Return float or None; propagates None/NaN gracefully."""
    if val is None:
        return None
    try:
        f = float(val)
        return f if math.isfinite(f) else None
    except (TypeError, ValueError):
        return None


def _esi_term(x: float, x_earth: float, weight: float, n_total: int) -> Optional[float]:
    """
    Single ESI factor:
      ( 1 - |x - x_earth| / (x + x_earth) )^(weight / n_total)
    Returns None if inputs are invalid.
    """
    if x is None or x_earth is None:
        return None
    denom = x + x_earth
    if denom <= 0:
        return None
    ratio = abs(x - x_earth) / denom
    base = 1.0 - ratio
    base = max(base, 0.0)  # clip negative bases from extreme values
    exponent = weight / n_total
    return base ** exponent


def surface_gravity_ms2(mass_earth: Optional[float], radius_earth: Optional[float]) -> Optional[float]:
    """
    Surface gravity in m/s².
    g = G * M / R²
    """
    m = _safe(mass_earth)
    r = _safe(radius_earth)
    if m is None or r is None or m <= 0 or r <= 0:
        return None
    mass_kg = m * EARTH_MASS_KG
    radius_m = r * EARTH_RADIUS_M
    return G_SI * mass_kg / (radius_m ** 2)


def escape_velocity_ms(mass_earth: Optional[float], radius_earth: Optional[float]) -> Optional[float]:
    """
    Escape velocity in m/s.
    v_esc = sqrt(2 * G * M / R)
    """
    m = _safe(mass_earth)
    r = _safe(radius_earth)
    if m is None or r is None or m <= 0 or r <= 0:
        return None
    mass_kg = m * EARTH_MASS_KG
    radius_m = r * EARTH_RADIUS_M
    v2 = 2.0 * G_SI * mass_kg / radius_m
    return math.sqrt(v2)


def bulk_density_gcm3(mass_earth: Optional[float], radius_earth: Optional[float]) -> Optional[float]:
    """
    Mean bulk density in g/cm³.
    rho = M / (4/3 * pi * R³)
    """
    m = _safe(mass_earth)
    r = _safe(radius_earth)
    if m is None or r is None or m <= 0 or r <= 0:
        return None
    mass_kg = m * EARTH_MASS_KG
    radius_m = r * EARTH_RADIUS_M
    volume_m3 = (4.0 / 3.0) * math.pi * (radius_m ** 3)
    density_kgm3 = mass_kg / volume_m3
    return density_kgm3 / 1000.0  # kg/m³ → g/cm³


def classify_composition(density_gcm3: Optional[float], radius_earth: Optional[float]) -> str:
    """
    Cautious composition interpretation based on mean density and radius.
    These are indicative ranges only — not confirmed compositions.

    Sources:
      Zeng et al. (2016), ApJ 819, 127 (mass-radius relationships)
      Rogers (2015), ApJ 801, 41 (rocky vs volatile boundary ~1.6 R_Earth)
    """
    if density_gcm3 is None or radius_earth is None:
        return "Insufficient data for composition estimate"
    if density_gcm3 <= 0 or radius_earth <= 0:
        return "Invalid parameters"

    if radius_earth > 4.0:
        return "Likely gas giant or ice giant — insufficient density for rocky composition"
    if radius_earth > 1.6:
        if density_gcm3 < 2.0:
            return "Likely volatile-rich (ice, water, or gas envelope) — sub-Neptune class"
        return "Ambiguous — may have significant volatile envelope"
    # Small planet (≤ 1.6 R_Earth)
    if density_gcm3 >= 5.0:
        return "Possibly rocky/iron-rich composition — consistent with terrestrial planet"
    if density_gcm3 >= 3.0:
        return "Possibly rocky composition — consistent with silicate-dominated interior"
    return "Lower density than expected for a rocky planet — possible volatile envelope or water world"


def compute_esi(
    radius_earth: Optional[float],
    mass_earth: Optional[float],
    equilibrium_temp_k: Optional[float],
) -> dict:
    """
    Compute the Earth Similarity Index and all contributing components.

    Parameters:
      radius_earth       : planet radius in Earth radii (required for radius ESI)
      mass_earth         : planet mass in Earth masses (required for density, escape ESI)
      equilibrium_temp_k : planetary equilibrium temperature in K (optional)

    Returns dict with all intermediate values, the ESI components computed,
    the final ESI, and a plain-language interpretation.

    Missing parameters are clearly reported; ESI is calculated from
    available terms only when at least two are present.
    """
    r = _safe(radius_earth)
    m = _safe(mass_earth)
    t = _safe(equilibrium_temp_k)

    result = {
        # Inputs
        "radius_earth":          r,
        "mass_earth":            m,
        "equilibrium_temp_k":    t,
        # Derived physical parameters
        "bulk_density_gcm3":     None,
        "surface_gravity_ms2":   None,
        "escape_velocity_ms":    None,
        "escape_velocity_kms":   None,
        # ESI sub-components (each 0–1)
        "esi_radius":            None,
        "esi_density":           None,
        "esi_escape_velocity":   None,
        "esi_temperature":       None,
        # Final ESI
        "esi":                   None,
        "esi_components_used":   [],
        "esi_missing_inputs":    [],
        # Interpretation
        "composition_estimate":  None,
        "interpretation":        "",
        "limitations":           (
            "ESI measures physical similarity to Earth. It does not measure "
            "habitability, atmospheric composition, or the presence of life. "
            "Temperature ESI uses equilibrium temperature, not surface temperature."
        ),
        "reference": "Schulze-Makuch et al. (2011), Astrobiology 11(10), 1041-1052. DOI: 10.1089/ast.2010.0592",
    }

    missing = []

    # Derived physical values
    if r is not None and r > 0 and m is not None and m > 0:
        density = bulk_density_gcm3(m, r)
        g = surface_gravity_ms2(m, r)
        v_esc = escape_velocity_ms(m, r)
        result["bulk_density_gcm3"]   = density
        result["surface_gravity_ms2"] = g
        result["escape_velocity_ms"]  = v_esc
        result["escape_velocity_kms"] = v_esc / 1000.0 if v_esc is not None else None
        result["composition_estimate"] = classify_composition(density, r)
    else:
        if r is None:
            missing.append("radius")
        if m is None:
            missing.append("mass")

    # ESI components — only compute when the input exists
    components_used = []
    n_total = 4  # denominator is always 4 (total possible components per paper)

    # Radius component
    if r is not None and r > 0:
        esi_r = _esi_term(r, EARTH_RADIUS_EARTH, W_RADIUS, n_total)
        result["esi_radius"] = esi_r
        if esi_r is not None:
            components_used.append(("radius", esi_r))
    else:
        missing.append("radius (ESI)")

    # Density component
    density = result["bulk_density_gcm3"]
    if density is not None and density > 0:
        esi_d = _esi_term(density, EARTH_DENSITY_GCM3, W_DENSITY, n_total)
        result["esi_density"] = esi_d
        if esi_d is not None:
            components_used.append(("density", esi_d))
    else:
        if m is None or r is None:
            missing.append("density (requires mass + radius)")

    # Escape velocity component
    v_esc = result["escape_velocity_ms"]
    if v_esc is not None and v_esc > 0:
        v_esc_kms = v_esc / 1000.0
        esi_v = _esi_term(v_esc_kms, EARTH_ESCAPE_KMS, W_ESCAPE, n_total)
        result["esi_escape_velocity"] = esi_v
        if esi_v is not None:
            components_used.append(("escape_velocity", esi_v))
    else:
        if m is None or r is None:
            missing.append("escape velocity (requires mass + radius)")

    # Temperature component
    if t is not None and t > 0:
        esi_t = _esi_term(t, EARTH_TEMP_K, W_TEMP, n_total)
        result["esi_temperature"] = esi_t
        if esi_t is not None:
            components_used.append(("temperature", esi_t))
    else:
        missing.append("equilibrium temperature")

    result["esi_missing_inputs"] = list(dict.fromkeys(missing))  # deduplicate
    result["esi_components_used"] = [c[0] for c in components_used]

    # Only compute ESI if at least 2 components are available
    if len(components_used) >= 2:
        esi_product = 1.0
        for _, val in components_used:
            esi_product *= val
        result["esi"] = round(esi_product, 4)

    # Plain-language interpretation
    esi_val = result["esi"]
    if esi_val is None:
        result["interpretation"] = (
            "ESI could not be calculated — insufficient parameter data. "
            "Missing: " + ", ".join(result["esi_missing_inputs"]) + "."
        )
    elif esi_val >= 0.80:
        result["interpretation"] = (
            f"ESI = {esi_val:.3f}. This planet's measured physical parameters "
            "are very similar to Earth's. Note: physical similarity does not imply habitability."
        )
    elif esi_val >= 0.60:
        result["interpretation"] = (
            f"ESI = {esi_val:.3f}. Moderate Earth similarity in the measured parameters. "
            "Significant differences in one or more characteristics."
        )
    elif esi_val >= 0.40:
        result["interpretation"] = (
            f"ESI = {esi_val:.3f}. Low Earth similarity — this planet differs substantially "
            "from Earth in one or more of the measured characteristics."
        )
    else:
        result["interpretation"] = (
            f"ESI = {esi_val:.3f}. Very low Earth similarity — physical parameters are "
            "very different from Earth's."
        )

    if result["esi_missing_inputs"] and esi_val is not None:
        result["interpretation"] += (
            " Note: ESI computed from partial data ("
            + ", ".join(result["esi_components_used"])
            + " only). Missing: "
            + ", ".join(result["esi_missing_inputs"]) + "."
        )

    return result
