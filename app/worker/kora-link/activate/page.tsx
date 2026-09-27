// app/worker/kora-link/activate/page.tsx
// KORA Link — Worker activation shell (KORA-LINK-SHELL-01, Flow C).
// Pure UI/UX preview, in the LIVE authenticated /worker/* tree (distinct from the
// demo-preview /my-kora/kora-link surface). No DB. No Supabase writes. No RLS.
// No real activation — the activation action below is a disabled mock only.
//
// Access: WORKER only. requireWorkerUser enforced server-side, same pattern as
// app/worker/privacy/page.tsx. No employer-facing path to this content.

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { TOKENS, SPACE, typeStyle, TYPE_FAMILY } from '@/lib/design/kora-design-tokens';
import { PageHead, Workspace, Col, Notice } from '@/components/ui/px';
import {
  getKoraLinkEcosystemContext,
  getKoraLinkRoleSummary,
  KORA_LINK_PRIVACY_BOUNDARIES,
} from '@/lib/kora-link/ecosystem';
import { KoraLinkRoleDashboard } from '@/components/kora-link/KoraLinkRoleDashboard';

export const metadata = { title: 'Il tuo KORA Link · KORA' };

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: SPACE.md }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ ...typeStyle('meta'), color: TOKENS.inkHint, margin: `0 0 ${SPACE.sm}px` }}>
      {children}
    </p>
  );
}

// Pilot status card — pure presentational, derived from already-computed
// ecosystem context / session presence. No new data source, no DB read.
function StatusCard({ label, status, description, tone }: { label: string; status: string; description: string; tone: 'ready' | 'preparing' | 'future' }) {
  const TONE_COLOR: Record<typeof tone, string> = {
    ready:     TOKENS.safeguard.pass.dot,
    preparing: TOKENS.safeguard.watch.dot,
    future:    TOKENS.inkHint,
  };
  return (
    <div style={{ border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: `${SPACE.sm}px ${SPACE.md}px`, background: TOKENS.surface }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: TONE_COLOR[tone], flexShrink: 0 }} />
        <p style={{ margin: 0, ...typeStyle('caption', { weight: 700 }), color: TOKENS.ink }}>{label}</p>
      </div>
      <p style={{ margin: `0 0 ${SPACE.xs}px`, ...typeStyle('caption', { weight: 700 }), color: TOKENS.inkSecondary }}>{status}</p>
      <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkHint }}>{description}</p>
    </div>
  );
}

export default async function WorkerKoraLinkActivatePage() {
  const auth = await requireWorkerUser();
  if (isKoraAuthError(auth)) redirect('/login');

  const context = getKoraLinkEcosystemContext();
  const summary = getKoraLinkRoleSummary('worker', context);
  const companyBoundary = KORA_LINK_PRIVACY_BOUNDARIES.find((b) => b.id === 'company_never_sees_worker_level');
  const workerBoundary = KORA_LINK_PRIVACY_BOUNDARIES.find((b) => b.id === 'worker_controls_activation');

  const nfcReadyForManualTest = Boolean(context.koraLinkEnabled);

  return (
    <div
      data-testid="kora-link-activate-page"
      style={{ maxWidth: 780, margin: '0 auto', padding: `${SPACE.xl}px ${SPACE.md}px ${SPACE['2xl']}px`, fontFamily: TYPE_FAMILY }}
    >

      <PageHead
        eyebrow="Worker · KORA Link"
        title="Il tuo KORA Link"
        lead={<>
          KORA Link è il tuo punto di accesso personale a KORA: un collegamento fisico–digitale che, una volta
          attivato con il tuo consenso, ti collega in modo sicuro al tuo profilo worker. Il test del chip NFC fisico
          fa parte del pilota — questa pagina mostra lo stato attuale, non un&apos;attivazione reale.
        </>}
      />

      <Workspace>
        <Col span="full">

      {/* Demo shell banner — explicit, non-suppressible. KORA-WP-125 Notice,
          copy unchanged; `role="status"` now announces it to assistive tech. */}
      <Notice tone="info">
        <strong>Anteprima design — no DB, nessuna RLS, nessuna chiamata a Supabase o RPC. Non attivo.</strong>
        {' '}
        Questa pagina mostra come funzionerà l&apos;attivazione una volta chiusi i gate di readiness —
        il pulsante sottostante non esegue alcuna azione reale.
      </Notice>

      {/* Pilot status cards */}
      <div>
        <SectionLabel>Stato pilota</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: SPACE.sm }}>
          <StatusCard
            label="Account worker"
            status="Attivo"
            description="Il tuo accesso KORA è configurato e verificato — la sessione con cui vedi questa pagina lo conferma."
            tone="ready"
          />
          <StatusCard
            label="KORA Link"
            status="In preparazione"
            description="Il tuo collegamento fisico–digitale non è ancora assegnato/attivato in questo ambiente pilota."
            tone="preparing"
          />
          <StatusCard
            label="Chip NFC"
            status={nfcReadyForManualTest ? 'Pronto per test manuale' : 'Non ancora disponibile in questo ambiente'}
            description="Il test del chip fisico avviene solo manualmente, quando il tuo KORA Admin lo abilita. L'app non scrive mai un chip NFC."
            tone={nfcReadyForManualTest ? 'ready' : 'preparing'}
          />
          <StatusCard
            label="Contribution"
            status="Futuro / non automatico"
            description="Un eventuale contributo personale nascerebbe da partecipazioni verificate — mai dal semplice collegamento del chip."
            tone="future"
          />
          <StatusCard
            label="KORA Index"
            status="Non attivo oggi"
            description="KORA Link non alimenta il KORA Index oggi. Il KORA Index resta un output aggregato a livello azienda, mai individuale."
            tone="future"
          />
        </div>
      </div>

      {/* Activation action — disabled preview, no real activation */}
      <Panel>
        <SectionLabel>Attivazione</SectionLabel>
        <p style={{ margin: `0 0 ${SPACE.md}px`, ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
          Avvicinando il telefono al chip fisico KORA Link assegnato dalla tua azienda, si aprirà
          automaticamente una pagina di conferma sicura con richiesta di consenso esplicita.
        </p>
        <button
          type="button"
          disabled
          title="Non attivo in questa anteprima — nessuna attivazione reale"
          style={{
            ...typeStyle('label', { weight: 700 }),
            padding: `${SPACE.sm}px ${SPACE.md}px`,
            borderRadius: 10,
            border: `1px solid ${TOKENS.inkBorder}`,
            background: 'rgba(6,3,43,0.04)',
            color: TOKENS.inkHint,
            cursor: 'not-allowed',
          }}
        >
          Attiva KORA Link
        </button>
      </Panel>

      {/* Consent — placeholder pending DPO/legal review, mirrors /my-kora/kora-link */}
      <Panel>
        <SectionLabel>Consenso</SectionLabel>
        <p style={{ margin: `0 0 ${SPACE.sm}px`, ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
          Confermando l&apos;attivazione, autorizzeresti l&apos;associazione del tuo KORA Link al tuo profilo
          worker KORA. Potrai revocare in qualsiasi momento chiedendo la disattivazione al tuo KORA Admin.
        </p>
        <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkHint }}>
          Testo privacy/consenso in attesa di revisione DPO (Gate 3). Il testo definitivo del consenso non è
          ancora stato approvato — la versione qui mostrata è provvisoria e non vincolante.
        </p>
      </Panel>

      {/* Capabilities + gates + privacy boundary, via shared shell */}
      <KoraLinkRoleDashboard
        summary={summary}
        capabilitiesTitle="Cosa potrai fare con KORA Link"
      />

      {/* Cosa l'azienda non vede */}
      {companyBoundary && (
        <Panel>
          <SectionLabel>Cosa la tua azienda non vede</SectionLabel>
          <p style={{ margin: 0, ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
            {companyBoundary.statement} La tua azienda vede solo conteggi aggregati di adozione — mai
            se, quando o come tu abbia usato il tuo KORA Link.
          </p>
        </Panel>
      )}

      {/* Confine privacy — full statement, Task F */}
      <Panel>
        <SectionLabel>Confine privacy</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: SPACE.md, display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
            La tua azienda vede solo insight aggregati, mai la tua attività individuale.
          </li>
          <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
            {workerBoundary?.statement ?? 'Il tuo KORA Link è personale — controlli sempre tu attivazione e consenso.'}
          </li>
          <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
            I tuoi dati personali/individuali non vengono mai mostrati alla tua azienda.
          </li>
          <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
            La condivisione con partner esterni non è attiva, a meno che tu non la avvii esplicitamente in flussi futuri.
          </li>
          <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
            L&apos;URL del chip NFC non contiene mai il tuo nome, la tua email o altri dati sensibili.
          </li>
        </ul>
      </Panel>

      {/* Safe next actions */}
      <Panel>
        <SectionLabel>Prossimi passi</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          <Link
            href="/worker/workspace"
            data-testid="kora-link-back-to-workspace"
            style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.ink, background: TOKENS.taupe, padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: 8, textDecoration: 'none', display: 'inline-block', width: 'fit-content' }}
          >
            ← Torna al tuo spazio operativo
          </Link>
          <Link
            href="/worker/privacy"
            style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.ink, background: TOKENS.taupe, padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: 8, textDecoration: 'none', display: 'inline-block', width: 'fit-content' }}
          >
            Leggi il confine privacy completo
          </Link>
          <p style={{ margin: `${SPACE.xs}px 0 0`, ...typeStyle('caption'), color: TOKENS.inkHint }}>
            In attesa dell&apos;attivazione pilota — nessuna azione è richiesta da parte tua ora.
          </p>
          <button
            type="button"
            disabled
            title="Non attivo — configurazione riservata al pilota"
            style={{
              ...typeStyle('caption', { weight: 700 }),
              padding: `${SPACE.sm}px ${SPACE.md}px`,
              borderRadius: 8,
              border: `1px solid ${TOKENS.inkBorder}`,
              background: 'rgba(6,3,43,0.03)',
              color: TOKENS.inkHint,
              cursor: 'not-allowed',
              width: 'fit-content',
            }}
          >
            Configura KORA Link
          </button>
        </div>
      </Panel>

        </Col>
      </Workspace>

    </div>
  );
}
