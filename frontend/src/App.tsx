import { useState, useEffect, useRef } from 'react';
import { IntroScene } from './components/intro/IntroScene';
import { WelcomeScreen } from './components/intro/WelcomeScreen';
import { HomeScreen } from './components/home/HomeScreen';
import { ExplorerPage } from './pages/ExplorerPage';
import { RankingsPage } from './pages/RankingsPage';
import { Methodology } from './pages/Methodology';
import { VisualizationsPage } from './pages/VisualizationsPage';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  Analysis,
  Compare,
  PlanetDetails,
} from './components/pages/PlaceholderPages';

export default function App() {
  // Application state: 'intro' | 'transitioning' | 'home'
  // When accessing direct routes (e.g. /explore, /rankings), start directly at 'home'
  const [appState, setAppState] = useState<'intro' | 'transitioning' | 'home'>(() => {
    return typeof window !== 'undefined' && window.location.pathname !== '/' ? 'home' : 'intro';
  });
  
  // Cinematic sequence clock: 0.0s to 8.5s
  const [elapsedTime, setElapsedTime] = useState(0);
  const [autoEnterCountdown, setAutoEnterCountdown] = useState<number | null>(null);

  // Screen responsiveness
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkViewport();

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleMediaChange);
    window.addEventListener('resize', checkViewport);

    return () => {
      window.removeEventListener('resize', checkViewport);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  // Intro animation clock: runs over 8.5s cinematic timeline
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (appState !== 'intro') return;

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = (now - startTimeRef.current) / 1000;
      setElapsedTime(elapsed);

      // Once sequence settles around 8.5s, initiate gentle auto-continue countdown (4s countdown)
      if (elapsed >= 8.5) {
        const remaining = Math.max(0, Math.ceil(12.5 - elapsed));
        setAutoEnterCountdown(remaining);

        if (elapsed >= 12.5) {
          handleEnter();
          return;
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [appState]);

  // Normalized progress over 8.5s benchmark
  const progress = Math.min(elapsedTime / 8.5, 1.0);

  // Transition into Phase 2 Home Screen
  const handleEnter = () => {
    if (appState !== 'intro') return;
    setAppState('transitioning');
    
    // Smooth cinematic transition: fade & scale
    setTimeout(() => {
      setAppState('home');
    }, 1100);
  };

  const handleSkip = () => {
    handleEnter();
  };

  const handleReplayIntro = () => {
    setAppState('intro');
    setElapsedTime(0);
    setAutoEnterCountdown(null);
    startTimeRef.current = null;
  };

  return (
    <div className="relative w-screen h-screen bg-[#050608] text-[#e8eaed] overflow-hidden select-none font-sans">
      {/* 1. Phase 1: 3D Planetary Scene Layer */}
      <div
        className={`absolute inset-0 transition-all duration-1200 ease-in-out ${
          appState === 'transitioning'
            ? 'opacity-0 scale-105 pointer-events-none'
            : appState === 'home'
            ? 'opacity-0 pointer-events-none'
            : 'opacity-100 scale-100'
        }`}
      >
        <IntroScene
          progress={progress}
          isMobile={isMobile}
          reducedMotion={reducedMotion}
        />

        {/* Welcome Screen 2D UI Overlay */}
        <WelcomeScreen
          progress={progress}
          elapsedTime={elapsedTime}
          onEnter={handleEnter}
          onSkip={handleSkip}
          autoEnterCountdown={autoEnterCountdown}
        />
      </div>

      {/* 2. Transition cross-fade veil */}
      <div
        className={`absolute inset-0 bg-[#050608] pointer-events-none transition-opacity duration-1000 ${
          appState === 'transitioning' ? 'opacity-85' : 'opacity-0'
        }`}
      />

      {/* 3. Phase 2: Main Home / Command Center */}
      {appState === 'home' && (
        <div className="absolute inset-0 z-30 transition-opacity duration-1000 opacity-100">
          <Routes>
            <Route path="/" element={<HomeScreen onReplayIntro={handleReplayIntro} />} />
            <Route path="/explore" element={<ExplorerPage onReplayIntro={handleReplayIntro} />} />
            <Route path="/planet/:id" element={<PlanetDetails />} />
            <Route path="/analysis/:id" element={<Analysis />} />
            <Route path="/rankings" element={<RankingsPage onReplayIntro={handleReplayIntro} />} />
            <Route path="/methodology" element={<Methodology onReplayIntro={handleReplayIntro} />} />
            <Route path="/visualizations" element={<VisualizationsPage onReplayIntro={handleReplayIntro} />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}
    </div>
  );
}
