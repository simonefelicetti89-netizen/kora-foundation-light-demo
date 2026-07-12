// app/partner/relationships/page.tsx
// Partner — Worker-initiated relationships (PARTNER-SURFACE-01).
//
// Product principle (see docs/PARTNER_SURFACE_01.md):
// KORA does not hide the worker from every stakeholder — it hides the worker
// FROM THE EMPLOYER when the interaction belongs to the worker-partner
// relationship. A worker who voluntarily applies, requests contact, joins an
// initiative, shares their profile, or books with this partner is choosing to
// share identity with THIS PARTNER — not with their employer. That is why
// name/surname may legitimately appear on this page, and only on this page
// (plus the mock rows below reflect that scoping, never a company-facing view).
//
// Pure UI/UX preview. No DB. No Supabase. No RPC. No real relationship record
// is created. Mock worker names are fictitious placeholders, not real people.
// Protected by app/partner/layout.tsx (requirePartnerUser — no new auth system here).

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

type RelationshipType =
  | 'Candidatura volontaria'
  | 'Richiesta di contatto'
  | 'Iscrizione a iniziativa'
  | 'Profilo condiviso'
  | 'Prenotazione volontaria';

type RelationshipStatus = 'Nuova' | 'In corso' | 'Completata' | 'Ritirata';

const STATUS_COLOR: Record<RelationshipStatus, { bg: string; text: string }> = {
  Nuova: { bg: 'rgba(97,86,245,0.10)', text: '#6156F5' },
  'In corso': { bg: 'rgba(217,154,43,0.12)', text: '#8A5A00' },
  Completata: { bg: 'rgba(47,125,85,0.10)', text: '#2F7D55' },
  Ritirata: { bg: 'rgba(6,3,43,0.06)', text: 'rgba(6,3,43,0.42)' },
};

interface MockRelationship {
  id: string;
  workerName: string;
  relationshipType: RelationshipType;
  emailShared: boolean;
  profileShared: boolean;
  dynamicCvShared: boolean;
  purpose: string;
  timestamp: string;
  visibilityScope: string;
  status: RelationshipStatus;
}

// Fictitious placeholder names, illustrative only — not real people, not
// derived from any seed file or live source. Names appear here because each
// row models a relationship the worker chose to initiate with this partner.
const MOCK_RELATIONSHIPS: MockRelationship[] = [
  {
    id: 'rel-1',
    workerName: 'Giulia Bianchi',
    relationshipType: 'Candidatura volontaria',
    emailShared: true,
    profileShared: true,
    dynamicCvShared: true,
    purpose: 'Candidatura per il percorso di mentoring digitale',
    timestamp: '2026-07-08 09:14',
    visibilityScope: 'Visibile solo al partner destinatario della candidatura',
    status: 'In corso',
  },
  {
    id: 'rel-2',
    workerName: 'Marco Ferrari',
    relationshipType: 'Prenotazione volontaria',
    emailShared: true,
    profileShared: false,
    dynamicCvShared: false,
    purpose: 'Prenotazione al workshop di ascolto attivo',
    timestamp: '2026-07-06 15:40',
    visibilityScope: 'Visibile solo al partner organizzatore del workshop',
    status: 'Completata',
  },
  {
    id: 'rel-3',
    workerName: 'Elena Conti',
    relationshipType: 'Richiesta di contatto',
    emailShared: true,
    profileShared: false,
    dynamicCvShared: false,
    purpose: 'Richiesta informazioni sulla giornata di raccolta alimentare',
    timestamp: '2026-07-11 11:02',
    visibilityScope: 'Visibile solo al partner contattato',
    status: 'Nuova',
  },
  {
    id: 'rel-4',
    workerName: 'Davide Romano',
    relationshipType: 'Iscrizione a iniziativa',
    emailShared: false,
    profileShared: true,
    dynamicCvShared: false,
    purpose: 'Iscrizione al programma di ergonomia e prevenzione posturale',
    timestamp: '2026-07-02 08:55',
    visibilityScope: 'Visibile solo al partner dell’iniziativa',
    status: 'In corso',
  },
  {
    id: 'rel-5',
    workerName: 'Sara Greco',
    relationshipType: 'Profilo condiviso',
    emailShared: false,
    profileShared: true,
    dynamicCvShared: true,
    purpose: 'Condivisione volontaria del profilo per opportunità future',
    timestamp: '2026-06-28 17:20',
    visibilityScope: 'Visibile solo al partner con cui il profilo è stato condiviso',
    status: 'Ritirata',
  },
];

function YesNo({ value }: { value: boolean }) {
  return (
    <span style={{ fontWeight: 700, color: value ? TOKENS.safeguard.pass.text : TOKENS.inkHint }}>
      {value ? 'sì' : 'no'}
    </span>
  );
}

function RelationshipRow({ r }: { r: MockRelationship }) {
  const color = STATUS_COLOR[r.status];
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
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TOKENS.ink }}>{r.workerName}</p>
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
          {r.status}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: TOKENS.inkSecondary }}>{r.relationshipType} — {r.purpose}</p>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 11.5, color: TOKENS.inkSecondary }}>
        <span>Email condivisa: <YesNo value={r.emailShared} /></span>
        <span>Profilo condiviso: <YesNo value={r.profileShared} /></span>
        <span>Dynamic CV condiviso: <YesNo value={r.dynamicCvShared} /></span>
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 11, color: TOKENS.inkHint }}>
        <span>{r.timestamp}</span>
        <span>{r.visibilityScope}</span>
      </div>

      <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: TOKENS.inkHint }}>
        Non condiviso con l&apos;azienda — solo aggregati
      </p>
    </div>
  );
}

export default function PartnerRelationshipsPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Partner · Relazioni con i lavoratori
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Relazioni avviate volontariamente dal lavoratore
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 660 }}>
          Qui compaiono nominativi — a differenza del resto dell&apos;area partner, che resta aggregata. Il motivo:
          ogni riga rappresenta una relazione che il lavoratore ha scelto volontariamente di avviare con te
          (candidatura, richiesta di contatto, iscrizione, condivisione di profilo o prenotazione), non un dato
          che l&apos;azienda ti ha trasmesso.
        </p>
      </div>

      {/* Why names appear here — explicit, non-suppressible */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — dati mock, nessuna connessione a database o servizi esterni. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          KORA non anonimizza ogni relazione: protegge il lavoratore dal controllo aziendale. Quando il
          lavoratore sceglie volontariamente di entrare in relazione con un partner, il partner può vedere
          solo i dati che il lavoratore ha scelto di condividere. L&apos;azienda riceve soltanto segnali aggregati.
        </p>
      </div>

      {/* Mock relationship list */}
      <Panel>
        <SectionLabel>Relazioni avviate dal lavoratore (dati mock)</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MOCK_RELATIONSHIPS.map((r) => (
            <RelationshipRow key={r.id} r={r} />
          ))}
        </div>
      </Panel>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/partner/privacy-boundary" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          Confine privacy — perché questa pagina è diversa dal resto dell&apos;area partner →
        </Link>
      </p>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/partner/activity-bookings" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          Richieste e prenotazioni attività — stesso principio, per le Attività Partner →
        </Link>
      </p>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/partner/initiatives" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          ← Torna a Iniziative
        </Link>
      </p>

    </div>
  );
}
