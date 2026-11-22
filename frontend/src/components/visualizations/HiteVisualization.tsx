/**
 * HiteVisualization
 * Displays HITE (Habitability Index for Transiting Exoplanets) results.
 * Barnes, Meadows & Evans (2015), ApJ 814, 91.
 *
 * Five panels:
 *   1. HITE H vs H' scatter comparison
 *   2. HITE H score distribution (histogram)
 *   3. Rocky probability distribution (histogram)
 *   4. Top HITE candidates ranked list
 *   5. Data-completeness distribution (histogram)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Star, Telescope, Atom, CheckCircle2 } from 'lucide-react';
import { getHiteStats } from '../../services/exoplanetService';
import type { HiteStats, HitePlanetRecord } from '../../services/exoplanetService';
import type { Exoplanet } from '../../types/exoplanet';

interface HiteVisualizationProps {
  selectedPlanet: Exoplanet | null;
  onSelectPlanet: (planet: Exoplanet) => void;
  /** Full planet list so we can look up full Exoplanet objects by name for onSelectPlanet */
  planets: Exoplanet[];
}

// ─── Shared bar-chart primitive ───────────────────────────────────────────────
interface MiniBarProps {
  label: string;
  count: number;
  maxCount: number;
  color: string;
  isHighlighted?: boolean;
}

const MiniBar: React.FC<MiniBarProps> = ({ label, count, maxCount, color, isHighlighted }) => {
  const pct = maxCount > 0 ? Math.max(2, (count / maxCount) * 100) : 2;
  return (
    <div className="group flex items-center gap-2 font-mono text-[9px]">
      <span className={`w-16 shrink-0 text-right ${isHighlighted ? 'text-[#38bdf8]' : 'text-[#788898]'}`}>
        {label}
      </span>
      <div className="relative h-4 flex-1 rounded-sm bg-[#0d141e] overflow-hidden">
        <div
          className="h-full rounded-sm transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className={`w-10 shrink-0 ${isHighlighted ? 'text-[#38bdf8] font-bold' : 'text-[#616e7c]'}`}>
        {count.toLocaleString()}
      </span>
    </div>
  );
};

// ─── H vs H' scatter (SVG) ────────────────────────────────────────────────────
interface HScatterProps {
  candidates: HitePlanetRecord[];
  selectedName: string | null;
  onSelect: (name: string) => void;
}

const HScatterPlot: React.FC<HScatterProps> = ({ candidates, selectedName, onSelect }) => {
  const [hovered, setHovered] = useState<HitePlanetRecord | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Filter to planets that have both H and H' values
  const plotData = useMemo(
    () => candidates.filter(p => p.hiteScore !== null && p.hiteScorePrime !== null),
    [candidates]
  );

  const W = 420, H_SVG = 300;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = W - margin.left - margin.right;
  const plotH = H_SVG - margin.top - margin.bottom;

  const toX = (v: number) => margin.left + v * plotW;
  const toY = (v: number) => H_SVG - margin.bottom - v * plotH;

  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H_SVG}`}
        className="w-full h-auto"
        onMouseLeave={() => { setHovered(null); setTooltipPos(null); }}
      >
        {/* Grid */}
        {ticks.map(t => (
          <g key={t}>
            <line x1={toX(t)} y1={margin.top} x2={toX(t)} y2={H_SVG - margin.bottom}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <line x1={margin.left} y1={toY(t)} x2={W - margin.right} y2={toY(t)}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <text x={toX(t)} y={H_SVG - margin.bottom + 14}
              textAnchor="middle" fill="#616e7c" fontSize={8} fontFamily="monospace">
              {t.toFixed(1)}
            </text>
            <text x={margin.left - 6} y={toY(t) + 3}
              textAnchor="end" fill="#616e7c" fontSize={8} fontFamily="monospace">
              {t.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Diagonal identity line H = H' */}
        <line x1={toX(0)} y1={toY(0)} x2={toX(1)} y2={toY(1)}
          stroke="rgba(56,189,248,0.15)" strokeWidth={1} strokeDasharray="4 3" />

        {/* Data points */}
        {plotData.map(p => {
          const cx = toX(p.hiteScore!);
          const cy = toY(p.hiteScorePrime!);
          const isSelected = p.name === selectedName;
          const isHov = hovered?.name === p.name;
          return (
            <circle
              key={p.name}
              cx={cx} cy={cy}
              r={isSelected ? 5 : isHov ? 4 : 2.5}
              fill={isSelected ? '#ffffff' : isHov ? '#dfb15b' : 'rgba(56,189,248,0.6)'}
              stroke={isSelected ? '#38bdf8' : 'none'}
              strokeWidth={1.5}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={e => {
                setHovered(p);
                const rect = (e.target as SVGElement).ownerSVGElement!.getBoundingClientRect();
                setTooltipPos({
                  x: cx / W * rect.width,
                  y: cy / H_SVG * rect.height,
                });
              }}
              onClick={() => onSelect(p.name)}
            />
          );
        })}

        {/* Axis labels */}
        <text x={W / 2} y={H_SVG - 4} textAnchor="middle" fill="#788898" fontSize={8} fontFamily="monospace">
          HITE H (eccentricity-constrained)
        </text>
        <text
          x={12} y={H_SVG / 2}
          textAnchor="middle" fill="#788898" fontSize={8} fontFamily="monospace"
          transform={`rotate(-90, 12, ${H_SVG / 2})`}
        >
          HITE H′ (unconstrained)
        </text>
      </svg>

      {/* Tooltip */}
      {hovered && tooltipPos && (
        <div
          className="pointer-events-none absolute z-20 min-w-[180px] rounded border border-[#38bdf8]/40 bg-[#080d14]/95 p-2.5 shadow-xl backdrop-blur-md"
          style={{ left: tooltipPos.x + 10, top: tooltipPos.y - 60 }}
        >
          <p className="font-['Cinzel',sans-serif] text-xs font-semibold text-[#e8eaed] mb-1">{hovered.name}</p>
          <div className="font-mono text-[9px] space-y-0.5">
            <div className="flex justify-between gap-3">
              <span className="text-[#788898]">HITE H:</span>
              <span className="text-[#38bdf8] font-bold">{hovered.hiteScore?.toFixed(4)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#788898]">HITE H′:</span>
              <span className="text-[#dfb15b]">{hovered.hiteScorePrime?.toFixed(4)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#788898]">Rocky p:</span>
              <span className="text-[#e8eaed]">{hovered.hiteRockyProbability?.toFixed(3)}</span>
            </div>
          </div>
          <p className="mt-1 text-center font-mono text-[7px] text-[#616e7c]">CLICK TO SELECT</p>
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const HiteVisualization: React.FC<HiteVisualizationProps> = ({
  selectedPlanet,
  onSelectPlanet,
  planets,
}) => {
  const [stats, setStats] = useState<HiteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const planetIndex = useMemo(
    () => new Map(planets.map(p => [p.name, p])),
    [planets]
  );

  const fetchStats = () => {
    setIsLoading(true);
    setError(null);
    getHiteStats()
      .then(setStats)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load HITE statistics.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchStats(); }, []);

  const handleSelectByName = (name: string) => {
    const planet = planetIndex.get(name);
    if (planet) onSelectPlanet(planet);
  };

  const selectedName = selectedPlanet?.name ?? null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-[#1e2733] bg-[#070b11]/60 py-16">
        <Loader2 className="w-7 h-7 animate-spin text-[#38bdf8] mb-3" />
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#e8eaed]">LOADING HITE STATISTICS...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-950/10 p-8 text-center">
        <AlertCircle className="mx-auto w-8 h-8 text-red-400 mb-3" />
        <p className="font-mono text-xs text-[#a0aab8]">{error ?? 'No HITE data available.'}</p>
        <button
          onClick={fetchStats}
          className="mt-4 flex items-center gap-2 mx-auto rounded border border-[#38bdf8]/40 px-4 py-1.5 font-mono text-[9px] text-[#38bdf8] hover:bg-[#38bdf8]/10"
        >
          <RefreshCw className="w-3 h-3" /> RETRY
        </button>
      </div>
    );
  }

  const maxH = Math.max(...stats.hScoreDistribution.buckets, 1);
  const maxRocky = Math.max(...stats.rockyProbabilityDistribution.buckets, 1);
  const maxComp = Math.max(...stats.completenessDistribution.buckets, 1);

  return (
    <div className="space-y-6">

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'PLANETS PROCESSED', value: stats.calculated.toLocaleString(), sub: `of ${stats.totalPlanets.toLocaleString()} total`, color: 'text-[#e8eaed]', icon: <Telescope className="w-3.5 h-3.5" /> },
          { label: 'HITE H > 0', value: stats.positiveHScore.toLocaleString(), sub: `${((stats.positiveHScore / stats.totalPlanets) * 100).toFixed(1)}% of catalog`, color: 'text-[#38bdf8]', icon: <Star className="w-3.5 h-3.5" /> },
          { label: 'AVG HITE H', value: stats.averageHiteH !== null ? stats.averageHiteH.toFixed(5) : 'N/A', sub: 'mean across all calculated', color: 'text-[#dfb15b]', icon: <Atom className="w-3.5 h-3.5" /> },
          { label: 'AVG DATA COMPLETENESS', value: stats.averageDataCompleteness !== null ? `${stats.averageDataCompleteness.toFixed(1)}%` : 'N/A', sub: 'mean input field coverage', color: 'text-emerald-400', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
        ].map(card => (
          <div key={card.label} className="rounded-md border border-[#1e2733]/80 bg-[#070b11]/70 p-3.5">
            <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-[#8c94a0]/70 mb-2">
              <span>{card.label}</span>
              <span className={card.color + '/70'}>{card.icon}</span>
            </div>
            <div className={`font-mono text-xl font-light ${card.color}`}>{card.value}</div>
            <div className="mt-1 font-mono text-[8px] text-[#5a6878]">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1: H vs H' scatter + Top candidates ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* H vs H' scatter */}
        <div className="lg:col-span-7 rounded-md border border-[#27323e]/80 bg-[#070b11]/85 p-5">
          <div className="mb-3 border-b border-white/[0.06] pb-3">
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#38bdf8]">HITE ANALYSIS</span>
            <h3 className="font-['Cinzel',sans-serif] text-sm text-[#e8eaed]">H vs H′ COMPARISON</h3>
            <p className="mt-1 font-mono text-[8px] text-[#788898] leading-relaxed">
              Each point is a planet with both HITE scores. H uses the minimum eccentricity
              derived from the transit-duration anomaly; H′ assumes e_min = 0. Points above
              the dashed diagonal have higher habitability when eccentricity is unconstrained.
            </p>
          </div>
          <HScatterPlot
            candidates={stats.topCandidates}
            selectedName={selectedName}
            onSelect={handleSelectByName}
          />
        </div>

        {/* Top 10 candidates */}
        <div className="lg:col-span-5 rounded-md border border-[#27323e]/80 bg-[#070b11]/85 p-5">
          <div className="mb-3 border-b border-white/[0.06] pb-3">
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#dfb15b]">RANKED LIST</span>
            <h3 className="font-['Cinzel',sans-serif] text-sm text-[#e8eaed]">HIGHEST HITE CANDIDATES</h3>
          </div>
          <div className="space-y-1.5">
            {stats.topCandidates.map((p, i) => {
              const isSelected = p.name === selectedName;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectByName(p.name)}
                  className={`w-full flex items-center gap-2.5 rounded px-2.5 py-2 text-left transition-colors ${
                    isSelected
                      ? 'bg-[#1b2b3a] border border-[#38bdf8]/40'
                      : 'border border-transparent hover:bg-[#0d1622]'
                  }`}
                >
                  <span className="w-5 font-mono text-[9px] text-[#455468] text-right shrink-0">
                    {i + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-mono text-[10px] font-semibold truncate ${isSelected ? 'text-[#38bdf8]' : 'text-[#d8dde4]'}`}>
                      {p.name}
                    </p>
                    <p className="font-mono text-[8px] text-[#616e7c]">
                      rocky={p.hiteRockyProbability?.toFixed(2)} · completeness={p.hiteDataCompleteness?.toFixed(0)}%
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-xs font-bold text-[#38bdf8]">
                      {p.hiteScore?.toFixed(4)}
                    </div>
                    <div className="font-mono text-[8px] text-[#788898]">
                      H′={p.hiteScorePrime?.toFixed(4)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Row 2: Three distribution histograms ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* HITE H score distribution */}
        <div className="rounded-md border border-[#27323e]/80 bg-[#070b11]/85 p-5">
          <div className="mb-3 border-b border-white/[0.06] pb-3">
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#38bdf8]">DISTRIBUTION</span>
            <h3 className="font-['Cinzel',sans-serif] text-sm text-[#e8eaed]">HITE H SCORES</h3>
          </div>
          <div className="space-y-1.5">
            {stats.hScoreDistribution.buckets.map((count, i) => {
              const selectedH = selectedPlanet?.hiteScore;
              const inBucket = selectedH !== null && selectedH !== undefined &&
                selectedH >= i * 0.1 && selectedH < (i + 1) * 0.1;
              return (
                <MiniBar
                  key={i}
                  label={stats.hScoreDistribution.labels[i]}
                  count={count}
                  maxCount={maxH}
                  color="#38bdf8"
                  isHighlighted={inBucket}
                />
              );
            })}
          </div>
          <p className="mt-3 font-mono text-[8px] text-[#616e7c] border-t border-white/[0.05] pt-2">
            Most planets score 0 (too hot / wrong flux range). The {stats.positiveHScore} with H &gt; 0 are
            genuine habitability candidates under the Barnes et al. model.
          </p>
        </div>

        {/* Rocky probability distribution */}
        <div className="rounded-md border border-[#27323e]/80 bg-[#070b11]/85 p-5">
          <div className="mb-3 border-b border-white/[0.06] pb-3">
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#dfb15b]">DISTRIBUTION</span>
            <h3 className="font-['Cinzel',sans-serif] text-sm text-[#e8eaed]">ROCKY PROBABILITY</h3>
          </div>
          <div className="space-y-1.5">
            {stats.rockyProbabilityDistribution.buckets.map((count, i) => {
              const selectedRocky = selectedPlanet?.hiteRockyProbability;
              const inBucket = selectedRocky !== null && selectedRocky !== undefined &&
                selectedRocky >= i * 0.1 && selectedRocky < (i + 1) * 0.1;
              return (
                <MiniBar
                  key={i}
                  label={stats.rockyProbabilityDistribution.labels[i]}
                  count={count}
                  maxCount={maxRocky}
                  color="#dfb15b"
                  isHighlighted={inBucket}
                />
              );
            })}
          </div>
          <p className="mt-3 font-mono text-[8px] text-[#616e7c] border-t border-white/[0.05] pt-2">
            p_rocky = 1 for Rp ≤ 1.5 R⊕, linearly decreasing to 0 at Rp ≥ 2.5 R⊕
            (Barnes et al. 2015). Bimodal distribution reflects the Radius Valley.
          </p>
        </div>

        {/* Data completeness distribution */}
        <div className="rounded-md border border-[#27323e]/80 bg-[#070b11]/85 p-5">
          <div className="mb-3 border-b border-white/[0.06] pb-3">
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-emerald-400">DISTRIBUTION</span>
            <h3 className="font-['Cinzel',sans-serif] text-sm text-[#e8eaed]">DATA COMPLETENESS</h3>
          </div>
          <div className="space-y-1.5">
            {stats.completenessDistribution.buckets.map((count, i) => {
              const selectedComp = selectedPlanet?.hiteDataCompleteness;
              const inBucket = selectedComp !== null && selectedComp !== undefined &&
                selectedComp >= i * 10 && selectedComp < (i + 1) * 10;
              return (
                <MiniBar
                  key={i}
                  label={stats.completenessDistribution.labels[i]}
                  count={count}
                  maxCount={maxComp}
                  color="#10b981"
                  isHighlighted={inBucket}
                />
              );
            })}
          </div>
          <p className="mt-3 font-mono text-[8px] text-[#616e7c] border-t border-white/[0.05] pt-2">
            Completeness measures what fraction of the 10 required HITE input fields
            (stellar radius, temperature, transit depth, period, duration, impact
            parameter, planet radius, mass, semi-major axis, luminosity) are present.
          </p>
        </div>
      </div>

      {/* ── Scientific reference footer ── */}
      <div className="rounded border border-white/[0.06] bg-[#070d16] px-4 py-3 font-mono text-[8px] text-[#616e7c]">
        <span className="text-[#dfb15b]">REFERENCE — </span>
        Barnes, Meadows &amp; Evans (2015), ApJ 814, 91. DOI: 10.1088/0004-637X/814/2/91.
        HITE integrates the fraction of (albedo, eccentricity) phase space consistent with
        surface liquid water, weighted by rocky-planet probability. It is a prioritisation metric,
        not a confirmation of habitability or life.
      </div>
    </div>
  );
};
