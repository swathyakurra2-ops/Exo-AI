import React from 'react';

/**
 * Full-bleed cinematic homepage environment.
 */
export const CraterBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none select-none bg-[#050608]"
    >
      <img
        src="/assets/exo-home-cosmic.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-bottom"
        style={{ filter: 'brightness(0.82) contrast(1.05)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050608]/15 via-transparent to-[#050608]/20" />
    </div>
  );
};
