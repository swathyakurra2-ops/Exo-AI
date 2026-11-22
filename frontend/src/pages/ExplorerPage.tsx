import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExplorerFilters, type DistanceFilter, type ExoplanetSort, type RadiusFilter } from '../components/explorer/ExplorerFilters';
import { ExoplanetCard } from '../components/explorer/ExoplanetCard';
import { TopNavigation } from '../components/home/TopNavigation';
import { getExoplanets } from '../services/exoplanetService';
import type { Exoplanet, PlanetType } from '../types/exoplanet';

interface ExplorerPageProps {
  onReplayIntro: () => void;
}

const sortByNullableNumber = (left: number | null | undefined, right: number | null | undefined) => {
  if ((left === null || left === undefined) && (right === null || right === undefined)) return 0;
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;
  return left - right;
};

const PAGE_SIZE = 60;

export const ExplorerPage: React.FC<ExplorerPageProps> = ({ onReplayIntro }) => {
  const navigate = useNavigate();
  const [planets, setPlanets] = useState<Exoplanet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [search, setSearch] = useState('');
  const [planetType, setPlanetType] = useState<PlanetType | 'all'>('all');
  const [radius, setRadius] = useState<RadiusFilter>('all');
  const [distance, setDistance] = useState<DistanceFilter>('all');
  const [sort, setSort] = useState<ExoplanetSort>('relevance');

  const fetchCatalog = (demo: boolean) => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    getExoplanets({ useDemo: demo })
      .then((results) => {
        setPlanets(results);
        setIsDemoMode(demo);
        setVisibleCount(PAGE_SIZE);
      })
      .catch((err) => {
        setHasError(true);
        setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to backend service.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchCatalog(false);
  }, []);

  const filteredPlanets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const matching = planets.filter((planet) => {
      const matchesSearch = !normalizedSearch
        || planet.name.toLowerCase().includes(normalizedSearch)
        || planet.hostStar.toLowerCase().includes(normalizedSearch);
      const matchesType = planetType === 'all' || planet.planetType === planetType;
      const matchesRadius = radius === 'all'
        || (planet.radiusEarth !== null && planet.radiusEarth !== undefined && (
          (radius === 'under-one' && planet.radiusEarth <= 1)
          || (radius === 'one-to-one-five' && planet.radiusEarth > 1 && planet.radiusEarth <= 1.5)
          || (radius === 'over-one-five' && planet.radiusEarth > 1.5)
        ));
      const matchesDistance = distance === 'all'
        || (planet.distanceLightYears !== null && planet.distanceLightYears !== undefined && (
          (distance === 'nearby' && planet.distanceLightYears < 50)
          || (distance === 'mid-range' && planet.distanceLightYears >= 50 && planet.distanceLightYears <= 500)
          || (distance === 'distant' && planet.distanceLightYears > 500)
        ));

      return matchesSearch && matchesType && matchesRadius && matchesDistance;
    });

    if (sort === 'relevance') return matching;

    return [...matching].sort((left, right) => {
      if (sort === 'name') return left.name.localeCompare(right.name);
      if (sort === 'temperature') return sortByNullableNumber(left.equilibriumTempK, right.equilibriumTempK);
      if (sort === 'radius') return sortByNullableNumber(left.radiusEarth, right.radiusEarth);
      return sortByNullableNumber(left.distanceLightYears, right.distanceLightYears);
    });
  }, [distance, planetType, planets, radius, search, sort]);

  const displayedPlanets = useMemo(() => {
    return filteredPlanets.slice(0, visibleCount);
  }, [filteredPlanets, visibleCount]);

  const clearFilters = () => {
    setSearch('');
    setPlanetType('all');
    setRadius('all');
    setDistance('all');
    setSort('relevance');
    setVisibleCount(PAGE_SIZE);
  };

  const handleNavigate = (view: 'home' | 'explore' | 'rankings' | 'compare' | 'visualizations') => {
    navigate(view === 'home' ? '/' : `/${view}`);
  };

  return (
    <div
      className="relative h-screen overflow-x-hidden overflow-y-auto text-[#e8eaed]"
      style={{
        background: 'radial-gradient(ellipse at 78% 0%, rgba(25, 57, 82, 0.28), transparent 44%), radial-gradient(ellipse at 8% 36%, rgba(150, 117, 61, 0.07), transparent 34%), #050608',
      }}
    >
      <TopNavigation activeView="explore" onNavigate={handleNavigate} onReplayIntro={onReplayIntro} />
      <main className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
        <header className="pb-8 pt-10 sm:pb-10 sm:pt-14 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3 font-mono text-[9px] tracking-[0.26em]">
              <span className="text-[#dfb15b]/85">EXOPLANET CATALOG</span>
              <span className="text-[#455468]">·</span>
              <span className={isDemoMode ? 'text-amber-400' : 'text-emerald-400'}>
                {isDemoMode ? 'DEMO MODE (6 WORLDS)' : 'LIVE FASTAPI CATALOG (6,725 WORLDS)'}
              </span>
            </div>
            <h1 className="font-['Cinzel',sans-serif] text-2xl font-light tracking-[0.12em] text-[#e8eaed] sm:text-3xl">
              EXOPLANET EXPLORER
            </h1>
            <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-[#9ba5b1]">
              Explore Kepler candidates and confirmed worlds from the scientific catalog.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-[8px] tracking-[0.15em]">
            <span className="text-[#75808c]">CATALOG SOURCE:</span>
            <button
              type="button"
              onClick={() => fetchCatalog(!isDemoMode)}
              className="rounded-full border border-[#38bdf8]/40 bg-[#070b11]/80 px-3 py-1.5 text-[#38bdf8] transition-colors hover:border-[#38bdf8]/80 hover:text-white"
            >
              {isDemoMode ? 'SWITCH TO LIVE API' : 'SWITCH TO DEMO DATA'}
            </button>
          </div>
        </header>

        <label className="flex h-14 w-full items-center gap-3 rounded-lg border border-[#34414f]/75 bg-[#070b11]/85 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors focus-within:border-[#38bdf8]/45 sm:px-5">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-[#8bbbd4]" />
          <span className="sr-only">Search exoplanets by name or host star</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search planets, host stars (e.g. K00001.01, KIC 11446443)..."
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#e8eaed] outline-none placeholder:text-[#84909d]"
          />
        </label>

        <div className="mt-5">
          <ExplorerFilters
            planetType={planetType}
            onPlanetTypeChange={(val) => {
              setPlanetType(val);
              setVisibleCount(PAGE_SIZE);
            }}
            temperatureAvailable={planets.some((planet) => planet.equilibriumTempK !== null && planet.equilibriumTempK !== undefined)}
            radius={radius}
            onRadiusChange={(val) => {
              setRadius(val);
              setVisibleCount(PAGE_SIZE);
            }}
            fluxAvailable={planets.some((planet) => planet.stellarFluxEarth !== null && planet.stellarFluxEarth !== undefined)}
            distance={distance}
            onDistanceChange={(val) => {
              setDistance(val);
              setVisibleCount(PAGE_SIZE);
            }}
            sort={sort}
            onSortChange={setSort}
          />
        </div>

        <div className="flex items-center justify-between gap-4 pb-4 pt-7">
          <p className="font-mono text-[9px] tracking-[0.19em] text-[#b1bbc6]" aria-live="polite">
            {isLoading
              ? 'SCANNING CATALOG...'
              : `${filteredPlanets.length} ${filteredPlanets.length === 1 ? 'WORLD' : 'WORLDS'} FOUND`}
          </p>
          {sort !== 'relevance' && (
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#77818d]">Sorted by {sort}</p>
          )}
        </div>

        {hasError ? (
          <div className="rounded-md border border-red-500/25 bg-[#140a0c]/80 px-6 py-12 text-center">
            <h2 className="font-mono text-[11px] tracking-[0.2em] text-red-400">THE CATALOG COULD NOT BE LOADED</h2>
            <p className="mt-2 text-xs text-[#9ba5b1]">
              {errorMessage || 'FastAPI backend is unreachable on http://localhost:8000.'}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => fetchCatalog(false)}
                className="rounded-full border border-white/20 px-4 py-2 font-mono text-[9px] tracking-[0.16em] text-[#e8eaed] transition-colors hover:border-white/50"
              >
                RETRY LIVE API
              </button>
              <button
                type="button"
                onClick={() => fetchCatalog(true)}
                className="rounded-full border border-[#dfb15b]/50 px-4 py-2 font-mono text-[9px] tracking-[0.16em] text-[#dfb15b] transition-colors hover:border-[#dfb15b]/90 hover:text-[#f3e1b6]"
              >
                VIEW DEMO CATALOG
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="border-y border-white/10 py-16 text-center">
            <p className="font-mono text-xs tracking-[0.2em] text-[#8bbbd4] animate-pulse">CONNECTING TO FASTAPI CATALOG...</p>
          </div>
        ) : displayedPlanets.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {displayedPlanets.map((planet) => (
                <ExoplanetCard key={planet.id} planet={planet} />
              ))}
            </div>

            {visibleCount < filteredPlanets.length && (
              <div className="mt-10 flex flex-col items-center justify-center gap-2">
                <p className="font-mono text-[9px] tracking-[0.16em] text-[#77818d]">
                  SHOWING {displayedPlanets.length} OF {filteredPlanets.length} WORLDS
                </p>
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="rounded-full border border-[#38bdf8]/40 bg-[#070b11]/85 px-6 py-2.5 font-mono text-[10px] tracking-[0.2em] text-[#38bdf8] transition-colors hover:border-[#38bdf8]/80 hover:text-white"
                >
                  LOAD MORE WORLDS
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-md border border-white/[0.08] bg-[#070b11]/65 px-5 py-14 text-center">
            <h2 className="font-mono text-[10px] tracking-[0.2em] text-[#e8eaed]">NO WORLDS MATCH YOUR SEARCH</h2>
            <p className="mt-3 text-xs text-[#9ba5b1]">Try adjusting your filters or search terms.</p>
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
