'use client';
// W-02: Privacy & Condivisione — confini dati del lavoratore.
// Scopo: rispondere a 'chi vede cosa dei miei dati KORA?' con chiarezza cristallina.
// Il PIB™ è del lavoratore, mai esposto al datore di lavoro.
// Soglia privacy N≥10 per ogni aggregato aziendale.
//
// B-WORKER-2 (2026-09-06): this page previously showed synthetic persona
// content unconditionally, with no real-session detection at all — a real
// authenticated WORKER visiting it (e.g. an old bookmark; the sidebar no
// longer links here, it points to /worker/privacy) saw fake settings, never
// their own. /worker/privacy (PrivacySettingsClient) is a proven
// CANONICAL_SUPERSET — real requireWorkerUser() auth, real
// /api/worker/privacy-settings data, real interactive rows (this page's own
// toggles were always explicitly non-interactive "solo anteprima"). A
// confirmed real WORKER session now redirects there; the demo/persona
// preview below (no real session) is otherwise unchanged.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole, usePersona } from '@/lib/demo-state';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { PreviewToLiveNotice } from '@/components/my-kora/PreviewToLiveNotice';
import { cn } from '@/lib/utils';

type PrivacyMode = 'checking' | 'redirecting' | 'demo';

// W-02: Privacy & Sharing
export default function PrivacySharing() {
  const { activeRole } = useRole();
  const { activePersona } = usePersona();
  const router = useRouter();

  const [mode, setMode] = useState<PrivacyMode>('checking');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/worker/privacy-settings')
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setMode('redirecting');
          router.replace('/worker/privacy');
        } else {
          setMode('demo');
        }
      })
      .catch(() => { if (!cancelled) setMode('demo'); });
    return () => { cancelled = true; };
  }, [router]);

  // Hold render until session resolves / redirect fires — avoids flashing
  // synthetic content for real workers.
  if (mode === 'checking' || mode === 'redirecting') return null;

  if (!myKoraPreviewService.canAccess(activeRole)) {
    return (
      <div className="space-y-4">
        <div>
          <h1 style={{ fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, fontSize: "1.875rem", letterSpacing: "-0.03em", lineHeight: 1.06, color: "#06032B" }}>Privacy & Condivisione</h1>
          <p className="text-sm text-[rgba(6,3,43,0.52)]">Preferenze di consenso e condivisione dati del lavoratore</p>
        </div>
        <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] p-6 text-center">
          <p className="text-sm font-semibold text-[#9E3B2F]">Accesso Limitato</p>
          <p className="mt-1 text-xs text-[rgba(158,59,47,0.90)] max-w-sm mx-auto">
            Le preferenze di privacy sono private del lavoratore. I ruoli datore di lavoro e admin non possono
            visualizzare né modificare le impostazioni di consenso individuali.
          </p>
          <p className="mt-3 text-xs font-mono text-[rgba(158,59,47,0.55)]">Ruolo attivo: {activeRole}</p>
        </div>
      </div>
    );
  }

  const privacy = myKoraPreviewService.getPrivacySummary(activePersona?.id ?? 'persona-a');

  return (
    <div className="space-y-6">
      <div>
        <BoundaryBadge mode="PREVIEW" variant="light" suffix="· Worker layer · dati sintetici" style={{ marginBottom: 6 }} />
        <h1 style={{ fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, fontSize: "1.875rem", letterSpacing: "-0.03em", lineHeight: 1.06, color: "#06032B" }}>Privacy & Condivisione</h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)]">{privacy.persona_label}</p>
      </div>

      {/* ── PreviewToLiveNotice — Task 3 */}
      <PreviewToLiveNotice
        what="Stai vedendo le tue impostazioni di Privacy & Condivisione in anteprima."
        preview="Le preferenze mostrate sono illustrative — nessuna modifica ha effetto reale in Foundation Light."
        live="In Pilot+, le tue scelte di consenso saranno registrate e applicate in modo sicuro al tuo account worker-owned."
        privacy="Solo tu puoi vedere e modificare le tue impostazioni di consenso. Il tuo datore di lavoro non ha accesso."
      />

      {/* Core privacy guarantee — non-suppressible */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] p-4">
        <p className="text-sm font-semibold text-[rgba(6,3,43,0.88)]">La tua privacy è costituzionale.</p>
        <p className="mt-1 text-xs text-[rgba(6,3,43,0.72)] leading-relaxed">{privacy.privacy_guarantee}</p>
      </div>

      {/* Two-column: what company sees vs. does not see */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[rgba(47,125,85,0.20)] bg-[rgba(47,125,85,0.08)] p-4">
          <p className="text-xs font-semibold text-[#2F7D55] mb-2 flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded-full bg-[#2F7D55] text-white text-center leading-4 text-[10px]">✓</span>
            Il tuo datore di lavoro PUÒ vedere
          </p>
          <ul className="space-y-1.5">
            {privacy.company_can_see.map((item, i) => (
              <li key={i} className="text-xs text-[#2F7D55] leading-relaxed flex gap-1.5">
                <span className="text-[#2F7D55] shrink-0 mt-0.5">·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] p-4">
          <p className="text-xs font-semibold text-[#9E3B2F] mb-2 flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded-full bg-[rgba(158,59,47,0.06)]0 text-white text-center leading-4 text-[10px]">✕</span>
            Il tuo datore di lavoro NON PUÒ vedere
          </p>
          <ul className="space-y-1.5">
            {privacy.company_cannot_see.map((item, i) => (
              <li key={i} className="text-xs text-[#9E3B2F] leading-relaxed flex gap-1.5">
                <span className="text-[rgba(158,59,47,0.55)] shrink-0 mt-0.5">·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Consent toggles */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
          Preferenze di Consenso
        </h2>

        {/* Task 9: Non-interactive toggle warning — workers must not think these do something real */}
        <div className="rounded-lg border border-[rgba(199,111,61,0.30)] bg-[rgba(199,111,61,0.07)] p-4 mb-3">
          <p className="text-sm font-semibold text-[rgba(6,3,43,0.88)] mb-1">Queste impostazioni non modificano dati reali.</p>
          <p className="text-xs text-[rgba(6,3,43,0.72)] leading-relaxed">
            In questa anteprima i controlli sono visivi — non attivi. Nessuna preferenza viene salvata,
            nessuna azione di consenso ha effetto. In Pilot+, ogni modifica sarà registrata in modo
            sicuro e applicata immediatamente al tuo account worker-owned.
          </p>
        </div>

        <div className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] p-3 mb-3">
          <p className="text-xs font-semibold text-[#8A5A00]">Solo anteprima — Foundation Light</p>
          <p className="text-xs text-[#8A5A00] mt-0.5">
            Questi controlli sono mostrati solo a scopo illustrativo. Nessuna azione di consenso reale avviene in Foundation Light.
            In produzione, le modifiche sarebbero registrate crittograficamente e applicate immediatamente.
          </p>
        </div>

        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {privacy.consent_toggles.map((toggle) => (
              <div key={toggle.id} className="px-4 py-3 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[rgba(6,3,43,0.78)]">{toggle.label}</p>
                  <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5 leading-relaxed">{toggle.description}</p>
                  <p className="text-xs font-mono text-[rgba(6,3,43,0.28)] mt-0.5">scope: {toggle.scope}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {/* Visual toggle — non-interactive in Foundation Light */}
                  <button
                    disabled
                    className={cn(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-not-allowed',
                      toggle.current_state === 'on' ? 'bg-[#C76F3D]' : 'bg-[rgba(6,3,43,0.12)]',
                    )}
                    aria-label={`${toggle.label} — preview only`}
                  >
                    <span
                      className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-[#F8F6F1] transition-transform mx-0.5',
                        toggle.current_state === 'on' ? 'translate-x-4' : 'translate-x-0',
                      )}
                    />
                  </button>
                  <span className="text-xs text-[rgba(6,3,43,0.40)] font-mono">solo anteprima</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Consent & Sharing Vault */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
          Consent &amp; Sharing Vault
        </h2>

        <div className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] p-3 mb-3">
          <p className="text-xs font-semibold text-[#D99A2B]">Solo anteprima — Foundation Light</p>
          <p className="text-xs text-[#8A5A00] mt-0.5">
            Il Vault è mostrato solo a scopo illustrativo. Nessuna modifica di consenso reale avviene in questa demo.
          </p>
        </div>

        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {[
              {
                id: 'vault-pib',
                data_type: 'PIB individuale',
                status: 'Privato',
                status_color: 'bg-[rgba(158,59,47,0.06)] text-[#9E3B2F] border-[rgba(158,59,47,0.20)]',
                employer_visibility: 'Mai',
                note: 'Il tuo Personal Impact Balance è esclusivamente tuo. Il datore di lavoro vede solo aggregati aziendali.',
              },
              {
                id: 'vault-timeline',
                data_type: 'Timeline personale',
                status: 'Privata',
                status_color: 'bg-[rgba(158,59,47,0.06)] text-[#9E3B2F] border-[rgba(158,59,47,0.20)]',
                employer_visibility: 'Mai',
                note: 'Ogni evento nel tuo percorso è visibile solo a te. Nessun accesso employer.',
              },
              {
                id: 'vault-cv',
                data_type: 'Dynamic Impact CV',
                status: 'Worker-controlled',
                status_color: 'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]',
                employer_visibility: 'Solo esplicito',
                note: 'Puoi scegliere tu cosa condividere, con chi e per quanto tempo. Nessuna condivisione automatica.',
              },
              {
                id: 'vault-aggregates',
                data_type: 'Aggregati aziendali',
                status: 'Anonimi sopra soglia',
                status_color: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
                employer_visibility: 'Sì — aggregato',
                note: 'Dati consolidati a livello aziendale. Nessun dato individuale. Soglia minima: 10 lavoratori per segmento.',
              },
              {
                id: 'vault-partner',
                data_type: 'Partner KORA',
                status: 'Solo iniziative autorizzate',
                status_color: 'bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
                employer_visibility: 'Nessun PIB / timeline',
                note: "I partner vedono solo l'esito di partecipazione a iniziative cui hai aderito. Non accedono al tuo PIB né alla timeline.",
              },
              {
                id: 'vault-advisor',
                data_type: 'Advisor KORA',
                status: 'Solo review assegnate',
                status_color: 'bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
                employer_visibility: 'Perimetro review',
                note: "L'advisor accede solo agli UEF che rientrano nella review formalmente assegnata. Non ha accesso al profilo completo.",
              },
            ].map((row) => (
              <div key={row.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[rgba(6,3,43,0.78)]">{row.data_type}</p>
                      <span className={cn('rounded border px-1.5 py-0.5 text-xs font-medium', row.status_color)}>
                        {row.status}
                      </span>
                    </div>
                    <p className="text-xs text-[rgba(6,3,43,0.40)] mt-1 leading-relaxed">{row.note}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-[rgba(6,3,43,0.40)]">Visibilità employer</p>
                    <p className="text-xs font-medium text-[rgba(6,3,43,0.62)] mt-0.5">{row.employer_visibility}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data deletion notice */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-3">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.62)] mb-1">Cancellazione Dati & Portabilità</p>
        <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">
          In produzione, i lavoratori possono richiedere la cancellazione completa dei dati o l&apos;esportazione portabile in qualsiasi momento.
          Foundation Light non elabora dati reali — nessun flusso di cancellazione è attivo in questa demo.
        </p>
        <p className="mt-1.5 text-xs font-mono text-[rgba(6,3,43,0.40)]">
          delete_request: preview_only · export_request: preview_only
        </p>
      </div>
    </div>
  );
}
