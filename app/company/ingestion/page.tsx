'use client';
// C-04: Ingestion Pipeline — stato del processo di intake dati.
// Scopo: mostrare al Company Admin che l'intake dati è gestito da KORA Admin.
// Nessun dato demo: la pipeline reale avviene nel workspace KORA Admin.

import Link from 'next/link';
import { OperatorToolBoundary } from '@/components/demo/OperatorToolBoundary';
import { useCompanySession } from '../_providers/CompanySessionProvider';

export default function AIIngestionAssistant() {
  const { companyName: liveCompanyName, sessionLoading } = useCompanySession();

  return (
    <div className="space-y-6">
      <OperatorToolBoundary />
      <div style={{ padding: '20px 0' }}>
        <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">
          KORA Intake Engine™ · LIVE
        </p>
        <h1 className="text-xl font-bold text-[#06032B] mb-2">
          {sessionLoading ? '…' : (liveCompanyName ?? 'La tua organizzazione')}
        </h1>
        <p className="text-sm text-[rgba(6,3,43,0.55)] max-w-xl leading-relaxed">
          Il processo di intake dati per il tuo tenant è gestito da KORA Admin.
          KORA Admin carica, classifica e rivede i tuoi file prima che entrino nel calcolo del KORA Index.
        </p>
        <p className="mt-2 text-xs text-[rgba(6,3,43,0.40)]">
          Quando KORA Admin elabora nuovi dati per il tuo tenant, lo stato di attivazione verrà aggiornato nel tuo workspace.
        </p>
        <div className="mt-4">
          <Link
            href="/company/workspace"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(6,3,43,0.12)] bg-[rgba(6,3,43,0.04)] px-3.5 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.72)] hover:bg-[rgba(6,3,43,0.08)] transition-colors"
          >
            ← Torna al Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
