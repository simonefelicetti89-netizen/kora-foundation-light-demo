// app/company/kora-link/campaigns/page.tsx
// KORA Link — Company campaigns shell (KORA-LINK-SHELL-01, Flow B).
// Pure UI/UX preview. No DB. No Supabase. No RLS. No RPC calls. No real campaign creation.
// Mock/static data only — every count below is illustrative, not derived from any live source.
// Protected by app/company/layout.tsx (requireCompanyUser — no new auth system here).
// No individual worker visibility, ever — aggregate-only, consistent with company/kora-link/page.tsx.

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

type CampaignStatus = 'Draft' | 'Approved' | 'Ready to distribute' | 'Expired';

const STATUS_LABEL: Record<CampaignStatus, string> = {
  Draft: 'Bozza',
  Approved: 'Approvata',
  'Ready to distribute': 'Pronta per la distribuzione',
  Expired: 'Scaduta',
};

const STATUS_COLOR: Record<CampaignStatus, { bg: string; text: string }> = {
  Draft: { bg: 'rgba(6,3,43,0.06)', text: 'rgba(6,3,43,0.62)' },
  Approved: { bg: 'rgba(97,86,245,0.10)', text: '#6156F5' },
  'Ready to distribute': { bg: 'rgba(47,125,85,0.10)', text: '#2F7D55' },
  Expired: { bg: 'rgba(158,59,47,0.10)', text: '#9E3B2F' },
};

type DeliveryChannel = 'QR' | 'NFC' | 'Link';

interface MockCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  channels: DeliveryChannel[];
  expiry: string;
  targetAggregate: string;
}

// Illustrative only — not persisted, not derived from any table, not tied to a real rollout.
const MOCK_CAMPAIGNS: MockCampaign[] = [
  {
    id: 'demo-camp-1',
    name: 'Onboarding sede Milano — Q3',
    status: 'Ready to distribute',
    channels: ['QR', 'NFC'],
    expiry: '2026-09-30',
    targetAggregate: 'Reparto Operations (aggregato)',
  },
  {
    id: 'demo-camp-2',
    name: 'Attivazione post-evento wellbeing',
    status: 'Approved',
    channels: ['QR', 'Link'],
    expiry: '2026-08-15',
    targetAggregate: 'Tutta la sede (aggregato)',
  },
  {
    id: 'demo-camp-3',
    name: 'Pilot reparto Logistica',
    status: 'Draft',
    channels: ['NFC'],
    expiry: '—',
    targetAggregate: 'Reparto Logistica (aggregato)',
  },
  {
    id: 'demo-camp-4',
    name: 'Campagna pilota 2025 (archiviata)',
    status: 'Expired',
    channels: ['QR'],
    expiry: '2025-12-31',
    targetAggregate: 'Sede Torino (aggregato)',
  },
];

function ChannelBadge({ channel }: { channel: DeliveryChannel }) {
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
        background: 'rgba(6,3,43,0.05)',
        color: TOKENS.inkSecondary,
        border: `1px solid ${TOKENS.inkBorder}`,
      }}
    >
      {channel}
    </span>
  );
}

function CampaignRow({ campaign }: { campaign: MockCampaign }) {
  const color = STATUS_COLOR[campaign.status];
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
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TOKENS.ink }}>{campaign.name}</p>
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
          {STATUS_LABEL[campaign.status]}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {campaign.channels.map((ch) => (
          <ChannelBadge key={ch} channel={ch} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: TOKENS.inkSecondary }}>
        <span>Scadenza: {campaign.expiry}</span>
        <span>Target: {campaign.targetAggregate}</span>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          type="button"
          disabled
          title="Non attivo in questa anteprima — nessuna generazione reale"
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '8px 14px',
            borderRadius: 10,
            border: `1px solid ${TOKENS.inkBorder}`,
            background: 'rgba(6,3,43,0.04)',
            color: TOKENS.inkHint,
            cursor: 'not-allowed',
          }}
        >
          Scarica QR e istruzioni
        </button>
      </div>
    </div>
  );
}

export default function CompanyKoraLinkCampaignsPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Company · KORA Link · Campagne
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Campagne di distribuzione — anteprima design
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
          Anteprima di come l&apos;azienda vedrebbe le proprie campagne di distribuzione KORA Link,
          senza mai visibilità sul singolo worker.
        </p>
      </div>

      {/* Demo shell banner — explicit, non-suppressible */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — no DB, nessuna RLS, nessuna chiamata a Supabase o RPC. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Le campagne mostrate sono dati mock statici, non collegati a nessuna infrastruttura reale.
          La creazione campagna non è abilitata in questa build.
        </p>
      </div>

      {/* Mock campaign list */}
      <Panel>
        <SectionLabel>Campagne (dati mock)</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MOCK_CAMPAIGNS.map((c) => (
            <CampaignRow key={c.id} campaign={c} />
          ))}
        </div>
      </Panel>

      {/* Distribution instructions */}
      <Panel>
        <SectionLabel>Come funzionerebbe la distribuzione</SectionLabel>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.8 }}>
          <li>L&apos;azienda approva una campagna a livello di reparto o sede (mai per singolo worker).</li>
          <li>KORA genera materiali di distribuzione aggregati (QR, chip NFC, link) — non ancora implementato.</li>
          <li>I worker attivano individualmente il proprio KORA Link dal proprio spazio personale.</li>
          <li>L&apos;azienda vede solo conteggi aggregati di copertura e attivazione, mai chi ha attivato cosa.</li>
        </ol>
      </Panel>

      {/* No individual worker visibility — explicit, prominent, mirrors /company/kora-link */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Nessuna visibilità individuale</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questa pagina non mostrerà mai nomi dei worker, identificativi worker (worker_id), tag UID,
          o eventi di attivazione individuali. Solo conteggi aggregati a livello organizzativo, coerenti
          con il confine di privacy costituzionale di KORA.
        </p>
      </div>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/company/kora-link" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          ← Torna a KORA Link — governance aggregata
        </Link>
      </p>

    </div>
  );
}
