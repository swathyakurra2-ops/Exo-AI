import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CraterBackground } from './CraterBackground';
import { TopNavigation } from './TopNavigation';
import { AICommandBox } from './AICommandBox';
import { WorldComparison } from './WorldComparison';

const comparisonPlanets = [
  { id: 'kepler-442-b', name: 'Kepler-442 b' },
  { id: 'trappist-1-e', name: 'TRAPPIST-1 e' },
  { id: 'proxima-centauri-b', name: 'Proxima Centauri b' },
];

interface HomeScreenProps {
  onReplayIntro: () => void;
}

/**
 * HomeScreen — Refined:
 * Visual Ratio: 80% Vast Cosmic Sky, 20% Distant Alien Horizon
 * - Hero sits in open cosmic space with generous breathing room
 * - Restrained, editorial typography (not giant marketing text)
 * - Understated AI command box (floating dark instrument panel)
 * - Quieter secondary quick actions
 * - Zero decorative dashboard telemetry clutter on Home
 */
export const HomeScreen: React.FC<HomeScreenProps> = ({ onReplayIntro }) => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'home' | 'explore' | 'rankings' | 'compare' | 'visualizations'>('home');

  const handleNavigate = (view: 'home' | 'explore' | 'rankings' | 'compare' | 'visualizations') => {
    setActiveView(view);
    navigate(view === 'home' ? '/' : `/${view}`);
  };

  const handleQuerySubmit = (_submittedQuery: string) => {
    // Connect this callback to the EXO-AI service when it is available.
  };

  return (
    <div className="relative h-screen w-screen overflow-x-hidden overflow-y-auto bg-[#050608] font-sans text-[#e8eaed] select-none">
      <CraterBackground />

      <div className="relative z-30 flex min-h-full flex-col">
        <TopNavigation
          activeView={activeView}
          onNavigate={handleNavigate}
          onReplayIntro={onReplayIntro}
        />

        <section className="flex min-h-[54svh] flex-col items-center justify-center px-4 text-center sm:px-6">
          <div className="mb-3 flex items-center space-x-2 font-mono text-[9px] uppercase tracking-[0.3em] text-[#38bdf8]/70">
            <span className="text-[#dfb15b]">✦</span>
            <span>INTELLIGENCE FOR THE SEARCH BEYOND EARTH</span>
          </div>

          <h1 className="mb-2 pl-[0.24em] font-['Cinzel',sans-serif] text-2xl font-light tracking-[0.24em] text-[#e8eaed] drop-shadow-[0_0_20px_rgba(56,189,248,0.15)] sm:mb-2.5 sm:text-4xl md:text-5xl">
            EXPLORE THE UNKNOWN.
          </h1>

          <p className="mx-auto mb-7 max-w-md font-sans text-[11px] font-light leading-relaxed tracking-wider text-[#8c94a0]/80 sm:mb-8 sm:text-xs">
            AI-powered exploration and prioritization of potentially habitable exoplanets.
          </p>
        </section>

        <section className="w-full px-4 pb-14 text-center sm:pb-16">
          <h2 className="font-['Cinzel',sans-serif] text-sm tracking-[0.24em] text-[#e8eaed]">
            ASK EXO-AI
          </h2>
          <p className="mt-2 mb-5 text-xs font-light tracking-wide text-[#8c94a0]">
            Explore thousands of worlds using natural language.
          </p>
          <AICommandBox onQuerySubmit={handleQuerySubmit} />
        </section>

        <WorldComparison
          planets={comparisonPlanets}
          onCompare={(firstPlanetId, secondPlanetId) => {
            if (firstPlanetId && secondPlanetId) navigate('/compare');
          }}
        />

        <section className="flex justify-center px-4 pb-10 pt-2 text-center">
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="rounded-full border border-[#38bdf8]/35 bg-[#050608]/20 px-6 py-2.5 font-mono text-[10px] tracking-[0.2em] text-[#e8eaed]/85 transition-colors hover:border-[#38bdf8]/65 hover:text-white"
          >
            EXPLORE EXOPLANETS
          </button>
        </section>

        <div className="h-10 shrink-0 sm:h-14" aria-hidden="true" />
      </div>
    </div>
  );
};
