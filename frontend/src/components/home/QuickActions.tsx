import React from 'react';
import { Compass } from 'lucide-react';
import { cosmicAudio } from '../../utils/audio';

interface QuickActionsProps {
  onNavigate: (view: 'home' | 'explore' | 'rankings' | 'compare') => void;
}

/**
 * QuickActions — Refined:
 * Secondary, understated scientific controls with thin borders,
 * no heavy fills, and delicate typography.
 */
export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-4 select-none">
      {/* 1. Explore */}
      <button
        onClick={() => {
          cosmicAudio.playDataBlip();
          onNavigate('explore');
        }}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-transparent hover:bg-[#111318]/60 border border-[#1e2430]/70 hover:border-[#38bdf8]/40 text-[#8c94a0]/80 hover:text-[#e8eaed] text-[10px] font-mono tracking-widest uppercase transition-colors duration-200"
      >
        <Compass className="w-3 h-3 text-[#38bdf8]/70" />
        <span>EXPLORE EXOPLANETS</span>
      </button>

    </div>
  );
};
