import React from 'react';
import { Link } from 'react-router-dom';
import { PlanetThumbnail } from './PlanetThumbnail';
import type { Exoplanet } from '../../types/exoplanet';

interface ExoplanetCardProps {
  planet: Exoplanet;
}

const formatValue = (value: number | null | undefined, unit: string, digits = 2) =>
  value === null || value === undefined ? 'N/A' : `${Number.isInteger(value) ? value : value.toFixed(digits)} ${unit}`;

export const ExoplanetCard: React.FC<ExoplanetCardProps> = ({ planet }) => (
  <article className="group flex min-h-[340px] flex-col overflow-hidden rounded-md border border-[#27323e]/75 bg-[#070b11]/75 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#64839b]/55 hover:bg-[#0a1018]/90">
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#dfb15b]/85 truncate max-w-[60%]">
        {planet.disposition || (planet.planetType === 'unknown' ? 'TYPE UNKNOWN' : planet.planetType.replace('-', ' '))}
      </span>
      <span className="font-mono text-[8px] tracking-wider text-[#65717e] truncate">
        {planet.hzClassification ? planet.hzClassification.toUpperCase() : 'WORLD SPECIMEN'}
      </span>
    </div>

    <PlanetThumbnail planetId={planet.id} />

    <div className="mt-4">
      <h2 className="font-['Cinzel',sans-serif] text-base tracking-wide text-[#e8eaed] truncate">{planet.name}</h2>
      <p className="mt-1 text-xs text-[#98a2ae] truncate">{planet.hostStar}</p>
    </div>

    <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.08] pt-3">
      <div>
        <dt className="font-mono text-[8px] uppercase tracking-wider text-[#77818d]">Radius</dt>
        <dd className="mt-1 text-[11px] text-[#d9dee5]">{formatValue(planet.radiusEarth, 'R⊕')}</dd>
      </div>
      <div>
        <dt className="font-mono text-[8px] uppercase tracking-wider text-[#77818d]">Temp</dt>
        <dd className="mt-1 text-[11px] text-[#d9dee5]">{formatValue(planet.equilibriumTempK, 'K', 0)}</dd>
      </div>
      <div>
        <dt className="font-mono text-[8px] uppercase tracking-wider text-[#77818d]">Flux</dt>
        <dd className="mt-1 text-[11px] text-[#d9dee5]">{formatValue(planet.stellarFluxEarth, 'S⊕')}</dd>
      </div>
    </dl>

    {/* HITE score — shown only when calculated and nonzero */}
    {planet.hiteScore !== null && planet.hiteScore !== undefined && planet.hiteScore > 0 && (
      <div className="mt-2 flex items-center justify-between rounded border border-purple-500/20 bg-purple-500/5 px-2.5 py-1.5">
        <span className="font-mono text-[8px] uppercase tracking-wider text-purple-400/80">
          HITE H
        </span>
        <div className="flex items-center gap-2 font-mono text-[9px]">
          <span className="font-semibold text-purple-300">{planet.hiteScore.toFixed(5)}</span>
          {planet.hiteRockyProbability !== null && planet.hiteRockyProbability !== undefined && (
            <span className="text-[#616e7c]">p_rocky={planet.hiteRockyProbability.toFixed(2)}</span>
          )}
        </div>
      </div>
    )}

    <Link
      to={`/planet/${planet.id}`}
      className="mt-auto self-start pt-5 font-mono text-[9px] tracking-[0.16em] text-[#8dc9e5]/85 transition-colors hover:text-[#c4eaff]"
    >
      VIEW PLANET <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
    </Link>
  </article>
);
