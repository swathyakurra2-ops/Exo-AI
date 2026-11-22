"""
Data Loader and Scientific Screening Module for EXO-AI
Loads, validates, and processes Kepler dataset records from cleankepler.csv.

Scientific modules used:
  kopparapu_hz     — Habitable zone classification (Kopparapu et al. 2014)
  hite_model       — HITE score (Barnes, Meadows & Evans 2015)
  esi_calculator   — Earth Similarity Index (Schulze-Makuch et al. 2011)
  stellar_analysis — Stellar classification and luminosity
  ml_pipeline      — Random Forest disposition classifier
"""

import csv
import logging
import math
import sys
from pathlib import Path
from types import ModuleType

logger = logging.getLogger("exo_ai.data_loader")

# Remove any stale mock pandas that may have been registered before pandas was installed
if "pandas" in sys.modules:
    import importlib
    _pd = sys.modules["pandas"]
    if not hasattr(_pd, "DataFrame"):
        # Stale mock — replace with real pandas
        del sys.modules["pandas"]

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    import kopparapu_hz
except ImportError as e:
    logger.error("Failed to import kopparapu_hz: %s", e)
    kopparapu_hz = None

try:
    from hite_model import compute_hite_for_planet
    import pandas as pd
    _hite_available = True
except ImportError:
    _hite_available = False
    compute_hite_for_planet = None
    logger.warning("hite_model not available — HITE scores will not be computed")

try:
    from esi_calculator import compute_esi
    from esi_calculator import (
        bulk_density_gcm3, surface_gravity_ms2, escape_velocity_ms,
        classify_composition
    )
    _esi_available = True
except ImportError:
    _esi_available = False
    compute_esi = None
    logger.warning("esi_calculator not available — ESI will not be computed")

try:
    from stellar_analysis import analyse_star
    _stellar_available = True
except ImportError:
    _stellar_available = False
    analyse_star = None
    logger.warning("stellar_analysis not available")

try:
    from ml_pipeline import train_model, predict_planet, get_model_summary
    _ml_available = True
except ImportError:
    _ml_available = False
    train_model = predict_planet = get_model_summary = None
    logger.warning("ml_pipeline not available — ML predictions disabled")


# ──────────────────────────────────────────────────────────────
# Candidate screening score (preserved from original app.py)
# ──────────────────────────────────────────────────────────────

def range_score(value, low, ideal_low, ideal_high, high) -> float:
    if value is None or math.isnan(value):
        return 0.0
    if value < low or value > high:
        return 0.0
    if ideal_low <= value <= ideal_high:
        return 1.0
    if value < ideal_low:
        return (value - low) / (ideal_low - low)
    return (high - value) / (high - ideal_high)


def calculate_candidate_score(radius, teq, insol):
    if radius is None or teq is None or insol is None:
        return None, None
    if math.isnan(radius) or math.isnan(teq) or math.isnan(insol):
        return None, None
    r_score = range_score(radius, 0.3, 0.8, 1.8, 2.5)
    t_score = range_score(teq, 180, 220, 320, 400)
    f_score = range_score(insol, 0.1, 0.25, 2.0, 4.0)
    score = (0.40 * r_score + 0.30 * t_score + 0.30 * f_score) * 100.0
    score = round(score, 2)
    priority = "Low" if score <= 40.0 else ("Medium" if score <= 70.0 else "High")
    return score, priority


def parse_float(val) -> float | None:
    if val is None:
        return None
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ("nan", "null", "none", "n/a", ""):
        return None
    try:
        f = float(val_str)
        return None if math.isnan(f) or math.isinf(f) else f
    except (ValueError, TypeError):
        return None


# ──────────────────────────────────────────────────────────────
# Planet mass estimation (Barnes et al. 2015, used by HITE)
# ──────────────────────────────────────────────────────────────
def estimate_mass_earth(rp_earth: float | None) -> float | None:
    if rp_earth is None or not math.isfinite(rp_earth) or rp_earth <= 0:
        return None
    if rp_earth <= 1.0:
        return rp_earth ** 3.268
    return rp_earth ** 3.65


class KeplerDataLoader:
    def __init__(self, csv_filename: str = "cleankepler.csv"):
        self.csv_path = backend_dir / csv_filename
        self.planets: list[dict] = []
        self.rankings: list[dict] = []
        self.stats: dict = {}
        self.validation_summary: dict = {}
        self.is_loaded: bool = False
        self._model_bundle: dict = {}
        # Raw CSV rows for ML training (preserve all columns)
        self._raw_rows: list[dict] = []

    def load(self) -> None:
        if not self.csv_path.exists():
            raise FileNotFoundError(f"Primary Kepler dataset not found at {self.csv_path}")

        logger.info("Loading Kepler dataset from %s", self.csv_path)

        required_columns = [
            "kepoi_name", "kepid", "koi_disposition",
            "koi_prad", "koi_teq", "koi_insol", "koi_steff",
        ]

        total_rows = 0
        excluded_missing_id = 0
        planets_list: list[dict] = []
        raw_rows: list[dict] = []

        with open(self.csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fieldnames = set(reader.fieldnames or [])

            missing_cols = [c for c in required_columns if c not in fieldnames]
            if missing_cols:
                raise KeyError(f"Required columns missing from dataset: {missing_cols}")

            for row in reader:
                total_rows += 1
                kepoi_name = (row.get("kepoi_name") or "").strip()
                if not kepoi_name:
                    excluded_missing_id += 1
                    continue

                kepid_str = (row.get("kepid") or "").strip()
                disposition = (row.get("koi_disposition") or "").strip()

                # ── Core planetary parameters ──
                radius_earth = parse_float(row.get("koi_prad"))
                teq          = parse_float(row.get("koi_teq"))
                insol        = parse_float(row.get("koi_insol"))
                steff        = parse_float(row.get("koi_steff"))
                period       = parse_float(row.get("koi_period"))
                sma          = parse_float(row.get("koi_sma"))
                depth        = parse_float(row.get("koi_depth"))
                duration     = parse_float(row.get("koi_duration"))
                impact       = parse_float(row.get("koi_impact"))

                # ── Stellar parameters ──
                srad  = parse_float(row.get("koi_srad"))
                smass = parse_float(row.get("koi_smass"))
                slogg = parse_float(row.get("koi_slogg"))
                smet  = parse_float(row.get("koi_smet"))
                kepmag = parse_float(row.get("koi_kepmag"))

                # ── Candidate screening score (original method) ──
                candidate_score, priority = calculate_candidate_score(radius_earth, teq, insol)

                # ── Full Kopparapu HZ classification ──
                hz_classification     = None
                hz_full               = None
                in_conservative_hz    = False
                in_optimistic_hz      = False
                hz_inner_flux_cons    = None
                hz_outer_flux_cons    = None
                hz_inner_flux_opt     = None
                hz_outer_flux_opt     = None
                hz_inner_au           = None
                hz_outer_au           = None
                hz_inner_au_opt       = None
                hz_outer_au_opt       = None
                stellar_luminosity    = None

                if kopparapu_hz and steff is not None:
                    # Legacy string classification (for backwards compat)
                    if insol is not None:
                        hz_classification = kopparapu_hz.classify_habitable_zone(steff, insol)

                    # Full classification with boundaries
                    if insol is not None:
                        hz_full = kopparapu_hz.classify_habitable_zone_full(steff, insol)
                        in_conservative_hz = hz_full.get("in_conservative_hz", False)
                        in_optimistic_hz   = hz_full.get("in_optimistic_hz", False)
                        hz_inner_flux_cons = hz_full.get("hz_inner_flux_conservative")
                        hz_outer_flux_cons = hz_full.get("hz_outer_flux_conservative")
                        hz_inner_flux_opt  = hz_full.get("hz_inner_flux_optimistic")
                        hz_outer_flux_opt  = hz_full.get("hz_outer_flux_optimistic")

                    # Stellar luminosity + AU boundaries
                    if srad is not None:
                        stellar_luminosity = kopparapu_hz.stellar_luminosity_solar(srad, steff)
                        if stellar_luminosity and hz_inner_flux_cons and hz_outer_flux_cons:
                            hz_inner_au, hz_outer_au = kopparapu_hz.hz_distances_au(
                                stellar_luminosity, hz_inner_flux_cons, hz_outer_flux_cons
                            )
                        if stellar_luminosity and hz_inner_flux_opt and hz_outer_flux_opt:
                            hz_inner_au_opt, hz_outer_au_opt = kopparapu_hz.hz_distances_au(
                                stellar_luminosity, hz_inner_flux_opt, hz_outer_flux_opt
                            )

                # ── ESI + physical parameters ──
                mass_earth_est = estimate_mass_earth(radius_earth)
                esi_result  = None
                density_gcm3 = None
                surface_gravity = None
                escape_velocity_ms_val = None
                composition_estimate = None

                if _esi_available and radius_earth is not None:
                    esi_result = compute_esi(radius_earth, mass_earth_est, teq)
                    density_gcm3 = esi_result.get("bulk_density_gcm3")
                    surface_gravity = esi_result.get("surface_gravity_ms2")
                    escape_velocity_ms_val = esi_result.get("escape_velocity_ms")
                    composition_estimate = esi_result.get("composition_estimate")

                # ── Stellar analysis ──
                stellar_info = None
                if _stellar_available:
                    stellar_info = analyse_star({
                        "koi_steff":  steff,
                        "koi_slogg":  slogg,
                        "koi_srad":   srad,
                        "koi_smass":  smass,
                        "koi_smet":   smet,
                        "koi_kepmag": kepmag,
                    })

                # ── HITE (computed later in batch) ──
                # We store all needed inputs here; HITE is computed after full load
                # to allow batch pandas operations.

                # ── Planet type classification ──
                planet_type = "unknown"
                if radius_earth is not None:
                    if radius_earth <= 1.6:
                        planet_type = "terrestrial"
                    elif radius_earth >= 4.0:
                        planet_type = "gas-giant"

                # ── Build the full planet record ──
                planet_record = {
                    # Identifiers
                    "id":                   kepoi_name,
                    "name":                 kepoi_name,
                    "hostStar":             f"KIC {kepid_str}" if kepid_str else "Unknown",
                    "kepid":                kepid_str,
                    "planetType":           planet_type,
                    "disposition":          disposition,

                    # Core planetary parameters
                    "radiusEarth":          radius_earth,
                    "equilibriumTempK":     teq,
                    "stellarFluxEarth":     insol,
                    "distanceLightYears":   None,  # not in Kepler data
                    "orbitalPeriodDays":    period,
                    "semiMajorAxisAU":      sma,
                    "transitDepthPpm":      depth,
                    "transitDurationHours": duration,
                    "impactParameter":      impact,
                    "massEarth":            mass_earth_est,

                    # Stellar parameters (raw catalogue)
                    "stellarTempK":         steff,
                    "stellarRadiusSolar":   srad,
                    "stellarMassSolar":     smass,
                    "stellarLogg":          slogg,
                    "stellarMetallicity":   smet,
                    "keplerMagnitude":      kepmag,

                    # Candidate screening score (original method)
                    "candidateScore":       candidate_score,
                    "priority":             priority,

                    # Kopparapu HZ
                    "hzClassification":          hz_classification,
                    "hzClassificationFull":      hz_full.get("conservative_classification") if hz_full else None,
                    "hzClassificationOptimistic": hz_full.get("optimistic_classification") if hz_full else None,
                    "inConservativeHz":           in_conservative_hz,
                    "inOptimisticHz":             in_optimistic_hz,
                    "hzInnerFluxConservative":    hz_inner_flux_cons,
                    "hzOuterFluxConservative":    hz_outer_flux_cons,
                    "hzInnerFluxOptimistic":      hz_inner_flux_opt,
                    "hzOuterFluxOptimistic":      hz_outer_flux_opt,
                    "hzInnerAU":                  hz_inner_au,
                    "hzOuterAU":                  hz_outer_au,
                    "hzInnerAUOptimistic":         hz_inner_au_opt,
                    "hzOuterAUOptimistic":         hz_outer_au_opt,
                    "stellarLuminositySolar":     stellar_luminosity,

                    # ESI
                    "esi":                   esi_result.get("esi") if esi_result else None,
                    "esiRadius":             esi_result.get("esi_radius") if esi_result else None,
                    "esiDensity":            esi_result.get("esi_density") if esi_result else None,
                    "esiEscapeVelocity":     esi_result.get("esi_escape_velocity") if esi_result else None,
                    "esiTemperature":        esi_result.get("esi_temperature") if esi_result else None,
                    "esiComponentsUsed":     esi_result.get("esi_components_used") if esi_result else [],
                    "esiMissingInputs":      esi_result.get("esi_missing_inputs") if esi_result else [],
                    "esiInterpretation":     esi_result.get("interpretation") if esi_result else None,

                    # Physical parameters
                    "bulkDensityGcm3":       density_gcm3,
                    "surfaceGravityMs2":     surface_gravity,
                    "escapeVelocityMs":      escape_velocity_ms_val,
                    "compositionEstimate":   composition_estimate,

                    # Stellar intelligence
                    "stellarSpectralClass":  stellar_info.get("spectral_class") if stellar_info else None,
                    "stellarSpectralDesc":   stellar_info.get("spectral_description") if stellar_info else None,
                    "stellarLumClass":       stellar_info.get("luminosity_class") if stellar_info else None,
                    "stellarHzNote":         stellar_info.get("hz_note") if stellar_info else None,

                    # HITE — computed in batch below, placeholder
                    "hiteScore":             None,
                    "hiteScorePrime":        None,
                    "hiteCalcType":          None,
                    "hiteRockyProbability":  None,
                    "hiteStatus":            None,
                    "hiteDataCompleteness":  None,
                    "hiteEMin":              None,
                    "hiteFMin":              None,
                    "hiteFMax":              None,

                    # ML — computed after model training
                    "mlPredictedClass":       None,
                    "mlClassProbabilities":   None,
                    "mlFeatureContributions": None,
                    "mlExplanationMethod":    None,
                    "mlLimitations":          None,
                }

                planets_list.append(planet_record)

                # Store raw row for ML (keep all numeric columns)
                raw_rows.append({
                    "kepoi_name":    kepoi_name,
                    "koi_disposition": disposition,
                    "koi_prad":      radius_earth,
                    "koi_teq":       teq,
                    "koi_insol":     insol,
                    "koi_period":    period,
                    "koi_sma":       sma,
                    "koi_steff":     steff,
                    "koi_srad":      srad,
                    "koi_smass":     smass,
                })

        # ── Batch HITE computation ──
        if _hite_available and planets_list:
            self._compute_hite_batch(planets_list, raw_rows)

        # ── Train ML model and add predictions ──
        if _ml_available and raw_rows:
            self._compute_ml(planets_list, raw_rows)

        self.planets = planets_list
        self._raw_rows = raw_rows

        # Precompute rankings
        self.rankings = sorted(
            self.planets,
            key=lambda p: (
                0 if p["candidateScore"] is not None else 1,
                -(p["candidateScore"] or 0.0),
            ),
        )

        # Stats
        confirmed_count       = sum(1 for p in self.planets if (p["disposition"] or "").upper() == "CONFIRMED")
        candidates_count      = sum(1 for p in self.planets if (p["disposition"] or "").upper() == "CANDIDATE")
        false_positives_count = sum(1 for p in self.planets if (p["disposition"] or "").upper() == "FALSE POSITIVE")
        high_priority_count   = sum(1 for p in self.planets if p["priority"] == "High")
        medium_priority_count = sum(1 for p in self.planets if p["priority"] == "Medium")
        low_priority_count    = sum(1 for p in self.planets if p["priority"] == "Low")
        no_score_count        = sum(1 for p in self.planets if p["candidateScore"] is None)
        in_cons_hz_count      = sum(1 for p in self.planets if p.get("inConservativeHz"))
        in_opt_hz_count       = sum(1 for p in self.planets if p.get("inOptimisticHz"))
        with_esi_count        = sum(1 for p in self.planets if p.get("esi") is not None)
        with_hite_count       = sum(1 for p in self.planets if p.get("hiteStatus") == "calculated")

        self.stats = {
            "totalRecords":           len(self.planets),
            "confirmed":              confirmed_count,
            "candidates":             candidates_count,
            "falsePositives":         false_positives_count,
            "highPriority":           high_priority_count,
            "mediumPriority":         medium_priority_count,
            "lowPriority":            low_priority_count,
            "recordsWithoutScore":    no_score_count,
            "inConservativeHz":       in_cons_hz_count,
            "inOptimisticHz":         in_opt_hz_count,
            "withEsi":                with_esi_count,
            "withHite":               with_hite_count,
            "mlTrained":              self._model_bundle.get("trained", False),
            "mlAccuracy":             self._model_bundle.get("accuracy"),
        }

        self.validation_summary = {
            "totalRowsInCsv":           total_rows,
            "excludedMissingId":        excluded_missing_id,
            "usableRecords":            len(self.planets),
            "requiredColumnsValidated": required_columns,
            "scientificModules": {
                "kopparapu":        kopparapu_hz is not None,
                "hite":             _hite_available,
                "esi":              _esi_available,
                "stellarAnalysis":  _stellar_available,
                "mlPipeline":       _ml_available,
            },
        }

        self.is_loaded = True
        logger.info(
            "Dataset loaded: %d records. HZ: %d cons / %d opt. ESI: %d. HITE: %d.",
            len(self.planets),
            in_cons_hz_count, in_opt_hz_count,
            with_esi_count, with_hite_count,
        )

    def _compute_hite_batch(self, planets_list: list[dict], raw_rows: list[dict]) -> None:
        """
        Compute HITE scores for all planets using the pandas-based hite_model module.

        Reads all required HITE columns directly from the CSV in one pass to avoid
        the name-corruption bug that occurred when pd.to_numeric was applied to the
        kepoi_name column. The name column is kept as a plain string throughout, and
        all numeric columns are coerced separately. Results are written back into
        planets_list via a name→index lookup built from the already-loaded records.
        """
        logger.info("Computing HITE scores for %d planets...", len(planets_list))
        try:
            import pandas as pd

            # --- Build the HITE input DataFrame from the CSV ---
            # Read only the columns HITE needs. kepoi_name is kept as str.
            numeric_cols = [
                "koi_srad", "koi_steff", "koi_slogg",
                "koi_depth", "koi_period", "koi_duration",
                "koi_impact", "koi_sma", "koi_smass",
            ]
            needed = ["kepoi_name"] + numeric_cols

            df = pd.read_csv(
                self.csv_path,
                usecols=lambda c: c in needed,
                dtype={"kepoi_name": str},      # preserve name as text
            )

            # Ensure all numeric columns exist and are coerced (never touch kepoi_name)
            for col in numeric_cols:
                if col not in df.columns:
                    df[col] = float("nan")
                else:
                    df[col] = pd.to_numeric(df[col], errors="coerce")

            # Strip whitespace from names
            df["kepoi_name"] = df["kepoi_name"].str.strip()

            # Drop rows with an empty planet name
            df = df[df["kepoi_name"].notna() & (df["kepoi_name"] != "")]

            logger.info("HITE supplementary DataFrame ready: %d rows.", len(df))

            # --- Name → list-index lookup (built from already-loaded planets_list) ---
            name_to_index: dict[str, int] = {p["id"]: i for i, p in enumerate(planets_list)}

            count_calculated = 0
            count_no_match   = 0

            for _, row in df.iterrows():
                name = str(row["kepoi_name"]).strip()
                idx  = name_to_index.get(name)
                if idx is None:
                    count_no_match += 1
                    continue
                try:
                    h = compute_hite_for_planet(row)
                    # Write NaN-safe values: convert numpy NaN → Python None for JSON
                    def _safe(v):
                        if v is None:
                            return None
                        try:
                            import math
                            return None if math.isnan(v) or math.isinf(v) else v
                        except (TypeError, ValueError):
                            return v

                    planets_list[idx]["hiteScore"]            = _safe(h.get("HITE_H"))
                    planets_list[idx]["hiteScorePrime"]       = _safe(h.get("HITE_H_prime"))
                    planets_list[idx]["hiteCalcType"]         = h.get("calc_type")
                    planets_list[idx]["hiteRockyProbability"] = _safe(h.get("rocky_probability"))
                    planets_list[idx]["hiteStatus"]           = h.get("status")
                    planets_list[idx]["hiteDataCompleteness"] = _safe(h.get("data_completeness"))
                    planets_list[idx]["hiteEMin"]             = _safe(h.get("e_min"))
                    planets_list[idx]["hiteFMin"]             = _safe(h.get("f_min"))
                    planets_list[idx]["hiteFMax"]             = _safe(h.get("f_max"))

                    if h.get("status") == "calculated":
                        count_calculated += 1
                except Exception as exc:
                    logger.debug("HITE error for %s: %s", name, exc)

            if count_no_match:
                logger.warning(
                    "HITE: %d CSV rows had no matching planet in planets_list "
                    "(possible kepoi_name mismatch).", count_no_match
                )

            logger.info(
                "HITE batch complete: %d calculated, %d unmatched.",
                count_calculated, count_no_match,
            )
        except Exception as exc:
            logger.error("HITE batch computation failed: %s", exc, exc_info=True)

    def _compute_ml(self, planets_list: list[dict], raw_rows: list[dict]) -> None:
        """Train ML model and add per-planet predictions."""
        logger.info("Training ML model...")
        bundle = train_model(raw_rows)
        self._model_bundle = bundle

        if not bundle.get("trained"):
            logger.warning("ML model training failed: %s", bundle.get("error"))
            return

        logger.info("Adding ML predictions to %d planets...", len(planets_list))
        name_to_raw = {r["kepoi_name"]: r for r in raw_rows}

        for planet in planets_list:
            raw = name_to_raw.get(planet["id"])
            if raw is None:
                continue
            try:
                pred = predict_planet(raw, bundle)
                planet["mlPredictedClass"]       = pred.get("predicted_class")
                planet["mlClassProbabilities"]   = pred.get("class_probabilities")
                planet["mlFeatureContributions"] = pred.get("feature_contributions")
                planet["mlExplanationMethod"]    = pred.get("explanation_method")
                planet["mlLimitations"]          = pred.get("limitations")
            except Exception as exc:
                logger.debug("ML prediction error for %s: %s", planet["id"], exc)

        logger.info("ML predictions complete.")

    def get_model_info(self) -> dict:
        """Return ML model summary."""
        if not _ml_available:
            return {"trained": False, "error": "ml_pipeline module not available"}
        return get_model_summary(self._model_bundle)


# Global singleton
loader = KeplerDataLoader()
