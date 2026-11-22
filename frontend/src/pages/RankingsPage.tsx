import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RankingsFilters, type RankingSort, type HzFilter } from '../components/rankings/RankingsFilters';
import { RankingRow } from '../components/rankings/RankingRow';
import { ModelStatus } from '../components/rankings/ModelStatus';
import { TopNavigation } from '../components/home/TopNavigation';
import { getRankings } from '../services/exoplanetService';
import type { Exoplanet, PlanetType } from '../types/exoplanet';

interface RankingsPageProps {
  onReplayIntro: () => void;
}

const PAGE_SIZE = 50;

export const RankingsPage: React.FC<RankingsPageProps> = ({ onReplayIntro }) => {
  const navigate = useNavigate();
  const [planets, setPlanets] = useState<Exoplanet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [planetType, setPlanetType] = useState<PlanetType | 'all'>('all');
  const [sort, setSort] = useState<RankingSort>('score');
  const [hzFilter, setHzFilter] = useState<HzFilter>('all');

  const fetchRankings = (demo: boolean) => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    getRankings({ useDemo: demo })
      .then((results) => {
        setPlanets(results);
        setIsDemoMode(demo);
        setSort(demo ? 'demo-order' : 'score');
        setVisibleCount(PAGE_SIZE);
      })
      .catch((err) => {
        setHasError(true);
        setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to backend rankings service.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchRankings(false);
  }, []);

  const rankedPlanets = useMemo(() => {
    const matching = planets.filter((planet) => {
      if (planetType !== 'all' && planet.planetType !== planetType) return false;
      if (hzFilter === 'conservative' && !planet.inConservativeHz) return false;
      if (hzFilter === 'optimistic' && !planet.inOptimisticHz) return false;
      return true;
    });

    if (sort === 'demo-order') {
      return matching;
    }

    if (sort === 'name') {
      return [...matching].sort((left, right) => left.name.localeCompare(right.name));
    }

    // Default 'score': descending candidateScore, unscored (null/undefined) placed at bottom
    return [...matching].sort((left, right) => {
      const leftHasScore = left.candidateScore !== null && left.candidateScore !== undefined;
      const rightHasScore = right.candidateScore !== null && right.candidateScore !== undefined;

      if (!leftHasScore && !rightHasScore) return 0;
      if (!leftHasScore) return 1;
      if (!rightHasScore) return -1;

      return (right.candidateScore as number) - (left.candidateScore as number);
    });
  }, [planets, planetType, sort]);

  const displayedPlanets = useMemo(() => {
    return rankedPlanets.slice(0, visibleCount);
  }, [rankedPlanets, visibleCount]);

  const handleNavigate = (view: 'home' | 'explore' | 'rankings' | 'compare' | 'visualizations') => {
    navigate(view === 'home' ? '/' : `/${view}`);
  };

  const clearFilters = () => {
    setPlanetType('all');
    setHzFilter('all');
    setSort(isDemoMode ? 'demo-order' : 'score');
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div
      className="h-screen overflow-x-hidden overflow-y-auto text-[#e8eaed]"
      style={{
        background: 'radial-gradient(ellipse at 78% 0%, rgba(25, 57, 82, 0.28), transparent 44%), radial-gradient(ellipse at 8% 36%, rgba(150, 117, 61, 0.07), transparent 34%), #050608',
      }}
    >
      <TopNavigation activeView="rankings" onNavigate={handleNavigate} onReplayIntro={onReplayIntro} />
      <main className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
        <header className="pb-5 pt-10 sm:pt-14 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3 font-mono text-[9px] tracking-[0.26em]">
              <span className="text-[#dfb15b]/85">EXO-AI / CANDIDATE PRIORITY</span>
              <span className="text-[#455468]">·</span>
              <span className={isDemoMode ? 'text-amber-400' : 'text-emerald-400'}>
                {isDemoMode ? 'PROTOTYPE DEMO' : 'LIVE FASTAPI RANKINGS'}
              </span>
            </div>
            <h1 className="font-['Cinzel',sans-serif] text-2xl font-light tracking-[0.12em] text-[#e8eaed] sm:text-3xl">
              CANDIDATE RANKING
            </h1>
            <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-[#9ba5b1]">
              Prioritize Kepler exoplanet candidates for scientific follow-up using transparent screening metrics.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-[8px] tracking-[0.15em]">
            <span className="text-[#75808c]">SOURCE:</span>
            <button
              type="button"
              onClick={() => fetchRankings(!isDemoMode)}
              className="rounded-full border border-[#38bdf8]/40 bg-[#070b11]/80 px-3 py-1.5 text-[#38bdf8] transition-colors hover:border-[#38bdf8]/80 hover:text-white"
            >
              {isDemoMode ? 'SWITCH TO LIVE API' : 'SWITCH TO DEMO DATA'}
            </button>
          </div>
        </header>

        <ModelStatus isDemoMode={isDemoMode} />

        <div className="mt-6">
          <RankingsFilters
            planetType={planetType}
            onPlanetTypeChange={(val) => {
              setPlanetType(val);
              setVisibleCount(PAGE_SIZE);
            }}
            temperatureAvailable={planets.some((planet) => planet.equilibriumTempK !== null && planet.equilibriumTempK !== undefined)}
            sort={sort}
            onSortChange={setSort}
            hzFilter={hzFilter}
            onHzFilterChange={(val) => {
              setHzFilter(val);
              setVisibleCount(PAGE_SIZE);
            }}
            isDemoMode={isDemoMode}
          />
        </div>

        <div className="flex items-center justify-between gap-4 py-5">
          <p className="font-mono text-[9px] tracking-[0.19em] text-[#b1bbc6]" aria-live="polite">
            {isLoading
              ? 'SCANNING CATALOG...'
              : `${rankedPlanets.length} ${rankedPlanets.length === 1 ? 'CANDIDATE' : 'CANDIDATES'}`}
          </p>
          <p className="font-mono text-[8px] tracking-[0.14em] text-[#77818d]">
            {sort === 'score'
              ? 'RANKED BY CANDIDATE SCREENING SCORE (DESCENDING)'
              : sort === 'demo-order'
              ? 'DEMO ORDER · NOT AI-RANKED'
              : 'SORTED BY NAME'}
          </p>
        </div>

        {hasError ? (
          <div className="rounded-md border border-red-500/25 bg-[#140a0c]/80 px-6 py-12 text-center">
            <h2 className="font-mono text-[11px] tracking-[0.2em] text-red-400">THE RANKINGS COULD NOT BE LOADED</h2>
            <p className="mt-2 text-xs text-[#9ba5b1]">
              {errorMessage || 'FastAPI backend is unreachable on http://localhost:8000.'}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => fetchRankings(false)}
                className="rounded-full border border-white/20 px-4 py-2 font-mono text-[9px] tracking-[0.16em] text-[#e8eaed] transition-colors hover:border-white/50"
              >
                RETRY LIVE API
              </button>
              <button
                type="button"
                onClick={() => fetchRankings(true)}
                className="rounded-full border border-[#dfb15b]/50 px-4 py-2 font-mono text-[9px] tracking-[0.16em] text-[#dfb15b] transition-colors hover:border-[#dfb15b]/90 hover:text-[#f3e1b6]"
              >
                VIEW DEMO RANKINGS
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="border-y border-white/10 py-16 text-center">
            <p className="font-mono text-xs tracking-[0.2em] text-[#8bbbd4] animate-pulse">CONNECTING TO FASTAPI RANKINGS...</p>
          </div>
        ) : displayedPlanets.length > 0 ? (
          <div>
            <div>
              {displayedPlanets.map((planet, index) => (
                <RankingRow
                  key={planet.id}
                  planet={planet}
                  rank={index + 1}
                  isDemo={isDemoMode}
                />
              ))}
            </div>

            {visibleCount < rankedPlanets.length && (
              <div className="mt-10 mb-8 flex flex-col items-center justify-center gap-2">
                <p className="font-mono text-[9px] tracking-[0.16em] text-[#77818d]">
                  SHOWING {displayedPlanets.length} OF {rankedPlanets.length} CANDIDATES
                </p>
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="rounded-full border border-[#dfb15b]/40 bg-[#070b11]/85 px-6 py-2.5 font-mono text-[10px] tracking-[0.2em] text-[#dfb15b] transition-colors hover:border-[#dfb15b]/80 hover:text-white"
                >
                  LOAD MORE CANDIDATES
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-white/[0.08] bg-[#070b11]/65 px-5 py-14 text-center">
            <h2 className="font-mono text-[10px] tracking-[0.2em] text-[#e8eaed]">NO CANDIDATES MATCH YOUR FILTERS</h2>
            <p className="mt-3 text-xs text-[#9ba5b1]">Try adjusting your selection.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-full border border-[#dfb15b]/35 px-4 py-2 font-mono text-[9px] tracking-[0.16em] text-[#dfb15b] transition-colors hover:border-[#dfb15b]/65 hover:text-[#f3e1b6]"
            >
              CLEAR FILTERS
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
