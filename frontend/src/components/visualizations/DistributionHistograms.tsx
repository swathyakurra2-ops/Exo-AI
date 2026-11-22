import React, { useMemo } from 'react';
import type { Exoplanet } from '../../types/exoplanet';

interface DistributionHistogramsProps {
  planets: Exoplanet[];
  selectedPlanet: Exoplanet | null;
}

interface HistogramBin {
  label: string;
  sublabel: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  containsSelected: boolean;
}

export const DistributionHistograms: React.FC<DistributionHistogramsProps> = ({
  planets,
  selectedPlanet,
}) => {
  // 1. Calculate Radius Distribution Bins
  const radiusBins: HistogramBin[] = useMemo(() => {
    const valid = planets.filter((p) => p.radiusEarth !== null && p.radiusEarth !== undefined && p.radiusEarth > 0);
    const total = valid.length;
    if (total === 0) return [];

    const binsConfig = [
      { label: '< 1.0 R⊕', sublabel: 'Sub-Earth', min: 0, max: 1.0 },
      { label: '1.0–1.5 R⊕', sublabel: 'Super-Earth', min: 1.0, max: 1.5 },
      { label: '1.5–2.5 R⊕', sublabel: 'Sub-Neptune', min: 1.5, max: 2.5 },
      { label: '2.5–4.0 R⊕', sublabel: 'Neptune-like', min: 2.5, max: 4.0 },
      { label: '4.0–8.0 R⊕', sublabel: 'Sub-Jovian', min: 4.0, max: 8.0 },
      { label: '8.0–15 R⊕', sublabel: 'Gas Giant', min: 8.0, max: 15.0 },
      { label: '> 15 R⊕', sublabel: 'Super-Jovian', min: 15.0, max: Infinity },
    ];

    const selectedR = selectedPlanet?.radiusEarth ?? null;

    return binsConfig.map((cfg) => {
      const count = valid.filter((p) => p.radiusEarth! >= cfg.min && (cfg.max === Infinity ? true : p.radiusEarth! < cfg.max)).length;
      const containsSelected = selectedR !== null && selectedR >= cfg.min && (cfg.max === Infinity ? true : selectedR < cfg.max);
      return {
        ...cfg,
        count,
        percentage: (count / total) * 100,
        containsSelected,
      };
    });
  }, [planets, selectedPlanet]);

  // 2. Calculate Temperature Distribution Bins
  const tempBins: HistogramBin[] = useMemo(() => {
    const valid = planets.filter((p) => p.equilibriumTempK !== null && p.equilibriumTempK !== undefined && p.equilibriumTempK > 0);
    const total = valid.length;
    if (total === 0) return [];

    const binsConfig = [
      { label: '< 200 K', sublabel: 'Cryogenic', min: 0, max: 200 },
      { label: '200–320 K', sublabel: 'Habitable Zone', min: 200, max: 320 },
      { label: '320–500 K', sublabel: 'Warm Temperate', min: 320, max: 500 },
      { label: '500–1000 K', sublabel: 'Hot Regime', min: 500, max: 1000 },
      { label: '1000–1800 K', sublabel: 'Torrid', min: 1000, max: 1800 },
      { label: '> 1800 K', sublabel: 'Ultra-Hot', min: 1800, max: Infinity },
    ];

    const selectedT = selectedPlanet?.equilibriumTempK ?? null;

    return binsConfig.map((cfg) => {
      const count = valid.filter((p) => p.equilibriumTempK! >= cfg.min && (cfg.max === Infinity ? true : p.equilibriumTempK! < cfg.max)).length;
      const containsSelected = selectedT !== null && selectedT >= cfg.min && (cfg.max === Infinity ? true : selectedT < cfg.max);
      return {
        ...cfg,
        count,
        percentage: (count / total) * 100,
        containsSelected,
      };
    });
  }, [planets, selectedPlanet]);

  const maxRadiusCount = Math.max(...radiusBins.map((b) => b.count), 1);
  const maxTempCount = Math.max(...tempBins.map((b) => b.count), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 1. Radius Histogram */}
      <div className="rounded-md border border-[#27323e]/80 bg-[#070b11]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#38bdf8]">
              POPULATION DEMOGRAPHICS
            </span>
            <h3 className="font-['Cinzel',sans-serif] text-sm tracking-wide text-[#e8eaed]">
              PLANET RADIUS DISTRIBUTION
            </h3>
          </div>
          <span className="font-mono text-[8px] tracking-wider text-[#788898]">
            SCALE: EARTH RADII (R⊕)
          </span>
        </div>

        {/* Bar container */}
        <div className="space-y-3.5 pt-2">
          {radiusBins.map((bin) => {
            const barWidth = `${Math.max(3, (bin.count / maxRadiusCount) * 100)}%`;
            return (
              <div key={bin.label} className="group text-xs">
                <div className="mb-1 flex items-center justify-between font-mono text-[9px]">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${bin.containsSelected ? 'text-[#38bdf8]' : 'text-[#d8dde4]'}`}>
                      {bin.label}
                    </span>
                    <span className="text-[8px] text-[#71808e]">({bin.sublabel})</span>
                    {bin.containsSelected && (
                      <span className="rounded bg-[#38bdf8]/15 px-1 py-0.2 font-mono text-[7px] uppercase tracking-wider text-[#38bdf8] border border-[#38bdf8]/30">
                        Selected Target
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-[#8c94a0]">
                    <span>{bin.count.toLocaleString()}</span>
                    <span className="text-[#64748b]">({bin.percentage.toFixed(1)}%)</span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#0d141e]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      bin.containsSelected
                        ? 'bg-gradient-to-r from-[#38bdf8] to-[#60a5fa] shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                        : 'bg-gradient-to-r from-[#1e3a5f] to-[#2563eb]/70 group-hover:from-[#2563eb] group-hover:to-[#38bdf8]'
                    }`}
                    style={{ width: barWidth }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 border-t border-white/[0.06] pt-3 font-mono text-[8px] text-[#71808e]">
          Note the distinct prevalence of Super-Earths and Sub-Neptunes (&quot;Radius Valley&quot;) characteristic of Kepler discoveries.
        </p>
      </div>

      {/* 2. Temperature Histogram */}
      <div className="rounded-md border border-[#27323e]/80 bg-[#070b11]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#dfb15b]">
              THERMAL REGIMES
            </span>
            <h3 className="font-['Cinzel',sans-serif] text-sm tracking-wide text-[#e8eaed]">
              EQUILIBRIUM TEMPERATURE DISTRIBUTION
            </h3>
          </div>
          <span className="font-mono text-[8px] tracking-wider text-[#788898]">
            SCALE: KELVIN (K)
          </span>
        </div>

        {/* Bar container */}
        <div className="space-y-3.5 pt-2">
          {tempBins.map((bin) => {
            const barWidth = `${Math.max(3, (bin.count / maxTempCount) * 100)}%`;
            const isHabitableWindow = bin.min === 200 && bin.max === 320;
            return (
              <div key={bin.label} className="group text-xs">
                <div className="mb-1 flex items-center justify-between font-mono text-[9px]">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${isHabitableWindow ? 'text-[#38bdf8]' : 'text-[#d8dde4]'}`}>
                      {bin.label}
                    </span>
                    <span className={`text-[8px] ${isHabitableWindow ? 'text-[#38bdf8]/80' : 'text-[#71808e]'}`}>
                      ({bin.sublabel})
                    </span>
                    {bin.containsSelected && (
                      <span className="rounded bg-[#dfb15b]/15 px-1 py-0.2 font-mono text-[7px] uppercase tracking-wider text-[#dfb15b] border border-[#dfb15b]/30">
                        Selected Target
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-[#8c94a0]">
                    <span>{bin.count.toLocaleString()}</span>
                    <span className="text-[#64748b]">({bin.percentage.toFixed(1)}%)</span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#0d141e]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHabitableWindow
                        ? 'bg-gradient-to-r from-[#059669] to-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                        : bin.containsSelected
                        ? 'bg-gradient-to-r from-[#dfb15b] to-[#fef08a] shadow-[0_0_12px_rgba(223,177,91,0.5)]'
                        : 'bg-gradient-to-r from-[#3f2a1d] to-[#d97706]/70 group-hover:from-[#d97706] group-hover:to-[#dfb15b]'
                    }`}
                    style={{ width: barWidth }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 border-t border-white/[0.06] pt-3 font-mono text-[8px] text-[#71808e]">
          The 200–320 K band defines the thermal boundary where liquid surface water may persist under appropriate planetary atmospheres.
        </p>
      </div>
    </div>
  );
};
