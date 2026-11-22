import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { PlanetType } from '../../types/exoplanet';

export type RadiusFilter = 'all' | 'under-one' | 'one-to-one-five' | 'over-one-five';
export type DistanceFilter = 'all' | 'nearby' | 'mid-range' | 'distant';
export type ExoplanetSort = 'relevance' | 'name' | 'temperature' | 'radius' | 'distance';

interface ExplorerFiltersProps {
  planetType: PlanetType | 'all';
  onPlanetTypeChange: (value: PlanetType | 'all') => void;
  temperatureAvailable: boolean;
  radius: RadiusFilter;
  onRadiusChange: (value: RadiusFilter) => void;
  fluxAvailable: boolean;
  distance: DistanceFilter;
  onDistanceChange: (value: DistanceFilter) => void;
  sort: ExoplanetSort;
  onSortChange: (value: ExoplanetSort) => void;
}

interface CompactSelectProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

const CompactSelect: React.FC<CompactSelectProps> = ({ label, value, options, onChange, disabled = false }) => (
  <label className="relative">
    <span className="sr-only">{label}</span>
    <select
      aria-label={label}
      className="h-9 max-w-full appearance-none rounded-full border border-[#35414e]/80 bg-[#080c12]/85 py-0 pl-3.5 pr-8 font-mono text-[10px] tracking-wide text-[#c3cbd4] outline-none transition-colors hover:border-[#64748b]/80 focus:border-[#38bdf8]/60 disabled:cursor-not-allowed disabled:text-[#77818d]"
      value={value}
      disabled={disabled}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-[#090d13] text-[#e8eaed]">
          {option.label}
        </option>
      ))}
    </select>
    <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-[#dfb15b]/75" />
  </label>
);

export const ExplorerFilters: React.FC<ExplorerFiltersProps> = ({
  planetType,
  onPlanetTypeChange,
  temperatureAvailable,
  radius,
  onRadiusChange,
  fluxAvailable,
  distance,
  onDistanceChange,
  sort,
  onSortChange,
}) => (
  <div className="flex flex-wrap items-center gap-2.5 border-y border-white/[0.08] py-3">
    <CompactSelect
      label="Planet type"
      value={planetType}
      onChange={(value) => onPlanetTypeChange(value as PlanetType | 'all')}
      options={[
        { value: 'all', label: 'All types' },
        { value: 'terrestrial', label: 'Terrestrial' },
        { value: 'gas-giant', label: 'Gas giant' },
        { value: 'unknown', label: 'Unknown' },
      ]}
    />
    <CompactSelect
      label="Temperature"
      value={temperatureAvailable ? 'all' : 'unavailable'}
      disabled={!temperatureAvailable}
      options={[{ value: temperatureAvailable ? 'all' : 'unavailable', label: temperatureAvailable ? 'All temperatures' : 'Temp unavailable' }]}
    />
    <CompactSelect
      label="Planet radius"
      value={radius}
      onChange={(value) => onRadiusChange(value as RadiusFilter)}
      options={[
        { value: 'all', label: 'All radii' },
        { value: 'under-one', label: '≤ 1 R⊕' },
        { value: 'one-to-one-five', label: '1–1.5 R⊕' },
        { value: 'over-one-five', label: '> 1.5 R⊕' },
      ]}
    />
    <CompactSelect
      label="Stellar flux"
      value={fluxAvailable ? 'all' : 'unavailable'}
      disabled={!fluxAvailable}
      options={[{ value: fluxAvailable ? 'all' : 'unavailable', label: fluxAvailable ? 'All flux' : 'Flux unavailable' }]}
    />
    <CompactSelect
      label="Distance"
      value={distance}
      onChange={(value) => onDistanceChange(value as DistanceFilter)}
      options={[
        { value: 'all', label: 'All distances' },
        { value: 'nearby', label: 'Under 50 ly' },
        { value: 'mid-range', label: '50–500 ly' },
        { value: 'distant', label: 'Over 500 ly' },
      ]}
    />
    <div className="ml-auto flex items-center gap-2">
      <span className="font-mono text-[8px] tracking-[0.16em] text-[#75808c]">SORT</span>
      <CompactSelect
        label="Sort by"
        value={sort}
        onChange={(value) => onSortChange(value as ExoplanetSort)}
        options={[
          { value: 'relevance', label: 'Relevance' },
          { value: 'name', label: 'Name' },
          { value: 'temperature', label: 'Temperature' },
          { value: 'radius', label: 'Radius' },
          { value: 'distance', label: 'Distance' },
        ]}
      />
    </div>
  </div>
);