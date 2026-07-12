// app/partner/initiatives/page.tsx
// Partner — Initiatives shell (PARTNER-SURFACE-01).
// General partner initiative pipeline: propose, sponsor, adopt, or support —
// broader than the KORA Link Track A-specific /partner/kora-link/initiatives
// (chip/scan verification). Pure UI/UX preview. No DB. No Supabase. No RPC.
// No worker-level data anywhere on this page — aggregate interest only.
// Protected by app/partner/layout.tsx (requirePartnerUser — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS, PILLAR_COLORS, type PillarColorKey } from '@/lib/design/kora-design-tokens';

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

type InitiativeStatus = 'Draft' | 'In review' | 'Verified' | 'Active' | 'Closed';

// Visible labels are deliberately distinct from /partner/kora-link/initiatives'
// (Bozza/Verificata) — this is a different pipeline (proposal/sponsorship/adoption,
// not Track A scan accreditation) and must not read as the same one.
const STATUS_LABEL: Record<InitiativeStatus, string> = {
  Draft: 'In preparazione',
  'In review': 'In valutazione',
  Verified: 'Approvata',
  Active: 'Attiva',
  Closed: 'Conclusa',
};

const STATUS_COLOR: Record<InitiativeStatus, { bg: string; text: string }> = {
  Draft: { bg: 'rgba(6,3,43,0.06)', text: 'rgba(6,3,43,0.62)' },
  'In review': { bg: 'rgba(217,154,43,0.12)', text: '#8A5A00' },
  Verified: { bg: 'rgba(97,86,245,0.10)', text: '#6156F5' },
  Active: { bg: 'rgba(47,125,85,0.10)', text: '#2F7D55' },
  Closed: { bg: 'rgba(6,3,43,0.06)', text: 'rgba(6,3,43,0.42)' },
};

type InterestLevel = 'Basso' | 'Medio' | 'Alto';

interface MockInitiative {
  id: string;
  name: string;
  status: InitiativeStatus;
  pillar: PillarColorKey;
  engagementState: string;
  aggregateInterest: InterestLevel;
}

// Illustrative only — not persisted, not derived from any live source.
const MOCK_INITIATIVES: MockInitiative[] = [
  {
    id: 'partner-init-1',
    name: 'Percorso di mentoring digitale per neoassunti',
    status: 'Active',
    pillar: 'GROWTH',
    engagementState: 'Sponsorizzata dal partner, co-progettata con KORA Admin',
    aggregateInterest: 'Alto',
  },
  {
    id: 'partner-init-2',
    name: 'Giornata di raccolta alimentare territoriale',
    status: 'Verified',
    pillar: 'IMPACT',
    engagementState: 'Adottata dal partner — in attesa di finestra di attivazione',
    aggregateInterest: 'Medio',
  },
  {
    id: 'partner-init-3',
    name: 'Workshop di ascolto attivo e supporto tra pari',
    status: 'In review',
    pillar: 'CONNECTION',
    engagementState: 'Proposta dal partner — in revisione da KORA Admin',
    aggregateInterest: 'Medio',
  },
  {
    id: 'partner-init-4',
    name: 'Programma di ergonomia e prevenzione posturale',
    status: 'Draft',
    pillar: 'LIFE',
    engagementState: 'In preparazione — non ancora inviata per valutazione',
    aggregateInterest: 'Basso',
  },
  {
    id: 'partner-init-5',
    name: 'Archivio di pratiche senior-junior (edizione 2025)',
    status: 'Closed',
    pillar: 'LEGACY',
    engagementState: 'Conclusa — risultati archiviati',
    aggregateInterest: 'Basso',
  },
];

function PillarBadge({ pillar }: { pillar: PillarColorKey }) {
  const color = PILLAR_COLORS[pillar];
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: 999,
        background: `${color}1A`,
        color,
        border: `1px solid ${color}45`,
      }}
    >
      {pillar}
    </span>
  );
}

function InitiativeCard({ initiative }: { initiative: MockInitiative }) {
  const color = STATUS_COLOR[initiative.status];
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
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TOKENS.ink }}>{initiative.name}</p>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 999,
            background: color.bg,
            color: color.text,
          }}
        >
          {STATUS_LABEL[initiative.status]}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <PillarBadge pillar={initiative.pillar} />
        <span style={{ fontSize: 11.5, color: TOKENS.inkSecondary }}>
          Interesse aggregato: <strong style={{ color: TOKENS.ink }}>{initiative.aggregateInterest}</strong>
        </span>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: TOKENS.inkHint, lineHeight: 1.5 }}>
        {initiative.engagementState}
      </p>
    </div>
  );
}

export default function PartnerInitiativesPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Partner · Iniziative
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Iniziative — proponi, sponsorizza, adotta
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
          Il pipeline di iniziative con cui il tuo profilo partner può essere coinvolto — proposta, sponsorship,
          adozione o supporto. Distinta dalle iniziative verificate KORA Link (scan fisico), che restano su{' '}
          <Link href="/partner/kora-link/initiatives" style={{ color: TOKENS.accent, textDecoration: 'none', fontWeight: 700 }}>
            /partner/kora-link/initiatives
          </Link>.
        </p>
      </div>

      {/* Preview banner — explicit, non-suppressible */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — dati mock, nessuna connessione a database o servizi esterni. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Le iniziative mostrate sono illustrative. Nessun dato a livello di singolo worker è presente in
          questa pagina — solo pipeline e interesse aggregato.
        </p>
      </div>

      {/* Initiative list */}
      <Panel>
        <SectionLabel>Iniziative (dati mock)</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MOCK_INITIATIVES.map((i) => (
            <InitiativeCard key={i.id} initiative={i} />
          ))}
        </div>
      </Panel>

      {/* Cross-links to the rest of the partner surface */}
      <Panel>
        <SectionLabel>Continua nell&apos;area partner</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link href="/partner/relationships" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
            Relazioni con i lavoratori — dove e perché possono comparire nominativi →
          </Link>
          <Link href="/partner/aggregate-signals" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
            Segnali aggregati — performance privacy-safe delle iniziative →
          </Link>
          <Link href="/partner/privacy-boundary" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
            Confine privacy — cosa può vedere il partner, cosa vede l&apos;azienda →
          </Link>
        </div>
      </Panel>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/partner/workspace" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          ← Torna al Workspace Partner
        </Link>
      </p>

    </div>
  );
}
