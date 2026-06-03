'use client';

// app/admin/demo/acme-001/company-workspace/_components/AcmeWorkspacePreview.tsx
// B40 — ACME-001 demo workspace preview.
// Mirrors real /company/workspace layout with synthetic ACME-001 data.
// No API calls. No live DB reads. 100% static.

import Link from 'next/link';
import {
  ACME_PROFILE, ACME_KORA_INDEX, ACME_MACROBLOCKS,
  ACME_EVIDENCE_SUMMARY, ACME_DECISION_PACK,
  ACME_REPORTING_READINESS, ACME_SUBMISSIONS,
  ACME_METHODOLOGY, SYNTHETIC_DEMO_LABEL,
} from '@/lib/demo/acme-001-dataset';

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>;
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden scroll-mt-4">
      <div className="px-5 py-3.5 border-b border-[rgba(6,3,43,0.05)]">
        <p className="text-[11px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-widest">{title}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

const SUBMISSION_STATUS_LABEL: Record<string, string> = {
  submission_accepted:            'Accettato per intake',
  submission_needs_clarification: 'Chiarimento richiesto',
  submission_pending:             'In attesa di revisione',
  submission_draft:               'Bozza',
};

const SUBMISSION_STATUS_CLS: Record<string, string> = {
  submission_accepted:            'border-green-200 bg-green-50 text-green-700',
  submission_needs_clarification: 'border-amber-200 bg-amber-50 text-amber-700',
  submission_pending:             'border-blue-200 bg-blue-50 text-blue-700',
  submission_draft:               'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]',
};

const SAFEGUARD_CLS: Record<string, string> = {
  CLEAR:   'border-green-200 bg-green-50 text-green-700',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-700',
  FLAGGED: 'border-red-200 bg-red-50 text-red-700',
};

export function AcmeWorkspacePreview({ userEmail }: { userEmail: string }) {
  const ki = ACME_KORA_INDEX;
  const rr = ACME_REPORTING_READINESS;
  const dp = ACME_DECISION_PACK;

  return (
    <div className="max-w-3xl mx-auto py-6 px-3 space-y-5">

      {/* ── Synthetic demo banner ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-semibold"
        style={{ background: 'rgba(186,117,23,0.12)', border: '1px solid rgba(186,117,23,0.30)', color: '#c9862d' }}
      >
        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0"
          style={{ background: 'rgba(186,117,23,0.22)', color: '#d4943a' }}>
          SYNTHETIC GUIDED DEMO
        </span>
        <span>{SYNTHETIC_DEMO_LABEL}</span>
        <Link href="/admin/demo/acme-001" className="ml-auto text-[10px] underline hover:text-amber-800 shrink-0">
          ← Demo Hub
        </Link>
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">
            {ACME_PROFILE.companyName}
          </p>
          <h1 className="text-xl font-bold text-white tracking-tight">Il tuo Workspace KORA</h1>
          <p className="text-sm text-white/45 mt-0.5">
            Vista aggregata — nessun dato individuale · Demo sintetico
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1">
          <span className="rounded border border-[#C76F3D]/60 bg-[#C76F3D]/15 px-2 py-0.5 text-xs font-semibold text-[#FFFFFF]">COMPANY_ADMIN</span>
          <span className="text-xs text-white/25 font-mono">{userEmail} (admin preview)</span>
        </div>
      </div>

      {/* ── Calibration bar ────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[10.5px] text-amber-700 font-medium">
        {ki.calibrationStatus.replace(/_/g, ' ')} · {ki.methodologyVersion} · Dati sintetici · Aggregati aziendali
      </div>

      {/* ── Welcome banner (new company state) ─────────────────────────────── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 space-y-1.5">
        <p className="text-sm font-semibold text-blue-800">La workspace aziendale è attiva</p>
        <p className="text-xs text-blue-700 leading-relaxed">
          In un pilot live, i dati KORA appariranno dopo il completamento dell&apos;onboarding dati e della review metodologica da parte di KORA Admin. In questa demo, i dati sono sintetici e rappresentativi.
        </p>
      </div>

      {/* ── KORA Index ──────────────────────────────────────────────────────── */}
      <Section title="KORA Index" id="kora-index">
        <div className="space-y-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">KORA Index</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-[#06032B] tracking-tight">{ki.value}</span>
                <span className="text-sm text-[rgba(6,3,43,0.40)]">/100</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Confidence Score</p>
              <span className="text-2xl font-bold text-[rgba(6,3,43,0.78)]">{Math.round(ki.confidenceScore * 100)}%</span>
              <p className="text-[9px] text-[rgba(6,3,43,0.40)] mt-0.5">Esterno al KORA Index</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Activation Safeguard</p>
              <Badge
                label={`Safeguard: ${ki.safeguardStatus}`}
                cls={SAFEGUARD_CLS[ki.safeguardStatus] ?? 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]'}
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Activation Rate</p>
              <span className="text-lg font-bold text-[rgba(6,3,43,0.78)]">{Math.round(ki.activationRate * 100)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10.5px]">
            {Object.entries(ACME_MACROBLOCKS).map(([, mb]) => (
              <div key={mb.label} className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[rgba(6,3,43,0.78)]">{mb.label} ({Math.round(mb.weight * 100)}%)</p>
                  <span className="font-bold text-[rgba(6,3,43,0.90)]">{mb.score}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[rgba(6,3,43,0.12)]">
                  <div className="h-1.5 rounded-full bg-[#C76F3D]" style={{ width: `${mb.score}%` }} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] leading-relaxed pt-1 border-t border-[rgba(6,3,43,0.05)]">
            {ki.disclaimer}
          </p>
        </div>
      </Section>

      {/* ── Reporting Readiness ─────────────────────────────────────────────── */}
      <Section title="Reporting Readiness" id="reporting-readiness">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge label={rr.overallLevel.replace(/_/g, ' ')} cls="border-amber-200 bg-amber-50 text-amber-700" />
            <span className="text-[10.5px] text-[rgba(6,3,43,0.52)]">{rr.pillars.filter(p => p.status === 'report_ready').length}/{rr.pillars.length} pillar pronti</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {rr.pillars.map((p) => (
              <div key={p.pillar} className="flex items-center gap-2">
                <span className={p.status === 'report_ready' ? 'text-green-500' : p.status === 'not_ready' ? 'text-red-400' : 'text-amber-500'}>
                  {p.status === 'report_ready' ? '✓' : '○'}
                </span>
                <span className={p.status === 'report_ready' ? 'text-[rgba(6,3,43,0.78)]' : 'text-[rgba(6,3,43,0.40)]'}>{p.pillar}</span>
              </div>
            ))}
          </div>
          <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] leading-relaxed pt-2 border-t border-[rgba(6,3,43,0.05)]">
            {rr.caveat}
          </p>
        </div>
      </Section>

      {/* ── Evidence Archive ────────────────────────────────────────────────── */}
      <Section title="Archivio Evidenze — Sola lettura" id="evidence-archive">
        <div className="space-y-3">
          <div className="flex gap-4 text-[10.5px] text-[rgba(6,3,43,0.52)]">
            <span><strong className="text-[rgba(6,3,43,0.90)]">{ACME_EVIDENCE_SUMMARY.total}</strong> iniziative</span>
            <span><strong className="text-green-700">{ACME_EVIDENCE_SUMMARY.eligible}</strong> idonee</span>
            <span><strong className="text-amber-600">{ACME_EVIDENCE_SUMMARY.pendingReview}</strong> in revisione</span>
          </div>
          <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2">
            Sola lettura · Nessun dato individuale · Soglia privacy N≥10 applicata
          </p>
          <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] leading-relaxed">
            Sola lettura · Nessuna azione disponibile · Il ciclo di vita allegati è gestito dall&apos;operatore KORA Admin.
          </p>
        </div>
      </Section>

      {/* ── Data Submission ─────────────────────────────────────────────────── */}
      <Section title="Data Submission" id="data-submission">
        <div className="space-y-3">
          <p className="text-[10.5px] text-[rgba(6,3,43,0.62)] leading-relaxed">
            I dati caricati saranno revisionati da KORA Admin prima di entrare nella pipeline di scoring.
          </p>
          <div className="space-y-2">
            {ACME_SUBMISSIONS.map((sub) => (
              <div key={sub.id} className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge label={SUBMISSION_STATUS_LABEL[sub.status] ?? sub.status} cls={SUBMISSION_STATUS_CLS[sub.status] ?? 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]'} />
                  <span className="text-[10px] text-[rgba(6,3,43,0.52)]">{sub.submissionType}</span>
                  <span className="text-[9px] text-[rgba(6,3,43,0.40)]">{sub.period} · {sub.fileCount} file</span>
                </div>
                {sub.adminComment && sub.status !== 'submission_draft' && (
                  <p className="text-[9.5px] text-amber-700 mt-1.5 rounded border border-amber-100 bg-amber-50 px-2 py-1">
                    KORA: {sub.adminComment}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="text-[9.5px] text-[rgba(6,3,43,0.40)]">
            Caricamento dati ≠ scoring KORA · Nessuna UEF generata automaticamente.
          </p>
        </div>
      </Section>

      {/* ── Decision Pack ───────────────────────────────────────────────────── */}
      <Section title="Decision Pack" id="decision-pack">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge label={dp.status} cls="border-amber-200 bg-amber-50 text-amber-700" />
            <span className="text-[10.5px] text-[rgba(6,3,43,0.52)]">
              Generato: {new Date(dp.generatedAt).toLocaleDateString('it-IT')}
            </span>
          </div>
          <p className="text-[10.5px] text-[rgba(6,3,43,0.62)]">
            Il Decision Pack è stato generato dall&apos;operatore KORA Admin. Contatta il tuo referente KORA per ricevere il documento.
          </p>
          <p className="text-[9.5px] text-[rgba(6,3,43,0.40)]">
            {dp.disclaimer}
          </p>
        </div>
      </Section>

      {/* ── Methodology & Privacy ───────────────────────────────────────────── */}
      <Section title="Metodologia & Privacy" id="methodology">
        <div className="space-y-3 text-[10.5px] text-[rgba(6,3,43,0.62)] leading-relaxed">
          <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3 space-y-2">
            {[ACME_METHODOLOGY.disclaimerKoraMeasures, ACME_METHODOLOGY.disclaimerPrivacy, ACME_METHODOLOGY.disclaimerCompliance].map((d, i) => (
              <p key={i}>{d}</p>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Stato calibrazione', value: ACME_PROFILE.calibrationStatus?.replace(/_/g, ' ') ?? 'pre_empirical_calibration' },
              { label: 'Metodologia',        value: ACME_PROFILE.methodologyVersion },
              { label: 'Soglia privacy',     value: 'N≥10 per segmento' },
              { label: 'Dati individuali',   value: 'Non accessibili al datore di lavoro' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-2">
                <p className="text-[9px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-[rgba(6,3,43,0.78)] font-medium">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-[9.5px] text-[rgba(6,3,43,0.40)]">{ACME_METHODOLOGY.csrDisclaimer}</p>
        </div>
      </Section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="text-[10px] text-[rgba(6,3,43,0.40)] text-center pt-2">
        ACME-001 · Synthetic Guided Demo · {ACME_PROFILE.methodologyVersion} · pre_empirical_calibration · synthetic_demo_data: true
      </div>

    </div>
  );
}
