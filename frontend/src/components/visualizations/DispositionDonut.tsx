import React, { useMemo, useState } from 'react';
import type { Exoplanet } from '../../types/exoplanet';

interface DispositionDonutProps {
  planets: Exoplanet[];
  selectedPlanet: Exoplanet | null;
}

interface Segment {
  key: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
  dashArray: string;
  dashOffset: number;
}

export const DispositionDonut: React.FC<DispositionDonutProps> = ({
  planets,
  selectedPlanet,
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const { segments, total } = useMemo(() => {
    const totalCount = planets.length;
    if (totalCount === 0) return { segments: [], total: 0 };

    const counts: Record<string, number> = {
      CONFIRMED: 0,
      CANDIDATE: 0,
      'FALSE POSITIVE': 0,
      'NOT DISPOSITIONED': 0,
    };

    planets.forEach((p) => {
      const disp = (p.disposition || '').toUpperCase();
      if (disp in counts) {
        counts[disp]++;
      } else {
        counts['NOT DISPOSITIONED']++;
      }
    });

    const config = [
      {
        key: 'CONFIRMED',
        label: 'Confirmed Planets',
        color: '#38bdf8',
        description: 'Spectroscopically or statistically validated exoplanets.',
      },
      {
        key: 'CANDIDATE',
        label: 'Vetted Candidates',
        color: '#dfb15b',
        description: 'Transit signals exhibiting exoplanet signatures awaiting confirmation.',
      },
      {
        key: 'FALSE POSITIVE',
        label: 'False Positives',
        color: '#f87171',
        description: 'Instrument artifacts, eclipsing binaries, or background stellar noise.',
      },
      {
        key: 'NOT DISPOSITIONED',
        label: 'Under Review',
        color: '#94a3b8',
        description: 'Catalog objects requiring additional Kepler vetting cycles.',
      },
    ];

    // SVG Circle perimeter calculation for stroke-dasharray (r = 50 -> C = 2 * PI * 50 = 314.159)
    const circumference = 314.159;
    let accumulatedOffset = 0;

    const computedSegments: Segment[] = config.map((cfg) => {
      const count = counts[cfg.key];
      const percentage = (count / totalCount) * 100;
      const strokeLength = (count / totalCount) * circumference;
      const dashArray = `${strokeLength} ${circumference - strokeLength}`;
      const dashOffset = -accumulatedOffset;
      accumulatedOffset += strokeLength;

      return {
        ...cfg,
        count,
        percentage,
        dashArray,
        dashOffset,
      };
    });

    return { segments: computedSegments, total: totalCount };
  }, [planets]);

  const activeSegment = segments.find((s) => s.key === hoveredKey) || null;

  return (
    <div className="rounded-md border border-[#27323e]/80 bg-[#070b11]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div>
          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#38bdf8]">
            CATALOG STATUS
          </span>
          <h3 className="font-['Cinzel',sans-serif] text-sm tracking-wide text-[#e8eaed]">
            KEPLER DISPOSITION BREAKDOWN
          </h3>
        </div>
        <span className="font-mono text-[8px] tracking-wider text-[#788898]">
          TOTAL: {total.toLocaleString()} OBJECTS
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-center gap-6 pt-2">
        {/* SVG Donut Graphic */}
        <div className="relative flex items-center justify-center">
          <svg className="h-44 w-44 -rotate-90 transform" viewBox="0 0 120 120">
            {/* Background track */}
            <circle
              cx="60"
              cy="60"
              r="50"
              className="fill-none stroke-[#0b121c]"
              strokeWidth="14"
            />

            {/* Segments */}
            {segments.map((seg) => {
              const isHovered = hoveredKey === seg.key;
              return (
                <circle
                  key={seg.key}
                  cx="60"
                  cy="60"
                  r="50"
                  className="fill-none transition-all duration-300 cursor-pointer"
                  stroke={seg.color}
                  strokeWidth={isHovered ? 17 : 14}
                  strokeDasharray={seg.dashArray}
                  strokeDashoffset={seg.dashOffset}
                  strokeLinecap="butt"
                  opacity={hoveredKey && !isHovered ? 0.45 : 1}
                  onMouseEnter={() => setHoveredKey(seg.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </svg>

          {/* Center text readout */}
          <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
            <span className="font-mono text-lg font-bold text-[#e8eaed]">
              {activeSegment ? activeSegment.count.toLocaleString() : total.toLocaleString()}
            </span>
            <span className="font-mono text-[7px] uppercase tracking-wider text-[#788898]">
              {activeSegment ? activeSegment.label : 'ALL OBJECTS'}
            </span>
          </div>
        </div>

        {/* Legend & Details */}
        <div className="space-y-2.5">
          {segments.map((seg) => {
            const isSelectedDisposition = selectedPlanet?.disposition?.toUpperCase() === seg.key;
            const isHovered = hoveredKey === seg.key;

            return (
              <div
                key={seg.key}
                onMouseEnter={() => setHoveredKey(seg.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`rounded border p-2.5 transition-all cursor-pointer ${
                  isHovered || isSelectedDisposition
                    ? 'border-white/20 bg-[#0d1622]'
                    : 'border-white/[0.04] bg-[#070c14] hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[9px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="font-medium text-[#e8eaed]">{seg.label}</span>
                    {isSelectedDisposition && (
                      <span className="rounded bg-[#dfb15b]/20 px-1 py-0.2 font-mono text-[7px] uppercase tracking-wider text-[#dfb15b] border border-[#dfb15b]/40">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#e8eaed]">{seg.count.toLocaleString()}</span>
                    <span className="text-[#64748b]">({seg.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <p className="mt-1 font-mono text-[8px] text-[#71808e] leading-relaxed">
                  {seg.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
