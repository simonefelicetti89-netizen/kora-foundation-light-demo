// app/company/activity-selection/plan/page.tsx
// Company — Activity Selection example plan (COMPANY-ACTIVITY-SELECTION-01).
//
// Static preview of a single illustrative company activity-selection plan —
// not a real saved plan, not persisted, no enforcement. Complements
// /company/activity-selection (which explains the five selection modes in
// general) by showing what one concrete combination might look like.
// No DB. No Supabase. No RPC. No budget enforcement. No worker booking.
// Protected by app/company/layout.tsx (requireCompanyUser — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS, PILLAR_COLORS, type PillarColorKey } from '@/lib/design/kora-design-tokens';
import {
  getPartnerActivities,
  FISCAL_CATEGORY_LABELS,
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

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
        background: 'rgba(6,3,43,0.05)', color: TOKENS.inkSecondary, border: `1px solid ${TOKENS.inkBorder}`,
      }}
    >
      {children}
    </span>
  );
}

function PillarTag({ pillar }: { pillar: PillarColorKey }) {
  const color = PILLAR_COLORS[pillar];
  return (
    <span
      style={{
        display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
        background: `${color}1A`, color, border: `1px solid ${color}45`,
      }}
    >
      {pillar}
    </span>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11.5, fontWeight: 700, color: TOKENS.inkHint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: TOKENS.ink }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11.5, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{note}</p>
    </div>
  );
}

// Example selection only — illustrative, not derived from any live source.
const EXAMPLE_FISCAL_CATEGORIES: FiscalCategory[] = ['welfare_aziendale', 'salute_prevenzione', 'formazione'];
const EXAMPLE_PILLARS: PillarColorKey[] = ['LIFE', 'GROWTH', 'CONNECTION'];
const EXAMPLE_ACTIVITY_IDS = ['activity-001', 'activity-002', 'activity-004', 'activity-007'];

export default function CompanyActivitySelectionPlanPage() {
  const activities = getPartnerActivities();
  const exampleActivities = activities.filter((a) => EXAMPLE_ACTIVITY_IDS.includes(a.activityId));
  const examplePartners = Array.from(new Set(exampleActivities.map((a) => a.partnerName)));

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Company · Fase 2 · Esempio di piano
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Esempio di piano di attivazione
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 660 }}>
          Anteprima statica di una possibile combinazione di selezione — non un piano reale, non salvato,
          nessuna enforcement applicata. Complementa{' '}
          <Link href="/company/activity-selection" style={{ color: TOKENS.accent, textDecoration: 'none', fontWeight: 700 }}>
            Selezione Attività Partner
          </Link>.
        </p>
      </div>

      {/* Preview banner */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — dati mock, nessuna connessione a database o servizi esterni. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questo esempio non è persistito. Nessun budget è realmente applicato.
        </p>
      </div>

      {/* Selected fiscal categories */}
      <Panel>
        <SectionLabel>Categorie fiscali selezionate (esempio)</SectionLabel>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {EXAMPLE_FISCAL_CATEGORIES.map((c) => <Tag key={c}>{FISCAL_CATEGORY_LABELS[c]}</Tag>)}
        </div>
      </Panel>

      {/* Selected pillars */}
      <Panel>
        <SectionLabel>Pilastri selezionati (esempio)</SectionLabel>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {EXAMPLE_PILLARS.map((p) => <PillarTag key={p} pillar={p} />)}
        </div>
      </Panel>

      {/* Selected partners */}
      <Panel>
        <SectionLabel>Partner selezionati (esempio)</SectionLabel>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {examplePartners.map((p) => <Tag key={p}>{p}</Tag>)}
        </div>
      </Panel>

      {/* Selected activities */}
      <Panel>
        <SectionLabel>Attività selezionate (esempio)</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exampleActivities.map((a) => (
            <div key={a.activityId} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: TOKENS.cardRadiusSm, border: TOKENS.cardBorder, background: '#fff', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.ink }}>{a.title}</span>
              <span style={{ fontSize: 11.5, color: TOKENS.inkHint }}>{a.partnerName}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Free worker choice perimeter */}
      <Panel>
        <SectionLabel>Perimetro scelta libera worker (esempio)</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Oltre alle attività selezionate sopra, l&apos;azienda potrebbe lasciare al worker scelta libera entro
          le categorie fiscali e i pilastri abilitati, fino al budget indicativo assegnato — nessuna
          enforcement implementata in questa build.
        </p>
      </Panel>

      {/* Budget + status */}
      <Panel>
        <SectionLabel>Budget indicativo e stato</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          <MetricCard label="Budget annuo indicativo" value="€ 45.000" note="Cifra illustrativa." />
          <MetricCard label="Stato revisione" value="Bozza" note="Nessun piano è realmente salvato." />
          <MetricCard label="Revisione payroll/fiscale" value="Richiesta" note="Nessuna approvazione implicata." />
        </div>
      </Panel>

      {/* Aggregate reporting preview */}
      <Panel>
        <SectionLabel>Anteprima reportistica aggregata</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          <MetricCard label="Adesione per categoria" value="Anteprima" note="Nessun dato reale oggi." />
          <MetricCard label="Adesione per pilastro" value="Anteprima" note="Nessun dato reale oggi." />
          <MetricCard label="Segnale KORA Index" value="Anteprima" note="Nessun segnale reale generato." />
        </div>
      </Panel>

      {/* Privacy boundary */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Confine privacy</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          L&apos;azienda riceve sempre e solo output aggregati. Il partner vede nominativi solo dopo un&apos;azione
          volontaria del worker. Nessuna attività individuale del worker torna mai al datore di lavoro.
        </p>
      </div>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/company/activity-selection" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          ← Torna a Selezione Attività Partner
        </Link>
      </p>

    </div>
  );
}
