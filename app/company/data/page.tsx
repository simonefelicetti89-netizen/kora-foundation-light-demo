'use client';
// C-03: Data Intake Studio™ — stato delle fonti dati e readiness per il calcolo KORA.
// Live-only: richiede una sessione company autenticata (COMPANY_ADMIN). B144: demo branch rimosso.
// Senza sessione live → NoDataState. Nessun dato sintetico. Nessun branch demo.

import Link from 'next/link';
import { useCompanySession } from '../_providers/CompanySessionProvider';

// ─── C-06: KORA Readiness & Data Inventory ──────────────────────────────────
export default function DataEvidence() {
  const { isLive, companyName: liveCompanyName, sessionLoading } = useCompanySession();

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-xs text-[rgba(6,3,43,0.40)]">
        Caricamento sessione…
      </div>
    );
  }

  if (!isLive) {
    return (
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-6 text-xs text-[rgba(6,3,43,0.52)] text-center">
        Sessione non disponibile. Ricaricare la pagina o effettuare nuovamente il login.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-5 py-4">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.62)] mb-1">Elaborazione gestita da KORA Operator</p>
        <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">
          KORA Admin elabora i tuoi file prima che entrino nel calcolo del KORA Index.
          Lo stato delle tue evidenze viene aggiornato nel workspace quando KORA Admin completa la revisione.
        </p>
      </div>
      <div style={{ padding: '8px 0' }}>
        <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">
          Stato Dati &amp; Evidenze · LIVE
        </p>
        <h1 className="text-xl font-bold text-[#06032B] mb-2">
          {liveCompanyName ?? 'La tua organizzazione'}
        </h1>
        <p className="text-sm text-[rgba(6,3,43,0.55)] max-w-xl leading-relaxed">
          Il dettaglio delle fonti dati e delle evidenze per il tuo tenant sarà visibile qui
          una volta che KORA Admin avrà elaborato il primo batch di dati.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/company/workspace"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(6,3,43,0.12)] bg-[rgba(6,3,43,0.04)] px-3.5 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.72)] hover:bg-[rgba(6,3,43,0.08)] transition-colors"
          >
            ← Torna al Workspace
          </Link>
          <Link
            href="/company/ingestion"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(6,3,43,0.12)] bg-[rgba(6,3,43,0.04)] px-3.5 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.72)] hover:bg-[rgba(6,3,43,0.08)] transition-colors"
          >
            Vedi stato del processo di intake →
          </Link>
        </div>
      </div>
    </div>
  );
}
