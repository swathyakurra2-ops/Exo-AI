"""
External Scientific Data Integration — EXO-AI
Fetches supplementary data from NASA Exoplanet Archive via its TAP/API service.

Sources integrated:
  1. NASA Exoplanet Archive (TAP service)
     https://exoplanetarchive.ipac.caltech.edu/TAP/sync

Design principles:
  - Local Kepler dataset always works as primary source (no dependency on live API)
  - External data is fetched on-demand, cached in memory for the session
  - All fetched records are validated and attributed
  - Errors are logged and return None — never crash the page

Data timestamps and attribution are always returned with records.
"""

import json
import logging
import math
import time
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger("exo_ai.external_data")

# ──────────────────────────────────────────────────────────────
# NASA Exoplanet Archive TAP endpoint
# ──────────────────────────────────────────────────────────────
NASA_TAP_BASE = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"
NASA_ATTRIBUTION = "NASA Exoplanet Archive (Caltech/IPAC), https://exoplanetarchive.ipac.caltech.edu"
REQUEST_TIMEOUT_S = 10  # seconds

# Simple in-memory cache: { cache_key: (timestamp_utc, data) }
_cache: dict[str, tuple[float, Any]] = {}
CACHE_TTL_S = 3600  # 1 hour


def _cache_get(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if entry is None:
        return None
    ts, data = entry
    if time.monotonic() - ts > CACHE_TTL_S:
        del _cache[key]
        return None
    return data


def _cache_set(key: str, data: Any) -> None:
    _cache[key] = (time.monotonic(), data)


def _safe_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        f = float(val)
        return f if math.isfinite(f) else None
    except (TypeError, ValueError):
        return None


def fetch_nasa_planet(kepoi_name: str) -> Optional[dict]:
    """
    Fetch supplementary data for a single Kepler planet from
    the NASA Exoplanet Archive via TAP/JSON.

    Returns a validated dict or None on failure.
    Caches successful responses for CACHE_TTL_S seconds.

    Columns requested: pl_name, pl_orbper, pl_rade, pl_bmasse,
    pl_eqt, pl_insol, pl_orbsmax, st_teff, st_rad, st_mass,
    st_lum, st_logg, st_met, sy_dist, sy_jmag, pl_controv_flag
    """
    cache_key = f"nasa_planet:{kepoi_name}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    # Build ADQL query
    # kepoi_name format: "K00001.01" — archive uses kepoi_name column in k2pandc table
    # We query the keplernames table joined to pscomppars for confirmed planets,
    # but many Kepler KOIs are only in the KOI table. Use keplernames or koiarchive.
    adql = (
        "SELECT pl_name,pl_orbper,pl_rade,pl_bmasse,pl_eqt,pl_insol,"
        "pl_orbsmax,st_teff,st_rad,st_mass,st_lum,st_logg,st_met,"
        "sy_dist,sy_jmag,pl_controv_flag "
        "FROM ps "
        f"WHERE kepoi_name='{kepoi_name}' "
        "ORDER BY pl_pubdate DESC "
        "LIMIT 1"
    )

    params = urllib.parse.urlencode({
        "QUERY": adql,
        "FORMAT": "json",
        "LANG": "ADQL",
    })
    url = f"{NASA_TAP_BASE}?{params}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "EXO-AI/1.0"})
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_S) as resp:
            raw = resp.read().decode("utf-8")
        data = json.loads(raw)
    except urllib.error.URLError as exc:
        logger.warning("NASA TAP request failed for %s: %s", kepoi_name, exc)
        return None
    except (json.JSONDecodeError, KeyError) as exc:
        logger.warning("NASA TAP parse error for %s: %s", kepoi_name, exc)
        return None
    except Exception as exc:
        logger.warning("NASA TAP unexpected error for %s: %s", kepoi_name, exc)
        return None

    # TAP JSON format: {"column_names": [...], "rows": [[...], ...]}
    # or plain list of dicts depending on endpoint
    rows = []
    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict):
        cols = data.get("column_names") or data.get("fields", [])
        raw_rows = data.get("rows", data.get("data", []))
        if cols and raw_rows:
            rows = [dict(zip(cols, r)) for r in raw_rows]
        elif "pl_name" in data:
            rows = [data]

    if not rows:
        # Cache empty result to avoid hammering the API
        _cache_set(cache_key, None)
        return None

    row = rows[0]

    result = {
        "source":          NASA_ATTRIBUTION,
        "fetched_at_utc":  datetime.now(timezone.utc).isoformat(),
        "pl_name":         row.get("pl_name"),
        "orbital_period_days":  _safe_float(row.get("pl_orbper")),
        "radius_earth_nasa":    _safe_float(row.get("pl_rade")),
        "mass_earth_nasa":      _safe_float(row.get("pl_bmasse")),
        "equilibrium_temp_nasa": _safe_float(row.get("pl_eqt")),
        "insolation_earth_nasa": _safe_float(row.get("pl_insol")),
        "semi_major_axis_au":    _safe_float(row.get("pl_orbsmax")),
        "stellar_teff_nasa":     _safe_float(row.get("st_teff")),
        "stellar_radius_nasa":   _safe_float(row.get("st_rad")),
        "stellar_mass_nasa":     _safe_float(row.get("st_mass")),
        "stellar_luminosity_nasa": _safe_float(row.get("st_lum")),
        "stellar_logg_nasa":     _safe_float(row.get("st_logg")),
        "stellar_metallicity_nasa": _safe_float(row.get("st_met")),
        "distance_pc":           _safe_float(row.get("sy_dist")),
        "distance_ly":           (_safe_float(row.get("sy_dist")) * 3.26156
                                   if _safe_float(row.get("sy_dist")) is not None else None),
        "j_magnitude":           _safe_float(row.get("sy_jmag")),
        "controversial":         bool(row.get("pl_controv_flag")),
    }

    _cache_set(cache_key, result)
    return result


def fetch_nasa_star(kepid: str) -> Optional[dict]:
    """
    Fetch stellar parameters for a Kepler Input Catalog star by KepID.
    Uses the stellar table in NASA Exoplanet Archive.
    Returns validated dict or None.
    """
    if not kepid:
        return None

    cache_key = f"nasa_star:{kepid}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    # Try to get a numeric kepid
    try:
        kepid_int = int(str(kepid).replace("KIC ", "").strip())
    except (ValueError, TypeError):
        return None

    adql = (
        "SELECT kepid,teff,logg,radius,mass,feh,dist "
        "FROM stellarhosts "
        f"WHERE kepid={kepid_int} "
        "LIMIT 1"
    )
    params = urllib.parse.urlencode({"QUERY": adql, "FORMAT": "json", "LANG": "ADQL"})
    url = f"{NASA_TAP_BASE}?{params}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "EXO-AI/1.0"})
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_S) as resp:
            raw = resp.read().decode("utf-8")
        data = json.loads(raw)
    except Exception as exc:
        logger.warning("NASA TAP star request failed for KIC %s: %s", kepid_int, exc)
        return None

    rows = []
    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict):
        cols = data.get("column_names") or data.get("fields", [])
        raw_rows = data.get("rows", data.get("data", []))
        if cols and raw_rows:
            rows = [dict(zip(cols, r)) for r in raw_rows]

    if not rows:
        _cache_set(cache_key, None)
        return None

    row = rows[0]
    result = {
        "source":         NASA_ATTRIBUTION,
        "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
        "kepid":          row.get("kepid"),
        "teff_k":         _safe_float(row.get("teff")),
        "logg_cgs":       _safe_float(row.get("logg")),
        "radius_solar":   _safe_float(row.get("radius")),
        "mass_solar":     _safe_float(row.get("mass")),
        "metallicity_dex": _safe_float(row.get("feh")),
        "distance_pc":    _safe_float(row.get("dist")),
        "distance_ly":    (_safe_float(row.get("dist")) * 3.26156
                           if _safe_float(row.get("dist")) is not None else None),
    }
    _cache_set(cache_key, result)
    return result


def clear_cache() -> None:
    """Clear the in-memory external data cache."""
    _cache.clear()
