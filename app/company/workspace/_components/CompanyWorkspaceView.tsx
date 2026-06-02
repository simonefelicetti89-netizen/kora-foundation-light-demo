'use client';

// app/company/workspace/_components/CompanyWorkspaceView.tsx
// B36 PART 4 — Company-facing workspace — board-grade, clean, read-only.
// Rendered after session auth. No demo-state. No admin controls.
// Covers: KORA Index summary, Reporting Readiness, Evidence Archive, Decision Pack, Methodology & Privacy.

import { useState, useEffect } from 'react';
import { DataSubmissionSection } from './DataSubmissionSection';

// ── Types ───────────────────────────────────────────────────────────────────────

interface WorkspaceData {
  ok: boolean;
  role: string;
  tenant: {
    companyName: string;
    methodologyVersion: string;
    calibrationStatus: string;
    isActive: boolean;
  };
  workforceBaseline: { totalWorkers: number; reportingPeriod: string } | null;
  koraIndex: {
    koraIndexValue: number;
    confidenceScore: number;
    safeguardStatus: string;
    activationRate: number | null;
    reportingPeriod: string;
    methodologyVersion: string;
    calibrationStatus: string;
    displayLabels: { methodology: string; calibration: string; disclaimer: string };
  } | null;
  reportingReadiness: {
    hasWorkforceBaseline: boolean;
    hasEvidenceBatches: boolean;
    batchCount: number;
    hasScoring: boolean;
    hasDecisionPack: boolean;
    decisionPackStatus: string;
    readinessLevel: string;
    caveat: string;
  };
  decisionPack: { status: string; createdAt: string; viewLink: string } | null;
  methodologyDisclaimer: {
    kora_measures: string;
    privacy_guarantee: string;
    no_compliance: string;
    data_status: string;
  };
}

interface Initiative {
  id: string;
  recordIdFull: string;
  batchIdFull: string;
  safeName: string;
  pillar: string | null;
  actionFamily: string | null;
  evidenceLevel: string | null;
  reviewStatus: string;
  eligibility: string;
}

interface ArchiveData {
  ok: boolean;
  tenant: { companyName: string; methodologyVersion: string; calibrationStatus: string };
  batches: Array<{ batchId: string; batchStatus: string; rowCount: number; attachmentCount: number; createdAt: string }>;
  initiatives: Initiative[];
  summary: { total: number; withEvidence: number; pendingReview: number; approved: number };
  privacyNote: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

const SAFEGUARD_CLS: Record<string, string> = {
  CLEAR:   'border-green-200 bg-green-50 text-green-700',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-700',
  FLAGGED: 'border-red-200 bg-red-50 text-red-700',
};

const SAFEGUARD_LABEL: Record<string, string> = {
  CLEAR:   'Activation Safeguard: CLEAR',
  WARNING: 'Activation Safeguard: WARNING',
  FLAGGED: 'Activation Safeguard: FLAGGED',
};

const REVIEW_CLS: Record<string, string> = {
  approved:             'text-green-600',
  approved_for_scoring: 'text-green-600',
  pending:              'text-amber-600',
  pending_review:       'text-amber-600',
  rejected:             'text-red-500',
};

const ELIGIBILITY_LABEL: Record<string, string> = {
  eligible:  'Idoneo',
  limited:   'Sollievo economico',
  blocked:   'Bloccato',
  review_required: 'In revisione',
};

const READINESS_LEVEL_LABEL: Record<string, string> = {
  not_started:       'Non avviato',
  evidence_collected:'Evidenze raccolte',
  scored:            'Pipeline completata',
  decision_pack_ready: 'Decision Pack disponibile',
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>;
}

function ts(s: string) {
  try { return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-slate-200 bg-white overflow-hidden scroll-mt-4">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────────

interface Props {
  userEmail: string;
  userRole: string;
}

export function CompanyWorkspaceView({ userEmail, userRole }: Props) {
  const [workspace, setWorkspace]   = useState<WorkspaceData | null>(null);
  const [archive, setArchive]       = useState<ArchiveData | null>(null);
  const [wsLoading, setWsLoading]   = useState(true);
  const [archLoading, setArchLoading] = useState(true);
  const [wsError, setWsError]       = useState<string | null>(null);
  const [archError, setArchError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/company/workspace', { credentials: 'include' })
      .then(r => r.json())
      .then((d: WorkspaceData) => {
        if (d.ok) setWorkspace(d);
        else setWsError('Workspace non disponibile.');
      })
      .catch(() => setWsError('Errore di rete.'))
      .finally(() => setWsLoading(false));

    fetch('/api/company/evidence-archive', { credentials: 'include' })
      .then(r => r.json())
      .then((d: ArchiveData) => {
        if (d.ok) setArchive(d);
        else setArchError('Archivio non disponibile.');
      })
      .catch(() => setArchError('Errore di rete.'))
      .finally(() => setArchLoading(false));
  }, []);

  const w = workspace;
  const ki = w?.koraIndex ?? null;
  const rr = w?.reportingReadiness ?? null;
  const dp = w?.decisionPack ?? null;
  const isViewer = userRole === 'COMPANY_VIEWER';

  return (
    <div className="max-w-3xl mx-auto py-6 px-3 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#6156F5] mb-1">
            {wsLoading ? 'KORA · Workspace' : (w?.tenant.companyName ?? 'KORA · Workspace')}
          </p>
          <h1 className="text-xl font-bold text-white tracking-tight">Il tuo Workspace KORA</h1>
          <p className="text-sm text-white/45 mt-0.5">
            Vista aggregata — nessun dato individuale
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1">
          <span className="rounded border border-[#6156F5]/60 bg-[#6156F5]/15 px-2 py-0.5 text-xs font-semibold text-[#9d97ff]">{userRole}</span>
          <span className="text-xs text-white/25 font-mono">{userEmail}</span>
        </div>
      </div>

      {/* ── Loading / error ─────────────────────────────────────────────────── */}
      {wsLoading && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-6 text-xs text-slate-400 text-center">
          Caricamento workspace…
        </div>
      )}
      {wsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
          ⚠ {wsError}
        </div>
      )}

      {/* ── Calibration / status bar ─────────────────────────────────────────── */}
      {w && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[10.5px] text-amber-700 font-medium">
          {w.tenant.calibrationStatus.replace(/_/g, ' ')} · {w.tenant.methodologyVersion} · Dati aggregati
        </div>
      )}

      {/* ── Welcome banner — new company with no data yet ─────────────────────── */}
      {w && !ki && rr?.readinessLevel === 'not_started' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 space-y-1.5">
          <p className="text-sm font-semibold text-blue-800">
            La workspace aziendale è attiva
          </p>
          <p className="text-xs text-blue-700 leading-relaxed">
            I dati KORA appariranno dopo il completamento dell&apos;onboarding dati e della review metodologica da parte di KORA Admin.
            Contatta il tuo referente KORA per avviare il processo di data intake.
          </p>
          <p className="text-[9.5px] text-blue-500 pt-0.5">
            Workspace attivo · Nessun dato ancora disponibile · Nessun demo fallback
          </p>
        </div>
      )}

      {/* ── KORA Index Summary ───────────────────────────────────────────────── */}
      {w && (
        <Section title="KORA Index" id="kora-index">
          {ki ? (
            <div className="space-y-4">
              {/* Hero row */}
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">KORA Index</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold text-[#06032B] tracking-tight">{ki.koraIndexValue}</span>
                    <span className="text-sm text-slate-400">/100</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Confidence Score</p>
                  <span className="text-2xl font-bold text-slate-700">{Math.round(ki.confidenceScore * 100)}%</span>
                  <p className="text-[9px] text-slate-400 mt-0.5">Esterno al KORA Index</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Activation Safeguard</p>
                  <Badge label={SAFEGUARD_LABEL[ki.safeguardStatus] ?? ki.safeguardStatus} cls={SAFEGUARD_CLS[ki.safeguardStatus] ?? 'border-slate-200 bg-slate-50 text-slate-500'} />
                </div>
                {ki.activationRate !== null && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Activation Rate</p>
                    <span className="text-lg font-bold text-slate-700">{Math.round(ki.activationRate * 100)}%</span>
                  </div>
                )}
              </div>

              {/* Macroblock summary (text-only, no components detail) */}
              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                {[
                  { label: 'Activation Reach (25%)', note: 'AR + MAR' },
                  { label: 'Activation Quality (30%)', note: 'NI + VR + CO' },
                  { label: 'Distribution & Equity (25%)', note: 'WB + PC + PB + EQ' },
                  { label: 'Budget-to-Human-Impact (20%)', note: 'BTI Engine' },
                ].map(({ label, note }) => (
                  <div key={label} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-700">{label}</p>
                    <p className="text-slate-400 text-[9px] mt-0.5">{note}</p>
                  </div>
                ))}
              </div>

              {/* Disclaimer — non-suppressible per doc 21b */}
              <p className="text-[9.5px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100">
                {ki.displayLabels.disclaimer}
              </p>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 text-center space-y-1">
              <p className="font-semibold text-slate-700">KORA Index non ancora disponibile</p>
              <p>La pipeline dati non è ancora stata completata per questa azienda.</p>
            </div>
          )}
        </Section>
      )}

      {/* ── Reporting Readiness ──────────────────────────────────────────────── */}
      {rr && (
        <Section title="Reporting Readiness" id="reporting-readiness">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                label={READINESS_LEVEL_LABEL[rr.readinessLevel] ?? rr.readinessLevel}
                cls={rr.hasScoring ? 'border-green-200 bg-green-50 text-green-700' : rr.hasEvidenceBatches ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'}
              />
              <span className="text-[10.5px] text-slate-500">{rr.batchCount} batch evidenza</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {[
                ['Baseline workforce', rr.hasWorkforceBaseline],
                ['Evidenze caricate', rr.hasEvidenceBatches],
                ['Pipeline completata', rr.hasScoring],
                ['Decision Pack', rr.hasDecisionPack],
              ].map(([label, done]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className={done ? 'text-green-500' : 'text-slate-300'}>
                    {done ? '✓' : '○'}
                  </span>
                  <span className={done ? 'text-slate-700' : 'text-slate-400'}>{String(label)}</span>
                </div>
              ))}
            </div>

            <p className="text-[9.5px] text-slate-400 leading-relaxed pt-2 border-t border-slate-100">
              {rr.caveat}
            </p>
          </div>
        </Section>
      )}

      {/* ── Evidence Archive ─────────────────────────────────────────────────── */}
      <Section title="Archivio Evidenze — Sola lettura" id="evidence-archive">
        {archLoading && (
          <p className="text-xs text-slate-400 text-center py-4">Caricamento archivio…</p>
        )}
        {archError && (
          <p className="text-xs text-red-500">{archError}</p>
        )}
        {archive && !archLoading && (
          <div className="space-y-3">
            {/* Summary bar */}
            <div className="flex gap-4 text-[10.5px] text-slate-500">
              <span><strong className="text-slate-800">{archive.summary.total}</strong> iniziative</span>
              <span><strong className="text-green-700">{archive.summary.approved}</strong> approvate</span>
              <span><strong className="text-amber-600">{archive.summary.pendingReview}</strong> in revisione</span>
            </div>

            {/* Privacy notice */}
            <p className="text-[9.5px] text-slate-400 rounded border border-slate-100 bg-slate-50 px-3 py-2">
              {archive.privacyNote}
            </p>

            {/* Initiatives table */}
            {archive.initiatives.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nessuna evidenza disponibile.</p>
            ) : (
              <div className="overflow-hidden rounded border border-slate-200">
                <table className="w-full text-[10.5px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {['Iniziativa', 'Pilastro', 'Evidenza', 'Stato'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide text-[9px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {archive.initiatives.slice(0, 50).map((init, i) => (
                      <tr key={init.recordIdFull ?? i} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-700 max-w-[200px] truncate">{init.safeName}</td>
                        <td className="px-3 py-2 text-slate-500">{init.pillar ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-500">{init.evidenceLevel ?? '—'}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className={REVIEW_CLS[init.reviewStatus] ?? 'text-slate-400'}>
                              {init.reviewStatus.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {ELIGIBILITY_LABEL[init.eligibility] ?? init.eligibility}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {archive.initiatives.length > 50 && (
                  <p className="px-3 py-2 text-[9.5px] text-slate-400 border-t border-slate-100">
                    Mostrate 50 di {archive.initiatives.length} iniziative.
                  </p>
                )}
              </div>
            )}

            <p className="text-[9.5px] text-slate-400 leading-relaxed">
              Sola lettura · Nessuna azione disponibile · Il ciclo di vita allegati è gestito dall&apos;operatore KORA Admin.
            </p>
          </div>
        )}
      </Section>

      {/* ── Decision Pack ────────────────────────────────────────────────────── */}
      <Section title="Decision Pack" id="decision-pack">
        {dp ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                label={dp.status.replace(/_/g, ' ')}
                cls={dp.status === 'ready' || dp.status === 'exported'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'}
              />
              <span className="text-[10.5px] text-slate-500">Generato: {ts(dp.createdAt)}</span>
            </div>
            <p className="text-[10.5px] text-slate-600">
              Il Decision Pack è stato generato dall&apos;operatore KORA Admin. Contatta il tuo referente KORA per ricevere il documento.
            </p>
            <p className="text-[9.5px] text-slate-400">
              Nota: il Decision Pack riflette il KORA Index di questo periodo con calibrazione pre-empirica. Non costituisce certificazione ESG, audit o giudizio di compliance.
            </p>
          </div>
        ) : (
          <div className="text-xs text-slate-500 py-2">
            Nessun Decision Pack disponibile per questo periodo. L&apos;operatore KORA Admin ti notificherà quando il documento sarà pronto.
          </div>
        )}
      </Section>

      {/* ── Data Submission ──────────────────────────────────────────────────── */}
      <Section title="Data Submission" id="data-submission">
        <DataSubmissionSection userRole={userRole} />
      </Section>

      {/* ── Methodology & Privacy ────────────────────────────────────────────── */}
      <Section title="Metodologia & Privacy" id="methodology">
        {w && (
          <div className="space-y-3 text-[10.5px] text-slate-600 leading-relaxed">
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
              {[
                w.methodologyDisclaimer.kora_measures,
                w.methodologyDisclaimer.privacy_guarantee,
                w.methodologyDisclaimer.no_compliance,
              ].map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Stato calibrazione', value: w.methodologyDisclaimer.data_status },
                { label: 'Metodologia', value: w.tenant.methodologyVersion },
                { label: 'Soglia privacy', value: 'N≥10 per segmento' },
                { label: 'Dati individuali', value: 'Non accessibili al datore di lavoro' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-slate-700 font-medium">{value}</p>
                </div>
              ))}
            </div>

            <p className="text-[9.5px] text-slate-400">
              KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
            </p>
          </div>
        )}
      </Section>

      {/* ── Viewer read-only notice ──────────────────────────────────────────── */}
      {isViewer && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10.5px] text-slate-500 text-center">
          Sei in modalità Company Viewer — sola lettura, nessuna azione disponibile.
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="text-[10px] text-slate-400 text-center pt-2">
        KORA Foundation Light · Company Workspace · {w?.tenant.methodologyVersion ?? ''} · pre_empirical_calibration
      </div>

    </div>
  );
}
