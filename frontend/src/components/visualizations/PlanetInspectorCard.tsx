import React, { useState, useMemo } from 'react';
import { Search, Compass, ChevronDown } from 'lucide-react';
import type { Exoplanet } from '../../types/exoplanet';

interface PlanetInspectorCardProps {
  planets: Exoplanet[];
  selectedPlanet: Exoplanet | null;
  onSelectPlanet: (planet: Exoplanet) => void;
}

const formatValue = (value: number | null | undefined, unit: string, digits = 2) =>
  value === null || value === undefined ? 'N/A' : `${Number.isInteger(value) ? value : value.toFixed(digits)} ${unit}`;

export const PlanetInspectorCard: React.FC<PlanetInspectorCardProps> = ({
  planets,
  selectedPlanet,
  onSelectPlanet,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Quick preset notable candidates for immediate scientific inspection
  const notableSpecimens = useMemo(() => {
    const targetIds = ['K00775.03', 'K01422.05', 'K00001.01', 'K00738.01'];
    return planets.filter((p) => targetIds.includes(p.name));
  }, [planets]);

  // Filtered planet results for the search dropdown
  const filteredPlanets = useMemo(() => {
    if (!searchQuery.trim()) return planets.slice(0, 15);
    const q = searchQuery.toLowerCase().trim();
    return planets
      .filter((p) => p.name.toLowerCase().includes(q) || p.hostStar.toLowerCase().includes(q))
      .slice(0, 20);
  }, [planets, searchQuery]);

  return (
    <div className="rounded-md border border-[#27323e]/80 bg-[#070b11]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div>
          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#dfb15b]">
            INDIVIDUAL TARGET INSPECTOR
          </span>
          <h3 className="font-['Cinzel',sans-serif] text-sm tracking-wide text-[#e8eaed]">
            PLANET TELEMETRY &amp; SCREENING PROFILE
          </h3>
        </div>
        <span className="font-mono text-[8px] tracking-wider text-[#788898]">
          TARGET IDENTIFIER: {selectedPlanet?.name || 'NONE SELECTED'}
        </span>
      </div>

      {/* Search & Selector Control */}
      <div className="relative mb-5">
        <label className="flex h-11 w-full items-center gap-2.5 rounded-lg border border-[#34414f]/75 bg-[#070b11]/90 px-3.5 shadow-inner transition-colors focus-within:border-[#38bdf8]/50">
          <Search className="h-4 w-4 shrink-0 text-[#8bbbd4]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Search catalog for planet or host star (e.g. K00775.03, KIC 11754553)..."
            className="h-full min-w-0 flex-1 bg-transparent text-xs text-[#e8eaed] outline-none placeholder:text-[#64748b]"
          />
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="p-1 text-[#8c94a0] hover:text-[#e8eaed]"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </label>

        {/* Dropdown Results */}
        {isDropdownOpen && (
          <div className="absolute left-0 right-0 top-12 z-30 max-h-60 overflow-y-auto rounded-md border border-[#34414f] bg-[#070d16] p-1 shadow-2xl backdrop-blur-xl">
            <div className="px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-[#616e7c]">
              MATCHING SPECIMENS ({filteredPlanets.length})
            </div>
            {filteredPlanets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelectPlanet(p);
                  setIsDropdownOpen(false);
                  setSearchQuery('');
                }}
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-left font-mono text-[10px] transition-colors ${
                  selectedPlanet?.id === p.id
                    ? 'bg-[#1b2b3a] text-[#38bdf8]'
                    : 'text-[#d8dde4] hover:bg-[#0f1724]'
                }`}
              >
                <div>
                  <span className="font-semibold">{p.name}</span>
                  <span className="ml-2 text-[9px] text-[#71808e]">{p.hostStar}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-[#8c94a0]">{p.disposition}</span>
                  {p.candidateScore !== null && p.candidateScore !== undefined && (
                    <span className="rounded bg-[#dfb15b]/20 px-1 py-0.2 text-[8px] text-[#dfb15b]">
                      {p.candidateScore.toFixed(0)} pts
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Preset Notable Specimens */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 font-mono text-[8px]">
          <span className="text-[#64748b]">BENCHMARK SPECIMENS:</span>
          {notableSpecimens.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPlanet(p)}
              className={`rounded-full border px-2.5 py-0.5 transition-all ${
                selectedPlanet?.id === p.id
                  ? 'border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8] font-bold shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                  : 'border-white/10 bg-[#090e17] text-[#8c94a0] hover:border-white/20 hover:text-[#e8eaed]'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Target Details Grid */}
      {selectedPlanet ? (
        <div className="space-y-4">
          {/* Main Identifier & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded border border-white/[0.06] bg-[#05080e] p-3.5">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-widest text-[#dfb15b]">
                EXOPLANET SPECIMEN
              </p>
              <h4 className="font-['Cinzel',sans-serif] text-xl font-light text-[#e8eaed]">
                {selectedPlanet.name}
              </h4>
              <p className="font-mono text-[9px] text-[#8c94a0]">
                HOST STAR CATALOG ID: <span className="text-[#d8dde4]">{selectedPlanet.hostStar}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-[#38bdf8]/30 bg-[#38bdf8]/10 px-2.5 py-1 font-mono text-[9px] font-semibold text-[#38bdf8]">
                {selectedPlanet.disposition || 'UNKNOWN DISPOSITION'}
              </span>
              {selectedPlanet.priority && (
                <span
                  className={`rounded border px-2.5 py-1 font-mono text-[9px] font-semibold ${
                    selectedPlanet.priority === 'High'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : selectedPlanet.priority === 'Medium'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                      : 'border-slate-500/40 bg-slate-500/10 text-slate-400'
                  }`}
                >
                  {selectedPlanet.priority} Priority
                </span>
              )}
            </div>
          </div>

          {/* Astrophysical Measurements Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded border border-white/[0.05] bg-[#050911] p-3 font-mono">
              <span className="text-[8px] uppercase tracking-wider text-[#71808e]">PLANETARY RADIUS</span>
              <p className="mt-1 text-base font-semibold text-[#38bdf8]">
                {formatValue(selectedPlanet.radiusEarth, 'R⊕')}
              </p>
              <span className="text-[8px] text-[#64748b]">
                {selectedPlanet.radiusEarth
                  ? selectedPlanet.radiusEarth <= 1.5
                    ? 'Terrestrial / Super-Earth'
                    : 'Gaseous / Sub-Neptune'
                  : 'Measurement omitted'}
              </span>
            </div>

            <div className="rounded border border-white/[0.05] bg-[#050911] p-3 font-mono">
              <span className="text-[8px] uppercase tracking-wider text-[#71808e]">EQUILIBRIUM TEMP</span>
              <p className="mt-1 text-base font-semibold text-[#e8eaed]">
                {formatValue(selectedPlanet.equilibriumTempK, 'K', 0)}
              </p>
              <span className="text-[8px] text-[#64748b]">
                {selectedPlanet.equilibriumTempK
                  ? `${(selectedPlanet.equilibriumTempK - 273.15).toFixed(0)} °C`
                  : 'Thermal data omitted'}
              </span>
            </div>

            <div className="rounded border border-white/[0.05] bg-[#050911] p-3 font-mono">
              <span className="text-[8px] uppercase tracking-wider text-[#71808e]">STELLAR FLUX</span>
              <p className="mt-1 text-base font-semibold text-[#dfb15b]">
                {formatValue(selectedPlanet.stellarFluxEarth, 'S⊕')}
              </p>
              <span className="text-[8px] text-[#64748b]">
                {selectedPlanet.stellarFluxEarth ? 'Relative to Earth' : 'Insolation omitted'}
              </span>
            </div>

            <div className="rounded border border-white/[0.05] bg-[#050911] p-3 font-mono">
              <span className="text-[8px] uppercase tracking-wider text-[#71808e]">STELLAR DISTANCE</span>
              <p className="mt-1 text-base font-semibold text-[#8c94a0]">
                {formatValue(selectedPlanet.distanceLightYears, 'ly')}
              </p>
              <span className="text-[8px] text-[#64748b]">Not in Kepler CSV</span>
            </div>
          </div>

          {/* Backend-provided screening score */}
          <div className="rounded border border-white/[0.06] bg-[#05080e] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/[0.06] pb-2.5">
              <div>
                <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#dfb15b]">
                  SCREENING EVALUATION
                </span>
                <h5 className="font-['Cinzel',sans-serif] text-xs font-semibold text-[#e8eaed]">
                  CANDIDATE SCREENING SCORE BREAKDOWN
                </h5>
              </div>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-xl font-bold text-[#dfb15b]">
                  {selectedPlanet.candidateScore !== null && selectedPlanet.candidateScore !== undefined
                    ? selectedPlanet.candidateScore.toFixed(1)
                    : 'N/A'}
                </span>
                <span className="text-[9px] text-[#71808e]">/ 100 PTS</span>
              </div>
            </div>

            <p className="mt-3 font-mono text-[8px] text-[#71808e]">
              Score and priority are supplied by the FastAPI backend. Component contributions are not exposed by the catalog API.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Compass className="h-8 w-8 text-[#64748b] animate-spin mb-3" style={{ animationDuration: '8s' }} />
          <h4 className="font-['Cinzel',sans-serif] text-sm text-[#e8eaed]">NO TARGET SPECIMEN SELECTED</h4>
          <p className="mt-1 font-mono text-[9px] text-[#71808e] max-w-sm">
            Select a target from the search bar above or click any data point in the population scatter plot to inspect its telemetry.
          </p>
        </div>
      )}
    </div>
  );
};
