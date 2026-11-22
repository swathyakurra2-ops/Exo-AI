# EXO-SCAN Data Dictionary

This document lists every column used in the EXO-SCAN analysis pipeline, including raw Kepler dataset columns and all derived columns. For each column, the source, units, description, and role in each analytical method (HITE, Kopparapu, ML/Screening) is documented.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Column is used by this method |
| ➕ | Column is derived/created by this method |
| ❌ | Column is not used by this method |

---

## 1. Raw Kepler Dataset Columns (`cleankepler.csv`)

These columns are read directly from `cleankepler.csv` (6,725 rows, NASA Kepler Q1–Q16 KOI cumulative table).

### 1.1 Identifiers

| Column | Source | Units | Description | HITE | Kopparapu | ML/Screening |
|--------|--------|-------|-------------|------|-----------|--------------|
| `rowid` | Kepler Archive | — | Sequential row identifier in CSV | ❌ | ❌ | ❌ |
| `kepid` | Kepler Archive | — | Kepler Input Catalog (KIC) star identifier | ❌ | ❌ | ✅ (display) |
| `kepoi_name` | Kepler Archive | — | Unique KOI identifier, e.g. `K00001.01` | ✅ (key) | ✅ (key) | ✅ (key) |
| `koi_disposition` | Kepler Archive | — | Official disposition: CONFIRMED / CANDIDATE / FALSE POSITIVE | ❌ | ❌ | ✅ (target label) |
| `koi_pdisposition` | Kepler Archive | — | Pipeline disposition before manual vetting | ❌ | ❌ | ✅ (feature, encoded) |
| `koi_vet_stat` | Kepler Archive | — | Vetting status: Done, Not Vetted, etc. | ❌ | ❌ | ✅ (feature, encoded) |
| `koi_vet_date` | Kepler Archive | — | Date of most recent vetting | ❌ | ❌ | ✅ (feature: `vet_year`) |
| `koi_disp_prov` | Kepler Archive | — | Source of disposition classification | ❌ | ❌ | ❌ |

### 1.2 False Positive Flags

| Column | Source | Units | Description | HITE | Kopparapu | ML/Screening |
|--------|--------|-------|-------------|------|-----------|--------------|
| `koi_fpflag_nt` | Kepler Archive | 0/1 | Not transit-like false positive flag | ❌ | ❌ | ✅ (feature, encoded) |
| `koi_fpflag_ss` | Kepler Archive | 0/1 | Stellar secondary eclipse false positive flag | ❌ | ❌ | ✅ (feature, encoded) |
| `koi_fpflag_co` | Kepler Archive | 0/1 | Centroid offset false positive flag | ❌ | ❌ | ✅ (feature, encoded) |
| `koi_fpflag_ec` | Kepler Archive | 0/1 | Ephemeris match indicates contamination flag | ❌ | ❌ | ❌ |

### 1.3 Orbital and Transit Parameters

| Column | Source | Units | Description | HITE | Kopparapu | ML/Screening |
|--------|--------|-------|-------------|------|-----------|--------------|
| `koi_period` | Kepler Archive | days | Orbital period | ✅ (required) | ❌ | ❌ |
| `koi_period_err1` | Kepler Archive | days | Upper uncertainty on orbital period | ❌ | ❌ | ❌ |
| `koi_period_err2` | Kepler Archive | days | Lower uncertainty on orbital period | ❌ | ❌ | ❌ |
| `koi_time0bk` | Kepler Archive | BKJD | Time of first transit (Barycentric Kepler JD) | ❌ | ❌ | ❌ |
| `koi_time0` | Kepler Archive | BJD | Time of first transit (Barycentric Julian Date) | ❌ | ❌ | ❌ |
| `koi_eccen` | Kepler Archive | — | Orbital eccentricity (pipeline; often 0) | ❌ | ❌ | ❌ |
| `koi_impact` | Kepler Archive | — | Impact parameter $b$ (planet-to-stellar-centre distance at mid-transit, in stellar radii) | ✅ (optional: $e_\min$) | ❌ | ❌ |
| `koi_impact_err1` | Kepler Archive | — | Upper uncertainty on impact parameter | ❌ | ❌ | ❌ |
| `koi_impact_err2` | Kepler Archive | — | Lower uncertainty on impact parameter | ❌ | ❌ | ❌ |
| `koi_duration` | Kepler Archive | hours | Transit duration (first to fourth contact) | ✅ (required; $e_\min$ calculation) | ❌ | ❌ |
| `koi_duration_err1` | Kepler Archive | hours | Upper uncertainty on transit duration | ❌ | ❌ | ❌ |
| `koi_duration_err2` | Kepler Archive | hours | Lower uncertainty on transit duration | ❌ | ❌ | ❌ |
| `koi_depth` | Kepler Archive | ppm | Transit depth (fractional flux decrease × 10⁶) | ✅ (required: $R_p$) | ❌ | ❌ |
| `koi_depth_err1` | Kepler Archive | ppm | Upper uncertainty on transit depth | ❌ | ❌ | ❌ |
| `koi_depth_err2` | Kepler Archive | ppm | Lower uncertainty on transit depth | ❌ | ❌ | ❌ |
| `koi_ror` | Kepler Archive | — | Radius ratio $R_p / R_\star$ (pipeline) | ❌ | ❌ | ❌ |
| `koi_sma` | Kepler Archive | AU | Semi-major axis (from Kepler pipeline) | ✅ (optional, with fallback) | ✅ (HZ distance) | ❌ |
| `koi_incl` | Kepler Archive | degrees | Orbital inclination | ❌ | ❌ | ❌ |

### 1.4 Planetary Parameters

| Column | Source | Units | Description | HITE | Kopparapu | ML/Screening |
|--------|--------|-------|-------------|------|-----------|--------------|
| `koi_prad` | Kepler Archive | $R_\oplus$ | Planetary radius (Kepler pipeline) | ❌ (HITE recomputes from depth) | ❌ | ✅ (screening score) |
| `koi_prad_err1` | Kepler Archive | $R_\oplus$ | Upper uncertainty on planetary radius | ❌ | ❌ | ❌ |
| `koi_prad_err2` | Kepler Archive | $R_\oplus$ | Lower uncertainty on planetary radius | ❌ | ❌ | ❌ |
| `koi_teq` | Kepler Archive | K | Planetary equilibrium temperature | ❌ | ❌ | ✅ (screening score) |
| `koi_insol` | Kepler Archive | $S_\oplus$ | Incident stellar flux relative to Earth | ❌ | ✅ (required: classification) | ✅ (screening score) |
| `koi_insol_err1` | Kepler Archive | $S_\oplus$ | Upper uncertainty on insolation | ❌ | ❌ | ❌ |
| `koi_insol_err2` | Kepler Archive | $S_\oplus$ | Lower uncertainty on insolation | ❌ | ❌ | ❌ |
| `koi_dor` | Kepler Archive | — | Star-to-planet distance in stellar radii | ❌ | ❌ | ❌ |

### 1.5 Stellar Parameters

| Column | Source | Units | Description | HITE | Kopparapu | ML/Screening |
|--------|--------|-------|-------------|------|-----------|--------------|
| `koi_steff` | Kepler Archive | K | Stellar effective temperature | ✅ (luminosity) | ✅ (required: flux boundaries) | ✅ (HZ classification) |
| `koi_steff_err1` | Kepler Archive | K | Upper uncertainty on $T_\star$ | ❌ | ❌ | ❌ |
| `koi_steff_err2` | Kepler Archive | K | Lower uncertainty on $T_\star$ | ❌ | ❌ | ❌ |
| `koi_slogg` | Kepler Archive | log(cm s⁻²) | Stellar surface gravity (log cgs) | ✅ (required column check) | ❌ | ❌ |
| `koi_slogg_err1` | Kepler Archive | log(cm s⁻²) | Upper uncertainty on log g | ❌ | ❌ | ❌ |
| `koi_slogg_err2` | Kepler Archive | log(cm s⁻²) | Lower uncertainty on log g | ❌ | ❌ | ❌ |
| `koi_smet` | Kepler Archive | dex | Stellar metallicity [Fe/H] | ❌ | ❌ | ❌ |
| `koi_srad` | Kepler Archive | $R_\odot$ | Stellar radius | ✅ (required: $R_p$, luminosity) | ✅ (luminosity for HZ AU) | ❌ |
| `koi_srad_err1` | Kepler Archive | $R_\odot$ | Upper uncertainty on stellar radius | ❌ | ❌ | ❌ |
| `koi_srad_err2` | Kepler Archive | $R_\odot$ | Lower uncertainty on stellar radius | ❌ | ❌ | ❌ |
| `koi_smass` | Kepler Archive | $M_\odot$ | Stellar mass | ✅ (optional: Kepler 3rd law fallback for $a$) | ❌ | ❌ |
| `koi_smass_err1` | Kepler Archive | $M_\odot$ | Upper uncertainty on stellar mass | ❌ | ❌ | ❌ |
| `koi_smass_err2` | Kepler Archive | $M_\odot$ | Lower uncertainty on stellar mass | ❌ | ❌ | ❌ |
| `koi_sparprov` | Kepler Archive | — | Source of stellar parameters | ❌ | ❌ | ❌ |

### 1.6 Centroid / Positional Columns

| Column | Source | Units | Description | HITE | Kopparapu | ML/Screening |
|--------|--------|-------|-------------|------|-----------|--------------|
| `koi_dicco_mra` | Kepler Archive | arcsec | ΔRA: difference-image centroid offset, RA | ❌ | ❌ | ❌ |
| `koi_dicco_mra_err` | Kepler Archive | arcsec | Uncertainty on above | ❌ | ❌ | ❌ |
| `koi_dicco_mdec` | Kepler Archive | arcsec | ΔDec: difference-image centroid offset, Dec | ❌ | ❌ | ✅ (feature: `pos_diff_mdec`) |
| `koi_dicco_mdec_err` | Kepler Archive | arcsec | Uncertainty on above | ❌ | ❌ | ✅ (feature: `avg_err_mdec`) |
| `koi_dicco_msky` | Kepler Archive | arcsec | Sky-projected centroid offset, difference image | ❌ | ❌ | ✅ (feature: `pos_diff_msky`) |
| `koi_dicco_msky_err` | Kepler Archive | arcsec | Uncertainty on above | ❌ | ❌ | ❌ |
| `koi_dikco_mra` | Kepler Archive | arcsec | ΔRA: KIC centroid offset, RA | ❌ | ❌ | ❌ |
| `koi_dikco_mdec` | Kepler Archive | arcsec | ΔDec: KIC centroid offset, Dec | ❌ | ❌ | ✅ (feature: `pos_diff_mdec`) |
| `koi_dikco_mdec_err` | Kepler Archive | arcsec | Uncertainty on above | ❌ | ❌ | ✅ (feature: `avg_err_mdec`) |
| `koi_dikco_msky` | Kepler Archive | arcsec | Sky-projected KIC centroid offset | ❌ | ❌ | ✅ (feature: `pos_diff_msky`) |
| `koi_dikco_msky_err` | Kepler Archive | arcsec | Uncertainty on above | ❌ | ❌ | ❌ |
| `koi_fwm_stat_sig` | Kepler Archive | — | Flux-weighted moment statistical significance | ❌ | ❌ | ❌ |
| `ra` | Kepler Archive | degrees | Right ascension of host star (J2000) | ❌ | ❌ | ❌ |
| `dec` | Kepler Archive | degrees | Declination of host star (J2000) | ❌ | ❌ | ❌ |

### 1.7 Photometric / Magnitude Columns

| Column | Source | Units | Description | HITE | Kopparapu | ML/Screening |
|--------|--------|-------|-------------|------|-----------|--------------|
| `koi_kepmag` | Kepler Archive | mag | Kepler-band apparent magnitude | ❌ | ❌ | ❌ |
| `koi_gmag` | Kepler Archive | mag | SDSS g-band magnitude | ❌ | ❌ | ❌ |
| `koi_rmag` | Kepler Archive | mag | SDSS r-band magnitude | ❌ | ❌ | ❌ |
| `koi_imag` | Kepler Archive | mag | SDSS i-band magnitude | ❌ | ❌ | ❌ |
| `koi_zmag` | Kepler Archive | mag | SDSS z-band magnitude | ❌ | ❌ | ❌ |
| `koi_jmag` | Kepler Archive | mag | 2MASS J-band magnitude | ❌ | ❌ | ❌ |
| `koi_hmag` | Kepler Archive | mag | 2MASS H-band magnitude | ❌ | ❌ | ❌ |
| `koi_kmag` | Kepler Archive | mag | 2MASS K-band magnitude | ❌ | ❌ | ❌ |
| `koi_model_snr` | Kepler Archive | — | Transit model signal-to-noise ratio | ❌ | ❌ | ❌ |

---

## 2. Derived Columns — HITE Pipeline (`hite_model.py`)

These columns are computed by `compute_hite_for_planet()` / `compute_hite_batch()` and stored in the results DataFrame.

| Column | Units | Formula / Source | Description |
|--------|-------|-----------------|-------------|
| `stellar_luminosity` | $L_\odot$ | $(R_\star/R_\odot)^2 \cdot (T_\star/5778)^4$ | Stellar luminosity in solar units |
| `planet_radius_earth` | $R_\oplus$ | $\sqrt{\delta/10^6} \cdot R_\star \cdot R_\odot / R_\oplus$ | Planetary radius derived from transit depth |
| `planet_mass_earth` | $M_\oplus$ | $R_p^{3.268}$ ($R_p \leq 1$) or $R_p^{3.65}$ ($R_p > 1$) | Planetary mass from radius–mass relation |
| `rocky_probability` | — | Piecewise linear: 1 at ≤1.5, 0 at ≥2.5 $R_\oplus$ | Probability planet is rocky |
| `semi_major_axis_au` | AU | `koi_sma` or Kepler 3rd law | Semi-major axis |
| `orbital_period` | days | `koi_period` | Orbital period (passthrough) |
| `transit_depth` | ppm | `koi_depth` | Transit depth (passthrough) |
| `transit_duration` | hours | `koi_duration` | Transit duration (passthrough) |
| `impact_parameter` | — | `koi_impact` | Impact parameter (passthrough) |
| `e_min` | — | $|1 - \tau_\text{obs}/\tau_\text{circ}|$ | Minimum orbital eccentricity from transit anomaly |
| `f_min` | W m⁻² | 67.0 (constant) | Minimum habitable flux (Pierrehumbert 2010) |
| `f_max` | W m⁻² | From surface gravity and Pierrehumbert model | Maximum habitable flux (runaway greenhouse) |
| `HITE_H` | — | Probability-weighted habitable grid fraction × $p_\text{rocky}$ | HITE score with eccentricity data (H) |
| `HITE_H_prime` | — | Uniform grid fraction × $p_\text{rocky}$ | HITE score without eccentricity data (H′) |
| `calc_type` | — | `'H'`, `'H_prime'`, or `'insufficient_data'` | Which HITE score was computed |
| `data_completeness` | % | Fraction of 10 key fields that are finite | Data completeness indicator |
| `status` | — | e.g. `'calculated'`, `'missing_stellar_parameters'` | Computation status |
| `stellar_radius` | $R_\odot$ | `koi_srad` | Stellar radius (passthrough) |
| `stellar_temp` | K | `koi_steff` | Stellar temperature (passthrough) |
| `stellar_logg` | log(cm s⁻²) | `koi_slogg` | Stellar log g (passthrough) |

---

## 3. Derived Columns — Kopparapu Pipeline (`kopparapu_hz.py`)

These columns are added by `add_habitable_zone_columns()`.

| Column | Units | Formula | Description |
|--------|-------|---------|-------------|
| `HZ_Inner_Flux` | $S_\oplus$ | $S_0^{\rm RG} + a^{\rm RG}T' + b^{\rm RG}T'^2 + c^{\rm RG}T'^3 + d^{\rm RG}T'^4$ | Conservative inner HZ flux (runaway greenhouse) |
| `HZ_Outer_Flux` | $S_\oplus$ | $S_0^{\rm MG} + a^{\rm MG}T' + \ldots$ | Conservative outer HZ flux (maximum greenhouse) |
| `HZ_Inner_Flux_Optimistic` | $S_\oplus$ | Recent Venus coefficients | Optimistic inner HZ flux |
| `HZ_Outer_Flux_Optimistic` | $S_\oplus$ | Early Mars coefficients | Optimistic outer HZ flux |
| `Stellar_Luminosity_Solar` | $L_\odot$ | $(R_\star/R_\odot)^2 (T_\star/5780)^4$ | Stellar luminosity (Kopparapu module version) |
| `HZ_Inner_AU` | AU | $\sqrt{L_\star / S_{\rm eff,inner}}$ | Conservative inner HZ distance |
| `HZ_Outer_AU` | AU | $\sqrt{L_\star / S_{\rm eff,outer}}$ | Conservative outer HZ distance |
| `HZ_Inner_AU_Optimistic` | AU | $\sqrt{L_\star / S_{\rm eff,inner,opt}}$ | Optimistic inner HZ distance |
| `HZ_Outer_AU_Optimistic` | AU | $\sqrt{L_\star / S_{\rm eff,outer,opt}}$ | Optimistic outer HZ distance |
| `HZ_Classification` | — | `classify_habitable_zone()` | Conservative HZ classification label |
| `HZ_Classification_Opt` | — | `classify_habitable_zone()` with optimistic bounds | Optimistic HZ classification label |
| `In_Conservative_HZ` | bool | True if classification = conservative HZ | Boolean conservative HZ flag |
| `In_Optimistic_HZ` | bool | True if within optimistic bounds | Boolean optimistic HZ flag |
| `Incident_Flux` | $S_\oplus$ | `koi_insol` | Incident flux (passthrough, renamed) |

---

## 4. Derived Columns — Candidate Screening (`data_loader.py`)

| Column | Units | Formula | Description |
|--------|-------|---------|-------------|
| `candidateScore` | 0–100 | $100 \times (0.4 \cdot r + 0.3 \cdot t + 0.3 \cdot f)$ | Weighted habitability screening score |
| `priority` | — | ≤40 → Low; ≤70 → Medium; >70 → High | Priority tier based on screening score |
| `hzClassification` | — | `kopparapu_hz.classify_habitable_zone()` | Kopparapu HZ label (API response) |

---

## 5. Derived Columns — Feature Engineering (`featureEngineer.py`)

| Column | Units | Formula | Description |
|--------|-------|---------|-------------|
| `radius_flag` | 0/1 | 1 if $0.5 \leq R_p \leq 1.5\,R_\oplus$ | Binary radius habitability flag |
| `temp_flag` | 0/1 | 1 if $200\,\text{K} \leq T_\text{eq} \leq 320\,\text{K}$ | Binary temperature habitability flag |
| `pos_diff_mdec` | arcsec | $|\texttt{koi\_dicco\_mdec} - \texttt{koi\_dikco\_mdec}|$ | Declination centroid discrepancy |
| `pos_diff_msky` | arcsec | $|\texttt{koi\_dicco\_msky} - \texttt{koi\_dikco\_msky}|$ | Sky-projected centroid discrepancy |
| `avg_err_mdec` | arcsec | mean of `koi_dicco_mdec_err` and `koi_dikco_mdec_err` | Average declination error |
| `total_pos_diff` | arcsec | `pos_diff_mdec + pos_diff_msky` | Combined positional discrepancy |
| `pos_flag` | 0/1 | 1 if `total_pos_diff < 0.1` | Low positional contamination flag |
| `habitability_score` | 0–3 | `radius_flag + temp_flag + pos_flag` | Combined habitability score |
| `vet_year` | year | `koi_vet_date.dt.year` | Year of most recent vetting |

---

## 6. Notes on Column Overlap

- **Planetary radius:** `koi_prad` (Kepler pipeline, used in Screening) vs. `planet_radius_earth` (recomputed from `koi_depth` and `koi_srad` for HITE). These may differ slightly due to different pipeline assumptions.
- **Stellar luminosity:** Computed independently in both `hite_model.py` (as `stellar_luminosity`) and `kopparapu_hz.py` (as `Stellar_Luminosity_Solar`). Both use the same formula; the slightly different solar temperature reference (5778 K in HITE vs 5780 K in Kopparapu) leads to negligible differences.
- **Semi-major axis:** `koi_sma` is used directly. If missing, HITE falls back to Kepler's 3rd law; Kopparapu uses it only to compute HZ distances in AU.
