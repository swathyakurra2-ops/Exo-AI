/**
 * HitePlanetProfile
 * Full HITE breakdown for a single selected planet.
 * Displays every intermediate value with a plain-English explanation.
 * Barnes, Meadows & Evans (2015), ApJ 814, 91.
 */

import React from 'react';
import type { Exoplanet } from '../../types/exoplanet';
import { Compass } from 'lucide-react';

interface HitePlanetProfileProps {
  planet: Exoplanet | null;
}

const fmt = (v: number | null | undefined, digits = 4, unit = '') =>
  v === null || v === undefined ? 'N/A' : `${v.toFixed(digits)}${unit ? ' ' + unit : ''}`;

const fmtPct = (v: number | null | undefined) =>
  v === null || v === undefined ? 'N/A' : `${v.toFixed(1)}%`;

// A labelled metric row with explanation
interface MetricRowProps {
  label: string;
  value: string;
  explanation: string;
  accent?: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, explanation, accent = 'text-[#e8eaed]' }) => (
  <div className="border-b border-white/[0.05] py-3 last:border-0">
    <div className="flex items-start justify-between gap-4">
      <span className="font-mono text-[9px] uppercase tracking-wider text-[#788898] shrink-0 w-44">{label}</span>
      <span className={`font-mono text-sm font-semibold ${accent} text-right`}>{value}</span>
    </div>
    <p className="mt-1 font-mono text-[8px] leading-relaxed text-[#616e7c]">{explanation}</p>
  </div>
);

// A compact bar gauge (0–1 scale)
interface GaugeProps {
  value: number | null | undefined;
  color: string;
  label: string;
}

const Gauge: React.FC<GaugeProps> = ({ value, color, label }) => {
  const pct = value !== null && value !== undefined ? Math.min(100, value * 100) : 0;
  return (
    <div>
      <div className="flex justify-between font-mono text-[8px] mb-1">
        <span className="text-[#788898]">{label}</span>
        <span className="text-[#e8eaed]">{value !== null && value !== undefined ? value.toFixed(5) : 'N/A'}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-[#0d141e] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export const HitePlanetProfile: React.FC<HitePlanetProfileProps> = ({ planet }) => {
  if (!planet) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center rounded-md border border-[#27323e]/80 bg-[#070b11]/85 p-5">
        <Compass className="h-8 w-8 text-[#64748b] mb-3 animate-spin" style={{ animationDuration: '8s' }} />
        <h4 className="font-['Cinzel',sans-serif] text-sm text-[#e8eaed]">NO TARGET SELECTED</h4>
        <p className="mt-1 font-mono text-[9px] text-[#71808e] max-w-sm">
          Select a planet from the scatter plot or top-candidates list to view its full HITE profile.
        </p>
      </div>
    );
  }

  const hasHite = planet.hiteStatus === 'calculated';
  const statusColor =
    planet.hiteStatus === 'calculated' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
    planet.hiteStatus === 'missing_stellar_parameters' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
    'text-[#788898] border-white/10 bg-white/5';

  return (
    <div className="rounded-md border border-[#27323e]/80 bg-[#070b11]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">

      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div>
          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#dfb15b]">HITE PROFILE</span>
          <h3 className="font-['Cinzel',sans-serif] text-sm text-[#e8eaed]">{planet.name}</h3>
          <p className="font-mono text-[9px] text-[#788898]">Host: {planet.hostStar}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider ${statusColor}`}>
            {planet.hiteStatus ?? 'pending'}
          </span>
          <span className="font-mono text-[9px] text-[#788898]">
            completeness: {fmtPct(planet.hiteDataCompleteness)}
          </span>
        </div>
      </div>

      {/* Final HITE scores — the headline numbers */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded border border-[#38bdf8]/20 bg-[#060c14] p-4">
          <p className="font-mono text-[8px] uppercase tracking-widest text-[#38bdf8] mb-1">HITE H</p>
          <p className="font-mono text-3xl font-light text-[#e8eaed]">
            {hasHite && planet.hiteScore != null ? planet.hiteScore.toFixed(5) : 'N/A'}
          </p>
          <p className="mt-1 font-mono text-[8px] text-[#616e7c] leading-relaxed">
            Eccentricity-constrained score. Uses the minimum eccentricity derived from
            the transit-duration anomaly (e_min = {fmt(planet.hiteEMin, 4)}). The fraction
            of (albedo, eccentricity) space consistent with habitability, weighted by
            rocky-planet probability.
          </p>
        </div>
        <div className="rounded border border-[#dfb15b]/20 bg-[#060c14] p-4">
          <p className="font-mono text-[8px] uppercase tracking-widest text-[#dfb15b] mb-1">HITE H′</p>
          <p className="font-mono text-3xl font-light text-[#e8eaed]">
            {hasHite && planet.hiteScorePrime != null ? planet.hiteScorePrime.toFixed(5) : 'N/A'}
          </p>
          <p className="mt-1 font-mono text-[8px] text-[#616e7c] leading-relaxed">
            Unconstrained score. e_min is set to 0 — the full eccentricity range [0, 0.8]
            is integrated. H′ ≥ H always. Use H when transit-duration data is reliable;
            H′ when only orbital period and stellar parameters are available.
          </p>
        </div>
      </div>

      {/* Score gauges */}
      {hasHite && (
        <div className="mb-5 space-y-3">
          <Gauge value={planet.hiteScore} color="#38bdf8" label="HITE H" />
          <Gauge value={planet.hiteScorePrime} color="#dfb15b" label="HITE H′" />
          <Gauge value={planet.hiteRockyProbability} color="#10b981" label="Rocky probability" />
        </div>
      )}

      {/* Intermediate values table */}
      <div>
        <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#788898] mb-3">
          INPUT PARAMETERS &amp; DERIVED QUANTITIES
        </p>
        <div>
          <MetricRow
            label="Rocky probability"
            value={fmt(planet.hiteRockyProbability, 4)}
            explanation="p_rocky: 1 for Rp ≤ 1.5 R⊕; linearly decreasing from 1 to 0 for 1.5 < Rp < 2.5 R⊕; 0 for Rp ≥ 2.5 R⊕. Barnes et al. (2015) empirical approximation. Multiplies the grid-integrated H to give the final HITE score."
            accent="text-emerald-400"
          />
          <MetricRow
            label="Planetary radius"
            value={fmt(planet.radiusEarth, 3, 'R⊕')}
            explanation="Derived from the transit depth and stellar radius: Rp/R★ = √(depth_ppm / 1,000,000). Used to compute planet mass, rocky probability, and F_max."
          />
          <MetricRow
            label="Estimated mass"
            value={fmt(planet.massEarth, 3, 'M⊕')}
            explanation="Estimated via the Barnes et al. (2015) mass–radius power law: Mp = Rp^3.268 for Rp ≤ 1 R⊕; Mp = Rp^3.65 for Rp > 1 R⊕. Used to compute surface gravity and F_max."
          />
          <MetricRow
            label="Stellar luminosity"
            value={fmt(planet.stellarLuminositySolar, 4, 'L☉')}
            explanation="L/L☉ = (R★/R☉)² × (T★/5778)⁴. Drives the stellar flux received by the planet at any semi-major axis and eccentricity during the grid sweep."
          />
          <MetricRow
            label="Semi-major axis"
            value={fmt(planet.semiMajorAxisAU, 4, 'AU')}
            explanation="Orbital semi-major axis from the Kepler catalog (koi_sma). If absent, estimated from Kepler's third law using orbital period and stellar mass. Central parameter in the flux calculation."
          />
          <MetricRow
            label="Min eccentricity (e_min)"
            value={fmt(planet.hiteEMin, 5)}
            explanation="Minimum orbital eccentricity derived from the transit-duration anomaly: e_min = |(Δ²−1)/(Δ²+1)| where Δ = D_obs / D_circ. D_circ is the expected circular-orbit duration from the stellar and orbital geometry. Used as the lower integration limit for HITE H."
            accent="text-[#38bdf8]"
          />
          <MetricRow
            label="F_min (habitability floor)"
            value={fmt(planet.hiteFMin, 1, 'W/m²')}
            explanation="Minimum outgoing longwave radiation for habitability: 67 W/m². Below this, any atmosphere will collapse (Pierrehumbert 2010). Constant across all planets in the Barnes et al. model."
          />
          <MetricRow
            label="F_max (runaway greenhouse)"
            value={fmt(planet.hiteFMax, 1, 'W/m²')}
            explanation="Maximum OLR before a runaway greenhouse occurs (Pierrehumbert 2010 analytical threshold). Depends on surface gravity (hence planet mass and radius). Planets with F_max ≤ F_min yield HITE = 0."
            accent="text-amber-400"
          />
          <MetricRow
            label="Calculation type"
            value={planet.hiteCalcType ?? 'N/A'}
            explanation="'H' means e_min > 0 was derived from transit data, so the constrained integral was used. 'H_prime' means e_min = 0 was assumed (no transit-duration constraint available), so H and H′ are equal."
          />
          <MetricRow
            label="Data completeness"
            value={fmtPct(planet.hiteDataCompleteness)}
            explanation="Fraction of the 10 HITE input fields (stellar radius, temperature, luminosity, transit depth, period, duration, impact parameter, planet radius, mass, semi-major axis) that are non-missing for this planet."
          />
        </div>
      </div>

      {/* Scientific caveat */}
      <div className="mt-4 rounded border border-white/[0.06] bg-[#070d16] px-3 py-2 font-mono text-[8px] text-[#616e7c] leading-relaxed">
        <span className="text-[#dfb15b]">⚠ SCIENTIFIC CAVEAT — </span>
        HITE is a prioritisation metric based on orbital mechanics and simple flux limits.
        It does not account for atmospheric composition, geological activity, magnetic field,
        tidal locking, stellar variability, or any factor that makes a planet genuinely habitable.
        A score of 1.0 means every (albedo, eccentricity) combination tested is flux-compatible —
        it does not mean the planet has liquid water or life.
      </div>
    </div>
  );
};
