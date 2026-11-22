import React from 'react';
import { X, Globe, BarChart2, ArrowLeftRight, CheckCircle2 } from 'lucide-react';

interface ViewModalProps {
  view: 'explore' | 'rankings' | 'compare' | null;
  onClose: () => void;
}

export const ViewModal: React.FC<ViewModalProps> = ({ view, onClose }) => {
  if (!view) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#050608]/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-[#0D1014]/95 border border-[#1e2430] rounded-xl shadow-2xl p-6 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#141920] pb-4 mb-4">
          <div className="flex items-center space-x-2.5">
            {view === 'explore' && <Globe className="w-4 h-4 text-[#38bdf8]" />}
            {view === 'rankings' && <BarChart2 className="w-4 h-4 text-[#dfb15b]" />}
            {view === 'compare' && <ArrowLeftRight className="w-4 h-4 text-[#38bdf8]" />}
            <span className="font-['Cinzel',sans-serif] text-sm tracking-[0.2em] text-[#e8eaed] uppercase">
              {view === 'explore' && 'Exoplanet Exploration Matrix'}
              {view === 'rankings' && 'Habitability Index Rankings'}
              {view === 'compare' && 'Atmospheric & Orbital Comparison'}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#141920] text-[#38bdf8] border border-[#38bdf8]/20">
              PHASE 2 PREVIEW
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#8c94a0] hover:text-[#e8eaed] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content based on view */}
        {view === 'explore' && (
          <div className="space-y-4 font-mono text-xs">
            <p className="text-[#8c94a0] leading-relaxed font-sans text-xs">
              Autonomous search engine active. Filter candidates across stellar flux, planetary radius, and equilibrium temperatures.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded bg-[#050608]/70 border border-[#141920]">
                <div className="text-[10px] text-[#8c94a0] mb-1">CANDIDATE 01</div>
                <div className="text-sm font-semibold text-[#e8eaed]">Kepler-452 b</div>
                <div className="text-[10px] text-[#38bdf8] mt-1">RADIUS: 1.63 R⊕ • FLUX: 1.10 S⊕</div>
              </div>
              <div className="p-3 rounded bg-[#050608]/70 border border-[#141920]">
                <div className="text-[10px] text-[#8c94a0] mb-1">CANDIDATE 02</div>
                <div className="text-sm font-semibold text-[#e8eaed]">Kepler-186 f</div>
                <div className="text-[10px] text-[#dfb15b] mt-1">RADIUS: 1.17 R⊕ • FLUX: 0.32 S⊕</div>
              </div>
            </div>
          </div>
        )}

        {view === 'rankings' && (
          <div className="space-y-3 font-mono text-xs">
            <p className="text-[#8c94a0] leading-relaxed font-sans text-xs">
              Planetary Habitability Laboratory (PHL) composite prioritization ranking.
            </p>
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-2.5 rounded bg-[#050608]/70 border border-[#141920]">
                <div className="flex items-center space-x-3">
                  <span className="text-[#dfb15b] font-bold">#1</span>
                  <span className="text-[#e8eaed]">Kepler-442 b</span>
                </div>
                <div className="text-right">
                  <span className="text-[#dfb15b] font-bold">0.84</span>
                  <span className="text-[#8c94a0] text-[10px] ml-1">ESI</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded bg-[#050608]/70 border border-[#141920]">
                <div className="flex items-center space-x-3">
                  <span className="text-[#38bdf8] font-bold">#2</span>
                  <span className="text-[#e8eaed]">TRAPPIST-1 e</span>
                </div>
                <div className="text-right">
                  <span className="text-[#38bdf8] font-bold">0.85</span>
                  <span className="text-[#8c94a0] text-[10px] ml-1">ESI</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'compare' && (
          <div className="space-y-4 font-mono text-xs">
            <p className="text-[#8c94a0] leading-relaxed font-sans text-xs">
              Side-by-side spectroscopic and orbital mechanics comparative analysis.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
              <div className="p-3 rounded bg-[#050608]/70 border border-[#141920]">
                <div className="text-[#38bdf8] font-bold mb-2">EARTH (ANALOG)</div>
                <div className="text-[#8c94a0] space-y-1">
                  <div>RADIUS: 1.00 R⊕</div>
                  <div>MASS: 1.00 M⊕</div>
                  <div>EQUILIBRIUM: 255 K</div>
                </div>
              </div>
              <div className="p-3 rounded bg-[#050608]/70 border border-[#141920]">
                <div className="text-[#dfb15b] font-bold mb-2">KEPLER-186 f</div>
                <div className="text-[#8c94a0] space-y-1">
                  <div>RADIUS: 1.17 R⊕</div>
                  <div>MASS: ~1.44 M⊕</div>
                  <div>EQUILIBRIUM: 188 K</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-[#141920] flex items-center justify-between text-[10px] font-mono text-[#8c94a0]/60">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-[#10b981]" />
            <span>EXO-AI RECONNAISSANCE ENGINE ACTIVE</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#141920] text-[#e8eaed] hover:bg-[#1e2430] transition-colors"
          >
            RETURN TO COMMAND [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
