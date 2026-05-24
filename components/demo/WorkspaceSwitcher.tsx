'use client';

import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/demo-state';
import type { KoraRole } from '@/lib/types';

interface WorkspaceCard {
  label: string;
  role: KoraRole;
  route: string;
  description: string;
  accentClass: string;
}

const WORKSPACES: WorkspaceCard[] = [
  {
    label: 'Azienda',
    role: 'COMPANY_ADMIN',
    route: '/company',
    description: 'Executive Cockpit, KORA Index, Activation, Reports e Decision Pack.',
    accentClass: 'border-indigo-200 hover:border-indigo-400',
  },
  {
    label: 'Lavoratore',
    role: 'WORKER',
    route: '/my-kora',
    description: 'PIB privato, timeline personale, Dynamic Impact CV e privacy boundary.',
    accentClass: 'border-emerald-200 hover:border-emerald-400',
  },
  {
    label: 'Partner',
    role: 'PARTNER',
    route: '/partner',
    description: 'Operating preview: richieste di attivazione, advisor review, disponibilità, evidenze e KORA Link / QR preview.',
    accentClass: 'border-violet-200 hover:border-violet-400',
  },
  {
    label: 'Advisor',
    role: 'ADVISOR',
    route: '/advisor',
    description: 'Review queue, evidence review, Confidence Stamp e boundary Advisor-reviewed ≠ Certified.',
    accentClass: 'border-amber-200 hover:border-amber-400',
  },
];

export function WorkspaceSwitcher() {
  const { activeRole, setRole } = useRole();
  const router = useRouter();

  function handleSelect(role: KoraRole, route: string) {
    setRole(role);
    router.push(route);
  }

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
        Esplora KORA dai diversi workspace
      </h2>
      <p className="text-sm text-slate-500 mb-4 leading-relaxed">
        KORA Foundation Light è una demo multi-sided. Cambia ruolo demo per vedere come azienda,
        lavoratore, partner e advisor partecipano allo stesso ciclo di attivazione.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {WORKSPACES.map((ws) => {
          const isActive = activeRole === ws.role;
          return (
            <button
              key={ws.role}
              onClick={() => handleSelect(ws.role, ws.route)}
              className={`
                flex flex-col items-start gap-2 rounded-lg border bg-white p-4 text-left
                transition-all hover:shadow-sm
                ${ws.accentClass}
                ${isActive ? 'ring-2 ring-offset-1 ring-slate-400' : ''}
              `}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">{ws.label}</span>
                {isActive && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    attivo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{ws.description}</p>
              <span className="mt-auto text-xs font-medium text-slate-400">{ws.route}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
