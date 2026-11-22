import React from 'react';

interface ModelStatusProps {
  isDemoMode?: boolean;
}

export const ModelStatus: React.FC<ModelStatusProps> = ({ isDemoMode = false }) => (
  <aside className="mt-7 flex flex-col gap-3 border-l border-[#dfb15b]/45 bg-[#080c12]/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
    <div>
      <p className="font-mono text-[8px] tracking-[0.18em] text-[#8c94a0]">METHODOLOGY & STATUS</p>
      <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-[#dfb15b]">
        {isDemoMode ? 'PROTOTYPE CATALOG · DEMO ORDER' : 'CANDIDATE SCREENING · FASTAPI CONNECTED'}
      </p>
    </div>
    <p className="max-w-xl text-xs leading-relaxed text-[#98a2ae]">
      {isDemoMode
        ? 'Prototype catalog currently in demo order. Connect to the FastAPI backend to view live candidate scores.'
        : 'Scores reflect a transparent rule-based screening heuristic (40% radius, 30% temperature, 30% insolation). A higher score represents candidate screening priority for observational follow-up, NOT an AI habitability prediction or proof of life.'}
    </p>
  </aside>
);
