import React from 'react';
import type { Exoplanet } from '../../types/exoplanet';

interface HabitableZoneVisualProps {
  selectedPlanet: Exoplanet | null;
}

export const HabitableZoneVisual: React.FC<HabitableZoneVisualProps> = ({ selectedPlanet }) => {
  const flux = selectedPlanet?.stellarFluxEarth ?? null;
  const hzClassification = selectedPlanet?.hzClassification ?? 'Not Classified';

  // Use a logarithmic display scale for the backend-provided flux measurement.
  const logMin = Math.log10(0.05); // -1.30
  const logMax = Math.log10(50.0); // +1.70

  const getPositionPercent = (s: number): number => {
    const clamped = Math.max(0.05, Math.min(50.0, s));
    const logVal = Math.log10(clamped);
    // Invert because higher flux is closer to the star (left), lower flux is further (right)
    return 100 - ((logVal - logMin) / (logMax - logMin)) * 100;
  };

  // Planet marker position
  const planetPositionPct = flux !== null && flux > 0 ? getPositionPercent(flux) : null;

  return (
    <div className="rounded-md border border-[#27323e]/80 bg-[#070b11]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#38bdf8]">
              ASTROPHYSICAL MODEL
            </span>
            <span className="text-[#455468]">·</span>
            <span className="font-mono text-[8px] text-[#788898]">
              BACKEND-DERIVED CLASSIFICATION
            </span>
          </div>
          <h3 className="font-['Cinzel',sans-serif] text-sm tracking-wide text-[#e8eaed]">
            STELLAR INSOLATION FLUX &amp; HZ CLASSIFICATION
          </h3>
        </div>

        {selectedPlanet && (
          <div className="flex items-center gap-2 font-mono text-[9px]">
            <span className="text-[#788898]">TARGET:</span>
            <span className="text-[#dfb15b] font-semibold">{selectedPlanet.name}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[8px] uppercase tracking-wider border ${
                hzClassification.includes('Within')
                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                  : hzClassification.includes('Inside inner')
                  ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                  : 'border-[#38bdf8]/40 text-[#38bdf8] bg-[#38bdf8]/10'
              }`}
            >
              {hzClassification}
            </span>
          </div>
        )}
      </div>

      {/* Main Diagram Area */}
      <div className="relative mt-6 pt-12 pb-14 px-4 bg-[#04070d]/90 rounded-md border border-white/[0.04] overflow-hidden">
        {/* Background Radial Glow of Host Star */}
        <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 w-72 h-72 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/5 to-transparent blur-3xl" />

        {/* The Solar/Stellar Body at left */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-200 via-orange-400 to-amber-600 shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-pulse" />
            <div className="absolute h-18 w-18 rounded-full border border-amber-400/30 blur-sm" />
          </div>
          <div className="hidden md:flex flex-col font-mono text-[8px] text-[#dfb15b]/90">
            <span className="font-bold tracking-widest">HOST STAR</span>
            <span className="text-[#8c94a0]">{selectedPlanet?.hostStar || 'Solar Type'}</span>
          </div>
        </div>

        {/* Flux Rail & Habitable Zone Track */}
        <div className="relative mx-12 md:mx-28 h-12 flex items-center">
          {/* Main flux rail */}
          <div className="absolute inset-x-0 h-1.5 bg-[#0e1622] rounded-full" />

          {/* Selected Planet Indicator */}
          {planetPositionPct !== null ? (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-700"
              style={{ left: `${planetPositionPct}%` }}
            >
              {/* Pulsing beacon */}
              <div className="relative flex items-center justify-center">
                <div className="h-5 w-5 rounded-full bg-[#dfb15b] shadow-[0_0_16px_rgba(223,177,91,0.9)]" />
                <div className="absolute h-9 w-9 rounded-full border border-[#dfb15b] animate-ping opacity-75" />
              </div>

              {/* Tag Callout */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-[#dfb15b] bg-[#0d1624]/95 px-2 py-0.5 font-mono text-[8px] font-bold text-[#dfb15b] shadow-xl">
                {selectedPlanet?.name} ({flux?.toFixed(2)} S⊕)
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <span className="rounded bg-black/60 px-3 py-1 font-mono text-[9px] text-[#9ba5b1] border border-white/10">
                {selectedPlanet ? 'Stellar insolation flux unavailable for this target' : 'Select a planet to plot its stellar flux position'}
              </span>
            </div>
          )}
        </div>

        {/* Directional Spectrum Labels */}
        <div className="mt-8 flex justify-between px-6 font-mono text-[8px] text-[#616e7c]">
          <span className="text-amber-500/80">← HIGHER INSOLATION (HOTTER)</span>
          <span className="text-[#38bdf8]/80">BACKEND HZ CLASSIFICATION</span>
          <span className="text-sky-400/80">LOWER INSOLATION (COLDER) →</span>
        </div>
      </div>

      {/* Astrophysical Interpretation & Caveat Notice */}
      <div className="mt-4 rounded border border-white/[0.06] bg-[#070d16] p-3 text-xs leading-relaxed text-[#9ba5b1]">
        <div className="flex items-center gap-2 mb-1.5 font-mono text-[8px] uppercase tracking-[0.16em] text-[#dfb15b]">
          <span>⚠ SCIENTIFIC PROTOCOL &amp; INTERPRETATION NOTICE</span>
        </div>
        <p className="text-[11px] text-[#a4b1be] font-light">
          This visualization plots the backend-provided stellar flux and displays its backend-derived HZ classification when available.
          HZ membership is an observational screening parameter and does <strong>not</strong> establish that an exoplanet has an atmosphere, water, or conditions supporting life.
        </p>
      </div>
    </div>
  );
};
