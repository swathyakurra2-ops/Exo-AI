# EXO-SCAN Ranking Methodology

> [!IMPORTANT]
> **Disclaimer:** The integrated ranking system described in this document is a project-specific design created for EXO-SCAN. It is **not a published scientific model**. While it is built upon published methodologies (Barnes et al. 2015; Kopparapu et al. 2013/2014), the grouping criteria, tier definitions, and integrated ranking logic are engineering decisions made for this application and have not been peer-reviewed or validated against external datasets.

---

## Overview

EXO-SCAN applies three complementary ranking systems to each Kepler planet candidate:

| Ranking | Input | Output Column |
|---------|-------|---------------|
| HITE-Based Ranking | HITE H or H′ score | `HITE_Rank` |
| Kopparapu-Based Ranking | HZ classification + insolation | `HZ_Rank` |
| Integrated Ranking | HITE + HZ + Screening | `Integrated_Rank`, `Integrated_Group` |

---

## 1. HITE-Based Ranking

### 1.1 Description

The HITE-based ranking orders all planets by their **habitability index score**, from most to least likely to be a habitable, rocky world.

### 1.2 Sort Key

Planets are sorted in **descending** order of their HITE score. The priority is:

1. Planets with a valid **H** score (full eccentricity constraint available)
2. Planets with a valid **H′** score (eccentricity assumed zero)
3. Planets with `status = insufficient_data` (excluded from numeric ranking)

Where both H and H′ are available for a planet, **H takes precedence** because it incorporates the eccentricity probability weighting $p(e)$ and the measured $e_\min$ constraint, making it the more conservative and scientifically rigorous estimate.

### 1.3 H vs H′ — Key Distinction

| Score | When Used | Eccentricity Treatment |
|-------|-----------|----------------------|
| **H** | Impact parameter `koi_impact` is available | Full $p(e)$ weighting; orbit integrated from $e_\min$ to 0.80 |
| **H′** | Impact parameter missing | $e_\min = 0$ assumed; uniform albedo–eccentricity grid fraction |

Because H is probability-weighted by the empirical eccentricity distribution and uses a data-constrained $e_\min$, it is the preferred score. H′ is used as a fallback when eccentricity data are absent, and is clearly flagged in the output via the `calc_type` column (`'H'` vs `'H_prime'`).

### 1.4 Handling of Insufficient Data

Planets for which HITE cannot be computed (missing stellar parameters, invalid transit depth, missing orbital distance) receive:

- `HITE_H = NaN`
- `HITE_H_prime = NaN`
- `calc_type = 'insufficient_data'`
- `HITE_Rank = NaN` (excluded from ranking)
- `Ranking_Status = 'Insufficient data'`

These planets appear at the bottom of sorted tables, after all ranked entries.

### 1.5 HITE Score Interpretation

| H / H′ Range | Interpretation |
|-------------|----------------|
| 0.8 – 1.0 | Strong candidate: most albedo–eccentricity configurations are habitable |
| 0.5 – 0.8 | Moderate candidate: majority of parameter space habitable |
| 0.2 – 0.5 | Weak candidate: minority of parameter space habitable |
| 0.0 – 0.2 | Poor candidate: very few configurations habitable |
| 0.0 | No habitable configuration found |
| NaN | Insufficient data for computation |

---

## 2. Kopparapu-Based Ranking

### 2.1 Description

The Kopparapu-based ranking orders planets according to their position relative to the conservative and optimistic habitable zones, as classified by the Kopparapu et al. (2013/2014) polynomial model.

### 2.2 Four Priority Tiers

Planets are sorted into four tiers in the following priority order:

| Tier | Priority | Criterion | Description |
|------|----------|-----------|-------------|
| **Tier 1** | Highest | `Within conservative habitable zone` | Planet's insolation falls between the runaway-greenhouse and maximum-greenhouse flux limits |
| **Tier 2** | High | Within optimistic HZ but outside conservative HZ | Insolation within the "recent Venus" / "early Mars" extended boundaries |
| **Tier 3** | Low | `Inside inner boundary` or `Beyond outer boundary` | Planet is too hot or too cold for liquid water under any modelled scenario |
| **Tier 4** | None | `Outside model temperature range` or `Invalid data` | Host star temperature outside 2600–7200 K, or data missing |

### 2.3 Secondary Sort — Geometric Distance to HZ Centre

Within each tier, planets are sorted by how close their semi-major axis is to the **centre of the conservative habitable zone** (the geometric mean of the inner and outer HZ distances):

$$
d_\text{centre} = \sqrt{d_\text{inner} \cdot d_\text{outer}}
$$

The planet with semi-major axis `koi_sma` closest to $d_\text{centre}$ is ranked highest within its tier.

### 2.4 HZ Classification Labels

These labels are produced by `kopparapu_hz.classify_habitable_zone()`:

| Label | Meaning |
|-------|---------|
| `Within conservative habitable zone` | Conservative HZ — Tier 1 |
| `Inside inner boundary` | Too hot — Tier 3 |
| `Beyond outer boundary` | Too cold — Tier 3 |
| `Outside model temperature range` | Host star $T_\star < 2600\,\text{K}$ or $T_\star > 7200\,\text{K}$ — Tier 4 |
| `Invalid data` | NaN temperature or insolation — Tier 4 |

### 2.5 Flux Reference Values (Solar Twin, $T_\star = 5780\,\text{K}$)

For reference, the Kopparapu boundaries for a Sun-like star are:

| Boundary | Flux ($S_\oplus$) | Distance (AU) for $L = 1\,L_\odot$ |
|----------|-------------------|--------------------------------------|
| Inner conservative | ≈ 1.107 | ≈ 0.950 AU |
| Outer conservative | ≈ 0.356 | ≈ 1.676 AU |
| Inner optimistic | ≈ 1.776 | ≈ 0.750 AU |
| Outer optimistic | ≈ 0.320 | ≈ 1.768 AU |

---

## 3. Integrated Ranking

### 3.1 Description

The integrated ranking combines information from both the HITE and Kopparapu analyses, plus the candidate screening score, to produce a single ranked list suitable for mission planning and target prioritisation.

> [!WARNING]
> This ranking is **project-specific**. The group definitions (A–F) and their exact criteria are engineering choices, not derived from a published habitability model. Users should treat them as a convenience tool for exploration, not as a scientific verdict.

### 3.2 Groups A–F

Planets are assigned to one of six mutually exclusive groups. Group A is the highest priority; Group F is the lowest.

---

#### **Group A — Conservative HZ + High HITE**
*"Best candidates"*

**Criteria (all must be met):**
- `HZ_Classification = 'Within conservative habitable zone'`
- `HITE_H ≥ 0.5` (or `HITE_H_prime ≥ 0.5` if H is unavailable)

**Interpretation:** The planet receives a flux consistent with liquid water under the Kopparapu conservative scenario, *and* more than half of its albedo–eccentricity parameter space is habitable according to HITE. These are the most self-consistent habitability candidates in the dataset.

**Sort within group:** Descending HITE score; ties broken by proximity to HZ centre.

---

#### **Group B — Conservative HZ + Low HITE**
*"HZ planets with uncertain habitability"*

**Criteria (all must be met):**
- `HZ_Classification = 'Within conservative habitable zone'`
- `HITE_H < 0.5` (or `HITE_H_prime < 0.5`)

**Interpretation:** Kopparapu places the planet in the habitable zone, but HITE indicates that only a minority of orbital/albedo configurations are compatible with habitability. This may reflect a large planet radius (low $p_\text{rocky}$), unusual stellar properties, or large eccentricity constraints.

**Sort within group:** Descending HITE score; ties broken by insolation proximity to HZ centre flux.

---

#### **Group C — Conservative HZ, No HITE Score**
*"HZ planets with missing transit data"*

**Criteria (all must be met):**
- `HZ_Classification = 'Within conservative habitable zone'`
- HITE score unavailable (`HITE_H = NaN` and `HITE_H_prime = NaN`)

**Interpretation:** The Kopparapu analysis places the planet in the conservative HZ, but the transit data required for HITE are incomplete. These planets may warrant follow-up observations to obtain the missing parameters.

**Sort within group:** Descending candidate screening score; ties broken by disposition (CONFIRMED > CANDIDATE).

---

#### **Group D — Optimistic HZ Only (not conservative)**
*"Marginal HZ candidates"*

**Criteria (all must be met):**
- `HZ_Classification ≠ 'Within conservative habitable zone'`
- Planet falls within the **optimistic** HZ (insolation between optimistic inner and outer flux limits)

**Interpretation:** The planet is too close to or too far from its star to be in the conservative HZ, but falls within the extended optimistic limits ("recent Venus" / "early Mars" analogues). Habitability is less likely but not ruled out.

**Sort within group:** Descending HITE score (if available); ties broken by distance to optimistic HZ centre.

---

#### **Group E — Outside All HZ Boundaries, High HITE**
*"Eccentric or misclassified candidates"*

**Criteria (all must be met):**
- Planet is outside both conservative and optimistic HZ
- `HITE_H ≥ 0.3` (or `HITE_H_prime ≥ 0.3`)

**Interpretation:** The Kopparapu classification (based on time-averaged insolation) suggests the planet is outside the HZ, but HITE assigns a non-negligible habitability probability. This can occur for highly eccentric orbits where the orbit-averaged flux is more favourable than the instantaneous insolation measured by Kepler, or where the HZ model is at the edge of its valid range.

**Sort within group:** Descending HITE score.

---

#### **Group F — All Remaining**
*"Low-priority or insufficient data"*

**Criteria:**
- Not assigned to Groups A–E

**Includes:**
- Planets outside the HZ with HITE < 0.3
- Planets with no HITE score and no HZ classification
- Planets whose host star temperature is outside the Kopparapu model range
- False positives (if included in the dataset)

**Sort within group:** Descending candidate screening score; unscored planets at the bottom.

---

### 3.3 Integrated Ranking Summary Table

| Group | HZ Status | HITE Threshold | Priority |
|-------|-----------|---------------|----------|
| A | Conservative HZ | ≥ 0.5 | ★★★★★ |
| B | Conservative HZ | < 0.5 | ★★★★☆ |
| C | Conservative HZ | No score | ★★★☆☆ |
| D | Optimistic HZ only | Any / none | ★★☆☆☆ |
| E | Outside HZ | ≥ 0.3 | ★★☆☆☆ |
| F | Any / none | < 0.3 / none | ★☆☆☆☆ |

---

## 4. Important Disclaimers

1. **Not a published model.** The integrated Groups A–F ranking is an EXO-SCAN project-specific design. No peer-reviewed paper defines or validates these exact groupings.

2. **HITE is a prioritisation metric, not proof of habitability.** A high HITE score means a large fraction of albedo–eccentricity parameter space is physically compatible with liquid water — it does not account for actual atmospheric composition, geology, or biological viability.

3. **Kopparapu boundaries are climate-model estimates.** The HZ limits are derived from 1D radiative-convective models for an Earth-mass, Earth-composition planet. They do not account for clouds, atmospheric dynamics, or interior heating.

4. **Kepler photometry limitations.** All inputs are derived from transit photometry. Planetary masses, atmospheric properties, and true orbital eccentricities are generally not measured.

5. **False positives are possible.** Despite Kepler pipeline vetting, some CANDIDATE and even CONFIRMED planets may be false positives (e.g. eclipsing binaries, background stars). Disposition should always be checked.
