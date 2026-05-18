'use client';

import { usePersona } from '@/lib/demo-state';

// W-01: My KORA Home
export default function MyKoraHome() {
  const { activePersona } = usePersona();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">My KORA</h1>
      {activePersona ? (
        <p className="text-sm text-slate-600">Welcome, {activePersona.display_name}</p>
      ) : (
        <p className="text-sm text-slate-400">Select a persona from the header to see your impact timeline.</p>
      )}
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
        Personal impact timeline skeleton — Phase 1
      </div>
    </div>
  );
}
