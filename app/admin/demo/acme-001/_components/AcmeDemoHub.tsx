'use client';

// app/admin/demo/acme-001/_components/AcmeDemoHub.tsx
// B40 — ACME-001 Guided Demo Control Center.
// Pure static rendering — no API calls, no DB reads.

import Link from 'next/link';
import {
  ACME_PROFILE, ACME_KORA_INDEX, ACME_MACROBLOCKS,
  ACME_PILLARS, ACME_EVIDENCE_RECORDS, ACME_EVIDENCE_SUMMARY, ACME_EVIDENCE_GAPS,
  ACME_REPORTING_READINESS, ACME_DECISION_PACK,
  ACME_SUBMISSIONS, ACME_NEXT_ACTIONS, ACME_METHODOLOGY,
  SYNTHETIC_DEMO_LABEL,
} from '@/lib/demo/acme-001-dataset';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function SectionTitle({ n, title, subtitle }: { n: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className="rounded bg-[#06032B] text-white text-[10px] font-bold px-2 py-0.5 shrink-0 mt-0.5">
        {n}
      </span>
      <div>
        <h2 className="text-sm font-bold text-[rgba(6,3,43,0.90)]">{title}</h2>
        {subtitle && <p className="text-[10.5px] text-[rgba(6,3,43,0.52)] mt-0.5">{subtitle}</p>}
      </div>
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
  submission_accepted:            'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  submission_needs_clarification: 'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]',
  submission_pending:             'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  submission_draft:               'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',
};

const READINESS_CLS: Record<string, string> = {
  report_ready:       'text-green-700',
  usable_with_caveat: 'text-amber-600',
  needs_evidence:     'text-[#D99A2B]',
  not_ready:          'text-red-500',
};

const READINESS_LABEL: Record<string, string> = {
  report_ready:       'Pronto',
  usable_with_caveat: 'Con caveat',
  needs_evidence:     'Mancano evidenze',
  not_ready:          'Non pronto',
};

// ── Main component ────────────────────────────────────────────────────────────

export function AcmeDemoHub({ userEmail }: { userEmail: string }) {
  return (
    <div className="max-w-3xl mx-auto py-6 px-3 space-y-8">

      {/* ── Synthetic demo badge ──────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-semibold"
        style={{ background: 'rgba(186,117,23,0.12)', border: '1px solid rgba(186,117,23,0.30)', color: '#c9862d' }}
      >
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0"
          style={{ background: 'rgba(186,117,23,0.22)', color: '#d4943a' }}
        >
          SYNTHETIC GUIDED DEMO
        </span>
        <span>{SYNTHETIC_DEMO_LABEL}</span>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">
              KORA Admin · Demo Lab
            </p>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {ACME_PROFILE.companyName}
            </h1>
            <p className="text-sm text-white/45 mt-0.5">
              {ACME_PROFILE.tenantCode} · {ACME_PROFILE.industry} · {ACME_PROFILE.workforce} dipendenti · {ACME_PROFILE.period}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="rounded border border-[#C76F3D]/60 bg-[#C76F3D]/15 px-2 py-0.5 text-xs font-semibold text-white">KORA_ADMIN</span>
            <span className="text-xs text-white/25 font-mono">{userEmail}</span>
          </div>
        </div>

        {/* Calibration bar */}
        <div className="mt-4 rounded border border-amber-500/30 bg-[rgba(217,154,43,0.08)]0/10 px-4 py-2 text-[10px] text-amber-300">
          {ACME_METHODOLOGY.calibrationStatus.replace(/_/g, ' ')} · {ACME_METHODOLOGY.versionId} · {ACME_PROFILE.period} · Dati aggregati · {ACME_METHODOLOGY.disclaimerCalibration}
        </div>
      </div>

      {/* ── Quick nav ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-5 py-4">
        <p className="text-[10px] font-bold text-[rgba(6,3,43,0.40)] uppercase tracking-widest mb-3">Percorso guidato KORA</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { n: '01', label: 'KORA Index',        href: '#kora-index' },
            { n: '02', label: 'Evidence Archive',  href: '#evidence' },
            { n: '03', label: 'Data Submission',   href: '#submissions' },
            { n: '04', label: 'Decision Pack',     href: '#decision-pack' },
            { n: '05', label: 'Readiness',         href: '#readiness' },
            { n: '06', label: 'Next Actions',      href: '#actions' },
            { n: '07', label: 'Workspace Preview', href: '/admin/demo/acme-001/company-workspace' },
            { n: '08', label: 'Future Vision',     href: '#future' },
          ].map((step) => (
            step.href.startsWith('#') ? (
              <a
                key={step.n}
                href={step.href}
                className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-2 text-center hover:bg-[rgba(6,3,43,0.05)] transition-colors"
              >
                <p className="text-[9px] font-bold text-[rgba(6,3,43,0.40)]">{step.n}</p>
                <p className="text-[10.5px] font-semibold text-[rgba(6,3,43,0.78)] leading-tight">{step.label}</p>
              </a>
            ) : (
              <Link
                key={step.n}
                href={step.href}
                className="rounded border border-[#C76F3D]/30 bg-[#C76F3D]/5 px-2 py-2 text-center hover:bg-[#C76F3D]/10 transition-colors"
              >
                <p className="text-[9px] font-bold text-[#C76F3D]/60">{step.n}</p>
                <p className="text-[10.5px] font-semibold text-[#C76F3D] leading-tight">{step.label}</p>
              </Link>
            )
          ))}
        </div>
      </div>

      {/* ── 01: KORA Index ────────────────────────────────────────────────────── */}
      <div id="kora-index" className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-6 py-5 space-y-5 scroll-mt-4">
        <SectionTitle n="01" title="KORA Index" subtitle="Foundation Light v0.1 · pre_empirical_calibration · dati sintetici" />

        {/* Hero metrics */}
        <div className="flex items-start gap-6 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">KORA Index</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-[#06032B] tracking-tight">{ACME_KORA_INDEX.value}</span>
              <span className="text-sm text-[rgba(6,3,43,0.40)]">/100</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Confidence Score</p>
            <span className="text-2xl font-bold text-[rgba(6,3,43,0.78)]">{Math.round(ACME_KORA_INDEX.confidenceScore * 100)}%</span>
            <p className="text-[9px] text-[rgba(6,3,43,0.40)] mt-0.5">Esterno al KORA Index · doc 21b</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Activation Safeguard</p>
            <Badge label={`Safeguard: ${ACME_KORA_INDEX.safeguardStatus}`} cls="bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]" />
            <p className="text-[9px] text-[rgba(6,3,43,0.40)] mt-1">AR {Math.round(ACME_KORA_INDEX.activationRate * 100)}% · MAR {Math.round(ACME_KORA_INDEX.meaningfulActivationRate * 100)}%</p>
          </div>
        </div>

        {/* Macroblocks */}
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(ACME_MACROBLOCKS).map(([key, mb]) => (
            <div key={key} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-[rgba(6,3,43,0.62)] uppercase tracking-wide">{mb.label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[rgba(6,3,43,0.40)]">{Math.round(mb.weight * 100)}%</span>
                  <span className="text-base font-bold text-[rgba(6,3,43,0.90)]">{mb.score}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-[rgba(6,3,43,0.12)]">
                <div
                  className="h-1.5 rounded-full bg-[#C76F3D]"
                  style={{ width: `${mb.score}%` }}
                />
              </div>
              <p className="text-[9.5px] text-[rgba(6,3,43,0.52)] leading-snug">{mb.note}</p>
            </div>
          ))}
        </div>

        {/* Pillar distribution */}
        <div>
          <p className="text-[10px] font-bold text-[rgba(6,3,43,0.40)] uppercase tracking-widest mb-2">Distribuzione Pilastri</p>
          <div className="space-y-1.5">
            {ACME_PILLARS.map((p) => (
              <div key={p.code} className="flex items-center gap-3">
                <span className="text-[10px] font-mono font-semibold text-[rgba(6,3,43,0.52)] w-14 shrink-0">{p.code}</span>
                <div className="flex-1 h-2 rounded-full bg-[rgba(6,3,43,0.05)]">
                  <div className="h-2 rounded-full bg-[#C76F3D]" style={{ width: `${Math.round(p.share * 100)}%` }} />
                </div>
                <span className="text-[10px] font-semibold text-[rgba(6,3,43,0.62)] w-8 shrink-0 text-right">{Math.round(p.share * 100)}%</span>
                <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] flex-1 max-w-[250px] truncate" title={p.note}>{p.note}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] pt-1 border-t border-[rgba(6,3,43,0.05)] leading-relaxed">
          {ACME_KORA_INDEX.disclaimer}
        </p>
      </div>

      {/* ── 02: Evidence Archive ──────────────────────────────────────────────── */}
      <div id="evidence" className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-6 py-5 space-y-4 scroll-mt-4">
        <SectionTitle n="02" title="Evidence Archive" subtitle="27 iniziative sintetiche — nessun dato individuale" />

        {/* Summary counts */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Totali',          value: ACME_EVIDENCE_SUMMARY.total,         cls: '' },
            { label: 'Idonei',          value: ACME_EVIDENCE_SUMMARY.eligible,       cls: 'text-green-700' },
            { label: 'Sollievo econ.',  value: ACME_EVIDENCE_SUMMARY.limited,        cls: 'text-amber-600' },
            { label: 'Bloccati',        value: ACME_EVIDENCE_SUMMARY.blocked,        cls: 'text-red-500' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-center">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">{label}</p>
              <p className={`text-xl font-bold text-[rgba(6,3,43,0.90)] mt-0.5 ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Evidence table */}
        <div className="overflow-hidden rounded border border-[rgba(6,3,43,0.08)]">
          <table className="w-full text-[10.5px]">
            <thead>
              <tr className="border-b border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]">
                {['Iniziativa', 'Pilastro', 'Eligibilità', 'Evidenza', 'Stato'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] font-bold text-[rgba(6,3,43,0.40)] uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACME_EVIDENCE_RECORDS.slice(0, 12).map((ev) => (
                <tr key={ev.id} className="border-b border-[rgba(6,3,43,0.04)] hover:bg-[rgba(6,3,43,0.03)]/40">
                  <td className="px-3 py-2 text-[rgba(6,3,43,0.78)] max-w-[180px] truncate" title={ev.note}>{ev.safeName}</td>
                  <td className="px-3 py-2 text-[rgba(6,3,43,0.52)]">{ev.pillar}</td>
                  <td className="px-3 py-2">
                    <Badge
                      label={ev.eligibility}
                      cls={ev.eligibility === 'eligible' ? 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]' :
                           ev.eligibility === 'limited' ? 'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]' :
                           ev.eligibility === 'blocked' ? 'bg-[rgba(158,59,47,0.08)] text-[rgba(158,59,47,0.85)] border-[rgba(158,59,47,0.22)]' :
                           'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]'}
                    />
                  </td>
                  <td className="px-3 py-2 text-[rgba(6,3,43,0.52)]">{ev.evidenceLevel}</td>
                  <td className="px-3 py-2 text-[rgba(6,3,43,0.52)] text-[9px]">{ev.reviewStatus.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-2 text-[9.5px] text-[rgba(6,3,43,0.40)] border-t border-[rgba(6,3,43,0.05)]">
            Mostrate 12 di 27 iniziative · Nessun dato individuale · No storagePath · No signedUrl
          </p>
        </div>

        {/* Evidence gaps */}
        <div>
          <p className="text-[10px] font-bold text-[rgba(6,3,43,0.40)] uppercase tracking-widest mb-2">Evidence Gaps</p>
          <div className="space-y-1.5">
            {ACME_EVIDENCE_GAPS.map((gap, i) => (
              <div key={i} className={`rounded border px-3 py-2 text-[10.5px] flex gap-2 ${gap.severity === 'high' ? 'border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)]' : gap.severity === 'medium' ? 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)]' : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)]'}`}>
                <Badge label={gap.pillar} cls="border-[rgba(6,3,43,0.14)] bg-[#F8F6F1] text-[rgba(6,3,43,0.62)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className={`font-semibold ${gap.severity === 'high' ? 'text-[#9E3B2F]' : gap.severity === 'medium' ? 'text-amber-700' : 'text-[rgba(6,3,43,0.62)]'}`}>{gap.gap}</span>
                  <span className="text-[rgba(6,3,43,0.52)] ml-1">— {gap.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 03: Data Submissions ──────────────────────────────────────────────── */}
      <div id="submissions" className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-6 py-5 space-y-4 scroll-mt-4">
        <SectionTitle n="03" title="Data Submission" subtitle="Company-side upload flow (B39) — revisione KORA Admin obbligatoria" />

        <div className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-4 py-2 text-[10px] text-amber-700">
          Caricamento dati ≠ scoring KORA · Submit non avvia scoring · accepted_for_intake richiede intake manuale da KORA Admin
        </div>

        <div className="space-y-3">
          {ACME_SUBMISSIONS.map((sub) => (
            <div key={sub.id} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge label={SUBMISSION_STATUS_LABEL[sub.status] ?? sub.status} cls={SUBMISSION_STATUS_CLS[sub.status] ?? 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]'} />
                    <span className="text-[10px] font-semibold text-[rgba(6,3,43,0.62)]">{sub.submissionType}</span>
                    <span className="text-[9px] text-[rgba(6,3,43,0.40)]">{sub.period}</span>
                    <span className="text-[9px] text-[rgba(6,3,43,0.40)]">{sub.fileCount} file</span>
                  </div>
                  {sub.companyNote && (
                    <p className="text-[10px] text-[rgba(6,3,43,0.52)]">
                      <span className="font-semibold text-[rgba(6,3,43,0.62)]">Nota azienda: </span>{sub.companyNote}
                    </p>
                  )}
                  {sub.adminComment && (
                    <p className="text-[10px] text-[rgba(6,3,43,0.72)] rounded border border-[rgba(6,3,43,0.06)] bg-[rgba(199,111,61,0.08)] px-2 py-1 mt-1">
                      <span className="font-semibold">KORA Admin: </span>{sub.adminComment}
                    </p>
                  )}
                </div>
              </div>
              {sub.files.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {sub.files.map((f, fi) => (
                    <span key={fi} className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-0.5 text-[9px] text-[rgba(6,3,43,0.52)] font-mono">
                      .{f.fileType} · {f.safeName.slice(0, 30)} · {Math.round(f.fileSizeBytes / 1024)}KB
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <Link
          href="/admin/company-submissions"
          className="inline-block text-[10px] text-[#C76F3D] hover:underline"
        >
          Apri Admin Submission Queue reale →
        </Link>
      </div>

      {/* ── 04: Decision Pack ─────────────────────────────────────────────────── */}
      <div id="decision-pack" className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-6 py-5 space-y-4 scroll-mt-4">
        <SectionTitle n="04" title="Decision Pack" subtitle={`${ACME_DECISION_PACK.versionId} · ${ACME_DECISION_PACK.status} · ${ACME_DECISION_PACK.reportingPeriod}`} />

        <div className="flex items-center gap-2">
          <Badge label="DRAFT" cls="bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]" />
          <span className="text-[10.5px] text-[rgba(6,3,43,0.52)]">Generato: {new Date(ACME_DECISION_PACK.generatedAt).toLocaleDateString('it-IT')}</span>
        </div>

        <div className="space-y-2">
          {ACME_DECISION_PACK.sections.map((s, i) => (
            <div key={i} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3">
              <p className="text-[10px] font-bold text-[rgba(6,3,43,0.62)] uppercase tracking-wide mb-1">{s.title}</p>
              <p className="text-[10.5px] text-[rgba(6,3,43,0.62)] leading-relaxed">{s.summary}</p>
            </div>
          ))}
        </div>

        <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] pt-1 border-t border-[rgba(6,3,43,0.05)] leading-relaxed">
          {ACME_DECISION_PACK.disclaimer}
        </p>
      </div>

      {/* ── 05: Reporting Readiness ───────────────────────────────────────────── */}
      <div id="readiness" className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-6 py-5 space-y-4 scroll-mt-4">
        <SectionTitle n="05" title="Reporting Readiness" subtitle="Non equivale a certificazione di conformità normativa" />

        <div className="flex items-center gap-3">
          <Badge
            label={ACME_REPORTING_READINESS.overallLevel.replace(/_/g, ' ')}
            cls="bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]"
          />
          <span className="text-[10.5px] text-[rgba(6,3,43,0.52)]">
            Score sintetico: {ACME_REPORTING_READINESS.readinessScore}%
          </span>
        </div>

        <div className="space-y-2">
          {ACME_REPORTING_READINESS.pillars.map((p) => (
            <div key={p.pillar} className="flex items-start gap-3 text-[10.5px]">
              <span className="font-mono font-semibold text-[rgba(6,3,43,0.52)] w-16 shrink-0">{p.pillar}</span>
              <span className={`font-semibold w-32 shrink-0 ${READINESS_CLS[p.status] ?? 'text-[rgba(6,3,43,0.52)]'}`}>
                {READINESS_LABEL[p.status] ?? p.status}
              </span>
              <span className="text-[rgba(6,3,43,0.52)] leading-snug">{p.note}</span>
            </div>
          ))}
        </div>

        <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-2 leading-relaxed">
          {ACME_REPORTING_READINESS.caveat}
        </p>
      </div>

      {/* ── 06: Next Best Actions ─────────────────────────────────────────────── */}
      <div id="actions" className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-6 py-5 space-y-3 scroll-mt-4">
        <SectionTitle n="06" title="Next Best Actions" subtitle="Priorità metodologiche — dati sintetici" />

        {ACME_NEXT_ACTIONS.map((a) => (
          <div key={a.priority} className="flex items-start gap-3 text-[10.5px]">
            <span className="rounded bg-[#06032B] text-white text-[9px] font-bold px-1.5 py-0.5 shrink-0">{a.priority}</span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-[rgba(6,3,43,0.78)]">[{a.pillar}] </span>
              <span className="text-[rgba(6,3,43,0.62)]">{a.action}</span>
            </div>
            <div className="shrink-0 space-y-0.5 text-right">
              <p className="text-[9px] text-green-600 font-semibold">{a.impact}</p>
              <p className="text-[9px] text-[rgba(6,3,43,0.40)]">Effort: {a.effort}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 07: Company Workspace Preview ─────────────────────────────────────── */}
      <div className="rounded-xl border border-[#C76F3D]/30 bg-[#C76F3D]/5 px-6 py-5 space-y-3">
        <SectionTitle n="07" title="Company Workspace Preview" subtitle="Apre una visualizzazione del workspace come lo vedrebbe COMPANY_ADMIN" />
        <p className="text-[10.5px] text-[rgba(6,3,43,0.62)] leading-relaxed">
          La demo workspace preview mostra come apparirà il workspace aziendale reale con dati simili ad ACME-001. Layout identico a quello che vedrebbe un Company Admin autenticato su un tenant live.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link
            href="/admin/demo/acme-001/company-workspace"
            className="rounded-lg bg-[#06032B] text-white px-5 py-2 text-xs font-semibold hover:bg-[#1a1756] transition-colors"
          >
            Apri Workspace Preview →
          </Link>
          <span className="text-[9px] text-[rgba(6,3,43,0.40)] self-center">Solo KORA_ADMIN · Dati sintetici · Nessuna mutazione live</span>
        </div>
      </div>

      {/* ── 08: Future Vision Boundary ────────────────────────────────────────── */}
      <div id="future" className="rounded-xl border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-6 py-5 space-y-4 scroll-mt-4">
        <div>
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">08</p>
          <h2 className="text-sm font-bold text-[#8A5A00]">Future Modules — Not Active in Foundation Light</h2>
          <p className="text-[10.5px] text-amber-700 mt-0.5">Vision prodotto strategica — non attivo, non contrattualizzabile, nessun production claim.</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { name: 'Worker PIB',             note: 'Personal Impact Balance privato, di proprietà del lavoratore.' },
            { name: 'Dynamic Impact CV',       note: 'CV verificato portabile — richiede privacy architecture e consenso esplicito.' },
            { name: 'Partner Map',             note: 'Rete welfare verificata multi-azienda — richiede Ecosystem Layer.' },
            { name: 'Advisor Console',         note: 'Portale advisor KORA con certificazione metodologica.' },
            { name: 'KORA Link (NFC/QR)',      note: 'Attivazione fisico-digitale — richiede worker-owned identity.' },
            { name: 'Care Economy Index',      note: 'Indice di impatto economia della cura — richiede calibrazione empirica.' },
            { name: 'Generational Transition', note: 'Intelligence su trasferimento intergenerazionale — fase pilota avanzata.' },
            { name: 'Future Readiness',        note: 'Modulo di readiness futura — dipende da benchmark cross-settore.' },
          ].map((m) => (
            <div key={m.name} className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[#F8F6F1]/60 p-3 opacity-80 space-y-1">
              <p className="text-[10.5px] font-semibold text-[#8A5A00]">{m.name}</p>
              <p className="text-[9.5px] text-amber-700 leading-snug">{m.note}</p>
              <p className="text-[9px] font-semibold text-[#D99A2B] uppercase tracking-wide">Vision</p>
            </div>
          ))}
        </div>

        <p className="text-[9.5px] text-amber-600">
          Nessun modulo futuro è attivo in Foundation Light. Nessuno è disponibile, contrattualizzabile o promesso.
          L&apos;architettura è sequenziale: ogni fase abilita quella successiva.
          <Link href="/future-vision" className="ml-1 underline hover:text-[#8A5A00]">Roadmap architetturale →</Link>
        </p>
      </div>

      {/* ── Methodology footer ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-5 py-4 space-y-2 text-[10px] text-[rgba(6,3,43,0.52)]">
        <p className="font-semibold text-[rgba(6,3,43,0.62)]">Metodologia & Privacy</p>
        {[
          ACME_METHODOLOGY.disclaimerKoraMeasures,
          ACME_METHODOLOGY.disclaimerPrivacy,
          ACME_METHODOLOGY.disclaimerCompliance,
          ACME_METHODOLOGY.csrDisclaimer,
        ].map((d, i) => <p key={i}>{d}</p>)}
        <p className="text-[9px] text-[rgba(6,3,43,0.40)] pt-1 border-t border-[rgba(6,3,43,0.05)]">
          ACME-001 · Synthetic Guided Demo · {ACME_PROFILE.methodologyVersion} · {ACME_KORA_INDEX.calibrationStatus} · synthetic_demo_data: true
        </p>
      </div>

    </div>
  );
}
