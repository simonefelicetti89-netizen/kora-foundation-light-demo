// app/partner/kora-link/initiatives/page.tsx
// KORA Link — Partner initiatives shell (KORA-LINK-SHELL-01, Flow D).
// Pure UI/UX preview. No DB. No Supabase. No RLS. No scan endpoint. No worker data.
// Mock/static data only. Protected by app/partner/layout.tsx (requirePartnerUser).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

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

type InitiativeStatus = 'Draft' | 'Pending accreditation' | 'Verified' | 'Closed';

const STATUS_LABEL: Record<InitiativeStatus, string> = {
  Draft: 'Bozza',
  'Pending accreditation': 'In attesa di accreditamento',
  Verified: 'Verificata',
  Closed: 'Chiusa',
};

const STATUS_COLOR: Record<InitiativeStatus, { bg: string; text: string }> = {
  Draft: { bg: 'rgba(6,3,43,0.06)', text: 'rgba(6,3,43,0.62)' },
  'Pending accreditation': { bg: 'rgba(217,154,43,0.12)', text: '#8A5A00' },
  Verified: { bg: 'rgba(47,125,85,0.10)', text: '#2F7D55' },
  Closed: { bg: 'rgba(6,3,43,0.06)', text: 'rgba(6,3,43,0.42)' },
};

interface MockInitiative {
  id: string;
  name: string;
  status: InitiativeStatus;
  eventType: string;
  window: string;
  confirmationMode: string;
}

// Illustrative only — no partner_scans table exists, no scan endpoint implemented.
const MOCK_INITIATIVES: MockInitiative[] = [
  {
    id: 'demo-init-1',
    name: 'Giornata di volontariato ambientale — Parco Nord',
    status: 'Verified',
    eventType: 'Volontariato territoriale',
    window: '2026-06-14',
    confirmationMode: 'Conferma minima presenza — nessun dato identificativo',
  },
  {
    id: 'demo-init-2',
    name: 'Workshop upskilling digitale',
    status: 'Pending accreditation',
    eventType: 'Formazione verificata',
    window: '2026-08-05',
    confirmationMode: 'In attesa di completamento accreditamento partner',
  },
  {
    id: 'demo-init-3',
    name: 'Raccolta fondi solidale',
    status: 'Draft',
    eventType: 'Iniziativa collettiva',
    window: '—',
    confirmationMode: 'Non ancora definita',
  },
  {
    id: 'demo-init-4',
    name: 'Evento pilota 2025 (archiviato)',
    status: 'Closed',
    eventType: 'Volontariato territoriale',
    window: '2025-11-20',
    confirmationMode: 'Conferma minima presenza — nessun dato identificativo',
  },
];

function InitiativeRow({ initiative }: { initiative: MockInitiative }) {
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

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: TOKENS.inkSecondary }}>
        <span>Tipo: {initiative.eventType}</span>
        <span>Finestra: {initiative.window}</span>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: TOKENS.inkHint, lineHeight: 1.5 }}>
        {initiative.confirmationMode}
      </p>
    </div>
  );
}

export default function PartnerKoraLinkInitiativesPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Partner · KORA Link · Iniziative
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Iniziative verificate — anteprima design
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
          Anteprima di come un partner accreditato vedrebbe le proprie iniziative Track A, senza mai
          accedere a dati identificativi dei worker.
        </p>
      </div>

      {/* Demo shell banner — explicit, non-suppressible */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — no DB, nessuna RLS, nessuna chiamata a Supabase o RPC. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Le iniziative mostrate sono dati mock statici. Nessuna tabella <code>partner_scans</code> esiste
          oggi — rimossa esplicitamente da 034 in KL-16, deferred a una futura migration 036+.
          Nessuno scan reale è implementato in questa build.
        </p>
      </div>

      {/* Mock initiative list */}
      <Panel>
        <SectionLabel>Iniziative (dati mock)</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MOCK_INITIATIVES.map((i) => (
            <InitiativeRow key={i.id} initiative={i} />
          ))}
        </div>
      </Panel>

      {/* Privacy-safe interaction — mirrors /partner/kora-link */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Interazione privacy-safe</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Il modello Track A è progettato perché il partner non riceva mai dati identificativi non
          necessari alla verifica dell&apos;evento — nessun nome, nessun contatto, nessun profilo worker.
          Solo la conferma minima che un evento verificato è avvenuto.
        </p>
      </div>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/partner/kora-link" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          ← Torna a KORA Link — verified event infrastructure
        </Link>
      </p>

    </div>
  );
}
