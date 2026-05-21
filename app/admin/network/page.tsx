import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';

const PROTOCOL_BADGE: Record<string, { style: string; label: string }> = {
  audit_completato: { style: 'bg-green-50 text-green-700 border-green-200',   label: 'Protocollo verificato' },
  audit_parziale:   { style: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Protocollo parziale' },
  audit_in_corso:   { style: 'bg-slate-50 text-slate-500 border-slate-200',    label: 'Audit in corso' },
};

export default function NetworkPage() {
  const advisors = adminPreviewService.getAdvisorNetworkPreview();
  const partners = adminPreviewService.getPartnerNetworkPreview();

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Advisor & Partner Network</h1>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Anteprima Sintetica
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Vista interna dell&apos;ecosistema di advisor e partner KORA.
          Nessun dato reale di advisor o partner. Nessuna logica marketplace o pagamento.
        </p>
      </div>

      {/* Advisors */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Advisor Network
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="divide-y divide-slate-100">
            {advisors.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{a.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{a.specialization}</p>
                  {a.assigned_companies.length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Assegnato a: {a.assigned_companies.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="font-mono text-slate-500">{a.pending_reviews} in attesa</span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${a.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Partners */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Partner Network
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="divide-y divide-slate-100">
            {partners.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.territory}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex gap-1">
                    {p.pillars.map((pl) => (
                      <span key={pl} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                        {pl}
                      </span>
                    ))}
                  </div>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${(PROTOCOL_BADGE[p.evidence_protocol_status] ?? PROTOCOL_BADGE.audit_in_corso).style}`}>
                    {(PROTOCOL_BADGE[p.evidence_protocol_status] ?? PROTOCOL_BADGE.audit_in_corso).label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{p.active_programs} prog.</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Nessun marketplace · Nessun motore di pricing · Nessuna esecuzione pagamento · Solo dati demo sintetici
      </p>
    </div>
  );
}
