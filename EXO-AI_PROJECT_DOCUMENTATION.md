# EXO-AI — Complete Project Documentation

**Last updated:** November 2026  
**Dataset:** NASA Kepler KOI Catalog (Q1–Q16), 6,725 objects  
**Backend:** FastAPI (Python 3.14) · **Frontend:** React + Vite (TypeScript)

---

## Table of Contents

1. [What This Project Does](#1-what-this-project-does)
2. [The Dataset](#2-the-dataset)
3. [Candidate Screening Score — Is It Scientifically Valid?](#3-candidate-screening-score--is-it-scientifically-valid)
4. [Kopparapu Habitable Zone Model](#4-kopparapu-habitable-zone-model)
5. [HITE — Habitability Index for Transiting Exoplanets](#5-hite--habitability-index-for-transiting-exoplanets)
6. [Earth Similarity Index (ESI)](#6-earth-similarity-index-esi)
7. [Machine Learning Disposition Classifier](#7-machine-learning-disposition-classifier)
8. [How the Four Models Compare](#8-how-the-four-models-compare)
9. [Application Architecture](#9-application-architecture)
10. [Live Results from This Dataset](#10-live-results-from-this-dataset)
11. [What No Model Can Tell You](#11-what-no-model-can-tell-you)
12. [References](#12-references)

---

## 1. What This Project Does

EXO-AI takes the raw Kepler Space Telescope planet candidate catalog and applies four independent scientific screening methods to every object. The goal is not to discover new planets — Kepler already found them. The goal is to identify, from 6,725 candidates, which ones are most worth expensive follow-up telescope time based on how consistent their measured properties are with habitability.

The application calculates every score once at startup, caches all results in memory, and exposes them through a REST API that the React frontend reads. Nothing is hardcoded or mocked. Every number comes from the actual CSV data.

---

## 2. The Dataset

**Source:** NASA Exoplanet Archive, Kepler Object of Interest (KOI) cumulative table, Q1–Q16 data release  
**File:** `cleankepler.csv`  
**Records:** 6,725 planetary candidates  

Each row is one transit signal detected by Kepler. The catalog records the official disposition (what NASA's vetting pipeline concluded), the measured transit parameters, and the host star properties derived from spectroscopy and photometry.

### Key columns used by EXO-AI

| Column | What it measures | Units |
|--------|-----------------|-------|
| `kepoi_name` | Unique planet identifier | — (e.g. K00001.01) |
| `koi_disposition` | Official verdict: CONFIRMED, CANDIDATE, or FALSE POSITIVE | — |
| `koi_prad` | Planet radius from transit photometry | Earth radii (R⊕) |
| `koi_teq` | Equilibrium temperature (blackbody, no greenhouse) | Kelvin |
| `koi_insol` | Stellar insolation received by the planet | Earth flux units (S⊕) |
| `koi_period` | Orbital period | days |
| `koi_sma` | Semi-major axis | AU |
| `koi_depth` | Fractional drop in stellar brightness during transit | parts per million |
| `koi_duration` | Time the planet takes to cross the star's disk | hours |
| `koi_impact` | Impact parameter — how centrally the planet crosses the star | dimensionless |
| `koi_steff` | Host star effective temperature | Kelvin |
| `koi_srad` | Host star radius | Solar radii |
| `koi_smass` | Host star mass | Solar masses |
| `koi_slogg` | Host star surface gravity | log(cm/s²) |

### Disposition breakdown

Of the 6,725 objects:
- **CONFIRMED** — independently validated as a real planet (radial velocity or statistical)
- **CANDIDATE** — passes automated vetting but awaits confirmation
- **FALSE POSITIVE** — transit caused by a background star, eclipsing binary, or instrument artifact
- **NOT DISPOSITIONED** — not yet fully assessed

---

## 3. Candidate Screening Score — Is It Scientifically Valid?

### What it is

The candidate screening score is a simple 0–100 filter defined in `data_loader.py`. It applies a trapezoid scoring function to three parameters and combines them with fixed weights:

```python
r_score = range_score(radius_earth, 0.3,  0.8,  1.8,  2.5)   # weight 40%
t_score = range_score(teq,          180,   220,  320,  400)   # weight 30%
f_score = range_score(insol,        0.1,   0.25, 2.0,  4.0)   # weight 30%

score = (0.40 × r_score + 0.30 × t_score + 0.30 × f_score) × 100
```

The `range_score` function returns:
- **0.0** if the value is outside the absolute limits (the outer pair of numbers)
- **1.0** if the value is inside the ideal window (the inner pair)
- A **linear ramp** between 0 and 1 in the transition zones

Thresholds: score ≤ 40 → Low priority; ≤ 70 → Medium; > 70 → High.

### Does published research support it?

This is the most important question to answer honestly, so here it is in full.

**The scoring function itself is not from a published paper.** The existing project documentation (`RANKING_METHODOLOGY.md`) explicitly states:

> *"The integrated ranking system described in this document is a project-specific design created for EXO-SCAN. It is not a published scientific model. While it is built upon published methodologies, the grouping criteria, tier definitions, and integrated ranking logic are engineering decisions made for this application and have not been peer-reviewed or validated against external datasets."*

However, the **boundaries it uses are individually grounded in published science**:

#### Radius: 0.8–1.8 R⊕ (outer limits 0.3–2.5)

The 1.6 R⊕ boundary between rocky and gaseous planets is documented in:
- **Rogers (2015)**, ApJ 801, 41 — showed statistically that planets above ~1.6 R⊕ are unlikely to be primarily rocky
- **Fulton et al. (2017)**, AJ 154, 109 — the "Fulton gap" or "radius valley": a statistical deficit of planets between 1.5 and 2.0 R⊕, separating rocky super-Earths from gaseous sub-Neptunes

The upper limit of 2.5 R⊕ for the hard cutoff is consistent with Barnes et al. (2015), which uses the same boundary in HITE's rocky probability function (p_rocky = 0 above 2.5 R⊕). The overlap is not coincidental — both reflect the same empirical observation.

What the scoring does **not** do: Rogers (2015) found the transition around 1.6 R⊕, not 1.8 R⊕. The score gives full marks up to 1.8 R⊕, which is slightly more generous than the literature supports. A planet at 1.75 R⊕ scores 100 on radius; Rogers (2015) would put the rocky probability at roughly 50%.

#### Temperature: 220–320 K (outer limits 180–400)

These are physically motivated by liquid water stability:
- 273 K is the melting point of water ice at 1 atm
- 373 K is the boiling point at 1 atm
- Earth's mean surface temperature is 288 K; equilibrium temperature (no greenhouse) is about 255 K
- The 220–320 K range on **equilibrium temperature** (not surface temperature) corresponds approximately to the range where, with plausible greenhouse warming, surface liquid water could exist

This is consistent with the spirit of the Kopparapu model, whose conservative HZ inner boundary for a solar twin produces an equilibrium temperature of roughly 270–290 K, and whose outer boundary produces roughly 190–210 K. The scoring range is a simplified version of the same physical reasoning.

**Important caveat:** `koi_teq` is the blackbody equilibrium temperature assuming a fixed albedo (usually 0.3) and no greenhouse effect. Earth's equilibrium temperature by this measure is about 255 K, not 288 K. A planet with `koi_teq = 270 K` and a strong CO₂ greenhouse could have a surface temperature well above 320 K. The score treats `koi_teq` as a rough proxy, not a surface temperature measurement.

#### Stellar flux: 0.25–2.0 S⊕ (outer limits 0.1–4.0)

These map directly to the Kopparapu habitable zone boundaries for a solar-type star:
- Conservative inner boundary (runaway greenhouse): ~1.1 S⊕
- Conservative outer boundary (maximum greenhouse): ~0.36 S⊕
- Optimistic inner boundary (recent Venus): ~1.78 S⊕
- Optimistic outer boundary (early Mars): ~0.32 S⊕

The scoring's ideal window of 0.25–2.0 S⊕ is slightly wider than the conservative HZ and roughly aligns with the optimistic boundaries. The 0.1 and 4.0 hard limits are beyond any HZ estimate in the literature.

#### The 40/30/30 weights

No published paper assigns exactly these weights. The 40% weight on radius reflects the view that size is the primary filter — a confirmed gas giant is disqualified regardless of its temperature. Temperature and flux each get 30% because they carry similar physical information (they are correlated: the more flux a planet receives, the higher its equilibrium temperature).

An alternative weighting supported by HITE's design would weight flux more heavily than temperature, since flux is the independent variable and temperature is derived from it. However, keeping radius as the dominant term is defensible: the rocky probability question (is this even a solid-surface planet?) is more fundamental than the thermal question.

#### Why K04081.01 scores 59.2 despite having a good temperature and flux

Its radius is 3.45 R⊕, which exceeds the 2.5 R⊕ hard cutoff. The radius score is 0.0. Temperature (305 K) and flux (2.05 S⊕, just above ideal) together contribute 59.3 points. This correctly reflects that a Neptune-sized planet in the habitable zone is not a habitable candidate — it almost certainly has no solid surface.

#### Summary: is it correct?

**The ranges are scientifically grounded.** Each boundary has a physical or empirical justification from the literature.

**The function form (linear trapezoid) is a simplification.** Real habitability probability is not a linear ramp — it does not go from 0% to 100% as radius decreases from 2.5 to 1.8 R⊕. HITE uses a more physically motivated function. The trapezoid is a reasonable engineering approximation for a quick visual filter.

**The combined score is not validated against an independent sample.** No paper has shown that this particular weighted combination of three parameters, with these specific boundaries, optimally identifies habitable planets. It is a reasonable, transparent, manually-designed filter — not a calibrated model.

**Use it as a first filter, not a conclusion.** Its value is speed and interpretability: you can explain to anyone why a planet scored 100 or 0. For the scientifically rigorous analysis, look at HITE and Kopparapu.

---

## 4. Kopparapu Habitable Zone Model

**File:** `backend/kopparapu_hz.py`  
**Papers:** Kopparapu et al. (2013), ApJ 765, 131 · Kopparapu et al. (2014), ApJ Letters 787, L29

### What it asks

Is this planet receiving the right amount of starlight for liquid water to exist on its surface?

### The physics

The habitable zone is not defined by distance from the star — it is defined by the stellar flux the planet receives. The inner boundary is where the greenhouse effect would trap enough heat to boil off all surface water (runaway greenhouse). The outer boundary is where even a dense CO₂ atmosphere could not warm the surface above freezing (maximum greenhouse).

Kopparapu et al. calculated these boundaries by running a 1D radiative-convective climate model at many stellar temperatures and fitting the results to polynomials:

```
S_eff(T★) = S₀ + a·T' + b·T'² + c·T'³ + d·T'⁴
where T' = T★ − 5780 K
```

Different coefficient sets (S₀, a, b, c, d) give different boundaries.

### The four boundaries implemented

| Boundary | Physical meaning | Label |
|----------|----------------|-------|
| Inner conservative | Runaway greenhouse threshold | S₀ = 1.107 |
| Outer conservative | Maximum greenhouse threshold | S₀ = 0.356 |
| Inner optimistic | Recent Venus analogue (Venus may have had water ~1 Gyr ago) | S₀ = 1.776 |
| Outer optimistic | Early Mars analogue (Mars had surface water ~3.8 Gyr ago) | S₀ = 0.320 |

**Conservative HZ** sits between the runaway greenhouse and maximum greenhouse limits. This is the safest claim — the range where Earth-like planets are most likely to have liquid surface water.

**Optimistic HZ** extends the zone using the more uncertain historical evidence from Venus and Mars. Planets in the optimistic but not conservative zone *might* be habitable under specific conditions, but the evidence is weaker.

### HZ distances in AU

The boundaries are computed in flux units (relative to Earth), then converted to physical distances:

```
d_HZ [AU] = √(L★ / S_eff)
```

where L★ is the stellar luminosity in solar units, derived from the host star's measured radius and temperature:

```
L★/L☉ = (R★/R☉)² × (T★/5778)⁴
```

### Valid temperature range

The model is calibrated for stellar temperatures between **2,600 K and 7,200 K**. Outside this range the code returns NaN and labels the classification "Outside model temperature range." This covers M dwarfs through early F-type stars — the vast majority of Kepler targets.

### Classification tiers

| Label | Meaning |
|-------|---------|
| Within conservative habitable zone | Flux is between inner and outer conservative boundaries |
| Within optimistic HZ (inside conservative) | Flux is between optimistic inner and conservative inner — slightly too hot |
| Within optimistic HZ (outside conservative) | Flux is between conservative outer and optimistic outer — slightly too cold |
| Interior to inner HZ boundary | Planet is too close to its star — far too hot |
| Exterior to outer HZ boundary | Planet is too far from its star — far too cold |
| Outside model temperature range | Host star temperature outside 2,600–7,200 K |

### Results in this dataset

- **285 planets** in the conservative habitable zone
- **472 planets** in the optimistic habitable zone (includes conservative)
- Flux limits for a solar twin: inner ~1.107 S⊕, outer ~0.356 S⊕

### What it does not account for

The Kopparapu model is a 1D climate model for a 1-Earth-mass, Earth-composition planet with a specific atmospheric profile. It does not account for:
- Cloud cover (which can significantly shift the HZ inward or outward)
- Atmospheric composition other than CO₂/H₂O
- Tidal heating (relevant for moons and close-in planets)
- Planetary mass (the 2014 paper gives boundaries for 1 M⊕; a heavier planet would have different HZ limits)
- Eccentricity (orbit-averaged flux differs from instantaneous flux for eccentric orbits)

This is exactly why HITE exists — it handles the eccentricity problem that Kopparapu does not.

---

## 5. HITE — Habitability Index for Transiting Exoplanets

**File:** `backend/hite_model.py`  
**Paper:** Barnes, Meadows & Evans (2015), ApJ 814, 91  
DOI: 10.1088/0004-637X/814/2/91

### What it asks

Given that we cannot measure the planet's exact albedo or orbital eccentricity from transit data alone, what fraction of all physically plausible (albedo, eccentricity) combinations would put this planet in a habitable flux range? And is the planet likely rocky enough to have a solid surface?

### Why this is better than a fixed HZ boundary

Kopparapu calculates boundaries for circular orbits and a specific albedo. Real planets have unknown eccentricities and albedos. A planet orbiting slightly outside the Kopparapu conservative HZ might still be habitable on a moderately eccentric orbit, because the orbit-averaged flux would be higher. HITE explicitly integrates over this uncertainty.

### Step-by-step calculation

**Step 1 — Stellar luminosity**

```
L★/L☉ = (R★/R☉)² × (T★/5778)⁴
```

Requires: `koi_srad` (stellar radius in solar radii) and `koi_steff` (stellar temperature in K).

**Step 2 — Planet radius from transit depth**

The Kepler pipeline provides `koi_prad` directly, but HITE recomputes it from first principles using the transit depth:

```
Rp/R★ = √(depth_ppm / 1,000,000)
Rp [R⊕] = (Rp/R★) × R★[R☉] × (R☉/R⊕)
```

Requires: `koi_depth` (transit depth in parts per million) and `koi_srad`.

**Step 3 — Planet mass from radius**

No mass measurement exists for most Kepler planets. HITE uses a broken power-law calibrated on known exoplanets (Barnes et al. 2015):

```
Rp ≤ 1 R⊕:  Mp = Rp^3.268
Rp > 1 R⊕:  Mp = Rp^3.65
```

This is an empirical approximation with significant scatter for individual planets, but it is the relationship used in the original paper.

**Step 4 — Rocky probability**

A planet cannot be habitable if it has no solid surface. The rocky probability function is a piecewise approximation from the same paper:

```
Rp ≤ 1.5 R⊕:          p_rocky = 1.0   (almost certainly rocky)
1.5 < Rp < 2.5 R⊕:    p_rocky = 2.5 − Rp  (linearly decreasing)
Rp ≥ 2.5 R⊕:          p_rocky = 0.0   (almost certainly gaseous)
```

This is consistent with Rogers (2015) and the Fulton gap, which place the rocky/gaseous transition near 1.5–1.6 R⊕. The 2.5 R⊕ upper limit matches where ESI composition estimates also conclude "gaseous."

**Step 5 — Minimum eccentricity from transit duration**

If a planet's observed transit duration differs from what a circular orbit would produce, its orbit must be at least somewhat eccentric. HITE calculates this minimum eccentricity:

```
D_circular = (P/π) × √[(R★+Rp)² − (b·R★)²] / a

Δ = D_observed / D_circular

e_min = |(Δ² − 1) / (Δ² + 1)|
```

Requires: `koi_impact` (impact parameter b), `koi_duration`, `koi_period`, and `koi_sma`.

This `e_min` becomes the lower integration limit for HITE H. If transit duration data are unavailable, e_min = 0 is assumed and H′ is computed instead of H.

**Step 6 — Flux limits**

```
F_min = 67 W/m²    (minimum OLR for liquid water; Pierrehumbert 2010)
F_max = f(Mp, Rp)  (runaway greenhouse threshold; depends on surface gravity)
```

F_max is calculated from the Pierrehumbert (2010) analytical runaway greenhouse formula, using the planet's surface gravity g = G·Mp/Rp². If F_max ≤ F_min, the planet is disqualified (HITE = 0).

**Step 7 — The albedo–eccentricity grid**

This is the core of the model. For each planet, the code tests every combination of:
- Bond albedo A from 0.05 to 0.80 (step 0.01 → 76 values)
- Eccentricity e from e_min to 0.80 (step 0.01 → up to 76 values)

At each (A, e) point, the orbit-averaged absorbed flux is:

```
F(A, e) = L★[W] × (1 − A) / (16π × a²[m] × √(1 − e²))
```

The cell is marked habitable if `F_min < F < F_max`.

**Step 8 — Integration with eccentricity probability weighting**

Not all eccentricities are equally likely. Barnes et al. (2015) fit this empirical polynomial to the observed eccentricity distribution (eq. 2 of the paper):

```
p(e) = 0.1619 − 0.5352e + 0.6358e² − 0.2557e³
```

The habitable fraction at each eccentricity is weighted by p(e) before averaging.

**Step 9 — H versus H′**

| Score | e_min used | Physical meaning |
|-------|-----------|-----------------|
| **H** | Derived from transit duration anomaly | Uses what the data tells us about minimum eccentricity. More constrained. |
| **H′** | 0 (assumed) | Full eccentricity range from zero. Used when impact parameter is unavailable. |

H ≤ H′ always. H is preferred when good transit duration and impact parameter data are available. H′ is the fallback.

**Step 10 — Final HITE score**

```
HITE H_final     = H  × p_rocky
HITE H′_final    = H′ × p_rocky
```

Both are clipped to [0, 1].

### What the numbers mean

| Score | Interpretation |
|-------|---------------|
| 0.90 – 1.00 | Nearly all orbital/albedo configurations tested are flux-compatible. Planet is small and likely rocky. Very high priority. |
| 0.50 – 0.90 | Majority of configurations are habitable-flux-compatible. Worth investigating. |
| 0.10 – 0.50 | Minority of configurations work. Lower priority. |
| 0.00 | Either p_rocky = 0 (too large to be rocky), or flux is outside the habitable window for all tested configurations. |
| NaN | Insufficient data — typically missing stellar radius/temperature or transit depth. |

### Results in this dataset

- **6,725** planets calculated, 0 failures
- **520** planets have HITE H > 0
- **Average HITE H across all 6,725:** 0.022 (most planets are hot or large, scoring zero)
- **Top candidate:** K03456.02 — H = 0.9882, radius 1.18 R⊕, semi-major axis 1.20 AU

### Scientific limitations specific to HITE

1. The mass-radius power law has scatter of roughly ±50% for individual planets. This directly affects F_max.
2. The rocky probability function is an approximation. A 1.6 R⊕ planet might or might not be rocky — HITE gives it p_rocky = 0.9, which is reasonable but not measured.
3. The Pierrehumbert F_max formula uses P_ref = 10 mbar (10⁴ Pa). The original Pierrehumbert (2010) reference uses a different pressure level. This makes F_max systematically lower than it should be, narrowing the habitable window slightly. The equation is not changed in this implementation because it matches the Barnes et al. (2015) paper's choices.
4. HITE assumes the planet's orbit is long-lived. It does not check orbital stability.
5. HITE does not consider stellar variability, stellar flares, or tidal locking — all of which are relevant for M-dwarf planets.

---

## 6. Earth Similarity Index (ESI)

**File:** `backend/esi_calculator.py`  
**Paper:** Schulze-Makuch et al. (2011), Astrobiology 11(10), 1041–1052  
DOI: 10.1089/ast.2010.0592

### What it measures

How physically similar is a planet to Earth across four measurable properties? ESI is a geometric mean of four similarity terms:

```
ESI = ∏ᵢ [1 − |xᵢ − xEarth| / (xᵢ + xEarth)]^(wᵢ/4)
```

### The four components

| Property | Earth reference | Weight exponent | Notes |
|----------|----------------|----------------|-------|
| Radius | 1.0 R⊕ | 0.57 | From transit photometry |
| Bulk density | 5.515 g/cm³ | 1.07 | Estimated from radius + mass |
| Escape velocity | 11.186 km/s | 0.70 | Estimated from radius + mass |
| Equilibrium temperature | 288 K | 5.58 | Highest weight; uses koi_teq |

The temperature weight (5.58) is far higher than the others. This means a planet with the right size and density but the wrong temperature scores very poorly. This reflects the intuition that temperature is the most critical factor for liquid water.

### What it does not measure

ESI measures physical resemblance to Earth. A high score (say 0.85) means the planet's radius, density, escape velocity, and temperature profile are Earth-like. It says nothing about whether the planet actually has water, an atmosphere, plate tectonics, or life. Venus and Earth have similar sizes and masses; Venus's ESI is moderately high. Venus is not habitable.

The existing documentation is explicit about this:

> *"ESI does NOT measure habitability or the probability of life. A high ESI means Earth-like, not inhabited."*

---

## 7. Machine Learning Disposition Classifier

**File:** `backend/ml_pipeline.py`  
**Algorithm:** Random Forest, 200 trees (Breiman 2001; scikit-learn implementation)

### What it predicts

It predicts the catalog disposition label (CONFIRMED / CANDIDATE / FALSE POSITIVE) from transit and stellar properties. It is trained on the same dataset it is applied to, so it is effectively learning the patterns the Kepler pipeline uses to classify objects — not discovering new physical information.

### Features used

Planet radius, equilibrium temperature, stellar flux, orbital period, semi-major axis, stellar effective temperature, stellar radius, stellar mass.

### Accuracy

**56.9% on held-out test data.** This is honest. The catalog labels themselves are inconsistent in some cases (e.g. some objects labeled CONFIRMED in the cumulative table but CANDIDATE in earlier releases). The class imbalance (many more candidates than confirmed planets) also limits accuracy.

### What it cannot do

It cannot predict habitability. It cannot identify previously unknown patterns. It cannot correct for mislabeled data. Its feature contributions (the SHAP-style explainability output) show which measured parameters drove the classification — they do not explain the planet's physical nature.

---

## 8. How the Four Models Compare

| Property | Candidate Score | Kopparapu HZ | HITE | ESI |
|----------|----------------|--------------|------|-----|
| Published paper | No | Yes | Yes | Yes |
| Accounts for eccentricity | No | No | Yes | No |
| Accounts for albedo | No | No | Yes | No |
| Requires rocky composition | No | No | Yes (p_rocky) | No |
| Accounts for stellar type | No | Yes | Yes | No |
| Needs transit depth | No | No | Yes | No |
| Speed | Instant | Fast | Slow (~50s for 6,725 planets) | Fast |
| Interpretability | Very high | High | Medium | High |
| Scientific rigor | Low-medium | High | High | Medium |

### How they interact

A planet can score differently on each model, and that is intentional. The models measure different things:

- A large planet in the Kopparapu HZ will score well on the candidate screening (temperature and flux are good) but score 0 on HITE (p_rocky = 0 for large planets). **HITE catches what the screening score misses.**

- A small planet outside the Kopparapu conservative HZ might score well on HITE if its orbit is eccentric enough that the orbit-averaged flux is still habitable. **HITE catches what Kopparapu misses.**

- Two planets with identical flux, temperature, and radius can have very different ESIs if one has a density consistent with rock and the other with water/ice. **ESI adds the density dimension.**

The rankings page sorts by the candidate screening score by default because it is fast and transparent. The HITE and Kopparapu badges then show whether the top-ranked planets also pass the more rigorous tests.

---

## 9. Application Architecture

```
cleankepler.csv (6,725 rows)
        │
        ▼
data_loader.py  — runs once at startup (~90 seconds total)
        │
        ├── Candidate screening score (instant, per planet)
        ├── Kopparapu HZ classification (fast, per planet)
        ├── ESI calculation (fast, per planet)
        ├── HITE batch calculation (~46 seconds, full dataset)
        └── ML model training + predictions (~40 seconds)
                    │
                    ▼ cached in memory (no recalculation per request)
                    │
        main.py (FastAPI, port 8001)
                    │
        ┌───────────┼────────────────────────────────────┐
        │           │                                    │
  /planets      /rankings                           /hite endpoints
  (all fields)  (sorted by                    /hite             → all 6,725
                candidate score)              /hite/stats       → distributions
                                              /hite/{name}      → one planet
                    │
                    ▼
        React frontend (Vite, port 3000)
                    │
        ┌───────────┼─────────────────┬──────────────┐
        │           │                 │              │
   /explore    /rankings        /visualizations  /methodology
   (card grid)  (ranked table)  (all charts +   (this document
                                 HITE section)   rendered as UI)
```

### Data flow for a planet card in Explorer

1. Frontend calls `GET /api/v1/planets`
2. FastAPI returns all 6,725 planets with all fields already computed
3. React renders ExplorerPage with filters
4. ExoplanetCard shows radius, temperature, flux, and — when HITE H > 0 — a purple HITE score strip

### Why calculations are only done once

The HITE computation takes ~46 seconds for 6,725 planets because it runs a 76×76 grid calculation per planet in pure Python. Running this on every API request would make the API unusable. The `data_loader.py` loader runs all models in a single pass at startup, stores everything in `loader.planets`, and all subsequent requests read from that in-memory cache. The backend startup log confirms: `HITE batch complete: 6725 calculated, 0 unmatched`.

---

## 10. Live Results from This Dataset

These are real numbers from the running backend at time of documentation.

### Candidate Screening Score (top 5)

| Planet | Radius (R⊕) | Temp (K) | Flux (S⊕) | Score | Priority |
|--------|------------|----------|----------|-------|----------|
| K00775.03 | 1.80 | 300 | 1.91 | 100.0 | High |
| K01422.05 | 1.08 | 244 | 0.84 | 100.0 | High |
| K01422.02 | 1.65 | 293 | 1.73 | 100.0 | High |
| K00172.02 | 1.74 | 286 | 1.59 | 100.0 | High |
| K02194.03 | 1.43 | 239 | 0.78 | 100.0 | High |

### Top HITE candidates

| Planet | HITE H | HITE H′ | p_rocky | Radius (R⊕) | SMA (AU) | Disposition |
|--------|--------|---------|---------|------------|---------|-------------|
| K03456.02 | 0.9882 | 0.9797 | 1.000 | 1.18 | 1.199 | CANDIDATE |
| K05840.01 | 0.9863 | 0.9804 | 1.000 | 1.39 | 1.206 | FALSE POSITIVE |
| K05147.01 | 0.9851 | 0.9893 | 1.000 | 1.31 | 1.213 | FALSE POSITIVE |
| K04579.01 | 0.9766 | 0.9864 | 1.000 | 1.08 | 0.993 | NOT DISPOSITIONED |
| K01422.05 | 0.9615 | 0.9585 | 1.000 | 1.08 | 0.149 | CONFIRMED |

Note: Several top HITE candidates are labeled FALSE POSITIVE by the Kepler pipeline. This is scientifically valid — HITE measures orbital/physical consistency with habitability from photometry alone; the false positive flag means the transit was likely caused by something other than a planet (e.g. a background binary). The two signals are independent measurements.

### Kopparapu HZ summary

- 285 in conservative HZ, 472 in optimistic HZ (of 6,725 total)
- For a solar-type star: inner flux boundary ~1.107 S⊕, outer ~0.356 S⊕

### HITE dataset summary

- 6,725 calculated (100% success rate)
- 520 with HITE H > 0 (7.7% of catalog)
- Average HITE H: 0.022 (pulled down by the ~6,200 hot or large planets scoring zero)
- Average data completeness: 100% (all required columns present for all planets)

---

## 11. What No Model Can Tell You

All four models share the same fundamental limitation: they use Kepler's transit photometry, which measures a dimming of starlight. From that one signal, we can derive the planet's size, orbital period, and approximate flux received. We cannot measure:

- **Atmospheric composition** — the dominant factor in habitability
- **Surface temperature** — depends on greenhouse gases, albedo, and circulation
- **Whether there is water** — the molecule that all four models are indirectly probing for
- **Whether the planet actually has a solid surface** — estimated, not measured
- **Orbital eccentricity** — bounded from below by HITE, but not measured directly
- **Planetary mass** — estimated from radius, not measured (except for a subset with radial velocity follow-up)
- **Magnetic field, tectonic activity, or stellar flares** — all relevant for habitability, all unknown

A planet that scores well on all four metrics — high candidate screening score, inside the Kopparapu conservative HZ, high HITE H, high ESI — is a planet worth pointing a larger telescope at. It is not a planet confirmed to be habitable, and it is certainly not evidence of life.

The correct interpretation of a high score on any of these models is: *"The measured properties are consistent with the conditions required for liquid water on the surface."* Nothing more.

---

## 12. References

**Barnes, R., Meadows, V. S., & Evans, N. (2015).** Comparative habitability of transiting exoplanets. *The Astrophysical Journal*, 814(2), 91.  
https://doi.org/10.1088/0004-637X/814/2/91  
*Used by:* HITE model — all equations.

**Kopparapu, R. K., Ramirez, R., Kasting, J. F., et al. (2013).** Habitable zones around main-sequence stars: new estimates. *The Astrophysical Journal*, 765(2), 131.  
https://doi.org/10.1088/0004-637X/765/2/131  
*Used by:* Kopparapu HZ — polynomial coefficients and physical basis.

**Kopparapu, R. K., Ramirez, R. M., SchottelKotte, J., et al. (2014).** Habitable zones around main-sequence stars: dependence on planetary mass. *The Astrophysical Journal Letters*, 787(2), L29.  
https://doi.org/10.1088/2041-8205/787/2/L29  
*Used by:* Kopparapu HZ — 1-Earth-mass model coefficients verified against Table 1.

**Pierrehumbert, R. T. (2010).** *Principles of Planetary Climate.* Cambridge University Press.  
https://doi.org/10.1017/CBO9780511780783  
*Used by:* HITE — F_min (67 W/m²) and F_max (runaway greenhouse analytical formula).

**Schulze-Makuch, D., Méndez, A., Fairén, A. G., et al. (2011).** A two-tiered approach to assessing the habitability of exoplanets. *Astrobiology*, 11(10), 1041–1052.  
https://doi.org/10.1089/ast.2010.0592  
*Used by:* ESI — formula, Earth reference values, and weight exponents from Table 1.

**Rogers, L. A. (2015).** Most 1.6 Earth-radius planets are not rocky. *The Astrophysical Journal*, 801(1), 41.  
https://doi.org/10.1088/0004-637X/801/1/41  
*Used by:* ESI composition classification; informs the 1.6 R⊕ rocky boundary in HITE's p_rocky function and the screening score's radius range.

**Zeng, L., Sasselov, D. D., & Jacobsen, S. B. (2016).** Mass-radius relation for rocky planets based on PREM. *The Astrophysical Journal*, 819(2), 127.  
https://doi.org/10.3847/0004-637X/819/2/127  
*Used by:* ESI composition classification thresholds.

**Fulton, B. J., Petigura, E. A., Howard, A. W., et al. (2017).** The California-Kepler survey. III. A gap in the radius distribution of small planets. *The Astronomical Journal*, 154(3), 109.  
https://doi.org/10.3847/1538-3881/aa80eb  
*Scientific context for:* The 1.5–1.6 R⊕ rocky/gaseous boundary used in HITE's p_rocky and the screening score's radius range.

**Breiman, L. (2001).** Random forests. *Machine Learning*, 45(1), 5–32.  
https://doi.org/10.1023/A:1010933404324  
*Used by:* ML disposition classifier.

**NASA Exoplanet Archive (2014).** Kepler KOI cumulative table, Q1–Q16 data release.  
https://exoplanetarchive.ipac.caltech.edu/  
*Source dataset:* `cleankepler.csv`, 6,725 objects.

**Mandel, K., & Agol, E. (2002).** Analytic light curves for planetary transit searches. *The Astrophysical Journal Letters*, 580(2), L171–L175.  
https://doi.org/10.1086/345520  
*Used by:* Transit model referenced in the Kepler pipeline that generated the input data.
