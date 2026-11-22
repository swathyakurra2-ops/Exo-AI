import React from 'react';
import { Link } from 'react-router-dom';
import type { Exoplanet } from '../../types/exoplanet';
import { PlanetThumbnail } from '../explorer/PlanetThumbnail';

interface RankingRowProps {
  planet: Exoplanet;
  rank: number;
  isDemo?: boolean;
}

const fmt = (value: number | null | undefined, unit: string, digits = 2) =>
  value == null ? '—' : `${Number.isInteger(value) ? value : value.toFixed(digits)} ${unit}`;

const HzBadge: React.FC<{ planet: Exoplanet }> = ({ planet }) => {
  if (planet.inConservativeHz) {
    return (
      <span className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[7px] tracking-widest text-emerald-400">
        CONS HZ
      </span>
    );
  }
  if (planet.inOptimisticHz) {
    return (
      <span className="rounded-sm border border-sky-500/35 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[7px] tracking-widest text-sky-400">
        OPT HZ
      </span>
    );
  }
  return null;
};

const EsiBadge: React.FC<{ esi: number | null | undefined }> = ({ esi }) => {
  if (esi == null) return null;
  const color =
    esi >= 0.8
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
      : esi >= 0.6
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
      : 'border-slate-500/30 bg-slate-500/08 text-slate-400';
  return (
    <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[7px] tracking-widest ${color}`}>
      ESI {esi.toFixed(2)}
    </span>
  );
};

const HiteBadge: React.FC<{ hiteScore: number | null | undefined }> = ({ hiteScore }) => {
  if (hiteScore == null || hiteScore <= 0) return null;
  const color =
    hiteScore >= 0.8
      ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
      : hiteScore >= 0.5
      ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
      : 'border-slate-500/30 bg-slate-500/08 text-slate-400';
  return (
    <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[7px] tracking-widest ${color}`}>
      HITE {hiteScore.toFixed(3)}
    </span>
  );
};

const PriorityBadge: React.FC<{ priority: string | null | undefined }> = ({ priority }) => {
  if (!priority) return null;
  const color =
    priority === 'High'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : priority === 'Medium'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider ${color}`}>
      {priority}
    </span>
  );
};

export const RankingRow: React.FC<RankingRowProps> = ({ planet, rank, isDemo = false }) => {
  const rankNumber = String(rank).padStart(2, '0');
  const isFirst = rank === 1;
  const hasScore = planet.candidateScore != null;

  return (
    <article
      className={`group grid grid-cols-[2.25rem_3rem_minmax(0,1fr)] items-center gap-x-3 gap-y-4 border-b px-3 py-5 transition-colors sm:px-5 lg:grid-cols-[3.5rem_4rem_minmax(170px,1.2fr)_minmax(260px,1.3fr)_220px] lg:gap-5 ${
        isFirst
          ? 'border-t border-[#dfb15b]/35 bg-[#10100e]/35'
          : 'border-white/[0.08] hover:bg-white/[0.02]'
      }`}
    >
      {/* Rank number */}
      <span
        className={`row-span-1 font-['Cinzel',sans-serif] text-xl font-light tabular-nums sm:text-2xl ${
          isFirst ? 'text-[#dfb15b]' : 'text-[#71808e]'
        }`}
      >
        {rankNumber}
      </span>

      {/* Thumbnail */}
      <PlanetThumbnail planetId={planet.id} size="small" />

      {/* Name + badges */}
      <div className="min-w-0">
        {isFirst && (
          <p className="mb-1 font-mono text-[7px] tracking-[0.14em] text-[#dfb15b]/80">
            {isDemo ? 'FIRST IN DEMO ORDER' : 'TOP CANDIDATE'}
          </p>
        )}
        <h2 className="truncate font-['Cinzel',sans-serif] text-sm tracking-wide text-[#e8eaed] sm:text-base">
          {planet.name}
        </h2>
        <p className="mt-0.5 truncate text-xs text-[#98a2ae]">
          {planet.hostStar}
          {planet.stellarSpectralClass && (
            <span className="ml-2 font-mono text-[9px] text-[#6b7a8a]">
              {planet.stellarSpectralClass}-type
            </span>
          )}
        </p>

        {/* Status badges */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {planet.disposition && (
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#73808d]">
              {planet.disposition}
            </span>
          )}
          <HzBadge planet={planet} />
          <EsiBadge esi={planet.esi} />
          <HiteBadge hiteScore={planet.hiteScore} />
        </div>
      </div>

      {/* Science metrics */}
      <dl className="col-span-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/[0.07] pt-3 sm:grid-cols-4 lg:col-span-1 lg:border-t-0 lg:pt-0">
        <div>
          <dt className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#74808c]">Radius</dt>
          <dd className="mt-1 text-[10px] text-[#d4dae1]">{fmt(planet.radiusEarth, 'R⊕')}</dd>
        </div>
        <div>
          <dt className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#74808c]">Temp</dt>
          <dd className="mt-1 text-[10px] text-[#d4dae1]">{fmt(planet.equilibriumTempK, 'K', 0)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#74808c]">Flux</dt>
          <dd className="mt-1 text-[10px] text-[#d4dae1]">{fmt(planet.stellarFluxEarth, 'S⊕')}</dd>
        </div>
        <div>
          <dt className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#74808c]">Period</dt>
          <dd className="mt-1 text-[10px] text-[#d4dae1]">{fmt(planet.orbitalPeriodDays, 'd', 1)}</dd>
        </div>
        {planet.hiteScore !== null && planet.hiteScore !== undefined && planet.hiteScore > 0 && (
          <div className="col-span-2 sm:col-span-4 border-t border-white/[0.05] pt-2">
            <dt className="font-mono text-[7px] uppercase tracking-[0.14em] text-purple-400/80">HITE H (Barnes 2015)</dt>
            <dd className="mt-1 flex items-center gap-2">
              <span className="text-[10px] text-purple-300 font-semibold">{planet.hiteScore.toFixed(5)}</span>
              {planet.hiteScorePrime !== null && planet.hiteScorePrime !== undefined && (
                <span className="font-mono text-[8px] text-[#616e7c]">
                  H′={planet.hiteScorePrime.toFixed(5)}
                </span>
              )}
              {planet.hiteRockyProbability !== null && planet.hiteRockyProbability !== undefined && (
                <span className="font-mono text-[8px] text-[#616e7c]">
                  rocky={planet.hiteRockyProbability.toFixed(2)}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>

      {/* Score + actions */}
      <div className="col-span-3 flex items-end justify-between gap-3 border-t border-white/[0.07] pt-3 lg:col-span-1 lg:flex-col lg:items-start lg:justify-center lg:border-t-0 lg:pt-0">
        <div>
          <p className="font-mono text-[7px] tracking-[0.14em] text-[#74808c]">
            {hasScore ? 'CANDIDATE SCORE' : 'NO SCORE'}
          </p>
          {hasScore ? (
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-sm font-semibold tracking-tight text-[#dfb15b]">
                {planet.candidateScore!.toFixed(1)}
              </span>
              <span className="font-mono text-[8px] text-[#74808c]">/ 100</span>
              <PriorityBadge priority={planet.priority} />
            </div>
          ) : (
            <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[#dfb15b]/90">
              {isDemo ? 'DEMO' : 'UNSCORED'}
            </p>
          )}

          {/* ML prediction */}
          {planet.mlPredictedClass && (
            <p className="mt-1.5 font-mono text-[8px] text-[#74808c]">
              ML:{' '}
              <span
                className={
                  planet.mlPredictedClass === 'CONFIRMED'
                    ? 'text-emerald-400'
                    : planet.mlPredictedClass === 'FALSE POSITIVE'
                    ? 'text-red-400'
                    : 'text-amber-400'
                }
              >
                {planet.mlPredictedClass}
              </span>
            </p>
          )}
        </div>

        <Link
          to={`/planet/${planet.id}`}
          className="shrink-0 font-mono text-[8px] tracking-[0.12em] text-[#8dc9e5]/85 transition-colors hover:text-[#c4eaff]"
        >
          DETAILS{' '}
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-200 group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      </div>
    </article>
  );
};
