"""
EXO-AI FastAPI Application — v2
Scientific endpoints for the React frontend.

Endpoints:
  GET /                          root info
  GET /api/v1/health             dataset + module status
  GET /api/v1/planets            full planet catalog
  GET /api/v1/rankings           planets sorted by candidate score
  GET /api/v1/stats              dataset statistics
  GET /api/v1/planet/{id}        single planet — all scientific layers
  GET /api/v1/planet/{id}/hite   HITE assessment for one planet
  GET /api/v1/planet/{id}/hz     Kopparapu HZ assessment
  GET /api/v1/planet/{id}/esi    ESI + physical parameters
  GET /api/v1/planet/{id}/stellar stellar intelligence
  GET /api/v1/planet/{id}/ml     ML prediction + explainability
  GET /api/v1/planet/{id}/nasa   NASA Exoplanet Archive supplementary data
  GET /api/v1/model/info         ML model summary and feature importances
  GET /api/v1/hz/explorer        HZ explorer — conservative HZ planets with full boundaries
  GET /api/v1/hite               HITE results for all planets
  GET /api/v1/hite/stats         HITE dataset-level statistics
  GET /api/v1/hite/{planet_name} HITE results for one planet by name
"""

import logging
from contextlib import asynccontextmanager
from typing import Any
import math

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from data_loader import loader

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("exo_ai.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing EXO-AI API v2...")
    try:
        loader.load()
        logger.info(
            "Dataset loaded: %d records. HZ: %d cons. ESI: %d. HITE: %d.",
            len(loader.planets),
            loader.stats.get("inConservativeHz", 0),
            loader.stats.get("withEsi", 0),
            loader.stats.get("withHite", 0),
        )
    except Exception as e:
        logger.error("Failed to load dataset on startup: %s", e)
    yield
    logger.info("Shutting down EXO-AI API.")


app = FastAPI(
    title="EXO-AI Exoplanet Intelligence API",
    description=(
        "FastAPI service exposing Kepler exoplanet observations, "
        "Kopparapu habitable zone boundaries, HITE scores, ESI, "
        "stellar intelligence, and ML classification with explainability."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _require_loaded():
    if not loader.is_loaded:
        raise HTTPException(status_code=503, detail="Dataset is not loaded")


def _get_planet(planet_id: str) -> dict[str, Any]:
    _require_loaded()
    # Build index on first call — fast lookup
    if not hasattr(loader, "_planet_index") or not loader._planet_index:
        loader._planet_index = {p["id"]: p for p in loader.planets}
    planet = loader._planet_index.get(planet_id)
    if planet is None:
        raise HTTPException(status_code=404, detail=f"Planet '{planet_id}' not found")
    return planet


def _sanitise(v: Any) -> Any:
    """Convert NaN/Inf float values to None so FastAPI serialises them as JSON null."""
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _hite_record(p: dict[str, Any]) -> dict[str, Any]:
    """Extract and sanitise HITE fields from a planet record for API responses."""
    return {
        "id":                     p["id"],
        "name":                   p["name"],
        "disposition":            p.get("disposition"),
        "hiteScore":              _sanitise(p.get("hiteScore")),
        "hiteScorePrime":         _sanitise(p.get("hiteScorePrime")),
        "hiteCalcType":           p.get("hiteCalcType"),
        "hiteRockyProbability":   _sanitise(p.get("hiteRockyProbability")),
        "hiteStatus":             p.get("hiteStatus"),
        "hiteDataCompleteness":   _sanitise(p.get("hiteDataCompleteness")),
        "hiteEMin":               _sanitise(p.get("hiteEMin")),
        "hiteFMin":               _sanitise(p.get("hiteFMin")),
        "hiteFMax":               _sanitise(p.get("hiteFMax")),
        # Supporting inputs used in the HITE calculation
        "radiusEarth":            _sanitise(p.get("radiusEarth")),
        "massEarth":              _sanitise(p.get("massEarth")),
        "stellarLuminositySolar": _sanitise(p.get("stellarLuminositySolar")),
        "semiMajorAxisAU":        _sanitise(p.get("semiMajorAxisAU")),
        "transitDepthPpm":        _sanitise(p.get("transitDepthPpm")),
        "transitDurationHours":   _sanitise(p.get("transitDurationHours")),
        "impactParameter":        _sanitise(p.get("impactParameter")),
        "stellarRadiusSolar":     _sanitise(p.get("stellarRadiusSolar")),
        "stellarTempK":           _sanitise(p.get("stellarTempK")),
        "orbitalPeriodDays":      _sanitise(p.get("orbitalPeriodDays")),
    }


# ──────────────────────────────────────────────────────────────
# Root and health
# ──────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "EXO-AI Exoplanet Intelligence API",
        "version": "2.0.0",
        "documentation": "/docs",
        "health": "/api/v1/health",
    }


@app.get("/api/v1/health")
def get_health() -> dict[str, Any]:
    return {
        "status": "healthy" if loader.is_loaded else "degraded",
        "dataset_loaded": loader.is_loaded,
        "usable_records": len(loader.planets),
        "validation_summary": loader.validation_summary,
    }


# ──────────────────────────────────────────────────────────────
# Catalog endpoints
# ──────────────────────────────────────────────────────────────

@app.get("/api/v1/planets")
def get_planets() -> list[dict[str, Any]]:
    """Full planet catalog with all scientific fields."""
    _require_loaded()
    return loader.planets


@app.get("/api/v1/rankings")
def get_rankings() -> list[dict[str, Any]]:
    """Planets sorted by candidate screening score (descending)."""
    _require_loaded()
    return loader.rankings


@app.get("/api/v1/stats")
def get_stats() -> dict[str, Any]:
    """Dataset statistics including HZ, ESI, HITE, and ML counts."""
    _require_loaded()
    return loader.stats


# ──────────────────────────────────────────────────────────────
# Single-planet endpoints — Planet Intelligence Page
# ──────────────────────────────────────────────────────────────

@app.get("/api/v1/planet/{planet_id}")
def get_planet(planet_id: str) -> dict[str, Any]:
    """
    Full Planet Intelligence record — all available scientific layers.
    Returns the complete planet dict including HITE, Kopparapu, ESI,
    stellar analysis, and ML classification.
    """
    return _get_planet(planet_id)


@app.get("/api/v1/planet/{planet_id}/hite")
def get_planet_hite(planet_id: str) -> dict[str, Any]:
    """
    HITE assessment for a single planet.
    Barnes, Meadows & Evans (2015), ApJ 814, 91.
    """
    planet = _get_planet(planet_id)
    return {
        "planet_id":          planet_id,
        "hiteScore":          planet.get("hiteScore"),
        "hiteScorePrime":     planet.get("hiteScorePrime"),
        "hiteCalcType":       planet.get("hiteCalcType"),
        "hiteRockyProbability": planet.get("hiteRockyProbability"),
        "hiteStatus":         planet.get("hiteStatus"),
        "hiteDataCompleteness": planet.get("hiteDataCompleteness"),
        "hiteEMin":           planet.get("hiteEMin"),
        "hiteFMin":           planet.get("hiteFMin"),
        "hiteFMax":           planet.get("hiteFMax"),
        "inputs": {
            "stellarRadiusSolar":   planet.get("stellarRadiusSolar"),
            "stellarTempK":         planet.get("stellarTempK"),
            "stellarLogg":          planet.get("stellarLogg"),
            "transitDepthPpm":      planet.get("transitDepthPpm"),
            "orbitalPeriodDays":    planet.get("orbitalPeriodDays"),
            "transitDurationHours": planet.get("transitDurationHours"),
            "impactParameter":      planet.get("impactParameter"),
            "semiMajorAxisAU":      planet.get("semiMajorAxisAU"),
            "radiusEarth":          planet.get("radiusEarth"),
            "massEarth":            planet.get("massEarth"),
            "stellarLuminositySolar": planet.get("stellarLuminositySolar"),
        },
        "reference": "Barnes, Meadows & Evans (2015), ApJ 814, 91. DOI: 10.1088/0004-637X/814/2/91",
        "limitations": (
            "HITE quantifies the fraction of albedo–eccentricity space that is "
            "consistent with habitability, weighted by rocky-planet probability. "
            "It is a prioritisation metric, NOT a confirmation of habitability or life."
        ),
    }


@app.get("/api/v1/planet/{planet_id}/hz")
def get_planet_hz(planet_id: str) -> dict[str, Any]:
    """
    Kopparapu Habitable Zone assessment for a single planet.
    Kopparapu et al. (2014), ApJ Letters 787, L29.
    """
    planet = _get_planet(planet_id)
    return {
        "planet_id":                   planet_id,
        "stellarTempK":                planet.get("stellarTempK"),
        "stellarLuminositySolar":      planet.get("stellarLuminositySolar"),
        "semiMajorAxisAU":             planet.get("semiMajorAxisAU"),
        "stellarFluxEarth":            planet.get("stellarFluxEarth"),
        "hzClassification":            planet.get("hzClassificationFull"),
        "hzClassificationOptimistic":  planet.get("hzClassificationOptimistic"),
        "inConservativeHz":            planet.get("inConservativeHz"),
        "inOptimisticHz":              planet.get("inOptimisticHz"),
        "hzInnerFluxConservative":     planet.get("hzInnerFluxConservative"),
        "hzOuterFluxConservative":     planet.get("hzOuterFluxConservative"),
        "hzInnerFluxOptimistic":       planet.get("hzInnerFluxOptimistic"),
        "hzOuterFluxOptimistic":       planet.get("hzOuterFluxOptimistic"),
        "hzInnerAU":                   planet.get("hzInnerAU"),
        "hzOuterAU":                   planet.get("hzOuterAU"),
        "hzInnerAUOptimistic":         planet.get("hzInnerAUOptimistic"),
        "hzOuterAUOptimistic":         planet.get("hzOuterAUOptimistic"),
        "reference": (
            "Kopparapu et al. (2014), ApJ Letters 787, L29. "
            "DOI: 10.1088/2041-8205/787/2/L29. "
            "1 Earth-mass model, conservative and optimistic boundaries."
        ),
        "limitations": (
            "The model applies to stellar effective temperatures 2600–7200 K. "
            "Boundaries are based on 1D climate models for a 1-Earth-mass planet. "
            "Being within the HZ does not confirm habitability — atmosphere, "
            "geology, and other factors are not considered."
        ),
    }


@app.get("/api/v1/planet/{planet_id}/esi")
def get_planet_esi(planet_id: str) -> dict[str, Any]:
    """
    Earth Similarity Index and physical parameters for a single planet.
    Schulze-Makuch et al. (2011), Astrobiology 11(10), 1041-1052.
    """
    planet = _get_planet(planet_id)
    return {
        "planet_id":             planet_id,
        "esi":                   planet.get("esi"),
        "esiRadius":             planet.get("esiRadius"),
        "esiDensity":            planet.get("esiDensity"),
        "esiEscapeVelocity":     planet.get("esiEscapeVelocity"),
        "esiTemperature":        planet.get("esiTemperature"),
        "esiComponentsUsed":     planet.get("esiComponentsUsed"),
        "esiMissingInputs":      planet.get("esiMissingInputs"),
        "esiInterpretation":     planet.get("esiInterpretation"),
        "bulkDensityGcm3":       planet.get("bulkDensityGcm3"),
        "surfaceGravityMs2":     planet.get("surfaceGravityMs2"),
        "escapeVelocityMs":      planet.get("escapeVelocityMs"),
        "compositionEstimate":   planet.get("compositionEstimate"),
        "inputs": {
            "radiusEarth":       planet.get("radiusEarth"),
            "massEarth":         planet.get("massEarth"),
            "equilibriumTempK":  planet.get("equilibriumTempK"),
        },
        "reference": (
            "Schulze-Makuch et al. (2011), Astrobiology 11(10), 1041-1052. "
            "DOI: 10.1089/ast.2010.0592"
        ),
        "limitations": (
            "ESI measures physical similarity to Earth's radius, density, "
            "escape velocity, and equilibrium temperature. "
            "ESI does NOT measure habitability or the probability of life. "
            "Mass is estimated from radius using the Barnes et al. (2015) "
            "empirical mass-radius relation — not directly measured."
        ),
    }


@app.get("/api/v1/planet/{planet_id}/stellar")
def get_planet_stellar(planet_id: str) -> dict[str, Any]:
    """Host-star analysis for a single planet."""
    planet = _get_planet(planet_id)
    return {
        "planet_id":             planet_id,
        "hostStar":              planet.get("hostStar"),
        "effectiveTempK":        planet.get("stellarTempK"),
        "radiusSolar":           planet.get("stellarRadiusSolar"),
        "massSolar":             planet.get("stellarMassSolar"),
        "logg":                  planet.get("stellarLogg"),
        "metallicity":           planet.get("stellarMetallicity"),
        "luminositySolar":       planet.get("stellarLuminositySolar"),
        "keplerMagnitude":       planet.get("keplerMagnitude"),
        "spectralClass":         planet.get("stellarSpectralClass"),
        "spectralDescription":   planet.get("stellarSpectralDesc"),
        "luminosityClass":       planet.get("stellarLumClass"),
        "hzNote":                planet.get("stellarHzNote"),
    }


@app.get("/api/v1/planet/{planet_id}/ml")
def get_planet_ml(planet_id: str) -> dict[str, Any]:
    """
    ML disposition classification and feature-importance explainability.
    Model: Random Forest (200 trees). Predicts catalogue disposition, NOT habitability.
    """
    planet = _get_planet(planet_id)
    return {
        "planet_id":               planet_id,
        "predictedClass":          planet.get("mlPredictedClass"),
        "classProbabilities":      planet.get("mlClassProbabilities"),
        "featureContributions":    planet.get("mlFeatureContributions"),
        "explanationMethod":       planet.get("mlExplanationMethod"),
        "limitations":             planet.get("mlLimitations"),
        "modelAccuracy":           loader.stats.get("mlAccuracy"),
    }


@app.get("/api/v1/planet/{planet_id}/nasa")
async def get_planet_nasa(planet_id: str) -> dict[str, Any]:
    """
    Supplementary data from NASA Exoplanet Archive (fetched on demand).
    Returns None fields if the planet is not in the NASA archive or fetch fails.
    Local dataset is unaffected by this endpoint's availability.
    """
    _require_loaded()
    try:
        from external_data import fetch_nasa_planet
        data = fetch_nasa_planet(planet_id)
    except Exception as exc:
        logger.warning("NASA data fetch failed for %s: %s", planet_id, exc)
        data = None

    return {
        "planet_id": planet_id,
        "nasa_data": data,
        "source_note": (
            "Data sourced from NASA Exoplanet Archive via TAP service. "
            "Availability depends on whether the planet appears in the confirmed "
            "planets table. Local Kepler data is always available as primary source."
        ),
    }


# ──────────────────────────────────────────────────────────────
# HZ Explorer endpoint
# ──────────────────────────────────────────────────────────────

@app.get("/api/v1/hz/explorer")
def get_hz_explorer() -> dict[str, Any]:
    """
    Returns all planets with Kopparapu HZ data, structured for the
    interactive HZ visualisation. Includes conservative and optimistic
    boundaries in both flux (Earth units) and AU.
    """
    _require_loaded()
    hz_planets = [
        {
            "id":                          p["id"],
            "name":                        p["name"],
            "disposition":                 p["disposition"],
            "stellarTempK":               p.get("stellarTempK"),
            "stellarLuminositySolar":     p.get("stellarLuminositySolar"),
            "semiMajorAxisAU":            p.get("semiMajorAxisAU"),
            "stellarFluxEarth":           p.get("stellarFluxEarth"),
            "radiusEarth":                p.get("radiusEarth"),
            "equilibriumTempK":           p.get("equilibriumTempK"),
            "hzClassification":           p.get("hzClassificationFull"),
            "hzClassificationOptimistic": p.get("hzClassificationOptimistic"),
            "inConservativeHz":           p.get("inConservativeHz"),
            "inOptimisticHz":             p.get("inOptimisticHz"),
            "hzInnerFluxConservative":    p.get("hzInnerFluxConservative"),
            "hzOuterFluxConservative":    p.get("hzOuterFluxConservative"),
            "hzInnerFluxOptimistic":      p.get("hzInnerFluxOptimistic"),
            "hzOuterFluxOptimistic":      p.get("hzOuterFluxOptimistic"),
            "hzInnerAU":                  p.get("hzInnerAU"),
            "hzOuterAU":                  p.get("hzOuterAU"),
            "hzInnerAUOptimistic":        p.get("hzInnerAUOptimistic"),
            "hzOuterAUOptimistic":        p.get("hzOuterAUOptimistic"),
            "stellarSpectralClass":       p.get("stellarSpectralClass"),
        }
        for p in loader.planets
        if p.get("hzClassificationFull") is not None
    ]
    return {
        "count": len(hz_planets),
        "planets": hz_planets,
        "reference": "Kopparapu et al. (2014), ApJ Letters 787, L29.",
    }


# ──────────────────────────────────────────────────────────────
# ML model info endpoint
# ──────────────────────────────────────────────────────────────

@app.get("/api/v1/model/info")
def get_model_info() -> dict[str, Any]:
    """ML model summary, accuracy, and feature importances."""
    _require_loaded()
    return loader.get_model_info()


# ──────────────────────────────────────────────────────────────
# HITE batch endpoints
# Barnes, Meadows & Evans (2015), ApJ 814, 91.
# IMPORTANT: /api/v1/hite/stats must be registered BEFORE
# /api/v1/hite/{planet_name} so FastAPI does not treat "stats"
# as a planet name.
# ──────────────────────────────────────────────────────────────

@app.get("/api/v1/hite")
def get_hite_all() -> dict[str, Any]:
    """
    HITE results for every planet in the catalog.
    Returns a lightweight record per planet: name, scores, status,
    rocky probability, and the key HITE inputs.
    NaN / Inf values are returned as JSON null.
    """
    _require_loaded()
    records = [_hite_record(p) for p in loader.planets]
    return {
        "count":     len(records),
        "planets":   records,
        "reference": "Barnes, Meadows & Evans (2015), ApJ 814, 91. DOI: 10.1088/0004-637X/814/2/91",
    }


@app.get("/api/v1/hite/stats")
def get_hite_stats() -> dict[str, Any]:
    """
    Dataset-level HITE statistics.
    Returns totals, success counts, average scores, and data-completeness
    distribution so the frontend can render summary cards and histograms.
    """
    _require_loaded()

    calculated = [p for p in loader.planets if p.get("hiteStatus") == "calculated"]
    with_h      = [p for p in calculated if p.get("hiteScore") is not None]
    with_h_pos  = [p for p in with_h      if (p.get("hiteScore") or 0) > 0]

    h_values      = [p["hiteScore"]      for p in with_h if p.get("hiteScore")      is not None]
    h_prime_vals  = [p["hiteScorePrime"] for p in with_h if p.get("hiteScorePrime") is not None]
    rocky_vals    = [p["hiteRockyProbability"] for p in calculated
                     if p.get("hiteRockyProbability") is not None]
    complete_vals = [p["hiteDataCompleteness"] for p in calculated
                     if p.get("hiteDataCompleteness") is not None]

    def _avg(lst):
        return round(sum(lst) / len(lst), 6) if lst else None

    # Score distribution buckets (0–0.1, 0.1–0.2, … 0.9–1.0)
    h_buckets = [0] * 10
    for v in h_values:
        bucket = min(int(v * 10), 9)
        h_buckets[bucket] += 1

    # Rocky-probability distribution buckets
    rocky_buckets = [0] * 10
    for v in rocky_vals:
        bucket = min(int(v * 10), 9)
        rocky_buckets[bucket] += 1

    # Data-completeness buckets (0–10 %, 10–20 %, … 90–100 %)
    completeness_buckets = [0] * 10
    for v in complete_vals:
        bucket = min(int(v / 10), 9)
        completeness_buckets[bucket] += 1

    # Top 10 candidates by HITE H
    top_candidates = sorted(with_h_pos, key=lambda p: p["hiteScore"], reverse=True)[:10]

    return {
        "totalPlanets":           len(loader.planets),
        "calculated":             len(calculated),
        "withHScore":             len(with_h),
        "positiveHScore":         len(with_h_pos),
        "insufficientData":       len(loader.planets) - len(calculated),
        "averageHiteH":           _avg(h_values),
        "averageHiteHPrime":      _avg(h_prime_vals),
        "averageRockyProbability": _avg(rocky_vals),
        "averageDataCompleteness": _avg(complete_vals),
        "hScoreDistribution": {
            "buckets":      h_buckets,
            "labels":       ["0.0–0.1","0.1–0.2","0.2–0.3","0.3–0.4","0.4–0.5",
                             "0.5–0.6","0.6–0.7","0.7–0.8","0.8–0.9","0.9–1.0"],
        },
        "rockyProbabilityDistribution": {
            "buckets":      rocky_buckets,
            "labels":       ["0.0–0.1","0.1–0.2","0.2–0.3","0.3–0.4","0.4–0.5",
                             "0.5–0.6","0.6–0.7","0.7–0.8","0.8–0.9","0.9–1.0"],
        },
        "completenessDistribution": {
            "buckets":      completeness_buckets,
            "labels":       ["0–10%","10–20%","20–30%","30–40%","40–50%",
                             "50–60%","60–70%","70–80%","80–90%","90–100%"],
        },
        "topCandidates": [_hite_record(p) for p in top_candidates],
        "reference":    "Barnes, Meadows & Evans (2015), ApJ 814, 91.",
    }


@app.get("/api/v1/hite/{planet_name}")
def get_hite_planet(planet_name: str) -> dict[str, Any]:
    """
    HITE assessment for a single planet, identified by kepoi_name (e.g. K03456.02).
    Returns all HITE fields plus the full set of inputs used in the calculation,
    with scientific interpretation labels for each value.
    """
    planet = _get_planet(planet_name)
    rec = _hite_record(planet)
    rec["reference"] = "Barnes, Meadows & Evans (2015), ApJ 814, 91. DOI: 10.1088/0004-637X/814/2/91"
    rec["methodology"] = (
        "HITE integrates the fraction of (albedo, eccentricity) space that places "
        "a planet's absorbed stellar flux within the Pierrehumbert (2010) habitable "
        "range [F_min, F_max], weighted by the eccentricity probability distribution "
        "of Barnes et al. (2015) eq. 2. The result is multiplied by the rocky-planet "
        "probability. H uses the minimum eccentricity constrained from the transit "
        "duration anomaly; H' uses e_min = 0 (unconstrained)."
    )
    rec["limitations"] = (
        "HITE is a prioritisation metric. A high score means a large fraction of "
        "orbital/albedo configurations are consistent with surface liquid water — "
        "it does not confirm an atmosphere, water, or life."
    )
    return rec


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)
