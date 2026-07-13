// app/admin/kora-link/pilot-readiness/page.tsx
// KORA-LINK-PILOT-READINESS-CHECKLIST-01 — read-only admin/founder checklist
// before the final manual NFC chip test.
//
// Protected by app/admin/layout.tsx (requireKoraAdmin — no new auth system here).
// Pure read-only presentation: no forms, no POST/PATCH/DELETE, no flag mutation,
// no DB mutation, no NFC write action. Feature-flag state is read only through
// the already-established getKoraLinkEcosystemContext() helper (same one used
// by the Control Tower and Governance pages) — no raw process.env access here.

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
    <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 12px' }}>
      {children}
    </p>
  );
}

function CheckRow({ label, status, tone }: { label: string; status: string; tone: 'ready' | 'blocked' | 'off' }) {
  const TONE: Record<typeof tone, { dot: string; text: string }> = {
    ready:   { dot: TOKENS.safeguard.pass.dot,   text: TOKENS.safeguard.pass.text },
    off:     { dot: TOKENS.safeguard.pass.dot,   text: TOKENS.safeguard.pass.text },
    blocked: { dot: TOKENS.safeguard.watch.dot,  text: TOKENS.safeguard.watch.text },
  };
  const t = TONE[tone];
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, borderBottom: `1px solid ${TOKENS.inkBorder}`, paddingBottom: 8 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: t.dot, flexShrink: 0, marginTop: 5 }} />
      <span style={{ fontSize: 12.5, color: TOKENS.ink, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: t.text, whiteSpace: 'nowrap' }}>{status}</span>
    </div>
  );
}

export const metadata = { title: 'KORA Link — Pilot Readiness Checklist · KORA' };

export default function KoraLinkPilotReadinessChecklistPage() {
  const context = getKoraLinkEcosystemContext();
  const gates = getKoraLinkGates(context.gateStatus);

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          KORA Admin · KORA Link · Pilot Readiness
        </p>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Checklist di readiness pilota — prima del test NFC
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 660 }}>
          Vista di sola lettura per KORA Admin/founder: cosa è pronto, cosa resta volutamente disattivato,
          e cosa non deve essere abilitato prima del test manuale finale del chip NFC. Questa pagina non
          esegue alcuna azione — nessun form, nessuna mutazione, nessuna scrittura su chip.
        </p>
      </div>

      {/* Demo shell banner — explicit, non-suppressible */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Sola lettura — nessuna mutazione, nessuna scrittura DB, nessuna variabile d&apos;ambiente modificata. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questa checklist non abilita KORA Link, non esegue il test NFC e non modifica alcun flag —
          registra solo lo stato attuale, letto tramite l&apos;helper già esistente <code>getKoraLinkEcosystemContext()</code>.
        </p>
      </div>

      {/* 1. Foundation readiness */}
      <Panel>
        <SectionLabel>1. Foundation readiness</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <CheckRow label="Creazione azienda (admin)"                          status="Pronto" tone="ready" />
          <CheckRow label="Navigazione live azienda (admin)"                   status="Pronto" tone="ready" />
          <CheckRow label="Setup/login referente aziendale"                    status="Pronto" tone="ready" />
          <CheckRow label="Provisioning worker in blocco"                      status="Pronto" tone="ready" />
          <CheckRow label="Setup/login/workspace worker"                       status="Pronto" tone="ready" />
          <CheckRow label="Superficie worker KORA Link (/worker/kora-link/activate)" status="Pronto come pilot skeleton" tone="ready" />
        </div>
      </Panel>

      {/* 2. KORA Link runtime status */}
      <Panel>
        <SectionLabel>2. Stato runtime KORA Link</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <CheckRow
            label="Route pubblica /link/[token] esiste ma è feature-gated"
            status="Skeleton, gated"
            tone="blocked"
          />
          <CheckRow
            label="KORA_LINK_ENABLED deve restare off fino al test manuale non-production finale"
            status={context.koraLinkEnabled ? 'ATTENZIONE: true' : 'off (corretto)'}
            tone={context.koraLinkEnabled ? 'blocked' : 'off'}
          />
          <CheckRow
            label="KORA_LINK_DB_LOOKUP_ENABLED deve restare off"
            status={context.dbLookupEnabled ? 'ATTENZIONE: true' : 'off (corretto)'}
            tone={context.dbLookupEnabled ? 'blocked' : 'off'}
          />
          <CheckRow
            label="KORA_LINK_ACTIVATION_ENABLED deve restare off"
            status={context.activationEnabled ? 'ATTENZIONE: true' : 'off (corretto)'}
            tone={context.activationEnabled ? 'blocked' : 'off'}
          />
          <CheckRow label="Nessun claim di collegamento worker reale è attivo"  status="Nessuno" tone="off" />
          <CheckRow label="Nessun evento di attivazione reale è attivo"        status="Nessuno" tone="off" />
        </div>
      </Panel>

      {/* 3. Governance blockers */}
      <Panel>
        <SectionLabel>3. Blocchi di governance</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <CheckRow label="Schema 034 — proposed, non applicato"               status="Bloccante" tone="blocked" />
          <CheckRow label="RLS 035 — proposed, non applicato"                  status="Bloccante" tone="blocked" />
          <CheckRow label="RPC 036 — proposed, non applicato"                  status="Bloccante" tone="blocked" />
          <CheckRow label="Approvazione CTO/DPO/legal richiesta prima di DB lookup/attivazione" status="Non concessa" tone="blocked" />
          <CheckRow label="Migrazione RLS/SQL non applicata"                   status="Non applicata" tone="blocked" />
          <CheckRow label="Soglia privacy e metodologia di attivazione non finali per uso nel KORA Index" status="Non finale" tone="blocked" />
        </div>
      </Panel>

      {/* 4. Worker privacy */}
      <Panel>
        <SectionLabel>4. Privacy worker</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <CheckRow label="Area worker esistente"                                    status="Pronto" tone="ready" />
          <CheckRow label="KORA Link è personale al worker"                          status="Confermato" tone="ready" />
          <CheckRow label="L'azienda vede solo output aggregati"                     status="Confermato" tone="ready" />
          <CheckRow label="Le azioni individuali del worker non sono mostrate all'azienda" status="Confermato" tone="ready" />
          <CheckRow label="Condivisione partner inattiva salvo avvio esplicito worker in flussi futuri" status="Inattiva" tone="off" />
          <CheckRow label="URL NFC non deve includere nome/email/dati sensibili"     status="Confermato" tone="ready" />
        </div>
      </Panel>

      {/* 5. What the final NFC test will prove */}
      <Panel>
        <SectionLabel>5. Cosa dimostrerà il test NFC finale</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Il chip apre un URL a marchio KORA.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}><code>/link/[token]</code> risolve alla pagina skeleton.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessun DB lookup viene eseguito.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessuna attivazione viene eseguita.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessun evento viene creato.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessun effetto sul KORA Index.</li>
        </ul>
      </Panel>

      {/* 6. What the final NFC test will NOT prove */}
      <Panel>
        <SectionLabel>6. Cosa NON dimostrerà il test NFC finale</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessun claim di identità worker.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessuna assegnazione persistente del link.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessun consenso legale raccolto.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessuna attribuzione di evento Contribution.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessuna integrazione con il KORA Index.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessuna condivisione partner.</li>
        </ul>
        <p style={{ margin: '12px 0 0', fontSize: 11.5, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          KORA Link non alimenta il KORA Index oggi. Il Contribution non è automatico oggi. Esiste un solo KORA Index —
          KORA Link resta pilot/skeleton fino a governance esplicita e approvazione CTO/DPO/legal.
        </p>
      </Panel>

      {/* Gate status — shared readiness panel, read-only, reused from ecosystem lib */}
      <KoraLinkReadinessPanel gates={gates} title="Gate status — intero ecosistema (sola lettura)" />

      {/* Navigation — read-only cross-links only */}
      <Panel>
        <SectionLabel>Link correlati</SectionLabel>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/admin/kora-link" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.ink, background: TOKENS.taupe, padding: '9px 16px', borderRadius: 8, textDecoration: 'none' }}>
            ← KORA Link Control Tower
          </Link>
          <Link href="/admin/kora-link-lab" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.ink, background: TOKENS.taupe, padding: '9px 16px', borderRadius: 8, textDecoration: 'none' }}>
            KORA Link Lab (NFC) →
          </Link>
          <Link href="/admin/kora-link/governance" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.ink, background: TOKENS.taupe, padding: '9px 16px', borderRadius: 8, textDecoration: 'none' }}>
            Registro decisioni aperte →
          </Link>
          <Link href="/admin/governance" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.ink, background: TOKENS.taupe, padding: '9px 16px', borderRadius: 8, textDecoration: 'none' }}>
            Governance &amp; Privacy →
          </Link>
          <Link href="/admin/companies/new" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.ink, background: TOKENS.taupe, padding: '9px 16px', borderRadius: 8, textDecoration: 'none' }}>
            Crea Azienda →
          </Link>
          <Link href="/admin/workers/bulk" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.ink, background: TOKENS.taupe, padding: '9px 16px', borderRadius: 8, textDecoration: 'none' }}>
            Provisioning worker in blocco →
          </Link>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Riferimento di sola route (non impersonazione admin): la superficie worker-facing KORA Link vive a{' '}
          <code>/worker/kora-link/activate</code> — accessibile solo con una sessione WORKER autenticata.
        </p>
      </Panel>

    </div>
  );
}
