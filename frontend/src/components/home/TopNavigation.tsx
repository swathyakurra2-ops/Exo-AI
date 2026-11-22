import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { cosmicAudio } from '../../utils/audio';

interface TopNavigationProps {
  activeView: 'home' | 'explore' | 'rankings' | 'compare' | 'methodology' | 'visualizations';
  onNavigate: (view: 'home' | 'explore' | 'rankings' | 'compare' | 'visualizations') => void;
  onReplayIntro: () => void;
}

/**
 * TopNavigation — Refined:
 * Transparent, delicate, unobtrusive scientific instrument navigation.
 */
export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeView,
  onNavigate,
  onReplayIntro,
}) => {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(cosmicAudio.getMuted());

  const handleToggleSound = () => {
    const unmuted = cosmicAudio.toggleSound();
    setIsMuted(!unmuted);
  };

  return (
    <header className="relative w-full z-40 px-3 py-4 sm:px-12 sm:py-5 flex items-center justify-between bg-transparent select-none">
      {/* 1. Left Brand Identity */}
      <div
        onClick={() => onNavigate('home')}
        className="flex items-center space-x-2.5 cursor-pointer group"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]/80 group-hover:scale-125 transition-transform" />
        <span className="font-['Cinzel',sans-serif] text-base tracking-[0.25em] text-[#e8eaed] font-light pl-0.5">
          EXO-AI
        </span>
      </div>

      {/* 2. Center Instrument Navigation */}
      <nav className="flex items-center space-x-2 sm:space-x-8 text-[9px] sm:text-[10px] font-mono tracking-[0.12em] sm:tracking-[0.22em]">
        <button
          onClick={() => onNavigate('explore')}
          className={`transition-colors duration-200 uppercase relative py-1 ${
            activeView === 'explore'
              ? 'text-[#38bdf8] font-medium'
              : 'text-[#8c94a0]/70 hover:text-[#e8eaed]'
          }`}
        >
          EXPLORE
        </button>

        <span className="text-[#141920]/80 select-none">/</span>

        <button
          onClick={() => onNavigate('rankings')}
          className={`transition-colors duration-200 uppercase relative py-1 ${
            activeView === 'rankings'
              ? 'text-[#dfb15b] font-medium'
              : 'text-[#8c94a0]/70 hover:text-[#e8eaed]'
          }`}
        >
          RANKINGS
        </button>

        <span className="text-[#141920]/80 select-none">/</span>

        <button
          onClick={() => onNavigate('visualizations')}
          className={`transition-colors duration-200 uppercase relative py-1 ${
            activeView === 'visualizations'
              ? 'text-[#38bdf8] font-medium'
              : 'text-[#8c94a0]/70 hover:text-[#e8eaed]'
          }`}
        >
          VISUALIZE
        </button>

        <span className="text-[#141920]/80 select-none">/</span>

        <button
          onClick={() => navigate('/methodology')}
          className={`relative py-1 uppercase transition-colors duration-200 ${
            activeView === 'methodology'
              ? 'text-[#dfb15b] font-medium'
              : 'text-[#8c94a0]/70 hover:text-[#e8eaed]'
          }`}
        >
          METHODOLOGY
        </button>
      </nav>

      {/* 3. Right Status & Utilities */}
      <div className="flex items-center space-x-2 sm:space-x-3.5">
        {/* Subtle green status dot */}
        <div className="hidden md:flex items-center space-x-1.5 font-mono text-[9px] tracking-widest text-[#8c94a0]/70">
          <span className="w-1 h-1 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[#8c94a0]/60">ONLINE</span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={handleToggleSound}
          aria-label="Toggle ambient sound"
          className="p-1 rounded text-[#8c94a0]/60 hover:text-[#e8eaed] transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-[#38bdf8]" />
          )}
        </button>

        {/* Replay Intro */}
        <button
          onClick={onReplayIntro}
          title="Replay Intro Sequence"
          className="hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded border border-[#141920]/80 hover:border-[#dfb15b]/30 text-[#8c94a0]/50 hover:text-[#dfb15b] font-mono text-[9px] tracking-wider transition-colors"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span className="hidden md:inline">REPLAY</span>
        </button>
      </div>
    </header>
  );
};
