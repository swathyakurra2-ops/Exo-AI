import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Compass,
  Database,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  FlaskConical,
} from 'lucide-react';
import { TopNavigation } from '../components/home/TopNavigation';
import { getExoplanets } from '../services/exoplanetService';
import type { Exoplanet } from '../types/exoplanet';
import { PopulationScatterPlot } from '../components/visualizations/PopulationScatterPlot';
import { DistributionHistograms } from '../components/visualizations/DistributionHistograms';
import { DispositionDonut } from '../components/visualizations/DispositionDonut';
import { HabitableZoneVisual } from '../components/visualizations/HabitableZoneVisual';
import { PlanetInspectorCard } from '../components/visualizations/PlanetInspectorCard';
import { HiteVisualization } from '../components/visualizations/HiteVisualization';
import { HitePlanetProfile } from '../components/visualizations/HitePlanetProfile';

interface VisualizationsPageProps {
  onReplayIntro: () => void;
}

export const VisualizationsPage: React.FC<VisualizationsPageProps> = ({ onReplayIntro }) => {
  const navigate = useNavigate();

  // Dataset state
  const [planets, setPlanets] = useState<Exoplanet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Active target selection
  const [selectedPlanet, setSelectedPlanet] = useState<Exoplanet | null>(null);

  // Fetch catalog records
  const fetchCatalog = () => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    getExoplanets()
      .then((records) => {
        setPlanets(records);

        setSelectedPlanet(records[0] || null);
      })
      .catch((err) => {
        setHasError(true);
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to retrieve observational records from FastAPI backend.'
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Compute live dataset telemetry statistics
  const stats = useMemo(() => {
    const totalLoaded = planets.length;
    const validRadiusCount = planets.filter((p) => p.radiusEarth !== null && p.radiusEarth !== undefined).length;
    const validTempCount = planets.filter(
      (p) => p.equilibriumTempK !== null && p.equilibriumTempK !== undefined
    ).length;
    const validFluxCount = planets.filter(
      (p) => p.stellarFluxEarth !== null && p.stellarFluxEarth !== undefined
    ).length;

    const confirmedCount = planets.filter((p) => (p.disposition || '').toUpperCase() === 'CONFIRMED').length;
    const candidateCount = planets.filter((p) => (p.disposition || '').toUpperCase() === 'CANDIDATE').length;

    return {
      totalLoaded,
      validRadiusCount,
      validTempCount,
      validFluxCount,
      confirmedCount,
      candidateCount,
    };
  }, [planets]);

  const handleNavigate = (view: 'home' | 'explore' | 'rankings' | 'compare' | 'visualizations') => {
    navigate(view === 'home' ? '/' : `/${view}`);
  };

  return (
    <div
      className="h-screen overflow-x-hidden overflow-y-auto text-[#e8eaed]"
      style={{
        background:
          'radial-gradient(ellipse at 80% 0%, rgba(25, 57, 82, 0.28), transparent 45%), radial-gradient(ellipse at 12% 40%, rgba(150, 117, 61, 0.08), transparent 38%), #050608',
      }}
    >
      {/* 1. Observatory Top Navigation */}
      <TopNavigation
        activeView="visualizations"
        onNavigate={handleNavigate}
        onReplayIntro={onReplayIntro}
      />

      {/* 2. Observatory Main Canvas */}
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-8 lg:px-12">
        {/* Section Header */}
        <header className="border-b border-white/[0.06] pb-6 pt-8 sm:pt-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 font-mono text-[9px] tracking-[0.26em]">
              <span className="text-[#38bdf8]">EXO-AI / SCIENTIFIC DATA OBSERVATORY</span>
              <span className="text-[#455468]">·</span>
              <span className="text-emerald-400">LIVE KEPLER MISSION ARCHIVE</span>
            </div>

            <h1 className="font-['Cinzel',sans-serif] text-2xl font-light tracking-[0.14em] text-[#e8eaed] sm:text-3xl lg:text-4xl">
              SCIENTIFIC DATA VISUALIZATION
            </h1>

            <p className="mt-2.5 max-w-2xl text-xs sm:text-sm font-light leading-relaxed text-[#9ba5b1]">
              Explore planetary distributions, stellar properties and habitability indicators across the Kepler catalog.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fetchCatalog}
              className="flex items-center gap-2 rounded-full border border-[#38bdf8]/30 bg-[#070b11]/80 px-3.5 py-1.5 font-mono text-[9px] tracking-wider text-[#38bdf8] transition-colors hover:border-[#38bdf8]/70 hover:bg-[#38bdf8]/10"
            >
              <RefreshCw className="w-3 h-3" />
              <span>REFRESH LIVE API</span>
            </button>
          </div>
        </header>

        {/* Header Telemetry Stat Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          <div className="rounded-md border border-[#1e2733]/80 bg-[#070b11]/70 p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-[#8c94a0]/70 font-mono text-[9px] uppercase tracking-wider">
              <span>TOTAL RECORDS LOADED</span>
              <Database className="w-3.5 h-3.5 text-[#38bdf8]/70" />
            </div>
            <div className="mt-2 font-mono text-xl sm:text-2xl font-light text-[#e8eaed]">
              {isLoading ? '...' : stats.totalLoaded.toLocaleString()}
            </div>
            <div className="mt-1 font-mono text-[8px] tracking-wider text-[#5a6878]">
              Kepler Space Telescope Catalog
            </div>
          </div>

          <div className="rounded-md border border-[#1e2733]/80 bg-[#070b11]/70 p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-[#8c94a0]/70 font-mono text-[9px] uppercase tracking-wider">
              <span>VALID RADII</span>
              <Activity className="w-3.5 h-3.5 text-[#38bdf8]/70" />
            </div>
            <div className="mt-2 font-mono text-xl sm:text-2xl font-light text-[#38bdf8]">
              {isLoading ? '...' : stats.validRadiusCount.toLocaleString()}
            </div>
            <div className="mt-1 font-mono text-[8px] tracking-wider text-[#5a6878]">
              {stats.totalLoaded > 0 ? `${((stats.validRadiusCount / stats.totalLoaded) * 100).toFixed(1)}% completeness` : '0%'}
            </div>
          </div>

          <div className="rounded-md border border-[#1e2733]/80 bg-[#070b11]/70 p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-[#8c94a0]/70 font-mono text-[9px] uppercase tracking-wider">
              <span>VALID TEMPERATURES</span>
              <Sparkles className="w-3.5 h-3.5 text-[#dfb15b]/70" />
            </div>
            <div className="mt-2 font-mono text-xl sm:text-2xl font-light text-[#dfb15b]">
              {isLoading ? '...' : stats.validTempCount.toLocaleString()}
            </div>
            <div className="mt-1 font-mono text-[8px] tracking-wider text-[#5a6878]">
              {stats.totalLoaded > 0 ? `${((stats.validTempCount / stats.totalLoaded) * 100).toFixed(1)}% completeness` : '0%'}
            </div>
          </div>

          <div className="rounded-md border border-[#38bdf8]/30 bg-[#070b11]/90 p-3.5 shadow-[0_0_15px_rgba(56,189,248,0.05)]">
            <div className="flex items-center justify-between text-[#38bdf8] font-mono text-[9px] uppercase tracking-wider">
              <span>SELECTED TARGET</span>
              <Compass className="w-3.5 h-3.5 text-[#38bdf8]" />
            </div>
            <div className="mt-2 truncate font-mono text-lg sm:text-xl font-medium text-white">
              {selectedPlanet ? selectedPlanet.name : 'NONE'}
            </div>
            <div className="mt-1 truncate font-mono text-[8px] tracking-wider text-[#788898]">
              {selectedPlanet ? `Host: ${selectedPlanet.hostStar}` : 'Select a specimen below'}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="my-16 flex flex-col items-center justify-center rounded-lg border border-[#1e2733] bg-[#070b11]/60 py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#38bdf8]" />
            <p className="mt-4 font-mono text-xs tracking-[0.2em] text-[#e8eaed]">
              INITIALIZING OBSERVATORY INSTRUMENTS...
            </p>
            <p className="mt-1.5 font-mono text-[9px] tracking-wider text-[#788898]">
              STREAMING 6,725 KEPLER OBSERVATIONS FROM FASTAPI BACKEND
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && hasError && (
          <div className="my-12 rounded-lg border border-red-500/40 bg-red-950/20 p-8 text-center">
            <AlertCircle className="mx-auto w-10 h-10 text-red-400" />
            <h3 className="mt-3 font-['Cinzel',sans-serif] text-base text-red-200">
              FASTAPI TELEMETRY LINK OFFLINE
            </h3>
            <p className="mx-auto mt-2 max-w-md font-mono text-xs text-[#a0aab8]">
              {errorMessage}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={fetchCatalog}
                className="rounded border border-[#38bdf8]/50 bg-[#070b11] px-4 py-2 font-mono text-xs tracking-wider text-[#38bdf8] hover:bg-[#38bdf8]/10"
              >
                RETRY CONNECTION
              </button>
            </div>
          </div>
        )}

        {!isLoading && !hasError && planets.length === 0 && (
          <div className="my-12 rounded-lg border border-[#1e2733] bg-[#070b11]/60 p-12 text-center">
            <Database className="mx-auto h-10 w-10 text-[#788898]" />
            <h3 className="mt-3 font-['Cinzel',sans-serif] text-base text-[#e8eaed]">
              NO CATALOG RECORDS AVAILABLE
            </h3>
            <p className="mt-2 font-mono text-xs text-[#a0aab8]">
              The live API returned an empty catalog.
            </p>
          </div>
        )}

        {/* Active Visualization Dashboard */}
        {!isLoading && !hasError && planets.length > 0 && (
          <div className="mt-8 space-y-8">
            {/* Row 1: Population Analytics — Scatter Plot (left/main) & Disposition Donut (right) */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2 font-mono text-[9px] tracking-[0.2em] text-[#8c94a0]/80">
                <BarChart3 className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>POPULATION ANALYTICS &amp; DEMOGRAPHICS</span>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* 1. Scatter Plot (8 cols on lg) */}
                <div className="lg:col-span-8">
                  <PopulationScatterPlot
                    planets={planets}
                    selectedPlanet={selectedPlanet}
                    onSelectPlanet={(p) => setSelectedPlanet(p)}
                  />
                </div>

                {/* 2. Disposition Donut (4 cols on lg) */}
                <div className="lg:col-span-4">
                  <DispositionDonut
                    planets={planets}
                    selectedPlanet={selectedPlanet}
                  />
                </div>
              </div>
            </section>

            {/* Row 2: Target Telemetry & Scientific Habitable Zone Model */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2 font-mono text-[9px] tracking-[0.2em] text-[#dfb15b]">
                <Layers className="w-3.5 h-3.5 text-[#dfb15b]" />
                <span>INDIVIDUAL TARGET INSPECTION &amp; HABITABILITY GRADIENT</span>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* 1. Target Telemetry Inspector Card (7 cols on lg) */}
                <div className="lg:col-span-7">
                  <PlanetInspectorCard
                    planets={planets}
                    selectedPlanet={selectedPlanet}
                    onSelectPlanet={(p) => setSelectedPlanet(p)}
                  />
                </div>

                {/* 2. Habitable Zone Visual (5 cols on lg) */}
                <div className="lg:col-span-5">
                  <HabitableZoneVisual selectedPlanet={selectedPlanet} />
                </div>
              </div>
            </section>

            {/* Row 3: Binned Population Distributions (Radius & Temperature Histograms) */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2 font-mono text-[9px] tracking-[0.2em] text-[#38bdf8]">
                <Activity className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>PHYSICAL ATTRIBUTE DISTRIBUTIONS (BINNED FREQUENCIES)</span>
              </div>

              <div>
                <DistributionHistograms
                  planets={planets}
                  selectedPlanet={selectedPlanet}
                />
              </div>
            </section>

            {/* Row 4: HITE — Habitability Index for Transiting Exoplanets */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2 font-mono text-[9px] tracking-[0.2em] text-[#dfb15b]">
                <FlaskConical className="w-3.5 h-3.5 text-[#dfb15b]" />
                <span>HITE — HABITABILITY INDEX FOR TRANSITING EXOPLANETS (BARNES ET AL. 2015)</span>
              </div>

              {/* HITE charts and stats */}
              <HiteVisualization
                planets={planets}
                selectedPlanet={selectedPlanet}
                onSelectPlanet={(p) => setSelectedPlanet(p)}
              />

              {/* Individual planet HITE profile — shown below charts */}
              <HitePlanetProfile planet={selectedPlanet} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
