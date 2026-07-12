// app/partner/activity-catalog/[activityId]/page.tsx
// Partner Activity Catalog — detail shell (PARTNER-ACTIVITY-CATALOG-01).
//
// Pure UI/UX preview of a single Partner Activity. Static lookup by id from
// lib/partner-activities/catalog.ts — no DB, no Supabase, no RPC. Shows
// classification, pillar mapping, future company selection modes, future
// worker action, a KORA Index signal preview (never real), the privacy
// boundary, and the fiscal/legal disclaimer. Not a KORA Space initiative
// and does not feed KORA Contribution.
// Protected by app/partner/layout.tsx (requirePartnerUser — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TOKENS, PILLAR_COLORS } from '@/lib/design/kora-design-tokens';
import {
  getPartnerActivityById,
  ACTIVITY_TYPE_LABELS,
  FISCAL_CATEGORY_LABELS,
  FISCAL_REVIEW_STATUS_LABELS,
  INDEX_SIGNAL_ELIGIBILITY_LABELS,
  CONTRIBUTION_ELIGIBILITY_LABELS,
  DELIVERY_MODE_LABELS,
  ACCESS_MODE_LABELS,
  FUTURE_WORKER_ACTION_LABELS,
  PARTNER_ACTIVITY_STATUS_LABELS,
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: '0 0 3px', fontSize: 10.5, color: TOKENS.inkHint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.ink, fontWeight: 600 }}>{value}</p>
    </div>
  );
}

export default async function PartnerActivityDetailPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;
  const activity = getPartnerActivityById(activityId);

  if (!activity) {
    notFound();
  }

  const pillarColor = PILLAR_COLORS[activity.primaryPillar];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Partner · Attività standard · Dettaglio
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          {activity.title}
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
          {activity.shortDescription}
        </p>
      </div>

      {/* Preview banner */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — dati mock, nessuna connessione a database o servizi esterni. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Nessuna prenotazione reale è possibile per questa attività in questa build.
        </p>
      </div>

      {/* Classification */}
      <Panel>
        <SectionLabel>Classificazione</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="Partner" value={activity.partnerName} />
          <Field label="Tipo attività" value={ACTIVITY_TYPE_LABELS[activity.activityType]} />
          <Field label="Categoria fiscale" value={FISCAL_CATEGORY_LABELS[activity.fiscalCategory]} />
          <Field label="Stato revisione fiscale" value={FISCAL_REVIEW_STATUS_LABELS[activity.fiscalReviewStatus]} />
          <Field label="Modalità di erogazione" value={DELIVERY_MODE_LABELS[activity.deliveryMode]} />
          <Field label="Stato catalogo" value={PARTNER_ACTIVITY_STATUS_LABELS[activity.status]} />
        </div>
      </Panel>

      {/* Pillar mapping */}
      <Panel>
        <SectionLabel>Mappatura pilastri</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
              background: `${pillarColor}1A`, color: pillarColor, border: `1px solid ${pillarColor}45`,
            }}
          >
            {activity.primaryPillar} — primario
          </span>
          {activity.secondaryPillars.map((p) => (
            <span
              key={p}
              style={{
                display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 999,
                background: 'rgba(6,3,43,0.04)', color: TOKENS.inkHint, border: `1px solid ${TOKENS.inkBorder}`,
              }}
            >
              {p} — secondario
            </span>
          ))}
        </div>
      </Panel>

      {/* Future company selection modes */}
      <Panel>
        <SectionLabel>Modalità future di selezione azienda</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questa attività è oggi classificata come <strong style={{ color: TOKENS.ink }}>{ACCESS_MODE_LABELS[activity.accessMode]}</strong>.
          In futuro l&apos;azienda potrà abilitare le attività per categoria fiscale, per pilastro, per partner specifico,
          per attività singola, o lasciare scelta libera al worker entro un perimetro/budget — nessuna di queste
          modalità è attiva oggi.
        </p>
      </Panel>

      {/* Future worker action */}
      <Panel>
        <SectionLabel>Azione futura del worker</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          In futuro il worker potrà interagire con questa attività tramite:{' '}
          <strong style={{ color: TOKENS.ink }}>{FUTURE_WORKER_ACTION_LABELS[activity.futureWorkerAction]}</strong>.
          Nessuna azione reale è disponibile in questa anteprima.
        </p>
      </Panel>

      {/* KORA Index signal preview */}
      <Panel>
        <SectionLabel>Anteprima segnale KORA Index</SectionLabel>
        <p style={{ margin: '0 0 8px', fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Eleggibilità segnale KORA Index: <strong style={{ color: TOKENS.ink }}>{INDEX_SIGNAL_ELIGIBILITY_LABELS[activity.indexSignalEligibility]}</strong>.
          Nessun segnale reale è generato oggi — l&apos;attivazione di questa attività non alimenta alcun calcolo
          KORA Index in questa build.
        </p>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Eleggibilità KORA Contribution: <strong style={{ color: TOKENS.ink }}>{CONTRIBUTION_ELIGIBILITY_LABELS[activity.contributionEligibility]}</strong>.
          Le attività non alimentano mai direttamente KORA Contribution — solo le iniziative KORA Space lo fanno.
        </p>
      </Panel>

      {/* Privacy boundary */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Confine privacy</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Nessun nominativo worker è mostrato qui. Il partner vedrà un nominativo solo dopo un&apos;azione
          volontaria del worker su questa attività. L&apos;azienda riceve sempre e solo segnali aggregati.
        </p>
      </div>

      {/* Fiscal/legal disclaimer */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Nota fiscale/legale</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          La categoria fiscale mostrata è metadato proposto, non un&apos;approvazione fiscale, payroll o legale.
          Nessuna decisione DPO, CTO, fiscale o legale è presa da questa pagina.
        </p>
      </div>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/partner/activity-catalog" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          ← Torna al Catalogo Attività
        </Link>
      </p>

    </div>
  );
}
