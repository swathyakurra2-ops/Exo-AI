import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { cosmicAudio } from '../../utils/audio';

interface AICommandBoxProps {
  onQuerySubmit: (query: string) => void;
}

/**
 * AICommandBox — Refined:
 * Dark instrument panel floating quietly in deep cosmic space:
 * - Clean dark charcoal #111318 surface
 * - Subtle cool gray border #1e2430 (subtle cosmic blue on focus)
 * - NO heavy outer glow or glassmorphism
 * - Moderate radius, restrained shadow
 * - One subtle rotating prompt at a time
 * - Subtle send button
 */
export const AICommandBox: React.FC<AICommandBoxProps> = ({
  onQuerySubmit,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rotating example prompts (one at a time)
  const examplePrompts = [
    'Find potentially habitable planets',
    'Show Earth-like candidates',
    'Find planets with favorable stellar flux',
  ];
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setExampleIndex((prev) => (prev + 1) % examplePrompts.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [examplePrompts.length]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    cosmicAudio.playDataBlip();
    onQuerySubmit(cleanQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectExample = (text: string) => {
    setQuery(text);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="w-full max-w-[620px] mx-auto select-none">
      {/* 1. Dark Instrument Panel Container */}
      <div
        className={`relative rounded-xl transition-all duration-200 bg-[#111318] border p-3.5 sm:p-4 shadow-xl shadow-black/70 ${
          isFocused ? 'border-[#38bdf8]/50' : 'border-[#1e2430] hover:border-[#283244]'
        }`}
      >
        {/* Input text field */}
        <textarea
          ref={textareaRef}
          rows={2}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Ask EXO-AI about an exoplanet..."
          className="w-full bg-transparent text-[#e8eaed] placeholder-[#8c94a0]/50 resize-none outline-none font-sans text-sm leading-relaxed tracking-wide"
        />

        {/* Bottom bar inside panel */}
        <div className="mt-2 pt-2 border-t border-[#181d26] flex items-center justify-between text-xs">
          {/* Subtle rotating suggestion */}
          <div
            onClick={() => handleSelectExample(examplePrompts[exampleIndex])}
            className="flex items-center space-x-1.5 text-[11px] font-mono text-[#8c94a0]/60 hover:text-[#38bdf8] transition-colors cursor-pointer truncate max-w-[80%]"
            title="Click to use prompt"
          >
            <span className="text-[#dfb15b]/70">✦</span>
            <span className="truncate">"{examplePrompts[exampleIndex]}"</span>
          </div>

          {/* Clean, understated send button */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!query.trim()}
            aria-label="Send query to EXO-AI"
            className={`p-1.5 rounded-md transition-all duration-200 flex items-center justify-center ${
              query.trim()
                ? 'bg-[#e8eaed] text-[#050608] hover:bg-[#38bdf8] hover:text-[#050608]'
                : 'text-[#8c94a0]/30 cursor-not-allowed'
            }`}
          >
            <ArrowUp className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );
};
