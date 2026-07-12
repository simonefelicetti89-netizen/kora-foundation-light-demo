// app/partner/activity-catalog/page.tsx
// Partner — Activity Catalog shell (PARTNER-ACTIVITY-CATALOG-01).
//
// A Partner Activity is NOT a KORA Space initiative and does NOT feed KORA
// Contribution. It represents a standard service/product/opportunity that
// an accredited partner offers — classifiable by fiscal/welfare category,
// mappable to KORA pillars, and intended in the future to feed KORA Index
// aggregate activation signals once companies can select and workers can
// book/request activities. None of that selection/booking logic exists yet.
//
// Pure UI/UX preview. No DB. No Supabase. No RPC. No real booking. No
// worker-level data anywhere on this page — every activity below is
// catalog metadata only, never tied to a specific worker.
// Protected by app/partner/layout.tsx (requirePartnerUser — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS, PILLAR_COLORS } from '@/lib/design/kora-design-tokens';
import {
  getPartnerActivities,
  getPartnerActivityCatalogSummary,
  ACTIVITY_TYPE_LABELS,
  FISCAL_CATEGORY_LABELS,
  FISCAL_REVIEW_STATUS_LABELS,
  INDEX_SIGNAL_ELIGIBILITY_LABELS,
  CONTRIBUTION_ELIGIBILITY_LABELS,
  FUTURE_WORKER_ACTION_LABELS,
  ACCESS_MODE_LABELS,
  PARTNER_ACTIVITY_STATUS_LABELS,
  type PartnerActivity,
  type FiscalCategory,
} from '@/lib/partner-activities/catalog';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: 20 }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 10px' }}>
      {children}
    </p>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11.5, fontWeight: 700, color: TOKENS.inkHint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: TOKENS.ink }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11.5, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{note}</p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10.5,
        fontWeight: 700,
        padding: '3px 9px',
        borderRadius: 999,
        background: 'rgba(6,3,43,0.05)',
        color: TOKENS.inkSecondary,
        border: `1px solid ${TOKENS.inkBorder}`,
      }}
    >
      {children}
    </span>
  );
}

function ActivityCard({ activity }: { activity: PartnerActivity }) {
  const pillarColor = PILLAR_COLORS[activity.primaryPillar];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '14px 16px',
        borderRadius: TOKENS.cardRadiusSm,
        border: TOKENS.cardBorder,
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TOKENS.ink }}>{activity.title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: TOKENS.inkHint }}>{activity.partnerName}</p>
        </div>
        <span
          style={{
            fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
            background: 'rgba(6,3,43,0.05)', color: TOKENS.inkSecondary, whiteSpace: 'nowrap',
          }}
        >
          {PARTNER_ACTIVITY_STATUS_LABELS[activity.status]}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{activity.shortDescription}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Tag>{ACTIVITY_TYPE_LABELS[activity.activityType]}</Tag>
        <Tag>{FISCAL_CATEGORY_LABELS[activity.fiscalCategory]}</Tag>
        <span
          style={{
            display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
            background: `${pillarColor}1A`, color: pillarColor, border: `1px solid ${pillarColor}45`,
          }}
        >
          {activity.primaryPillar}
        </span>
        {activity.secondaryPillars.map((p) => (
          <span
            key={p}
            style={{
              display: 'inline-block', fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
              background: 'rgba(6,3,43,0.04)', color: TOKENS.inkHint, border: `1px solid ${TOKENS.inkBorder}`,
            }}
          >
            {p}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11.5, color: TOKENS.inkSecondary }}>
        <span>Revisione fiscale: <strong style={{ color: TOKENS.ink }}>{FISCAL_REVIEW_STATUS_LABELS[activity.fiscalReviewStatus]}</strong></span>
        <span>Azione futura worker: <strong style={{ color: TOKENS.ink }}>{FUTURE_WORKER_ACTION_LABELS[activity.futureWorkerAction]}</strong></span>
        <span>Accesso: <strong style={{ color: TOKENS.ink }}>{ACCESS_MODE_LABELS[activity.accessMode]}</strong></span>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: TOKENS.inkHint }}>
        <span>Segnale KORA Index: {INDEX_SIGNAL_ELIGIBILITY_LABELS[activity.indexSignalEligibility]}</span>
        <span>Contribution: {CONTRIBUTION_ELIGIBILITY_LABELS[activity.contributionEligibility]}</span>
      </div>

      <Link
        href={`/partner/activity-catalog/${activity.activityId}`}
        style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none', marginTop: 2 }}
      >
        Dettaglio attività →
      </Link>
    </div>
  );
}

export default function PartnerActivityCatalogPage() {
  const activities = getPartnerActivities();
  const summary = getPartnerActivityCatalogSummary();
  const fiscalCategories = Array.from(new Set(activities.map((a) => a.fiscalCategory))) as FiscalCategory[];

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Partner · Attività standard
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Catalogo Attività
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
          Le attività standard sono servizi, prodotti e opportunità offerti dal tuo profilo partner — distinte
          dalle{' '}
          <Link href="/partner/initiatives" style={{ color: TOKENS.accent, textDecoration: 'none', fontWeight: 700 }}>
            Proposte Partner
          </Link>{' '}
          e dalle iniziative KORA Space. Le attività alimentano in futuro segnali aggregati KORA Index — non
          alimentano mai direttamente KORA Contribution.
        </p>
      </div>

      {/* Preview banner — explicit, non-suppressible */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — dati mock, nessuna connessione a database o servizi esterni. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Nessuna prenotazione reale è possibile in questa build. Nessuna selezione aziendale, nessun booking
          worker, e nessun segnale KORA Index reale sono generati da questa pagina.
        </p>
      </div>

      {/* Summary cards */}
      <Panel>
        <SectionLabel>Riepilogo catalogo</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          <MetricCard label="Attività totali" value={summary.totalActivities} note="Numero totale di attività nel catalogo (dati mock)." />
          <MetricCard label="Categorie fiscali" value={Object.keys(summary.byFiscalCategory).length} note="Numero di categorie fiscali/welfare distinte rappresentate." />
          <MetricCard label="Pilastri coperti" value={Object.keys(summary.byPillar).length} note="Numero di pilastri KORA coperti (primario o secondario)." />
          <MetricCard label="Pronte per anteprima azienda" value={summary.readyForCompanyPreview} note="Attività con stato visible_to_company_preview." />
          <MetricCard label="Richiedono revisione fiscale" value={summary.needingFiscalReview} note="Revisione payroll aziendale necessaria o non ancora classificate." />
          <MetricCard label="Eleggibili KORA Index (anteprima)" value={summary.indexEligiblePreview} note="Segnale KORA Index eleggibile in anteprima — non ancora un segnale reale." />
        </div>
      </Panel>

      {/* Grouped by fiscal category */}
      <Panel>
        <SectionLabel>Attività per categoria fiscale</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {fiscalCategories.map((category) => (
            <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: TOKENS.inkHint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {FISCAL_CATEGORY_LABELS[category]}
              </p>
              {activities.filter((a) => a.fiscalCategory === category).map((a) => (
                <ActivityCard key={a.activityId} activity={a} />
              ))}
            </div>
          ))}
        </div>
      </Panel>

      {/* Privacy note */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Nessun nominativo worker</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questo catalogo non mostra mai nomi, email, identificativi worker o eventi individuali. Il partner
          vedrà nominativi solo dopo un&apos;azione volontaria del worker (prenotazione, candidatura, richiesta
          di contatto, condivisione di profilo) — esattamente come già descritto in{' '}
          <Link href="/partner/relationships" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
            Relazioni con i lavoratori
          </Link>. L&apos;azienda riceve sempre e solo segnali aggregati.
        </p>
      </div>

      {/* Classification note */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Nota sulla classificazione</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          La categoria fiscale/welfare mostrata è metadato proposto, non un&apos;approvazione fiscale o legale.
          La validazione fiscale, payroll e legale definitiva resta fuori dallo scope di questo sprint e non
          è decisa da questa pagina.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/partner/initiatives" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          ← Proposte Partner — corsia KORA Space/Contribution, separata
        </Link>
        <Link href="/admin/partner-ecosystem-model" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Modello ecosistema Partner →
        </Link>
        <Link href="/admin/kora-activation-layer" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Activation Layer — riferimento di modello →
        </Link>
        <Link href="/partner/activity-bookings" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Richieste e prenotazioni attività →
        </Link>
      </div>

    </div>
  );
}
