import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, ArrowRight, Compass } from 'lucide-react';
import { cosmicAudio } from '../../utils/audio';

interface WelcomeScreenProps {
  progress: number; // 0 to 1 (mapped over 8.5s)
  elapsedTime: number; // actual seconds
  onEnter: () => void;
  onSkip: () => void;
  autoEnterCountdown?: number | null;
}

/**
 * WelcomeScreen UI Layer:
 * Strictly fulfills Requirements #7, #8, #9, #12, #13:
 * - Lets the visual experience breathe first (SPACE -> PLANET -> DATA -> PROCESSING -> EXO-AI)
 * - Wordmark appears ONLY after 6.5s (progress ~ 0.76)
 * - Refined scale: clean, elegant typography that does NOT dominate or clutter the viewport
 * - Subtle utility top controls (tiny, low opacity, thin borders)
 * - Seamless keyboard shortcuts (ESC to skip, ENTER/SPACE to enter)
 */
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  progress,
  elapsedTime,
  onEnter,
  onSkip,
  autoEnterCountdown = null,
}) => {
  const [isMuted, setIsMuted] = useState(true);

  const handleToggleSound = () => {
    const isNowUnmuted = cosmicAudio.toggleSound();
    setIsMuted(!isNowUnmuted);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (progress > 0.7) {
          onEnter();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSkip, onEnter, progress]);

  // Timed Sequence (7–9 sec overall):
  // 0.0 - 6.5s: Environment breathes with Planet + Data Streams without typographic clutter
  // 6.5s+: EXO-AI wordmark emerges gently
  const showWordmark = elapsedTime >= 6.4;
  const wordmarkAlpha = Math.min(Math.max((elapsedTime - 6.4) / 1.0, 0), 1);

  // 7.4s+: Welcome State subtitle
  const showWelcome = elapsedTime >= 7.3;
  const welcomeAlpha = Math.min(Math.max((elapsedTime - 7.3) / 0.8, 0), 1);

  // 7.9s+: Subtle Enter Action Button
  const showAction = elapsedTime >= 7.8;
  const actionAlpha = Math.min(Math.max((elapsedTime - 7.8) / 0.7, 0), 1);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 sm:p-8 select-none">
      {/* 1. Subtle, Minimal Utility Top Header */}
      <header
        className="w-full flex items-center justify-between transition-opacity duration-1000"
        style={{ opacity: Math.min(elapsedTime / 2.5, 0.65) }}
      >
        {/* Tiny System ID */}
        <div className="flex items-center space-x-2 font-mono text-[9px] tracking-widest text-[#8c94a0]/70">
          <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]/80 animate-pulse" />
          <span className="text-[#e8eaed]/80 font-medium">EXO-AI</span>
          <span className="text-[#8c94a0]/30">/</span>
          <span className="hidden sm:inline">ASTROPHYSICAL_SYNTHESIS</span>
        </div>

        {/* Minimal utility controls: Sound & Skip */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          <button
            onClick={handleToggleSound}
            aria-label="Toggle sound"
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-transparent hover:bg-[#0D1014]/60 border border-[#141920]/80 hover:border-[#38bdf8]/30 text-[#8c94a0]/60 hover:text-[#e8eaed] transition-colors duration-200 text-[9px] font-mono tracking-wider"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-2.5 h-2.5 text-[#8c94a0]/60" />
                <span className="hidden sm:inline">SOUND OFF</span>
              </>
            ) : (
              <>
                <Volume2 className="w-2.5 h-2.5 text-[#38bdf8]" />
                <span className="hidden sm:inline text-[#38bdf8]">SOUND ON</span>
              </>
            )}
          </button>

          <button
            onClick={onSkip}
            className="px-2 py-0.5 rounded bg-transparent hover:bg-[#0D1014]/60 border border-[#141920]/80 hover:border-[#dfb15b]/30 text-[#8c94a0]/60 hover:text-[#dfb15b] transition-colors duration-200 text-[9px] font-mono tracking-wider"
          >
            SKIP <span className="text-[8px] text-[#8c94a0]/40 hidden sm:inline">[ESC]</span>
          </button>
        </div>
      </header>

      {/* 2. Center Content: Appears ONLY after 6.5s (SPACE -> PLANET -> DATA -> PROCESSING -> EXO-AI) */}
      <main className="my-auto flex flex-col items-center justify-center text-center max-w-lg mx-auto px-4 z-20">
        {/* EXO-AI Wordmark: Refined scale, elegant typography, not dominating */}
        {showWordmark && (
          <div
            className="transition-all duration-1000 ease-out flex flex-col items-center"
            style={{
              opacity: wordmarkAlpha,
              transform: `translateY(${Math.max(0, (1 - wordmarkAlpha) * 14)}px)`,
            }}
          >
            <div className="relative inline-block mb-2">
              <h1 className="text-3xl sm:text-5xl font-light tracking-[0.32em] text-[#e8eaed] font-['Cinzel',sans-serif] drop-shadow-[0_0_25px_rgba(56,189,248,0.2)] pl-[0.32em]">
                EXO-AI
              </h1>
              <div
                className="h-px bg-gradient-to-r from-transparent via-[#dfb15b]/80 to-transparent w-full mt-1.5 transition-all duration-1000"
                style={{ opacity: wordmarkAlpha * 0.6 }}
              />
            </div>
          </div>
        )}

        {/* Welcome State Typography */}
        {showWelcome && (
          <div
            className="mt-1 transition-all duration-1000 ease-out flex flex-col items-center"
            style={{
              opacity: welcomeAlpha,
              transform: `translateY(${Math.max(0, (1 - welcomeAlpha) * 10)}px)`,
            }}
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#38bdf8]/90 mb-1.5 font-medium">
              WELCOME TO EXO-AI
            </p>

            <h2 className="text-sm sm:text-base font-light tracking-wide text-[#e8eaed]/80 max-w-sm font-sans">
              Intelligence for the search beyond Earth.
            </h2>
          </div>
        )}

        {/* Action Button: Clean, subtle, compact */}
        {showAction && (
          <div
            className="mt-6 transition-all duration-1000 ease-out pointer-events-auto flex flex-col items-center"
            style={{
              opacity: actionAlpha,
              transform: `translateY(${Math.max(0, (1 - actionAlpha) * 8)}px)`,
            }}
          >
            <button
              onClick={() => {
                cosmicAudio.playTransitionWhoosh();
                onEnter();
              }}
              className="group relative inline-flex items-center space-x-2.5 px-6 py-2.5 rounded-full bg-[#0D1014]/85 border border-[#38bdf8]/30 hover:border-[#38bdf8]/80 text-[#e8eaed] font-mono text-[11px] tracking-[0.22em] shadow-[0_0_15px_rgba(56,189,248,0.12)] hover:shadow-[0_0_25px_rgba(56,189,248,0.28)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            >
              <Compass className="w-3 h-3 text-[#38bdf8] group-hover:rotate-45 transition-transform duration-500" />
              <span className="font-medium text-[#e8eaed]">ENTER EXO-AI</span>
              <ArrowRight className="w-3 h-3 text-[#dfb15b] group-hover:translate-x-0.5 transition-transform duration-300" />
            </button>

            {autoEnterCountdown !== null && autoEnterCountdown > 0 && (
              <p className="mt-2.5 text-[9px] font-mono text-[#8c94a0]/50 tracking-widest">
                SEQUENCE CONTINUES IN {autoEnterCountdown}s
              </p>
            )}
          </div>
        )}
      </main>

      {/* 3. Subtle Footer Status Line */}
      <footer
        className="w-full flex items-center justify-between text-[9px] font-mono text-[#8c94a0]/50 tracking-widest transition-opacity duration-1000"
        style={{ opacity: Math.min(elapsedTime / 3.0, 0.55) }}
      >
        <div className="flex items-center space-x-3">
          <span>RAW DATA → PLANET → UNDERSTANDING</span>
        </div>

        {/* Thin scientific progress line */}
        <div className="flex items-center space-x-2">
          <span>T+{(elapsedTime).toFixed(1)}s</span>
          <div className="w-20 sm:w-28 h-px bg-[#141920] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#38bdf8] to-[#dfb15b]"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
};
