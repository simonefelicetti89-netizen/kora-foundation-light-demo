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
    accentClass: 'border-[rgba(199,111,61,0.22)] hover:border-[#C76F3D]',
  },
  {
    label: 'Lavoratore',
    role: 'WORKER',
    route: '/my-kora',
    description: 'PIB privato, timeline personale, Dynamic Impact CV e privacy boundary.',
    accentClass: 'border-[rgba(47,125,85,0.20)] hover:border-[#2F7D55]',
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
    accentClass: 'border-[rgba(217,154,43,0.25)] hover:border-[#D99A2B]',
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
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
        Esplora KORA dai diversi workspace
      </h2>
      <p className="text-sm text-[rgba(6,3,43,0.52)] mb-4 leading-relaxed">
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
                flex flex-col items-start gap-2 rounded-lg border bg-[#F8F6F1] p-4 text-left
                transition-all hover:shadow-sm
                ${ws.accentClass}
                ${isActive ? 'ring-2 ring-offset-1 ring-slate-400' : ''}
              `}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{ws.label}</span>
                {isActive && (
                  <span className="rounded bg-[rgba(6,3,43,0.05)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[rgba(6,3,43,0.52)]">
                    attivo
                  </span>
                )}
              </div>
              <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">{ws.description}</p>
              <span className="mt-auto text-xs font-medium text-[rgba(6,3,43,0.40)]">{ws.route}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
