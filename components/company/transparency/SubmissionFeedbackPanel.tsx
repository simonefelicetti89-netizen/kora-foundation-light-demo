'use client';

// components/company/transparency/SubmissionFeedbackPanel.tsx
// B94-B — Company Submission Transparency
// Answers "Che fine hanno fatto i dati che ho caricato?" with aggregate-only data.
// All counts are company-level. No individual worker data ever surfaces here.

import {
  deriveEligibilityCategories,
  deriveReviewBreakdown,
  deriveDataQualitySummary,
  ELIGIBILITY_TAXONOMY,
  KORA_EDUCATION_STEPS,
  type EligibilityCategory,
  type ReviewBreakdown,
  type DataQualitySummary,
  type SubmissionStatusEntry,
} from '@/lib/company-transparency/transparency-engine';
import type { SubmissionFeedbackData } from '@/services/submission-feedback/SubmissionFeedbackService';

// ── Shared design tokens ──────────────────────────────────────────────────────

const COL = {
  heading:   'rgba(6,3,43,0.85)',
  body:      'rgba(6,3,43,0.58)',
  muted:     'rgba(6,3,43,0.40)',
  border:    'rgba(6,3,43,0.08)',
  card:      'rgba(6,3,43,0.03)',
  green:     '#22c55e',
  greenBg:   'rgba(34,197,94,0.09)',
  greenBdr:  'rgba(34,197,94,0.25)',
  amber:     '#f59e0b',
  amberBg:   'rgba(245,158,11,0.09)',
  amberBdr:  'rgba(245,158,11,0.25)',
  red:       '#ef4444',
  redBg:     'rgba(239,68,68,0.09)',
  redBdr:    'rgba(239,68,68,0.25)',
  blue:      'rgba(74,127,224,0.90)',
  blueBg:    'rgba(74,127,224,0.09)',
  blueBdr:   'rgba(74,127,224,0.25)',
};

// ── Demo / Live badge ─────────────────────────────────────────────────────────

function DataModeBadge({ isDemo }: { isDemo: boolean }) {
  return (
    <span
      data-testid={isDemo ? 'badge-demo' : 'badge-live'}
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          4,
        padding:      '2px 8px',
        borderRadius: 20,
        fontSize:     10,
        fontWeight:   700,
        letterSpacing: '0.04em',
        background:   isDemo ? COL.amberBg : COL.blueBg,
        border:       `1px solid ${isDemo ? COL.amberBdr : COL.blueBdr}`,
        color:        isDemo ? COL.amber : COL.blue,
      }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: isDemo ? COL.amber : COL.blue,
      }} />
      {isDemo ? 'DEMO · dati sintetici' : 'LIVE · dati aziendali'}
    </span>
  );
}

// ── Aggregate count pills ─────────────────────────────────────────────────────

function CountPill({
  label, value, color, bg, border,
}: {
  label: string; value: number; color: string; bg: string; border: string;
}) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8,
      background: bg, border: `1px solid ${border}`,
      minWidth: 90, textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: COL.muted, marginTop: 3, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// ── Submission Feedback Panel ─────────────────────────────────────────────────

export function SubmissionFeedbackPanel({
  feedback,
  submissions = [],
}: {
  feedback:    SubmissionFeedbackData;
  submissions?: ReadonlyArray<SubmissionStatusEntry>;
}) {
  const eligibility = deriveEligibilityCategories(
    feedback.recordsAccepted,
    feedback.recordsLimited,
    feedback.recordsBlocked,
  );
  const review  = deriveReviewBreakdown(submissions);
  const quality = deriveDataQualitySummary(
    feedback.filesUploaded,
    feedback.recordsParsed,
    feedback.recordsReviewed,
    feedback.parseWarnings,
    feedback.clarificationRequests,
  );

  return (
    <div data-testid="submission-feedback-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top row — counts + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: COL.heading, marginBottom: 2 }}>
            Cosa è successo ai tuoi dati
          </div>
          <div style={{ fontSize: 11, color: COL.muted }}>
            {feedback.period} · {feedback.recordsReceived} record ricevuti
          </div>
        </div>
        <DataModeBadge isDemo={feedback.isDemo} />
      </div>

      {/* Aggregate record counts */}
      <div
        data-testid="feedback-counts"
        style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
      >
        <CountPill label="Ricevuti"    value={feedback.recordsReceived} color={COL.blue}  bg={COL.blueBg}  border={COL.blueBdr} />
        <CountPill label="Revisionati" value={feedback.recordsReviewed} color={COL.green} bg={COL.greenBg} border={COL.greenBdr} />
        <CountPill label="In attesa"   value={feedback.recordsPending}  color={COL.amber} bg={COL.amberBg} border={COL.amberBdr} />
        <CountPill label="Idonei"      value={feedback.recordsAccepted} color={COL.green} bg={COL.greenBg} border={COL.greenBdr} />
        <CountPill label="Limitati"    value={feedback.recordsLimited}  color={COL.amber} bg={COL.amberBg} border={COL.amberBdr} />
        <CountPill label="Esclusi"     value={feedback.recordsBlocked}  color={COL.red}   bg={COL.redBg}   border={COL.redBdr}  />
      </div>

      {/* Eligibility, Review, Quality, Why, Education — stacked sub-panels */}
      <ReviewStatusBreakdown review={review} />
      <EligibilitySummary categories={eligibility} />
      <DataQualitySummaryPanel quality={quality} />
      <WhyPanel />
      <KoraEducationBlock />
    </div>
  );
}

// ── Review Status Breakdown ───────────────────────────────────────────────────

export function ReviewStatusBreakdown({ review }: { review: ReviewBreakdown }) {
  const items = [
    { key: 'accepted',           label: 'Accettate',             value: review.accepted,           color: COL.green, bg: COL.greenBg, border: COL.greenBdr },
    { key: 'pending',            label: 'In revisione',           value: review.pending,            color: COL.blue,  bg: COL.blueBg,  border: COL.blueBdr },
    { key: 'needs_clarification',label: 'Chiarimento richiesto',  value: review.needsClarification, color: COL.amber, bg: COL.amberBg, border: COL.amberBdr },
    { key: 'rejected',           label: 'Rifiutate',              value: review.rejected,           color: COL.red,   bg: COL.redBg,   border: COL.redBdr },
  ];

  return (
    <div data-testid="review-status-breakdown">
      <div style={{ fontSize: 11, fontWeight: 600, color: COL.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Stato submission
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {items.map(({ key, label, value, color, bg, border }) => (
          <div
            key={key}
            data-testid={`review-status-${key}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 8,
              background: value > 0 ? bg : COL.card,
              border: `1px solid ${value > 0 ? border : COL.border}`,
            }}
          >
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: value > 0 ? color : COL.muted,
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: value > 0 ? color : COL.muted }}>{value}</span>
            <span style={{ fontSize: 11, color: COL.body }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Eligibility Summary ───────────────────────────────────────────────────────

export function EligibilitySummary({ categories }: { categories: EligibilityCategory[] }) {
  const colorMap: Record<string, { color: string; bg: string; border: string }> = {
    eligible: { color: COL.green, bg: COL.greenBg, border: COL.greenBdr },
    limited:  { color: COL.amber, bg: COL.amberBg, border: COL.amberBdr },
    blocked:  { color: COL.red,   bg: COL.redBg,   border: COL.redBdr   },
  };

  return (
    <div data-testid="eligibility-summary">
      <div style={{ fontSize: 11, fontWeight: 600, color: COL.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Classificazione Eligibility Gate
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {categories.map((cat) => {
          const c = colorMap[cat.key];
          return (
            <div
              key={cat.key}
              data-testid={`eligibility-category-${cat.key}`}
              style={{
                padding: '14px 16px', borderRadius: 10,
                background: COL.card, border: `1px solid ${COL.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{cat.count}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                  background: c.bg, border: `1px solid ${c.border}`, color: c.color,
                }}>
                  {cat.label} · {cat.percentage}%
                </span>
              </div>
              <div style={{ fontSize: 11, color: COL.body, marginBottom: 10, lineHeight: 1.5 }}>
                {cat.italianExplanation}
              </div>
              <div style={{ fontSize: 10, color: COL.muted, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Esempi
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {cat.examples.map((ex, i) => (
                  <li key={i} style={{ fontSize: 11, color: COL.body, display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 3 }}>
                    <span style={{ color: c.color, flexShrink: 0, marginTop: 1 }}>·</span>
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Data Quality Summary ──────────────────────────────────────────────────────

export function DataQualitySummaryPanel({ quality }: { quality: DataQualitySummary }) {
  const metrics = [
    { label: 'File caricati',           value: String(quality.filesUploaded),             color: COL.blue },
    { label: 'Record analizzati',        value: String(quality.recordsParsed),             color: COL.heading },
    { label: 'Record revisionati',       value: String(quality.recordsReviewed),           color: COL.heading },
    { label: 'Parsing riuscito',         value: `${quality.parseSuccessRate}%`,            color: quality.parseSuccessRate >= 95 ? COL.green : COL.amber },
    { label: 'Avvisi di parsing',        value: String(quality.parseWarnings),             color: quality.parseWarnings === 0 ? COL.green : COL.amber },
    { label: 'Chiarimenti richiesti',    value: String(quality.clarificationRequests),     color: quality.clarificationRequests === 0 ? COL.green : COL.amber },
  ];

  return (
    <div data-testid="data-quality-summary">
      <div style={{ fontSize: 11, fontWeight: 600, color: COL.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Qualità dei dati
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {metrics.map(({ label, value, color }) => (
          <div key={label} style={{
            padding: '8px 12px', borderRadius: 8,
            background: COL.card, border: `1px solid ${COL.border}`,
            textAlign: 'center', minWidth: 80,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 10, color: COL.muted, marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Why Panel ─────────────────────────────────────────────────────────────────

export function WhyPanel() {
  const reasons = [
    {
      title:  'Eligibility Gate',
      body:   'KORA verifica se ogni attività è volontaria e va oltre il minimo contrattuale e legale. Le attività obbligatorie per legge (DPI, sorveglianza sanitaria, compliance mandatoria) non generano Impact Units — non perché siano negative, ma perché non rappresentano attivazione volontaria.',
    },
    {
      title:  'Fattore Limitato (CF)',
      body:   'Alcune attività hanno valore welfare reale ma limitato. Il fattore di correzione CF riduce le Impact Units generate senza escludere completamente il record. Esempi: buoni pasto, fringe benefit generici, polizze standard.',
    },
    {
      title:  'Anti-Gaming Factor (AGF)',
      body:   'AGF protegge l\'integrità del KORA Index da inflazione artificiale. Se lo stesso evento viene ripetuto in modo sistematico senza variazione o valore reale aggiunto, AGF riduce o azzera le IU generate.',
    },
    {
      title:  'Verifica delle evidenze',
      body:   'La Verification Rate (VR) misura quale quota delle IU è supportata da evidenze verificabili. Dati senza evidenza allegata ricevono un peso di verifica più basso nel Confidence Score, ma non vengono automaticamente esclusi.',
    },
  ];

  return (
    <div data-testid="why-panel">
      <div style={{ fontSize: 11, fontWeight: 600, color: COL.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Perché alcuni record non generano impatto?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {reasons.map(({ title, body }) => (
          <div key={title} style={{
            padding: '12px 14px', borderRadius: 8,
            background: COL.card, border: `1px solid ${COL.border}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: COL.heading, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 11, color: COL.body, lineHeight: 1.6 }}>{body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KORA Education Block ──────────────────────────────────────────────────────

export function KoraEducationBlock() {
  return (
    <div data-testid="kora-education-block">
      <div style={{ fontSize: 11, fontWeight: 600, color: COL.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Come KORA interpreta i tuoi dati
      </div>
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: COL.card, border: `1px solid ${COL.border}`,
      }}>
        {/* Step flow */}
        <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'stretch' }}>
          {KORA_EDUCATION_STEPS.map((step, i) => (
            <div key={step.key} style={{ display: 'flex', alignItems: 'stretch', flex: '1 1 140px', minWidth: 120 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(74,127,224,0.07)', border: `1px solid ${COL.blueBdr}`,
                  minHeight: 32,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: COL.blue, flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: COL.heading }}>{step.label}</span>
                </div>
                <div style={{ fontSize: 10, color: COL.body, lineHeight: 1.5, padding: '0 2px' }}>
                  {step.description}
                </div>
              </div>
              {i < KORA_EDUCATION_STEPS.length - 1 && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', padding: '10px 6px 0',
                  color: COL.muted, fontSize: 14, flexShrink: 0,
                }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Privacy note */}
        <div style={{
          marginTop: 12, padding: '8px 10px', borderRadius: 6,
          background: COL.greenBg, border: `1px solid ${COL.greenBdr}`,
          fontSize: 10, color: COL.body, lineHeight: 1.5,
        }}>
          <strong style={{ color: COL.green }}>Privacy by design</strong>
          {' — '}
          Il KORA Index è un indicatore a livello aziendale. Le Impact Units intermedie dei singoli lavoratori (PIB)
          non sono mai visibili al datore di lavoro. L&apos;accesso a dati individuali è strutturalmente escluso.
        </div>
      </div>
    </div>
  );
}

// ── Compact version for workspace integration ─────────────────────────────────

export function SubmissionTransparencyCompact({
  feedback,
}: {
  feedback: SubmissionFeedbackData;
}) {
  const eligibility = deriveEligibilityCategories(
    feedback.recordsAccepted,
    feedback.recordsLimited,
    feedback.recordsBlocked,
  );
  const eligible = eligibility.find((c) => c.key === 'eligible');

  return (
    <div data-testid="submission-transparency-compact">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(6,3,43,0.55)' }}>
          Trasparenza dati
        </span>
        <DataModeBadge isDemo={feedback.isDemo} />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {[
          { label: 'Ricevuti',    value: feedback.recordsReceived, color: '#4A7FE0' },
          { label: 'Idonei',      value: feedback.recordsAccepted, color: '#16a34a' },
          { label: 'Limitati',    value: feedback.recordsLimited,  color: '#b45309' },
          { label: 'Esclusi',     value: feedback.recordsBlocked,  color: '#dc2626' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: '5px 10px', borderRadius: 6, textAlign: 'center',
            background: 'rgba(6,3,43,0.03)', border: '1px solid rgba(6,3,43,0.07)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 9, color: 'rgba(6,3,43,0.40)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {eligible && (
        <div style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', marginBottom: 8 }}>
          {eligible.percentage}% dei record revisionati è idoneo alla generazione di Impact Units.
        </div>
      )}

      <a
        href="/company/status#submission-transparency"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
          color: '#4A7FE0', textDecoration: 'none', fontWeight: 600,
        }}
      >
        Dettaglio completo nel Status Center →
      </a>
    </div>
  );
}

// ── Eligibility taxonomy re-export (for tests and external consumers) ─────────
export { ELIGIBILITY_TAXONOMY };
