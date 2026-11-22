import React from 'react';
import { Link, useParams } from 'react-router-dom';

const PlaceholderPage: React.FC<{ title: string; id?: string }> = ({ title, id }) => (
  <main className="min-h-screen bg-[#050608] p-8 font-sans text-[#e8eaed]">
    <h1 className="text-xl">{title}{id ? `: ${id}` : ''}</h1>
    <Link className="mt-4 inline-block text-[#38bdf8]" to="/">Home</Link>
  </main>
);

export const PlanetDetails: React.FC = () => {
  const { id } = useParams();
  return <PlaceholderPage title="Planet Details" id={id} />;
};

export const Analysis: React.FC = () => {
  const { id } = useParams();
  return <PlaceholderPage title="Habitability Analysis" id={id} />;
};

export const Compare: React.FC = () => <PlaceholderPage title="Compare" />;