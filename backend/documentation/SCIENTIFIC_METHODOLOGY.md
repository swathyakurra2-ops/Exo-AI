# EXO-SCAN Scientific Methodology

> [!IMPORTANT]
> This document describes the scientific methods implemented in EXO-SCAN for habitability scoring and habitable-zone classification of Kepler exoplanet candidates. All equations are reproduced from peer-reviewed literature; attribution is given in the References section.

---

## 1. Project Objective

EXO-SCAN is an exoplanet intelligence platform that screens the NASA Kepler Object of Interest (KOI) catalogue for potentially habitable worlds. The system applies two independent, published scientific methodologies to every candidate:

1. **HITE** — Habitability Index for Transiting Exoplanets (Barnes, Meadows & Evans 2015): a probabilistic score in [0, 1] that quantifies how likely a transiting exoplanet is to be a rocky, habitable-zone world given photometric observables.
2. **Kopparapu HZ** — conservative and optimistic habitable-zone boundaries (Kopparapu et al. 2013, 2014): determines whether a planet's received stellar flux places it within the liquid-water habitable zone.

Results are then combined with a candidate-screening score and a supervised Random Forest classifier to produce a ranked list of high-priority targets.

---

## 2. HITE Methodology (Barnes, Meadows & Evans 2015)

### 2.1 Overview

HITE assigns a single number $H \in [0,1]$ (or $H' \in [0,1]$ when eccentricity data are unavailable) to each transiting exoplanet. The score represents the **fraction of albedo–eccentricity parameter space** in which the planet would maintain liquid surface water. A planet with $H = 1$ would be habitable for every physical combination of albedo and eccentricity; $H = 0$ means none.

> [!NOTE]
> HITE is a *prioritisation metric*, not a proof of habitability. It quantifies what fraction of plausible orbital and surface-albedo configurations are compatible with liquid water, given the measured transit parameters.

### 2.2 Physical Constants

| Symbol | Value | Units | Description |
|--------|-------|-------|-------------|
| $G$ | $6.67428 \times 10^{-11}$ | m³ kg⁻¹ s⁻² | Gravitational constant |
| $\sigma$ | $5.670373 \times 10^{-8}$ | W m⁻² K⁻⁴ | Stefan–Boltzmann constant |
| $M_\oplus$ | $5.9722 \times 10^{24}$ | kg | Earth mass |
| $R_\oplus$ | $6.371 \times 10^{6}$ | m | Earth radius |
| $R_\odot$ | $6.957 \times 10^{8}$ | m | Solar radius |
| $L_\odot$ | $3.828 \times 10^{26}$ | W | Solar luminosity |
| $T_\odot$ | 5778 | K | Solar effective temperature |
| $M_\odot$ | $1.989 \times 10^{30}$ | kg | Solar mass |
| AU | $1.496 \times 10^{11}$ | m | Astronomical unit |

### 2.3 Step A — Stellar Luminosity

Stellar luminosity in solar units is derived from the Stefan–Boltzmann law applied to the host star's measured radius $R_\star$ and effective temperature $T_\star$:

$$
\frac{L_\star}{L_\odot} = \left(\frac{R_\star}{R_\odot}\right)^2 \left(\frac{T_\star}{T_\odot}\right)^4
$$

where $T_\odot = 5778\,\text{K}$. Returns NaN for non-positive or non-finite inputs.

### 2.4 Step B — Planetary Radius from Transit Depth

The planet-to-star radius ratio is recovered from the fractional transit depth $\delta$ (in ppm):

$$
\frac{R_p}{R_\star} = \sqrt{\frac{\delta}{10^6}}
$$

The planetary radius in Earth units is:

$$
R_p\,[\text{R}_\oplus] = \frac{R_p}{R_\star} \cdot \frac{R_\star\,[\text{R}_\odot] \cdot R_\odot}{R_\oplus}
$$

### 2.5 Step C — Planet Mass from Radius (Barnes et al. 2015)

A broken power-law relates planetary radius to mass:

$$
M_p\,[\text{M}_\oplus] =
\begin{cases}
R_p^{3.268} & \text{if } R_p \leq 1\,R_\oplus \\
R_p^{3.65}  & \text{if } R_p > 1\,R_\oplus
\end{cases}
$$

### 2.6 Step D — Rocky Probability

Based on the radius valley between rocky and gaseous planets, a piecewise linear function assigns the probability that a planet is rocky:

$$
p_\text{rocky}(R_p) =
\begin{cases}
1.0 & R_p \leq 1.5\,R_\oplus \\
\dfrac{2.5 - R_p}{2.5 - 1.5} & 1.5 < R_p < 2.5\,R_\oplus \\
0.0 & R_p \geq 2.5\,R_\oplus
\end{cases}
$$

### 2.7 Step E — Eccentricity Minimum from Transit Duration

For planets with a measured impact parameter $b$ and transit duration $\tau_\text{obs}$, the expected circular transit duration is:

$$
\tau_\text{circ} = \frac{P}{\pi} \arcsin\!\left(\frac{\sqrt{(R_\star + R_p)^2 - (b\,R_\star)^2}}{a}\right)
$$

The eccentricity minimum is then:

$$
e_\min = \left|1 - \frac{\tau_\text{obs}}{\tau_\text{circ}}\right|
$$

This quantity provides a *lower bound* on the orbital eccentricity, not a measurement.

### 2.8 Step F — Eccentricity Probability Distribution

Barnes et al. (2015) fit an empirical polynomial to the observed eccentricity distribution of small exoplanets (eq. 2 of that paper):

$$
p(e) = 0.1619 - 0.5352\,e + 0.6358\,e^2 - 0.2557\,e^3
$$

Valid over $e \in [0, 0.80]$; values outside this range are clamped to zero.

### 2.9 Step G — Maximum Habitable Flux (Pierrehumbert 2010)

The runaway greenhouse threshold sets the maximum stellar flux a planet can receive while maintaining liquid water. Following Pierrehumbert (2010):

$$
F_\text{max} = \sigma \left( \frac{g}{\kappa} \cdot \frac{R_\text{water}}{L_\text{water}} \cdot \frac{1}{2\pi} \right)^{\!1/4}
\cdot \left(\frac{L_\text{water}/R_\text{water}}{T_\text{ref}}\right)
$$

where:
- $\kappa = 0.055\,\text{m}^2\,\text{kg}^{-1}$ (grey absorption coefficient)
- $L_\text{water}/R_\text{water} = 5420\,\text{K}$
- $g$ = surface gravity of the planet (m s⁻²)

Surface gravity is derived from mass and radius:

$$
g = \frac{G\,M_p}{R_p^2}
$$

### 2.10 Step H — HITE Score Computation (Albedo–Eccentricity Grid)

A two-dimensional grid is evaluated over:
- Bond albedo $A \in [0.05, 0.80]$, step 0.01
- Eccentricity $e \in [e_\min, 0.80]$, step 0.01

For each $(A, e)$ pair, the **orbit-averaged stellar flux** absorbed by the planet is:

$$
S_\text{eff}(A, e) = \frac{L_\star\,[\text{L}_\odot]}{4\pi\,a^2\,(1-e^2)^{1/2}} \cdot (1 - A)
$$

(Note: the time-averaged flux over an eccentric orbit depends on $a$ and $e$ through the factor $(1-e^2)^{1/2}$.)

The emitted thermal flux per unit area is the equilibrium condition:

$$
F_\text{emit}(A, e) = S_\text{eff}(A, e)
$$

A grid cell $(A, e)$ is classified as **habitable** if:

$$
F_\text{min} \leq F_\text{emit}(A, e) \leq F_\text{max}
$$

where $F_\text{min} = 67\,\text{W m}^{-2}$ (the minimum flux to maintain liquid water; Barnes et al. 2015 following Pierrehumbert 2010).

### 2.11 HITE Score H (with eccentricity data)

$$
H = \frac{\displaystyle\int_{e_\min}^{0.80} \int_{A_\min}^{A_\max} \mathbb{1}[F_\text{habitable}]\,p(e)\,dA\,de}
          {\displaystyle\int_{0}^{0.80} \int_{0.05}^{0.80} p(e)\,dA\,de}
$$

The probability-weighted habitable fraction is then multiplied by $p_\text{rocky}$:

$$
H_\text{final} = \text{clip}\!\left(H \times p_\text{rocky},\; 0,\; 1\right)
$$

### 2.12 HITE Score H′ (without eccentricity data)

When the impact parameter is unavailable, $e_\min = 0$ is assumed and no eccentricity weighting is applied:

$$
H' = \frac{\text{number of habitable }(A,e)\text{ cells}}{\text{total grid cells}}
$$

Multiplied by $p_\text{rocky}$ as above.

---

## 3. Kopparapu Habitable-Zone Methodology (Kopparapu et al. 2013/2014)

### 3.1 Overview

Kopparapu et al. (2013, 2014) provide polynomial fits to climate-model results for the inner (runaway greenhouse) and outer (maximum greenhouse) boundaries of the liquid-water habitable zone as a function of stellar effective temperature.

### 3.2 Flux Boundary Equation

For a star with effective temperature $T_\star$, the effective stellar flux at each HZ boundary is:

$$
S_\text{eff}(T_\star) = S_0 + a\,T_\star' + b\,T_\star'^2 + c\,T_\star'^3 + d\,T_\star'^4
$$

where $T_\star' = T_\star - 5780\,\text{K}$ (offset from solar temperature).

**Valid temperature range:** $2600\,\text{K} \leq T_\star \leq 7200\,\text{K}$. Outside this range the function returns NaN.

### 3.3 Kopparapu Coefficients (one-Earth-mass model)

| Boundary | $S_0$ | $a$ | $b$ | $c$ | $d$ |
|----------|--------|-----|-----|-----|-----|
| Inner (runaway greenhouse) | 1.107 | $1.332\times10^{-4}$ | $1.580\times10^{-8}$ | $-8.308\times10^{-12}$ | $-1.931\times10^{-15}$ |
| Outer (maximum greenhouse) | 0.356 | $6.171\times10^{-5}$ | $1.698\times10^{-9}$ | $-3.198\times10^{-12}$ | $-5.575\times10^{-16}$ |

### 3.4 HZ Distances in Astronomical Units

Using the stellar luminosity $L_\star$ (in solar units):

$$
d_\text{inner}\,[\text{AU}] = \sqrt{\frac{L_\star}{S_\text{eff,inner}}}
\qquad
d_\text{outer}\,[\text{AU}] = \sqrt{\frac{L_\star}{S_\text{eff,outer}}}
$$

### 3.5 Optimistic HZ Boundaries

The optimistic (extended) HZ uses the "recent Venus" and "early Mars" climate limits:

| Boundary | $S_0$ | $a$ | $b$ | $c$ | $d$ |
|----------|--------|-----|-----|-----|-----|
| Inner optimistic (recent Venus) | 1.776 | $2.136\times10^{-4}$ | $2.533\times10^{-8}$ | $-1.332\times10^{-11}$ | $-3.097\times10^{-15}$ |
| Outer optimistic (early Mars) | 0.320 | $5.547\times10^{-5}$ | $1.526\times10^{-9}$ | $-2.874\times10^{-12}$ | $-5.011\times10^{-16}$ |

### 3.6 Classification Labels

| Label | Condition |
|-------|-----------|
| `Within conservative habitable zone` | $S_\text{eff,outer} \leq S_\text{eff,planet} \leq S_\text{eff,inner}$ |
| `Inside inner boundary` | $S_\text{eff,planet} > S_\text{eff,inner}$ |
| `Beyond outer boundary` | $S_\text{eff,planet} < S_\text{eff,outer}$ |
| `Outside model temperature range` | $T_\star < 2600\,\text{K}$ or $T_\star > 7200\,\text{K}$ |
| `Invalid data` | NaN or negative flux/temperature |

---

## 4. Random Forest Pipeline

### 4.1 Feature Engineering (featureEngineer.py)

Prior to model training, the following derived features are created from the raw Kepler dataset:

| Feature | Formula | Purpose |
|---------|---------|---------|
| `radius_flag` | 1 if $0.5 \leq R_p \leq 1.5\,R_\oplus$ else 0 | Binary habitability indicator |
| `temp_flag` | 1 if $200\,\text{K} \leq T_\text{eq} \leq 320\,\text{K}$ else 0 | Binary habitability indicator |
| `pos_diff_mdec` | $|\texttt{koi\_dicco\_mdec} - \texttt{koi\_dikco\_mdec}|$ | Centroid stability |
| `pos_diff_msky` | $|\texttt{koi\_dicco\_msky} - \texttt{koi\_dikco\_msky}|$ | Centroid stability |
| `total_pos_diff` | `pos_diff_mdec + pos_diff_msky` | Combined positional discrepancy |
| `pos_flag` | 1 if `total_pos_diff < 0.1` else 0 | Low positional contamination |
| `habitability_score` | `radius_flag + temp_flag + pos_flag` | Integer score 0–3 |
| `vet_year` | Year extracted from `koi_vet_date` | Temporal feature |

Categorical columns (`koi_disposition`, `koi_vet_stat`, `koi_pdisposition`, `koi_fpflag_nt`, `koi_fpflag_ss`, `koi_fpflag_co`) are one-hot encoded.

### 4.2 Model Training

The classifier uses `sklearn.ensemble.RandomForestClassifier` on the feature-engineered dataset (`data.csv`). Target label: `koi_disposition` (CONFIRMED / CANDIDATE / FALSE POSITIVE). A stratified train/test split is applied. Model performance is evaluated using `classification_report` and `confusion_matrix`.

### 4.3 Candidate Screening Score (data_loader.py / app.py)

An independent piecewise scoring function assigns a score 0–100 to each planet based on three features:

| Feature | Weight | Ideal Range | Outer Range |
|---------|--------|-------------|-------------|
| Planetary radius ($R_\oplus$) | 40% | [0.8, 1.8] | [0.3, 2.5] |
| Equilibrium temperature (K) | 30% | [220, 320] | [180, 400] |
| Stellar insolation ($S_\oplus$) | 30% | [0.25, 2.0] | [0.1, 4.0] |

Score thresholds: ≤40 → Low priority; ≤70 → Medium; >70 → High.

---

## 5. Dataset Description

### 5.1 Source

**File:** `cleankepler.csv`  
**Rows:** 6,725 Kepler Object of Interest (KOI) records  
**Origin:** NASA Exoplanet Archive, Kepler KOI cumulative table (Q1–Q16 data release)  
**Pre-processing:** Duplicate removal, column standardisation, numeric coercion applied upstream.

### 5.2 Key Columns Used in Analysis

| Column | Type | Units | Description |
|--------|------|-------|-------------|
| `kepoi_name` | String | — | Unique KOI identifier (e.g. K00001.01) |
| `kepid` | Integer | — | Kepler Input Catalog star ID |
| `koi_disposition` | Categorical | — | CONFIRMED / CANDIDATE / FALSE POSITIVE |
| `koi_period` | Float | days | Orbital period |
| `koi_duration` | Float | hours | Transit duration |
| `koi_depth` | Float | ppm | Transit depth |
| `koi_impact` | Float | — | Impact parameter $b$ |
| `koi_prad` | Float | $R_\oplus$ | Planetary radius (Kepler pipeline) |
| `koi_teq` | Float | K | Equilibrium temperature |
| `koi_insol` | Float | $S_\oplus$ | Stellar insolation |
| `koi_srad` | Float | $R_\odot$ | Stellar radius |
| `koi_steff` | Float | K | Stellar effective temperature |
| `koi_slogg` | Float | log(cm/s²) | Stellar surface gravity |
| `koi_smass` | Float | $M_\odot$ | Stellar mass |
| `koi_sma` | Float | AU | Semi-major axis |

---

## 6. Feature Mapping Table

| Scientific Parameter | Source Column(s) | Model | Notes |
|---------------------|-----------------|-------|-------|
| Stellar luminosity | `koi_srad`, `koi_steff` | HITE, Kopparapu | Derived via Stefan–Boltzmann |
| Planet radius | `koi_depth`, `koi_srad` | HITE | From transit depth |
| Planet mass | Derived from $R_p$ | HITE | Broken power-law |
| Rocky probability | Derived from $R_p$ | HITE | Piecewise linear |
| $e_\min$ | `koi_impact`, `koi_duration`, `koi_period`, `koi_sma` | HITE | From transit anomaly |
| Semi-major axis | `koi_sma` (or Kepler 3rd law) | HITE | AU |
| HZ inner flux | `koi_steff` | Kopparapu | Polynomial model |
| HZ outer flux | `koi_steff` | Kopparapu | Polynomial model |
| HZ inner AU | `koi_steff`, stellar luminosity | Kopparapu | Derived from flux |
| HZ outer AU | `koi_steff`, stellar luminosity | Kopparapu | Derived from flux |
| Insolation | `koi_insol` | Kopparapu | Classification only |
| Candidate score | `koi_prad`, `koi_teq`, `koi_insol` | Screening | Weighted piecewise score |
| Disposition | `koi_disposition` | ML | Target variable |

---

## 7. Missing Data Handling Rules

| Condition | Treatment | Effect |
|-----------|-----------|--------|
| `koi_srad` or `koi_steff` missing | `status = missing_stellar_parameters` | HITE score = NaN |
| `koi_depth` ≤ 0 or missing | `status = missing_transit_depth` | Planet radius = NaN, HITE = NaN |
| `koi_sma` missing | Fallback: Kepler's 3rd law using `koi_period` and `koi_smass` | If also missing: `status = missing_orbital_distance` |
| `koi_impact` missing | $e_\min = 0$ assumed, H′ used instead of H | Less precise eccentricity constraint |
| `koi_steff` outside [2600, 7200] K | Kopparapu returns NaN | HZ classification = "Outside model temperature range" |
| `koi_insol` missing or negative | Kopparapu returns "Invalid data" | No HZ classification |
| Any of `koi_prad`, `koi_teq`, `koi_insol` missing | Candidate score = None | Priority = None |

---

## 8. Scientific Assumptions and Limitations

1. **Albedo range:** The HITE grid assumes bond albedo $A \in [0.05, 0.80]$. Albedos outside this range (e.g. ice-covered worlds) are excluded.
2. **Eccentricity range:** The eccentricity distribution polynomial is valid for $e \in [0, 0.80]$.
3. **Mass–radius relation:** The broken power-law of Barnes et al. is calibrated on known exoplanets and carries significant scatter for individual objects.
4. **One-Earth-mass model:** The Kopparapu HZ boundaries are calibrated for planets with Earth's mass; adjustments for significantly different masses are not applied here.
5. **Circular orbit assumption in Kopparapu:** The HZ distance calculation assumes circular orbits; eccentric orbits may shift the effective HZ.
6. **No atmospheric modelling:** Neither HITE nor Kopparapu classifications account for actual atmospheric composition, which is the dominant factor in habitability.
7. **Photometric data only:** EXO-SCAN uses Kepler transit photometry. Radial velocity masses, transmission spectra, or ground-based follow-up are not incorporated.
8. **Kepler pipeline values:** `koi_prad`, `koi_teq`, and `koi_insol` are taken directly from the Kepler pipeline. EXO-SCAN recomputes radius and mass from first principles (`koi_depth`, `koi_srad`) for the HITE calculation.

---

## 9. References

Barnes, R., Meadows, V. S., & Evans, N. (2015). Comparative habitability of transiting exoplanets. *The Astrophysical Journal*, **814**(2), 91. https://doi.org/10.1088/0004-637X/814/2/91

Kopparapu, R. K., Ramirez, R., Kasting, J. F., et al. (2013). Habitable zones around main-sequence stars: new estimates. *The Astrophysical Journal*, **765**(2), 131. https://doi.org/10.1088/0004-637X/765/2/131

Kopparapu, R. K., Ramirez, R. M., SchottelKotte, J., et al. (2014). Habitable zones around main-sequence stars: dependence on planetary mass. *The Astrophysical Journal Letters*, **787**(2), L29. https://doi.org/10.1088/2041-8205/787/2/L29

Pierrehumbert, R. T. (2010). *Principles of Planetary Climate*. Cambridge University Press. https://doi.org/10.1017/CBO9780511780783

Mandel, K., & Agol, E. (2002). Analytic light curves for planetary transit searches. *The Astrophysical Journal Letters*, **580**(2), L171–L175. https://doi.org/10.1086/345520

NASA Exoplanet Archive. (2014). Kepler KOI cumulative table, Q1–Q16 data release. https://exoplanetarchive.ipac.caltech.edu/
