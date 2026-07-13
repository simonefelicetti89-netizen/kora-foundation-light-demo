// app/admin/kora-link/page.tsx
// KORA Link Control Tower (KL-23) — admin-facing overview of the whole KORA Link
// ecosystem: runtime readiness, feature flags, lifecycle, capability matrix,
// gate status, safety boundaries, next operational actions.
// Protected by app/admin/layout.tsx (requireKoraAdmin — no new auth system here).
// No DB. No Supabase writes. No Impact Units. No KORA Index effect.

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import {
  getKoraLinkEcosystemContext,
  getKoraLinkRoleSummary,
  getKoraLinkLifecycleWithState,
  getKoraLinkGates,
  KORA_LINK_ROLES,
  KORA_LINK_ROLE_LABEL,
  KORA_LINK_CAPABILITIES,
  KORA_LINK_CAPABILITY_STATE_LABEL,
  KORA_LINK_PRIVACY_BOUNDARIES,
} from '@/lib/kora-link/ecosystem';
import { KoraLinkCapabilityCard } from '@/components/kora-link/KoraLinkCapabilityCard';
import { KoraLinkReadinessPanel } from '@/components/kora-link/KoraLinkReadinessPanel';
import { KoraLinkBoundaryCard } from '@/components/kora-link/KoraLinkBoundaryCard';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 12px' }}>
      {children}
    </p>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: 20 }}>
      {children}
    </div>
  );
}

export default function KoraLinkControlTowerPage() {
  const context = getKoraLinkEcosystemContext();
  const adminSummary = getKoraLinkRoleSummary('admin', context);
  const lifecycle = getKoraLinkLifecycleWithState(context);
  const gates = getKoraLinkGates(context.gateStatus);
  const openGates = gates.filter((g) => g.status === 'open');

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          KORA Link · Control Tower
        </p>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          KORA Link Ecosystem
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
          Infrastruttura di collegamento fisico–digitale KORA. Governance centralizzata di runtime,
          feature flag, lifecycle dei chip, gate di produzione e confini privacy.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <Link
            href="/admin/kora-link-lab"
            style={{ display: 'inline-flex', fontSize: 12.5, fontWeight: 700, color: '#fff', background: TOKENS.ink, padding: '8px 14px', borderRadius: 8, textDecoration: 'none' }}
          >
            Apri KORA Link Lab (NFC) →
          </Link>
          <Link
            href="/admin/kora-link/governance"
            style={{ display: 'inline-flex', fontSize: 12.5, fontWeight: 700, color: TOKENS.ink, background: TOKENS.taupe, padding: '8px 14px', borderRadius: 8, textDecoration: 'none' }}
          >
            Registro decisioni aperte — anteprima →
          </Link>
          <Link
            href="/admin/kora-link/pilot-readiness"
            style={{ display: 'inline-flex', fontSize: 12.5, fontWeight: 700, color: TOKENS.ink, background: TOKENS.taupe, padding: '8px 14px', borderRadius: 8, textDecoration: 'none' }}
          >
            Checklist readiness pilota →
          </Link>
        </div>
      </div>

      {/* Runtime readiness / feature flags */}
      <Panel>
        <SectionLabel>Runtime readiness &amp; feature flags</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {[
            { label: 'KORA_LINK_ENABLED',            value: context.koraLinkEnabled ? 'true' : 'false',                 ok: !!context.koraLinkEnabled },
            { label: 'KORA_LINK_DB_LOOKUP_ENABLED',  value: context.dbLookupEnabled ? 'true' : 'false (default)',       ok: !context.dbLookupEnabled },
            { label: 'KORA_LINK_ACTIVATION_ENABLED', value: context.activationEnabled ? 'true' : 'false (default)',     ok: !context.activationEnabled },
            { label: 'Rate limit provider',          value: context.rateLimitProvider ?? 'non configurato',             ok: context.rateLimitProvider !== null },
            { label: 'Schema 034',                   value: 'proposed, non applicato',                                   ok: false },
            { label: 'RLS 035',                      value: 'proposed, non applicato',                                   ok: false },
            { label: 'RPC 036',                      value: 'proposed, non applicato',                                   ok: false },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10.5, color: TOKENS.inkHint, fontFamily: 'ui-monospace, monospace' }}>{row.label}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: row.ok ? TOKENS.safeguard.pass.text : TOKENS.safeguard.watch.text }}>{row.value}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Lifecycle overview */}
      <Panel>
        <SectionLabel>Lifecycle overview</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lifecycle.map((stage) => (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: `1px solid ${TOKENS.inkBorder}`, paddingBottom: 10 }}>
              <span style={{ fontSize: 10.5, color: TOKENS.inkHint, width: 18, flexShrink: 0 }}>{stage.order}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: TOKENS.ink }}>{stage.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{stage.description}</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: TOKENS.inkHint, whiteSpace: 'nowrap' }}>
                {KORA_LINK_CAPABILITY_STATE_LABEL[stage.state]}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Capability matrix per role */}
      <Panel>
        <SectionLabel>Capability matrix per ruolo</SectionLabel>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11.5 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 10px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Capability</th>
                {KORA_LINK_ROLES.map((role) => (
                  <th key={role} style={{ textAlign: 'center', padding: '6px 8px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {KORA_LINK_ROLE_LABEL[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KORA_LINK_CAPABILITIES.map((cap) => (
                <tr key={cap.id} style={{ borderTop: `1px solid ${TOKENS.inkBorder}` }}>
                  <td style={{ padding: '8px 10px', color: TOKENS.ink, fontWeight: 600 }}>{cap.label}</td>
                  {KORA_LINK_ROLES.map((role) => (
                    <td key={role} style={{ textAlign: 'center', padding: '8px 8px', color: cap.roles.includes(role) ? TOKENS.safeguard.pass.text : TOKENS.inkBorder }}>
                      {cap.roles.includes(role) ? '●' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Admin capability grid */}
      <Panel>
        <SectionLabel>Capacità KORA Admin</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {adminSummary.capabilities.map((c) => (
            <KoraLinkCapabilityCard key={c.id} capability={c} />
          ))}
        </div>
      </Panel>

      {/* Gate status */}
      <KoraLinkReadinessPanel gates={gates} title="Gate status — intero ecosistema" />

      {/* Safety boundaries — full ecosystem, not just admin */}
      <KoraLinkBoundaryCard boundaries={KORA_LINK_PRIVACY_BOUNDARIES} title="Confini privacy — intero ecosistema" />

      {/* Next operational actions */}
      <Panel>
        <SectionLabel>Prossime azioni operative</SectionLabel>
        {openGates.length === 0 ? (
          <p style={{ fontSize: 12.5, color: TOKENS.safeguard.pass.text, margin: 0 }}>
            Tutti i gate sono chiusi. Nessuna azione bloccante residua.
          </p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {openGates.map((g) => (
              <li key={g.id} style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: TOKENS.ink }}>{g.label}</span> — {g.description}
              </li>
            ))}
          </ol>
        )}
      </Panel>

    </div>
  );
}
