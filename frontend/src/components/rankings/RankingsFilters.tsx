import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { PlanetType } from '../../types/exoplanet';

export type RankingSort = 'score' | 'name' | 'demo-order';
export type HzFilter = 'all' | 'conservative' | 'optimistic';

interface RankingsFiltersProps {
  planetType: PlanetType | 'all';
  onPlanetTypeChange: (value: PlanetType | 'all') => void;
  temperatureAvailable: boolean;
  sort: RankingSort;
  onSortChange: (value: RankingSort) => void;
  hzFilter: HzFilter;
  onHzFilterChange: (value: HzFilter) => void;
  isDemoMode?: boolean;
}

const RankingSelect: React.FC<{
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange?: (value: string) => void;
  disabled?: boolean;
}> = ({ label, value, options, onChange, disabled = false }) => (
  <label className="relative">
    <span className="sr-only">{label}</span>
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className="h-9 max-w-full appearance-none rounded-full border border-[#35414e]/80 bg-[#080c12]/85 py-0 pl-3.5 pr-8 font-mono text-[10px] tracking-wide text-[#c3cbd4] outline-none transition-colors hover:border-[#64748b]/80 focus:border-[#38bdf8]/60 disabled:cursor-not-allowed disabled:text-[#77818d]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#090d13] text-[#e8eaed]">
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-[#dfb15b]/75"
    />
  </label>
);

export const RankingsFilters: React.FC<RankingsFiltersProps> = ({
  planetType,
  onPlanetTypeChange,
  temperatureAvailable,
  sort,
  onSortChange,
  hzFilter,
  onHzFilterChange,
  isDemoMode = false,
}) => {
  const sortOptions = isDemoMode
    ? [
        { value: 'demo-order', label: 'Demo order' },
        { value: 'name', label: 'Name' },
      ]
    : [
        { value: 'score', label: 'Candidate score' },
        { value: 'name', label: 'Name' },
      ];

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-y border-white/[0.08] py-3">
      <RankingSelect
        label="Planet type"
        value={planetType}
        onChange={(v) => onPlanetTypeChange(v as PlanetType | 'all')}
        options={[
          { value: 'all', label: 'All types' },
          { value: 'terrestrial', label: 'Terrestrial' },
          { value: 'gas-giant', label: 'Gas giant' },
          { value: 'unknown', label: 'Unknown type' },
        ]}
      />

      <RankingSelect
        label="Habitable zone filter"
        value={hzFilter}
        onChange={(v) => onHzFilterChange(v as HzFilter)}
        options={[
          { value: 'all', label: 'All HZ zones' },
          { value: 'conservative', label: 'Conservative HZ' },
          { value: 'optimistic', label: 'Optimistic HZ' },
        ]}
      />

      <RankingSelect
        label="Temperature"
        value={temperatureAvailable ? 'all' : 'unavailable'}
        disabled={!temperatureAvailable}
        options={[
          {
            value: temperatureAvailable ? 'all' : 'unavailable',
            label: temperatureAvailable ? 'All temperatures' : 'Temp unavailable',
          },
        ]}
      />

      <span className="ml-auto flex items-center gap-2">
        <span className="font-mono text-[8px] tracking-[0.16em] text-[#75808c]">SORT</span>
        <RankingSelect
          label="Sort ranking records"
          value={sort}
          onChange={(v) => onSortChange(v as RankingSort)}
          options={sortOptions}
        />
      </span>
    </div>
  );
};
