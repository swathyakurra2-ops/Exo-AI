import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { Exoplanet } from '../../types/exoplanet';

interface PopulationScatterPlotProps {
  planets: Exoplanet[];
  selectedPlanet: Exoplanet | null;
  onSelectPlanet: (planet: Exoplanet) => void;
}

const DISPOSITION_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  CONFIRMED: { fill: 'rgba(56, 189, 248, 0.75)', stroke: '#38bdf8', label: 'Confirmed' },
  CANDIDATE: { fill: 'rgba(223, 177, 91, 0.85)', stroke: '#dfb15b', label: 'Candidate' },
  'FALSE POSITIVE': { fill: 'rgba(239, 68, 68, 0.65)', stroke: '#f87171', label: 'False Positive' },
  'NOT DISPOSITIONED': { fill: 'rgba(148, 163, 184, 0.55)', stroke: '#94a3b8', label: 'Not Dispositioned' },
  UNKNOWN: { fill: 'rgba(113, 128, 142, 0.5)', stroke: '#71808e', label: 'Other' },
};

export const PopulationScatterPlot: React.FC<PopulationScatterPlotProps> = ({
  planets,
  selectedPlanet,
  onSelectPlanet,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Filter toggles
  const [activeDispositions, setActiveDispositions] = useState<Record<string, boolean>>({
    CONFIRMED: true,
    CANDIDATE: true,
    'FALSE POSITIVE': true,
    'NOT DISPOSITIONED': true,
  });

  // Zoom / domain presets
  const [zoomMode, setZoomMode] = useState<'focused' | 'full'>('focused');
  const [hoveredPlanet, setHoveredPlanet] = useState<Exoplanet | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Filter valid data points with numeric radius and temp
  const validData = useMemo(() => {
    return planets.filter(
      (p) =>
        p.radiusEarth !== null &&
        p.radiusEarth !== undefined &&
        p.radiusEarth > 0 &&
        p.equilibriumTempK !== null &&
        p.equilibriumTempK !== undefined &&
        p.equilibriumTempK > 0
    );
  }, [planets]);

  // Define domains
  const xDomain = useMemo(() => {
    return zoomMode === 'focused' ? { min: 0.2, max: 20 } : { min: 0.2, max: 80 };
  }, [zoomMode]);

  const yDomain = useMemo(() => {
    return { min: 100, max: 3200 };
  }, []);

  // Margins for axes
  const margin = { top: 30, right: 30, bottom: 50, left: 60 };

  // Helper coordinate conversions
  const getCoordinates = (
    radius: number,
    temp: number,
    width: number,
    height: number
  ): { x: number; y: number; inBounds: boolean } => {
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    // Linear mapping with clipping
    const clampedRadius = Math.max(xDomain.min, Math.min(xDomain.max, radius));
    const clampedTemp = Math.max(yDomain.min, Math.min(yDomain.max, temp));

    const xRatio = (clampedRadius - xDomain.min) / (xDomain.max - xDomain.min);
    // Y is inverted (higher temperature near top)
    const yRatio = (clampedTemp - yDomain.min) / (yDomain.max - yDomain.min);

    const x = margin.left + xRatio * plotW;
    const y = height - margin.bottom - yRatio * plotH;
    const inBounds = radius >= xDomain.min && radius <= xDomain.max && temp >= yDomain.min && temp <= yDomain.max;

    return { x, y, inBounds };
  };

  // Draw chart on canvas for maximum rendering performance (6,700+ points at 60fps)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    // Horizontal temp ticks
    const tempTicks = [500, 1000, 1500, 2000, 2500, 3000];
    tempTicks.forEach((t) => {
      const y = height - margin.bottom - ((t - yDomain.min) / (yDomain.max - yDomain.min)) * plotH;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    });

    // Vertical radius ticks
    const rTicks = zoomMode === 'focused' ? [2, 4, 6, 8, 10, 14, 18] : [10, 20, 30, 40, 50, 60, 70];
    rTicks.forEach((r) => {
      const x = margin.left + ((r - xDomain.min) / (xDomain.max - xDomain.min)) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
    });

    // Render all population points
    for (let i = 0; i < validData.length; i++) {
      const p = validData[i];
      const disp = p.disposition?.toUpperCase() || 'UNKNOWN';
      if (!activeDispositions[disp]) continue;

      const { x, y, inBounds } = getCoordinates(p.radiusEarth!, p.equilibriumTempK!, width, height);
      if (!inBounds) continue;

      const style = DISPOSITION_COLORS[disp] || DISPOSITION_COLORS.UNKNOWN;
      ctx.fillStyle = style.fill;

      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight selected planet
    if (selectedPlanet && selectedPlanet.radiusEarth && selectedPlanet.equilibriumTempK) {
      const { x, y } = getCoordinates(selectedPlanet.radiusEarth, selectedPlanet.equilibriumTempK, width, height);

      // Outer targeting reticle ring
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glowing core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Crosshair lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 14, y);
      ctx.lineTo(x + 14, y);
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x, y + 14);
      ctx.stroke();

      // Text label next to reticle
      ctx.fillStyle = '#e8eaed';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(selectedPlanet.name, x + 12, y - 8);
    }
  }, [validData, xDomain, yDomain, activeDispositions, selectedPlanet, zoomMode]);

  // Interactive mouse move for hover inspection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Search nearest point within 10px radius
    let closestPlanet: Exoplanet | null = null;
    let minDist = 12;

    for (let i = 0; i < validData.length; i++) {
      const p = validData[i];
      const disp = p.disposition?.toUpperCase() || 'UNKNOWN';
      if (!activeDispositions[disp]) continue;

      const { x, y, inBounds } = getCoordinates(p.radiusEarth!, p.equilibriumTempK!, width, height);
      if (!inBounds) continue;

      const dist = Math.hypot(x - mouseX, y - mouseY);
      if (dist < minDist) {
        minDist = dist;
        closestPlanet = p;
      }
    }

    if (closestPlanet) {
      setHoveredPlanet(closestPlanet);
      setTooltipPos({ x: mouseX, y: mouseY });
    } else {
      setHoveredPlanet(null);
      setTooltipPos(null);
    }
  };

  const handleClick = () => {
    if (hoveredPlanet) {
      onSelectPlanet(hoveredPlanet);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPlanet(null);
    setTooltipPos(null);
  };

  return (
    <div className="relative rounded-md border border-[#27323e]/80 bg-[#070b11]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      {/* Chart Control Bar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#38bdf8]">
              POPULATION DIAGRAM
            </span>
            <span className="text-[#455468]">·</span>
            <span className="font-mono text-[8px] text-[#788898]">
              {validData.length.toLocaleString()} OBSERVATIONS
            </span>
          </div>
          <h2 className="font-['Cinzel',sans-serif] text-base font-light tracking-wide text-[#e8eaed]">
            PLANETARY RADIUS VS. EQUILIBRIUM TEMPERATURE
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Toggle */}
          <div className="flex items-center rounded-full border border-[#34414f]/70 bg-[#080d14] p-0.5 text-[9px] font-mono">
            <button
              type="button"
              onClick={() => setZoomMode('focused')}
              className={`rounded-full px-2.5 py-1 transition-colors ${
                zoomMode === 'focused'
                  ? 'bg-[#1b2b3a] text-[#38bdf8] font-semibold'
                  : 'text-[#8c94a0] hover:text-[#e8eaed]'
              }`}
            >
              FOCUSED (0–20 R⊕)
            </button>
            <button
              type="button"
              onClick={() => setZoomMode('full')}
              className={`rounded-full px-2.5 py-1 transition-colors ${
                zoomMode === 'full'
                  ? 'bg-[#1b2b3a] text-[#38bdf8] font-semibold'
                  : 'text-[#8c94a0] hover:text-[#e8eaed]'
              }`}
            >
              WIDE (0–80 R⊕)
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Interactive Disposition Filter */}
      <div className="mb-3 flex flex-wrap items-center gap-3 font-mono text-[9px]">
        <span className="text-[#788898] uppercase tracking-wider text-[8px]">FILTER DISPOSITION:</span>
        {Object.entries(DISPOSITION_COLORS).map(([key, item]) => {
          if (key === 'UNKNOWN') return null;
          const isActive = activeDispositions[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() =>
                setActiveDispositions((prev) => ({ ...prev, [key]: !prev[key] }))
              }
              className={`flex items-center gap-1.5 rounded border px-2 py-0.5 transition-all ${
                isActive
                  ? 'border-white/20 bg-[#0f1722] text-[#e8eaed]'
                  : 'border-white/5 bg-transparent text-[#616e7c] opacity-50'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.stroke }}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Plot Area */}
      <div ref={containerRef} className="relative h-[420px] w-full select-none cursor-crosshair overflow-hidden rounded bg-[#05080e]/90">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="absolute inset-0 h-full w-full"
        />

        {/* Axis Labels Overlay */}
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-widest text-[#788898]">
          PLANETARY RADIUS (R⊕, Earth Radii)
        </div>
        <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 origin-left font-mono text-[9px] tracking-widest text-[#788898]">
          EQUILIBRIUM TEMPERATURE (K, Kelvin)
        </div>

        {/* Y Axis Tick Marks */}
        <div className="pointer-events-none absolute left-8 top-8 bottom-12 flex flex-col justify-between font-mono text-[8px] text-[#616e7c]">
          <span>3000 K</span>
          <span>2500 K</span>
          <span>2000 K</span>
          <span>1500 K</span>
          <span>1000 K</span>
          <span>500 K</span>
          <span>100 K</span>
        </div>

        {/* X Axis Tick Marks */}
        <div className="pointer-events-none absolute bottom-8 left-16 right-8 flex justify-between font-mono text-[8px] text-[#616e7c]">
          {zoomMode === 'focused' ? (
            <>
              <span>0 R⊕</span>
              <span>4 R⊕</span>
              <span>8 R⊕</span>
              <span>12 R⊕</span>
              <span>16 R⊕</span>
              <span>20 R⊕</span>
            </>
          ) : (
            <>
              <span>0 R⊕</span>
              <span>15 R⊕</span>
              <span>30 R⊕</span>
              <span>45 R⊕</span>
              <span>60 R⊕</span>
              <span>80 R⊕</span>
            </>
          )}
        </div>

        {/* Hover Tooltip */}
        {hoveredPlanet && tooltipPos && (
          <div
            className="pointer-events-none absolute z-20 min-w-[190px] -translate-x-1/2 -translate-y-full rounded border border-[#38bdf8]/40 bg-[#080d14]/95 p-3 shadow-2xl backdrop-blur-md"
            style={{ left: tooltipPos.x, top: tooltipPos.y - 12 }}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
              <span className="font-['Cinzel',sans-serif] text-xs font-semibold text-[#e8eaed]">
                {hoveredPlanet.name}
              </span>
              <span
                className={`font-mono text-[7px] uppercase px-1 py-0.5 rounded border ${
                  hoveredPlanet.disposition === 'CONFIRMED'
                    ? 'border-[#38bdf8]/40 text-[#38bdf8] bg-[#38bdf8]/10'
                    : hoveredPlanet.disposition === 'CANDIDATE'
                    ? 'border-[#dfb15b]/40 text-[#dfb15b] bg-[#dfb15b]/10'
                    : 'border-red-500/40 text-red-400 bg-red-500/10'
                }`}
              >
                {hoveredPlanet.disposition || 'UNKNOWN'}
              </span>
            </div>

            <div className="mt-2 space-y-1 font-mono text-[9px]">
              <div className="flex justify-between text-[#8c94a0]">
                <span>Host Star:</span>
                <span className="text-[#d8dde4]">{hoveredPlanet.hostStar}</span>
              </div>
              <div className="flex justify-between text-[#8c94a0]">
                <span>Radius:</span>
                <span className="text-[#38bdf8] font-medium">{hoveredPlanet.radiusEarth?.toFixed(2)} R⊕</span>
              </div>
              <div className="flex justify-between text-[#8c94a0]">
                <span>Equilibrium Temp:</span>
                <span className="text-[#d8dde4]">{hoveredPlanet.equilibriumTempK?.toFixed(0)} K</span>
              </div>
              {hoveredPlanet.stellarFluxEarth !== null && (
                <div className="flex justify-between text-[#8c94a0]">
                  <span>Stellar Flux:</span>
                  <span className="text-[#d8dde4]">{hoveredPlanet.stellarFluxEarth?.toFixed(2)} S⊕</span>
                </div>
              )}
              {hoveredPlanet.candidateScore !== null && hoveredPlanet.candidateScore !== undefined && (
                <div className="flex justify-between text-[#8c94a0] border-t border-white/[0.06] pt-1">
                  <span>Screening Score:</span>
                  <span className="text-[#dfb15b] font-semibold">{hoveredPlanet.candidateScore.toFixed(1)} / 100</span>
                </div>
              )}
            </div>

            <p className="mt-2 border-t border-white/[0.06] pt-1 text-center font-mono text-[7px] tracking-wider text-[#738294]">
              CLICK TO INSPECT CANDIDATE
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
