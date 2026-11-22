import React from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopNavigation } from '../components/home/TopNavigation';

interface MethodologyProps {
  onReplayIntro: () => void;
}

const pipeline = [
  {
    number: '01',
    title: 'DATA',
    description: 'Known exoplanet and stellar observations form the starting point.',
    details: 'Planet radius · mass · stellar flux · orbital characteristics · equilibrium temperature · host-star properties',
  },
  {
    number: '02',
    title: 'FEATURES',
    description: 'Relevant planetary and stellar characteristics are prepared as model features.',
    details: 'Preprocessing · missing-value handling where applicable · feature selection',
  },
  {
    number: '03',
    title: 'ANALYSIS',
    description: 'The project’s machine-learning model will analyze relationships between candidate characteristics.',
    details: 'Model integration is in development. No analysis results are available yet.',
  },
  {
    number: '04',
    title: 'PRIORITIZATION',
    description: 'Candidates can ultimately be ordered for further scientific investigation.',
    details: 'Candidate prioritization · not life detection',
  },
];

const factors = [
  { title: 'PLANETARY SCALE', description: 'Radius and mass-related characteristics.' },
  { title: 'ENERGY RECEIVED', description: 'Stellar flux and irradiation.' },
  { title: 'THERMAL CONDITIONS', description: 'Temperature-related characteristics.' },
  { title: 'ORBITAL CONTEXT', description: 'Orbital period and related properties.' },
  { title: 'HOST STAR', description: 'Characteristics of the star hosting the planet.' },
  { title: 'OTHER OBSERVABLES', description: 'Additional available planetary and stellar measurements.' },
];

const limitations = [
  'Available observations may be incomplete.',
  'Some planetary properties are estimated rather than directly measured.',
  'Model outputs depend on the quality and coverage of the training data.',
  'A model can identify promising candidates, but it cannot establish the presence of life.',
  'Scientific validation still requires observation and further study.',
];

export const Methodology: React.FC<MethodologyProps> = ({ onReplayIntro }) => {
  const navigate = useNavigate();
  const handleNavigate = (view: 'home' | 'explore' | 'rankings' | 'compare' | 'visualizations') => {
    navigate(view === 'home' ? '/' : `/${view}`);
  };

  return (
    <div
      className="h-screen overflow-x-hidden overflow-y-auto text-[#e8eaed]"
      style={{
        background: 'radial-gradient(ellipse at 78% 0%, rgba(25, 57, 82, 0.28), transparent 44%), radial-gradient(ellipse at 8% 36%, rgba(150, 117, 61, 0.07), transparent 34%), #050608',
      }}
    >
      <TopNavigation activeView="methodology" onNavigate={handleNavigate} onReplayIntro={onReplayIntro} />

      <main className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
        <header className="pb-10 pt-10 sm:pb-14 sm:pt-14">
          <p className="mb-3 font-mono text-[9px] tracking-[0.26em] text-[#dfb15b]/85">EXO-AI / METHODOLOGY</p>
          <h1 className="font-['Cinzel',sans-serif] text-2xl font-light tracking-[0.12em] text-[#e8eaed] sm:text-3xl">
            HOW EXO-AI WORKS
          </h1>
          <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-[#9ba5b1]">
            From astronomical observations to intelligent candidate prioritization.
          </p>
        </header>

        <section aria-labelledby="pipeline-heading" className="pb-16 sm:pb-20">
          <div className="mb-6 flex items-center justify-between border-b border-white/[0.09] pb-3">
            <h2 id="pipeline-heading" className="font-mono text-[9px] tracking-[0.2em] text-[#aeb8c3]">
              THE ANALYSIS PIPELINE
            </h2>
            <span className="font-mono text-[8px] tracking-[0.14em] text-[#77818d]">OBSERVATION → PRIORITY</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4">
            {pipeline.map((stage, index) => (
              <div key={stage.number} className="relative border-l border-[#344454]/80 py-2 pl-5 pr-5 sm:pl-6 md:min-h-64 md:py-4">
                <div className="mb-5 flex items-center gap-3">
                  <span className={`font-mono text-[9px] tracking-wider ${index === 3 ? 'text-[#dfb15b]' : 'text-[#70b4d4]'}`}>
                    {stage.number}
                  </span>
                  <span className="h-px w-7 bg-[#465665]/75" />
                </div>
                <h3 className="font-['Cinzel',sans-serif] text-sm tracking-[0.12em] text-[#e8eaed]">{stage.title}</h3>
                <p className="mt-3 max-w-xs text-xs leading-relaxed text-[#a1abb6]">{stage.description}</p>
                <p className="mt-4 max-w-xs font-mono text-[9px] leading-relaxed text-[#748391]">{stage.details}</p>
                {index < pipeline.length - 1 && (
                  <>
                    <ArrowDown aria-hidden="true" className="absolute -bottom-4 left-4 z-10 h-4 w-4 text-[#dfb15b]/75 md:hidden" />
                    <ArrowRight aria-hidden="true" className="absolute right-2 top-5 hidden h-4 w-4 text-[#dfb15b]/75 md:block" />
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="factors-heading" className="pb-16 sm:pb-20">
          <div className="mb-6 border-b border-white/[0.09] pb-3">
            <h2 id="factors-heading" className="font-mono text-[9px] tracking-[0.2em] text-[#aeb8c3]">WHAT WE CONSIDER</h2>
          </div>
          <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {factors.map((factor, index) => (
              <article key={factor.title} className="border-b border-white/[0.08] py-5">
                <p className="mb-2 font-mono text-[8px] tracking-[0.18em] text-[#80b9d4]">0{index + 1} / FACTOR</p>
                <h3 className="font-['Cinzel',sans-serif] text-xs tracking-[0.1em] text-[#e1e6ec]">{factor.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#909ca8]">{factor.description}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-[10px] leading-relaxed text-[#75818e]">
            The characteristics available for analysis depend on the observations and model inputs provided.
          </p>
        </section>

        <section aria-labelledby="why-heading" className="grid gap-8 border-y border-white/[0.09] py-8 sm:grid-cols-[minmax(150px,0.7fr)_2fr] sm:gap-12 sm:py-10">
          <h2 id="why-heading" className="font-['Cinzel',sans-serif] text-sm tracking-[0.14em] text-[#e8eaed]">
            WHY MACHINE LEARNING?
          </h2>
          <div className="max-w-3xl space-y-4 text-sm font-light leading-relaxed text-[#a5afb9]">
            <p>
              Simple rule-based filters can identify obvious candidates, but planetary habitability is influenced by multiple interacting characteristics.
            </p>
            <p>
              Machine learning can help identify patterns across multiple variables and prioritize candidates for closer examination. It is a tool for organizing scientific attention, not a substitute for evidence or expert review.
            </p>
          </div>
        </section>

        <section aria-labelledby="score-heading" className="my-16 border-l-2 border-[#dfb15b]/70 bg-[#0a0d12]/70 px-5 py-6 sm:my-20 sm:px-8 sm:py-8">
          <p className="mb-3 font-mono text-[8px] tracking-[0.2em] text-[#dfb15b]">SCIENTIFIC INTERPRETATION</p>
          <h2 id="score-heading" className="font-['Cinzel',sans-serif] text-sm tracking-[0.12em] text-[#e8eaed]">WHAT THE SCORE MEANS</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#a5afb9]">
            A higher EXO-AI priority does <strong className="font-medium text-[#e8eaed]">NOT</strong> mean that a planet is inhabited or definitively habitable.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#d9dee5]">
            It means: <span className="text-[#f0d9a6]">“the candidate warrants greater attention based on the characteristics considered by the model.”</span>
          </p>
        </section>

        <section aria-labelledby="limitations-heading" className="pb-16 sm:pb-20">
          <div className="mb-6 border-b border-white/[0.09] pb-3">
            <h2 id="limitations-heading" className="font-mono text-[9px] tracking-[0.2em] text-[#aeb8c3]">LIMITATIONS</h2>
          </div>
          <ul className="grid grid-cols-1 gap-x-12 sm:grid-cols-2">
            {limitations.map((limitation, index) => (
              <li key={limitation} className="flex gap-3 border-b border-white/[0.06] py-3 text-xs leading-relaxed text-[#98a3ae]">
                <span className="font-mono text-[8px] text-[#dfb15b]/75">0{index + 1}</span>
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="development-heading" className="border-t border-white/[0.09] pt-6">
          <h2 id="development-heading" className="mb-5 font-mono text-[9px] tracking-[0.2em] text-[#aeb8c3]">CURRENT DEVELOPMENT</h2>
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-l border-[#344454] py-2 pl-4">
              <dt className="font-mono text-[8px] tracking-[0.16em] text-[#74818e]">FRONTEND</dt>
              <dd className="mt-2 text-xs text-[#b9c5ce]">CONNECTED</dd>
            </div>
            <div className="border-l border-[#344454] py-2 pl-4">
              <dt className="font-mono text-[8px] tracking-[0.16em] text-[#74818e]">EXPLORER</dt>
              <dd className="mt-2 text-xs text-[#b9c5ce]">AVAILABLE</dd>
            </div>
            <div className="border-l border-[#344454] py-2 pl-4">
              <dt className="font-mono text-[8px] tracking-[0.16em] text-[#74818e]">RANKINGS</dt>
              <dd className="mt-2 text-xs text-[#b9c5ce]">PROTOTYPE</dd>
            </div>
            <div className="border-l border-[#dfb15b]/50 py-2 pl-4">
              <dt className="font-mono text-[8px] tracking-[0.16em] text-[#74818e]">ANALYSIS MODEL</dt>
              <dd className="mt-2 text-xs text-[#dfb15b]">AWAITING BACKEND INTEGRATION</dd>
            </div>
          </dl>
        </section>

        <div className="h-12" aria-hidden="true" />
      </main>
    </div>
  );
};