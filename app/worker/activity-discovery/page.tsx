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
import { TOKENS, PILLAR_COLORS, type PillarColorKey } from '@/lib/design/kora-design-tokens';
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

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
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
        display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 10.5, color: TOKENS.inkHint, width: 16, flexShrink: 0 }}>{i + 1}</span>
          <div>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: TOKENS.ink }}>{s.step}</p>
            {s.note && <p style={{ margin: '2px 0 0', fontSize: 11.5, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{s.note}</p>}
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
        display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px',
        borderRadius: TOKENS.cardRadiusSm, border: TOKENS.cardBorder, background: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TOKENS.ink }}>{activity.title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: TOKENS.inkHint }}>{activity.partnerName}</p>
        </div>
        <span
          style={{
            fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
            background: 'rgba(6,3,43,0.05)', color: TOKENS.inkSecondary, whiteSpace: 'nowrap',
          }}
        >
          {PARTNER_ACTIVITY_STATUS_LABELS[activity.status]}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{activity.shortDescription}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Tag>{ACTIVITY_TYPE_LABELS[activity.activityType]}</Tag>
        <Tag>{FISCAL_CATEGORY_LABELS[activity.fiscalCategory]}</Tag>
        <PillarTag pillar={activity.primaryPillar} />
        {activity.secondaryPillars.map((p) => <PillarTag key={p} pillar={p} />)}
        <Tag>{DELIVERY_MODE_LABELS[activity.deliveryMode]}</Tag>
      </div>

      <p style={{ margin: 0, fontSize: 11, color: TOKENS.inkHint }}>
        Segnale KORA Index: {INDEX_SIGNAL_ELIGIBILITY_LABELS[activity.indexSignalEligibility]}
      </p>

      <button
        type="button"
        disabled
        title="Non attivo in questa anteprima — nessuna azione reale"
        style={{
          fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 10, alignSelf: 'flex-start',
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
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* 1. Intro panel */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Worker · Fase 2 Activation Intelligence
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Attività disponibili
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
          Queste sono Attività Partner standard — non iniziative KORA Space, non iniziative Contribution.
          La scelta è sempre tua e volontaria: sfogliare questa pagina non ti espone in alcun modo alla tua
          azienda. L&apos;azienda riceve solo esiti aggregati; il partner vede informazioni nominative solo
          dopo un&apos;azione che scegli tu di avviare.
        </p>
      </div>

      {/* Preview banner */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — dati mock, nessuna connessione a database o servizi esterni. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Nessuna prenotazione, candidatura, richiesta di contatto o riscatto voucher è reale in questa build.
        </p>
      </div>

      {/* 2. Worker privacy/control panel */}
      <Panel>
        <SectionLabel>Il tuo controllo</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Sfogliare queste attività non ti espone in alcun modo alla tua azienda.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Scegliere di prenotare, candidarti, richiedere contatto o riscattare un voucher creerebbe una relazione avviata da te con il partner.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Solo i dati necessari a quella relazione verrebbero condivisi con il partner — mai di più.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>La tua azienda continuerebbe a ricevere solo report aggregati, mai la tua scelta individuale.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessuna prenotazione o condivisione reale avviene in questo sprint.</li>
        </ul>
      </Panel>

      {/* 4. Discovery filters/groups — non-interactive browse-by summary */}
      <Panel>
        <SectionLabel>Sfoglia per</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          <div style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Pilastro KORA — <strong style={{ color: TOKENS.ink }}>5</strong></div>
          <div style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Categoria fiscale/welfare — <strong style={{ color: TOKENS.ink }}>{fiscalCategoryCount}</strong></div>
          <div style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Partner — <strong style={{ color: TOKENS.ink }}>{partnerCount}</strong></div>
          <div style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Tipo attività — <strong style={{ color: TOKENS.ink }}>{activityTypeCount}</strong></div>
          <div style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Azione futura — <strong style={{ color: TOKENS.ink }}>{actionCount}</strong></div>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 11, color: TOKENS.inkHint }}>
          Anteprima — nessun filtro interattivo reale in questa build.
        </p>
      </Panel>

      {/* 5. Suggested lanes */}
      <Panel>
        <SectionLabel>Corsie suggerite</SectionLabel>
        <p style={{ margin: '0 0 14px', fontSize: 11.5, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Sono suggerimenti, non classifiche. Nessuna profilazione individuale, nessun tracciamento delle tue
          preferenze visibile all&apos;azienda.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {LANES.map((lane) => {
            const laneActivities = activities.filter(
              (a) => a.primaryPillar === lane.pillar || a.secondaryPillars.includes(lane.pillar),
            );
            if (laneActivities.length === 0) return null;
            return (
              <div key={lane.pillar} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PillarTag pillar={lane.pillar} />
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: TOKENS.ink }}>{lane.label}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Nota KORA Index</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          L&apos;attivazione di queste attività potrà in futuro diventare un segnale aggregato per il KORA
          Index. Nessun calcolo live del KORA Index è modificato in questo sprint. Le tue scelte individuali
          non vengono mai riportate all&apos;azienda.
        </p>
      </div>

      {/* 9. Contribution note */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Nota Contribution</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Le Attività Partner non alimentano mai direttamente KORA Contribution. Le iniziative KORA Space
          restano separate. Alcune attività potranno essere impacchettate in un&apos;iniziativa solo tramite
          un percorso separato di proposta, revisione e adozione.
        </p>
      </div>

      {/* Cross-links */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/worker/activity-discovery/detail" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Anteprima dettaglio attività →
        </Link>
        <Link href="/worker/commons" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Space — iniziative reali (diverso dalle attività) →
        </Link>
        <Link href="/partner/activity-catalog" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Catalogo Attività Partner (vista partner) →
        </Link>
        <Link href="/company/activity-selection" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Come l&apos;azienda configura il perimetro →
        </Link>
        <Link href="/admin/kora-activation-layer" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Activation Layer — riferimento di modello →
        </Link>
      </div>

    </div>
  );
}
