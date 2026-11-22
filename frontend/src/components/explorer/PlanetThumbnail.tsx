import React from 'react';

interface PlanetThumbnailProps {
  planetId: string;
  size?: 'default' | 'small';
}

const palettes = [
  { light: 'rgba(181, 205, 214, 0.92)', mid: 'rgba(67, 110, 130, 0.9)', dark: 'rgba(15, 29, 42, 0.98)', glow: 'rgba(91, 160, 188, 0.12)' },
  { light: 'rgba(218, 197, 156, 0.88)', mid: 'rgba(117, 94, 62, 0.9)', dark: 'rgba(31, 27, 24, 0.98)', glow: 'rgba(191, 151, 91, 0.1)' },
  { light: 'rgba(181, 195, 218, 0.9)', mid: 'rgba(73, 92, 125, 0.9)', dark: 'rgba(18, 24, 38, 0.98)', glow: 'rgba(107, 145, 192, 0.11)' },
  { light: 'rgba(197, 181, 188, 0.88)', mid: 'rgba(111, 80, 96, 0.9)', dark: 'rgba(30, 22, 31, 0.98)', glow: 'rgba(166, 116, 142, 0.09)' },
];

export const PlanetThumbnail: React.FC<PlanetThumbnailProps> = ({ planetId, size = 'default' }) => {
  const paletteIndex = [...planetId].reduce((sum, character) => sum + character.charCodeAt(0), 0) % palettes.length;
  const palette = palettes[paletteIndex];
  const isSmall = size === 'small';

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${isSmall ? 'h-14 w-14 shrink-0' : 'h-32 border-b border-white/[0.06]'}`} aria-hidden="true">
      <div className={`absolute rounded-full opacity-75 blur-2xl ${isSmall ? 'h-12 w-12' : 'h-28 w-28'}`} style={{ background: palette.glow }} />
      <div
        className={`relative rounded-full ring-1 ring-white/10 transition duration-300 group-hover:brightness-110 ${isSmall ? 'h-10 w-10' : 'h-[76px] w-[76px]'}`}
        style={{
          background: `radial-gradient(circle at 32% 27%, ${palette.light} 0%, ${palette.mid} 30%, ${palette.dark} 76%)`,
          boxShadow: `inset -12px -10px 22px rgba(0, 0, 0, 0.58), inset 3px 3px 10px rgba(255, 255, 255, 0.12), 0 0 24px ${palette.glow}`,
        }}
      >
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/[0.08] via-transparent to-black/30" />
      </div>
    </div>
  );
};