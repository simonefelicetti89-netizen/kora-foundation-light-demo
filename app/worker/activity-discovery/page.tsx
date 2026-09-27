// app/worker/activity-discovery/page.tsx
// Worker — Activity Discovery shell (WORKER-ACTIVITY-DISCOVERY-01).
//
// Phase 2 Activation Intelligence (see docs/KORA_ACTIVATION_LAYER_01.md).
// Shows the worker standard Partner Activities available inside a
// company-enabled activation perimeter (docs/COMPANY_ACTIVITY_SELECTION_01.md).
// These are NOT KORA Space initiatives and do NOT feed KORA Contribution.
// Browsing this page never exposes the worker to the employer. Choosing an
// activity (book/apply/request contact/redeem voucher) would create a
// worker-initiated relationship with the partner — no such action is real
// in this sprint. Reuses the static Partner Activity catalog
// (lib/partner-activities/catalog.ts) — no DB, no Supabase, no RPC, no
// real booking/request/contact/voucher logic, no worker eligibility logic.
//
// Access: WORKER only. requireWorkerUser enforced server-side, same pattern
// as app/worker/kora-link/activate/page.tsx. No employer-facing path to
// this content.

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { TOKENS, PILLAR_COLORS, SPACE, typeStyle, TYPE_FAMILY, type PillarColorKey } from '@/lib/design/kora-design-tokens';
import { PageHead, Workspace, Col, Notice } from '@/components/ui/px';
import {
  getPartnerActivities,
  FISCAL_CATEGORY_LABELS,
  ACTIVITY_TYPE_LABELS,
  DELIVERY_MODE_LABELS,
  PARTNER_ACTIVITY_STATUS_LABELS,
  INDEX_SIGNAL_ELIGIBILITY_LABELS,
  type PartnerActivity,
  type FutureWorkerAction,
} from '@/lib/partner-activities/catalog';

export const metadata = { title: 'Attività disponibili · KORA' };

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

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block', ...typeStyle('caption', { weight: 700 }), padding: '3px 9px' /* optical: chip-internal, KORA-WP-141 documented exception */, borderRadius: 999,
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
        display: 'inline-block', ...typeStyle('caption', { weight: 700 }), padding: '3px 9px' /* optical: chip-internal, KORA-WP-141 documented exception */, borderRadius: 999,
        background: `${color}1A`, color, border: `1px solid ${color}45`,
      }}
    >
      {pillar}
    </span>
  );
}

interface FlowStep {
  step: string;
  note?: string;
}

function FlowMap({ steps }: { steps: FlowStep[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: SPACE.sm }}>
          <span style={{ ...typeStyle('caption'), color: TOKENS.inkHint, width: SPACE.md, flexShrink: 0 }}>{i + 1}</span>
          <div>
            <p style={{ margin: 0, ...typeStyle('label', { weight: 700 }), color: TOKENS.ink }}>{s.step}</p>
            {s.note && <p style={{ margin: '2px 0 0' /* optical: baseline nudge under the step label */, ...typeStyle('caption'), color: TOKENS.inkSecondary }}>{s.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// Worker-facing CTA verb labels — presentational only, local to this page.
// Distinct from FUTURE_WORKER_ACTION_LABELS (noun form, used elsewhere as a
// descriptive tag) — this is the button text a worker would see.
const FUTURE_ACTION_CTA: Record<FutureWorkerAction, string> = {
  book: 'Prenota',
  apply: 'Candidati',
  request_contact: 'Richiedi contatto',
  redeem_voucher: 'Riscatta voucher',
  info_only: 'Scopri di più',
};

function ActivityCard({ activity }: { activity: PartnerActivity }) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: SPACE.sm, padding: `${SPACE.md}px ${SPACE.md}px`,
        borderRadius: TOKENS.cardRadiusSm, border: TOKENS.cardBorder, background: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, ...typeStyle('label', { weight: 700 }), color: TOKENS.ink }}>{activity.title}</p>
          <p style={{ margin: '2px 0 0' /* optical: baseline nudge under the activity title */, ...typeStyle('caption'), color: TOKENS.inkHint }}>{activity.partnerName}</p>
        </div>
        <span
          style={{
            ...typeStyle('caption', { weight: 700 }), padding: '3px 10px' /* optical: chip-internal, KORA-WP-141 documented exception */, borderRadius: 999,
            background: 'rgba(6,3,43,0.05)', color: TOKENS.inkSecondary, whiteSpace: 'nowrap',
          }}
        >
          {PARTNER_ACTIVITY_STATUS_LABELS[activity.status]}
        </span>
      </div>

      <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkSecondary }}>{activity.shortDescription}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.xs, flexWrap: 'wrap' }}>
        <Tag>{ACTIVITY_TYPE_LABELS[activity.activityType]}</Tag>
        <Tag>{FISCAL_CATEGORY_LABELS[activity.fiscalCategory]}</Tag>
        <PillarTag pillar={activity.primaryPillar} />
        {activity.secondaryPillars.map((p) => <PillarTag key={p} pillar={p} />)}
        <Tag>{DELIVERY_MODE_LABELS[activity.deliveryMode]}</Tag>
      </div>

      <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkHint }}>
        Segnale KORA Index: {INDEX_SIGNAL_ELIGIBILITY_LABELS[activity.indexSignalEligibility]}
      </p>

      <button
        type="button"
        disabled
        title="Non attivo in questa anteprima — nessuna azione reale"
        style={{
          ...typeStyle('caption', { weight: 700 }), padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: 10, alignSelf: 'flex-start',
          border: `1px solid ${TOKENS.inkBorder}`, background: 'rgba(6,3,43,0.04)', color: TOKENS.inkHint, cursor: 'not-allowed',
        }}
      >
        {FUTURE_ACTION_CTA[activity.futureWorkerAction]}
      </button>
    </div>
  );
}

const LANES: { pillar: PillarColorKey; label: string }[] = [
  { pillar: 'LIFE', label: 'Per il tuo benessere' },
  { pillar: 'GROWTH', label: 'Per crescere' },
  { pillar: 'CONNECTION', label: 'Per connetterti' },
  { pillar: 'IMPACT', label: 'Per contribuire' },
  { pillar: 'LEGACY', label: 'Per lasciare traccia' },
];

export default async function WorkerActivityDiscoveryPage() {
  const auth = await requireWorkerUser();
  if (isKoraAuthError(auth)) redirect('/login');

  const activities = getPartnerActivities();
  const fiscalCategoryCount = new Set(activities.map((a) => a.fiscalCategory)).size;
  const partnerCount = new Set(activities.map((a) => a.partnerName)).size;
  const activityTypeCount = new Set(activities.map((a) => a.activityType)).size;
  const actionCount = new Set(activities.map((a) => a.futureWorkerAction)).size;

  return (
    <div
      data-testid="activity-discovery-page"
      style={{ maxWidth: 1080, margin: '0 auto', padding: `${SPACE.xl}px ${SPACE.md}px ${SPACE['2xl']}px`, fontFamily: TYPE_FAMILY }}
    >

      <PageHead
        eyebrow="Worker · Fase 2 Activation Intelligence"
        title="Attività disponibili"
        lead={<>
          Queste sono Attività Partner standard — non iniziative KORA Space, non iniziative Contribution.
          La scelta è sempre tua e volontaria: sfogliare questa pagina non ti espone in alcun modo alla tua
          azienda. L&apos;azienda riceve solo esiti aggregati; il partner vede informazioni nominative solo
          dopo un&apos;azione che scegli tu di avviare.
        </>}
      />

      <Workspace>
        <Col span="full">

      {/* Preview banner — KORA-WP-125 Notice, copy unchanged. Deliberately NOT a
          KORA-WP-140 state: the seven states answer "why is this DATA absent",
          while this answers "this CAPABILITY is not live". See report. */}
      <Notice tone="info">
        <strong>Anteprima design — dati mock, nessuna connessione a database o servizi esterni. Non attivo.</strong>
        {' '}
        Nessuna prenotazione, candidatura, richiesta di contatto o riscatto voucher è reale in questa build.
      </Notice>

      {/* 2. Worker privacy/control panel */}
      <Panel>
        <SectionLabel>Il tuo controllo</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: SPACE.md, display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
          <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>Sfogliare queste attività non ti espone in alcun modo alla tua azienda.</li>
          <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>Scegliere di prenotare, candidarti, richiedere contatto o riscattare un voucher creerebbe una relazione avviata da te con il partner.</li>
          <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>Solo i dati necessari a quella relazione verrebbero condivisi con il partner — mai di più.</li>
          <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>La tua azienda continuerebbe a ricevere solo report aggregati, mai la tua scelta individuale.</li>
          <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>Nessuna prenotazione o condivisione reale avviene in questo sprint.</li>
        </ul>
      </Panel>

      {/* 4. Discovery filters/groups — non-interactive browse-by summary */}
      <Panel>
        <SectionLabel>Sfoglia per</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: SPACE.sm }}>
          <div style={{ ...typeStyle('caption'), color: TOKENS.inkSecondary }}>Pilastro KORA — <strong style={{ color: TOKENS.ink }}>5</strong></div>
          <div style={{ ...typeStyle('caption'), color: TOKENS.inkSecondary }}>Categoria fiscale/welfare — <strong style={{ color: TOKENS.ink }}>{fiscalCategoryCount}</strong></div>
          <div style={{ ...typeStyle('caption'), color: TOKENS.inkSecondary }}>Partner — <strong style={{ color: TOKENS.ink }}>{partnerCount}</strong></div>
          <div style={{ ...typeStyle('caption'), color: TOKENS.inkSecondary }}>Tipo attività — <strong style={{ color: TOKENS.ink }}>{activityTypeCount}</strong></div>
          <div style={{ ...typeStyle('caption'), color: TOKENS.inkSecondary }}>Azione futura — <strong style={{ color: TOKENS.ink }}>{actionCount}</strong></div>
        </div>
        <p style={{ margin: `${SPACE.sm}px 0 0`, ...typeStyle('caption'), color: TOKENS.inkHint }}>
          Anteprima — nessun filtro interattivo reale in questa build.
        </p>
      </Panel>

      {/* 5. Suggested lanes */}
      <Panel>
        <SectionLabel>Corsie suggerite</SectionLabel>
        <p style={{ margin: `0 0 ${SPACE.md}px`, ...typeStyle('caption'), color: TOKENS.inkHint }}>
          Sono suggerimenti, non classifiche. Nessuna profilazione individuale, nessun tracciamento delle tue
          preferenze visibile all&apos;azienda.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          {LANES.map((lane) => {
            const laneActivities = activities.filter(
              (a) => a.primaryPillar === lane.pillar || a.secondaryPillars.includes(lane.pillar),
            );
            if (laneActivities.length === 0) return null;
            return (
              <div key={lane.pillar} style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
                  <PillarTag pillar={lane.pillar} />
                  <p style={{ margin: 0, ...typeStyle('label', { weight: 700 }), color: TOKENS.ink }}>{lane.label}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
                  {laneActivities.map((a) => <ActivityCard key={a.activityId} activity={a} />)}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 7. Phase 2 flow note */}
      <Panel>
        <SectionLabel>Flusso Fase 2</SectionLabel>
        <FlowMap
          steps={[
            { step: 'L\'azienda abilita un perimetro', note: 'Categoria fiscale, pilastro, partner, o scelta libera — vedi /company/activity-selection.' },
            { step: 'Tu scegli volontariamente' },
            { step: 'Il partner gestisce la relazione' },
            { step: 'KORA aggrega i segnali' },
            { step: 'Futuro segnale KORA Index' },
          ]}
        />
      </Panel>

      {/* 8. KORA Index note */}
      <div style={{ background: TOKENS.insetPanel, border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: `${SPACE.md}px ${SPACE.md}px` }}>
        <SectionLabel>Nota KORA Index</SectionLabel>
        <p style={{ margin: 0, ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
          L&apos;attivazione di queste attività potrà in futuro diventare un segnale aggregato per il KORA
          Index. Nessun calcolo live del KORA Index è modificato in questo sprint. Le tue scelte individuali
          non vengono mai riportate all&apos;azienda.
        </p>
      </div>

      {/* 9. Contribution note */}
      <div style={{ background: TOKENS.insetPanel, border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: `${SPACE.md}px ${SPACE.md}px` }}>
        <SectionLabel>Nota Contribution</SectionLabel>
        <p style={{ margin: 0, ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
          Le Attività Partner non alimentano mai direttamente KORA Contribution. Le iniziative KORA Space
          restano separate. Alcune attività potranno essere impacchettate in un&apos;iniziativa solo tramite
          un percorso separato di proposta, revisione e adozione.
        </p>
      </div>

      {/* Cross-links */}
      <div style={{ display: 'flex', gap: SPACE.sm, flexWrap: 'wrap' }}>
        <Link href="/worker/activity-discovery/detail" style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.accent, textDecoration: 'none' }}>
          Anteprima dettaglio attività →
        </Link>
        <Link href="/worker/commons" style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Space — iniziative reali (diverso dalle attività) →
        </Link>
        <Link href="/partner/activity-catalog" style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.accent, textDecoration: 'none' }}>
          Catalogo Attività Partner (vista partner) →
        </Link>
        <Link href="/company/activity-selection" style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.accent, textDecoration: 'none' }}>
          Come l&apos;azienda configura il perimetro →
        </Link>
        <Link href="/admin/kora-activation-layer" style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Activation Layer — riferimento di modello →
        </Link>
      </div>

        </Col>
      </Workspace>

    </div>
  );
}
