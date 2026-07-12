// app/admin/kora-link/governance/page.tsx
// KORA Link — Governance decisions register (KORA-LINK-SHELL-01, Flow E, optional).
// Pure UI/UX preview. No DB. No Supabase writes. No RLS.
// This page RECORDS open governance decisions — it does not resolve any of them.
// No CTO/DPO decision is made or implied by this page. All items below remain
// explicitly OPEN/PENDING until a named decision-maker records a resolution
// in the canonical docs (docs/21-founder-gate-resolution-log.md and successors).
// Protected by app/admin/layout.tsx (requireKoraAdmin — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { getKoraLinkEcosystemContext, getKoraLinkGates } from '@/lib/kora-link/ecosystem';
import { KoraLinkReadinessPanel } from '@/components/kora-link/KoraLinkReadinessPanel';

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

interface OpenDecision {
  id: string;
  question: string;
  owner: string;
  blockedGate: string;
}

// Explicitly open — this register does not propose, imply, or default to an answer.
const OPEN_DECISIONS: OpenDecision[] = [
  {
    id: 'consent-text',
    question: 'Testo definitivo di consenso attivazione KORA Link (worker-facing)',
    owner: 'DPO / Legal',
    blockedGate: 'Gate 3',
  },
  {
    id: 'retention',
    question: 'Politica di retention per record di attivazione e log KORA Link',
    owner: 'DPO / Legal',
    blockedGate: 'Gate 3',
  },
  {
    id: 'request-fingerprint-hashing',
    question: 'Meccanismo di hashing per request_fingerprint (algoritmo, salt, rotazione)',
    owner: 'CTO',
    blockedGate: 'Gate 2',
  },
  {
    id: 'aggregate-threshold',
    question: 'Soglia minima di aggregazione per le viste company (coerenza con safe_aggregation_threshold ≥ 10)',
    owner: 'CTO + Founder',
    blockedGate: 'Gate 2 / Gate 4',
  },
  {
    id: 'delivered-to-label-semantics',
    question: 'Semantica esatta del campo delivered_to_label (cosa rappresenta, chi lo popola, chi lo vede)',
    owner: 'CTO',
    blockedGate: 'Gate 2',
  },
  {
    id: 'break-glass-procedure',
    question: 'Procedura di break-glass per accesso emergenziale a dati KORA Link',
    owner: 'CTO + DPO',
    blockedGate: 'Gate 3 / Gate 4',
  },
];

export default function KoraLinkGovernancePage() {
  const context = getKoraLinkEcosystemContext();
  const gates = getKoraLinkGates(context.gateStatus);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          KORA Link · Governance
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Registro decisioni aperte — anteprima design
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
          Elenco delle decisioni di governance ancora aperte per KORA Link. Questa pagina registra le
          domande — non propone né implica risposte, e non chiude alcun gate o decisione.
        </p>
      </div>

      {/* Demo shell banner — explicit, non-suppressible */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — no DB, nessuna RLS, nessuna chiamata a Supabase o RPC. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Nessuna decisione CTO o DPO viene presa o implicata da questa pagina. Tutte le voci sotto
          restano esplicitamente APERTE fino a risoluzione formale documentata in
          <code> docs/21-founder-gate-resolution-log.md</code> o successori.
        </p>
      </div>

      {/* Open decisions register */}
      <Panel>
        <SectionLabel>Decisioni aperte</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {OPEN_DECISIONS.map((d) => (
            <div
              key={d.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '14px 16px',
                borderRadius: TOKENS.cardRadiusSm,
                border: TOKENS.cardBorder,
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TOKENS.ink }}>{d.question}</p>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'rgba(217,154,43,0.12)',
                    color: '#8A5A00',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Aperta / pending
                </span>
              </div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 11.5, color: TOKENS.inkSecondary }}>
                <span>Owner: {d.owner}</span>
                <span>Bloccata da: {d.blockedGate}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Gate status — shared readiness panel, read-only */}
      <KoraLinkReadinessPanel gates={gates} title="Gate status — intero ecosistema" />

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/admin/kora-link" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          ← Torna a KORA Link Control Tower
        </Link>
      </p>

    </div>
  );
}
