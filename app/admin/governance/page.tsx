// app/admin/governance/page.tsx
// Platform Governance & Privacy register (GOVERNANCE-UI-01).
//
// This page is a read-only governance register / decision surface. It does
// not approve any pending legal or technical item, does not close any gate,
// does not activate KORA Link, and does not change any data visibility rule.
// It renders real content (principles, gate status, pending decisions, doc
// references) drawn from the canonical docs — it takes no action of its own.
//
// No DB. No Supabase. No RPC. No feature flag touched. No CTO/DPO decision
// made or implied. Protected by app/admin/layout.tsx (requireKoraAdmin — no
// new auth system here).

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

interface PendingDecision {
  id: string;
  question: string;
  owner: string;
  blockedGate: string;
  detailNote?: string;
}

// Explicitly open — this register does not propose, imply, or default to an
// answer for any item. Six of these are also tracked, with fuller rationale,
// on the KORA Link-specific register at /admin/kora-link/governance — noted
// below rather than duplicated in full.
const PENDING_DECISIONS: PendingDecision[] = [
  {
    id: 'aggregate-threshold',
    question: 'Soglia minima di aggregazione per le viste company (coerenza con safe_aggregation_threshold ≥ 10)',
    owner: 'CTO + Founder',
    blockedGate: 'Gate 2 / Gate 4',
    detailNote: 'Dettaglio su KORA Link Governance',
  },
  {
    id: 'audit-log-retention',
    question: 'Durata di retention del log di audit (kora_link.audit_log ed equivalenti)',
    owner: 'DPO / Legal',
    blockedGate: 'Gate 3',
    detailNote: 'Dettaglio su KORA Link Governance',
  },
  {
    id: 'request-fingerprint-hashing',
    question: 'Meccanismo di hashing per request_fingerprint (algoritmo, salt, rotazione)',
    owner: 'CTO',
    blockedGate: 'Gate 2',
    detailNote: 'Dettaglio su KORA Link Governance — nota: colonna rimossa in KORA-LINK-DPO-DECISIONS-09 (v. docs/KORA_LINK_DPO_DECISIONS_09.md); badge invariato in attesa di risoluzione formale nel registro.',
  },
  {
    id: 'consent-version-privacy-notice',
    question: 'Testo definitivo dell\'informativa di attivazione e whitelist di activation_notice_version (informativa privacy worker-facing)',
    owner: 'DPO / Legal',
    blockedGate: 'Gate 3',
    detailNote: 'Dettaglio su KORA Link Governance — nota: valore canonico ratificato in KORA-LINK-DPO-DECISIONS-09 (v. docs/KORA_LINK_DPO_DECISIONS_09.md); badge invariato in attesa di risoluzione formale nel registro.',
  },
  {
    id: 'delivered-to-label-semantics',
    question: 'Semantica esatta del campo delivery_channel (già delivered_to_label — cosa rappresenta, chi lo popola, chi lo vede)',
    owner: 'CTO',
    blockedGate: 'Gate 2',
    detailNote: 'Dettaglio su KORA Link Governance — nota: sostituito con enum ristretto in KORA-LINK-DPO-DECISIONS-09 (v. docs/KORA_LINK_DPO_DECISIONS_09.md); badge invariato in attesa di risoluzione formale nel registro.',
  },
  {
    id: 'break-glass-procedure',
    question: 'Procedura di break-glass DPO per accesso emergenziale al log di audit',
    owner: 'CTO + DPO',
    blockedGate: 'Gate 3 / Gate 4',
    detailNote: 'Dettaglio su KORA Link Governance',
  },
  {
    id: 'worker-self-select',
    question: 'Approvazione della policy RLS di worker self-select su link_assignments',
    owner: 'CTO',
    blockedGate: 'Gate 4',
  },
  {
    id: 'public-lookup-path',
    question: 'Percorso di lookup pubblico: grant a ruolo anon oppure percorso service_role-only',
    owner: 'CTO',
    blockedGate: 'Gate 2',
  },
  {
    id: 'activation-concurrency',
    question: 'Modello di concorrenza per l\'attivazione (SERIALIZABLE vs FOR UPDATE)',
    owner: 'CTO',
    blockedGate: 'Gate 2 / Gate 4',
  },
  {
    id: 'audit-log-grant-vs-security-definer',
    question: 'Grant service_role su audit_log rispetto al pattern basato su funzioni SECURITY DEFINER',
    owner: 'CTO',
    blockedGate: 'Gate 4',
  },
];

const OWNER_GROUPS: string[] = Array.from(new Set(PENDING_DECISIONS.map((d) => d.owner)));

interface BoundaryEntry {
  actor: string;
  statement: string;
  href?: string;
  linkLabel?: string;
}

const PRIVACY_BOUNDARY_MAP: BoundaryEntry[] = [
  {
    actor: 'Company',
    statement: 'Vede solo segnali aggregati — mai identità o attività individuale del singolo worker.',
    href: '/partner/privacy-boundary',
    linkLabel: 'Confine privacy partner (stesso principio, lato azienda) →',
  },
  {
    actor: 'Worker',
    statement: 'Controlla la propria relazione personale — decide autonomamente cosa condividere e con chi.',
    href: '/worker/privacy',
    linkLabel: 'Privacy & Condivisione worker →',
  },
  {
    actor: 'Partner',
    statement: 'Vede nominativi solo quando il worker avvia volontariamente una relazione diretta — mai in modo aggregato.',
    href: '/partner/privacy-boundary',
    linkLabel: 'Confine privacy partner →',
  },
  {
    actor: 'KORA Admin',
    statement: 'Ha accesso alle superfici di governance e audit — non è un accesso automatico a dati worker individuali.',
    href: '/admin/kora-link/governance',
    linkLabel: 'Registro decisioni KORA Link →',
  },
  {
    actor: 'DPO / Legal',
    statement: 'Rivede le decisioni pendenti. Non riceve un bypass nascosto ai controlli di accesso — la sua revisione passa dagli stessi registri visibili qui.',
  },
];

const EVIDENCE_DOCS = [
  { file: 'docs/QA_STATUS.md', note: 'Stato test/QA, con le stesse cautele di data e re-verifica riportate nel documento stesso.' },
  { file: 'docs/E2E_GOLDEN_PATH.md', note: 'Cosa prova GD01, requisiti env, limiti noti.' },
  { file: 'docs/E2E_TWO_TENANT_ISOLATION.md', note: 'Cosa provano T01/T02, stato COMPANY_B.' },
  { file: 'docs/KORA_LINK_GATE_REPORT.md', note: 'Storico gate-by-gate di KORA Link, inclusa la chiusura KL-19.' },
  { file: 'docs/PARTNER_SURFACE_01.md', note: 'Modello di visibilità worker-initiated per il partner.' },
  { file: 'docs/PILOT_PRIVACY_GOVERNANCE.md', note: 'Sintesi di privacy governance pilota — non è un parere legale.' },
];

export default function GovernancePage() {
  const context = getKoraLinkEcosystemContext();
  const gates = getKoraLinkGates(context.gateStatus);

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Admin · Governance
        </p>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Governance &amp; Privacy
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
          Registro di governance a livello di piattaforma: principi di privacy, stato dei gate, decisioni
          pendenti e confine di visibilità tra azienda, worker, partner e KORA Admin. È un registro di
          lettura e di decisione — non un meccanismo di approvazione.
        </p>
      </div>

      {/* Non-suppressible scope banner — what this page is and is not */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Registro di governance in sola lettura.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questa pagina non approva alcuna decisione legale o tecnica pendente, non chiude alcun gate, non
          attiva KORA Link e non modifica la visibilità dei dati. Registra lo stato — non lo cambia.
        </p>
      </div>

      {/* 1. Governance Overview */}
      <Panel>
        <SectionLabel>Panoramica</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>Nessun ranking individuale.</strong> KORA misura le organizzazioni, non le persone — non esiste una superficie che classifichi o confronti singoli worker.
          </li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>Azienda solo aggregata.</strong> Gli output company-facing (KORA Index, tassi di attivazione, distribuzione per pilastro) sono sempre a livello aggregato, mai individuale.
          </li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>Partner: visibilità worker-initiated.</strong> Il partner vede nominativi solo quando il worker avvia volontariamente una relazione diretta — mai altrimenti.
          </li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>KORA Link: proposed, non applicato.</strong> Schema, RLS e RPC (034/035/036) restano in <code>supabase/proposed/</code> — nessuna migration applicata, nessun feature flag abilitato.
          </li>
        </ul>
      </Panel>

      {/* 2. Gate Status — sourced from the same canonical function the KORA Link
          Control Tower and Governance pages use, not re-typed here. */}
      <KoraLinkReadinessPanel gates={gates} title="Stato gate — KORA Link" />
      <p style={{ fontSize: 11.5, color: TOKENS.inkHint, margin: '-14px 0 0', lineHeight: 1.5 }}>
        Nessun gate viene chiuso da questa pagina. Lo stato sopra riflette esclusivamente ciò che è
        documentato altrove — questa vista non lo modifica.
      </p>

      {/* 3. Pending Decisions Registry */}
      <Panel>
        <SectionLabel>Decisioni pendenti, per owner</SectionLabel>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Tutte le voci sotto restano esplicitamente aperte. Sei di queste hanno un dettaglio più esteso su{' '}
          <Link href="/admin/kora-link/governance" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
            KORA Link Governance
          </Link>
          ; qui compaiono in forma sintetica insieme a quattro voci ulteriori, più tecniche, non presenti su quella pagina.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {OWNER_GROUPS.map((owner) => (
            <div key={owner} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: TOKENS.inkHint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {owner}
              </p>
              {PENDING_DECISIONS.filter((d) => d.owner === owner).map((d) => (
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
                    {d.detailNote && <span style={{ color: TOKENS.inkHint }}>{d.detailNote}</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Panel>

      {/* 4. Privacy Boundary Map */}
      <Panel>
        <SectionLabel>Mappa del confine privacy</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {PRIVACY_BOUNDARY_MAP.map((entry) => (
            <div key={entry.actor} style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
              <p style={{ margin: '0 0 6px', fontSize: 12.5, fontWeight: 700, color: TOKENS.ink }}>{entry.actor}</p>
              <p style={{ margin: entry.href ? '0 0 8px' : 0, fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{entry.statement}</p>
              {entry.href && (
                <Link href={entry.href} style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
                  {entry.linkLabel}
                </Link>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* 5. Evidence / Docs — plain references, not live links (docs/ is not a served route) */}
      <Panel>
        <SectionLabel>Evidenze e documenti</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EVIDENCE_DOCS.map((doc) => (
            <div key={doc.file} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <code style={{ fontSize: 11.5, color: TOKENS.ink, fontWeight: 700 }}>{doc.file}</code>
              <span style={{ fontSize: 11.5, color: TOKENS.inkSecondary }}>{doc.note}</span>
            </div>
          ))}
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Questi documenti riportano le proprie date e cautele di validazione — questa pagina non ne rivendica
          una verifica più recente di quella dichiarata al loro interno.
        </p>
      </Panel>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/admin/kora-link/governance" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          Registro decisioni KORA Link — dettaglio specifico →
        </Link>
      </p>

    </div>
  );
}
