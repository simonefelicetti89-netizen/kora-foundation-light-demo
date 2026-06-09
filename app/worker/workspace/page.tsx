// app/worker/workspace/page.tsx
// B109: Worker Experience MVP — worker private workspace (server component).
// Only reachable by authenticated WORKER role (layout gate + middleware).
// Shows: identity, available initiatives, participation history, placeholders.
// NEVER shows PIB, rankings, employer analytics, or other workers' data.

import { getCurrentWorkerUser } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { WorkerInitiativeRow, WorkerParticipationRow } from '@/lib/supabase/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type InitiativeItem = {
  id: string;
  title: string;
  pillar: WorkerInitiativeRow['pillar'];
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  mode: string | null;
  participation_status: WorkerParticipationRow['status'] | null;
};

type HistoryItem = {
  initiative_title: string;
  pillar: WorkerInitiativeRow['pillar'];
  participation_status: WorkerParticipationRow['status'];
  participated_at: string;
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WorkerWorkspacePage() {
  const worker = await getCurrentWorkerUser();
  if (!worker) redirect('/company/login');

  const db = getSupabaseServiceClient();

  // Fetch worker identity — own row only (workerId from session)
  const { data: wiRow } = await db.schema('personal').from('worker_identity')
    .select('worker_ref, status, tenant_id, created_at')
    .eq('id', worker.workerId)
    .eq('auth_user_id', worker.id)
    .maybeSingle();

  // Fetch tenant name
  const { data: tenantRow } = await db.schema('analytics').from('tenant')
    .select('company_name, tenant_code')
    .eq('id', worker.tenantId)
    .maybeSingle();

  // Fetch private profile
  const { data: profRow } = await db.schema('personal').from('worker_profile_private')
    .select('display_name, onboarding_done')
    .eq('worker_id', worker.workerId)
    .maybeSingle();

  // Fetch published initiatives for worker's tenant
  const { data: rawInitiatives } = await db.schema('personal').from('worker_initiative')
    .select('id, title, pillar, description, start_date, end_date, mode')
    .eq('tenant_id', worker.tenantId)
    .eq('status', 'published')
    .order('start_date', { ascending: true, nullsFirst: false });

  // Fetch worker's own participation rows
  const initiativeIds = (rawInitiatives ?? []).map(i => i.id as string);
  const { data: participations } = initiativeIds.length > 0
    ? await db.schema('personal').from('worker_participation')
        .select('initiative_id, status')
        .eq('worker_id', worker.workerId)
        .in('initiative_id', initiativeIds)
    : { data: [] };

  const participationMap = new Map<string, WorkerParticipationRow['status']>(
    (participations ?? []).map(p => [p.initiative_id as string, p.status as WorkerParticipationRow['status']]),
  );

  const initiatives: InitiativeItem[] = (rawInitiatives ?? []).map(i => ({
    id: i.id as string,
    title: i.title as string,
    pillar: i.pillar as WorkerInitiativeRow['pillar'],
    description: i.description as string | null,
    start_date: i.start_date as string | null,
    end_date: i.end_date as string | null,
    mode: i.mode as string | null,
    participation_status: participationMap.get(i.id as string) ?? null,
  }));

  // Fetch participation history (all statuses, own rows only)
  const { data: historyRows } = await db.schema('personal').from('worker_participation')
    .select('initiative_id, status, created_at, worker_initiative:initiative_id(title, pillar)')
    .eq('worker_id', worker.workerId)
    .order('created_at', { ascending: false })
    .limit(20);

  const history: HistoryItem[] = (historyRows ?? []).map(r => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const init = (r.worker_initiative as any) ?? {};
    return {
      initiative_title:     (init.title as string) ?? '—',
      pillar:               (init.pillar as WorkerInitiativeRow['pillar']) ?? 'GROWTH',
      participation_status: r.status as WorkerParticipationRow['status'],
      participated_at:      r.created_at as string,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wi   = (wiRow   ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t    = (tenantRow ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof = (profRow ?? {}) as any;

  const displayName    = (prof.display_name as string | null) ?? worker.email;
  const onboardingDone = (prof.onboarding_done as boolean) ?? false;
  const status         = (wi.status as string) ?? worker.workerStatus;
  const workerRef      = (wi.worker_ref as string) ?? '—';
  const companyName    = (t.company_name as string) ?? '—';

  const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
    invited:  { bg: '#fef9c3', text: '#854d0e', label: 'Invitato' },
    active:   { bg: '#dcfce7', text: '#15803d', label: 'Attivo' },
    pending:  { bg: '#dbeafe', text: '#1d4ed8', label: 'In attesa' },
    disabled: { bg: '#f3f4f6', text: '#6b7280', label: 'Disabilitato' },
  };
  const sc = STATUS_COLOR[status] ?? STATUS_COLOR['pending'];

  return (
    <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 24px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: 0 }}>
            Il mio spazio
          </h1>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: sc.bg, color: sc.text, borderRadius: 4, padding: '2px 7px',
          }}>
            {sc.label}
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.55)', margin: 0 }}>
          {displayName} · {companyName}
        </p>
      </div>

      {/* Privacy notice — always visible */}
      <div style={{
        background: 'rgba(47,125,85,0.06)', border: '1px solid rgba(47,125,85,0.20)',
        borderRadius: 10, padding: '14px 18px', marginBottom: 28,
      }}>
        <p style={{ fontSize: 12, color: '#1a4731', margin: 0, lineHeight: 1.6 }}>
          <strong>Privacy:</strong> Il tuo datore di lavoro non può vedere questi dati individuali.
          Solo tu puoi accedere a questo spazio. KORA misura le organizzazioni, non le persone.
        </p>
      </div>

      {/* Identity card */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <h2 style={sectionHeadingStyle}>La tua identità KORA</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <Row label="Email" value={worker.email} />
          <Row label="Worker Ref" value={workerRef} mono />
          <Row label="Azienda" value={companyName} />
          <Row label="Onboarding" value={onboardingDone ? 'Completato' : 'In attesa'} />
        </div>
      </div>

      {/* Initiatives section */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <h2 style={sectionHeadingStyle}>Le tue iniziative</h2>
        {initiatives.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.40)', margin: 0, lineHeight: 1.5 }}>
            Nessuna iniziativa disponibile per il tuo tenant. L'amministratore KORA le pubblica quando pronte.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {initiatives.map(init => (
              <InitiativeCard key={init.id} init={init} />
            ))}
          </div>
        )}
      </div>

      {/* History section */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <h2 style={sectionHeadingStyle}>Il mio storico</h2>
        {history.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.40)', margin: 0 }}>
            Nessuna partecipazione registrata ancora.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {history.map((h, i) => (
              <HistoryRow key={i} item={h} />
            ))}
          </div>
        )}
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
          Solo tu puoi vedere questo storico. Non è condiviso con l'azienda.
        </p>
      </div>

      {/* Placeholder sections — future sprint */}
      <div style={{ display: 'grid', gap: 16 }}>
        <PlaceholderSection
          title="Dynamic Impact CV"
          description="Il tuo CV di impatto — portabile, verificato, condivisibile. Disponibile nel prossimo sprint."
        />
        <PlaceholderSection
          title="Le tue opportunità"
          description="Programmi attivi nella tua azienda compatibili con il tuo profilo."
        />
      </div>

      <div style={{ marginTop: 28, fontSize: 10, color: 'rgba(6,3,43,0.30)', lineHeight: 1.5 }}>
        KORA Foundation Light · Worker Workspace · B109 · I dati aziendali rimangono aggregati e non mostrano dati individuali.
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: 'rgba(6,3,43,0.45)', marginBottom: 14, marginTop: 0,
};

const PILLAR_COLORS: Record<string, string> = {
  LIFE: '#16a34a', GROWTH: '#2563eb', CONNECTION: '#9333ea',
  IMPACT: '#dc2626', LEGACY: '#ca8a04',
};

const PARTICIPATION_LABELS: Record<string, string> = {
  interested: 'Interessato',
  registered: 'Registrato',
  attended:   'Partecipato',
  cancelled:  'Cancellato',
};

function InitiativeCard({ init }: { init: InitiativeItem }) {
  const pillarColor = PILLAR_COLORS[init.pillar] ?? '#555';
  const partLabel   = init.participation_status ? PARTICIPATION_LABELS[init.participation_status] : null;

  return (
    <div style={{
      background: '#f9f9fb', border: '1px solid rgba(6,3,43,0.08)',
      borderRadius: 8, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: pillarColor,
            }}>
              {init.pillar}
            </span>
            {init.mode && (
              <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.40)' }}>· {init.mode}</span>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#06032B', marginBottom: 2 }}>
            {init.title}
          </div>
          {init.description && (
            <div style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', lineHeight: 1.4 }}>
              {init.description.slice(0, 140)}
            </div>
          )}
          {(init.start_date || init.end_date) && (
            <div style={{ fontSize: 10, color: 'rgba(6,3,43,0.35)', marginTop: 4 }}>
              {init.start_date && `Dal ${init.start_date}`}
              {init.end_date && ` al ${init.end_date}`}
            </div>
          )}
        </div>
        {partLabel && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            background: init.participation_status === 'attended' ? '#dcfce7' : 'rgba(6,3,43,0.07)',
            color: init.participation_status === 'attended' ? '#15803d' : 'rgba(6,3,43,0.50)',
            borderRadius: 4, padding: '2px 7px', flexShrink: 0, marginLeft: 10,
          }}>
            {partLabel}
          </span>
        )}
      </div>
      {!init.participation_status && (
        <div style={{ marginTop: 10 }}>
          <span style={{
            display: 'inline-block', fontSize: 10, color: 'rgba(6,3,43,0.40)', fontStyle: 'italic',
          }}>
            Usa &quot;Mi interessa&quot; via API o app KORA per registrare la tua partecipazione.
          </span>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const pillarColor = PILLAR_COLORS[item.pillar] ?? '#555';
  const partLabel   = PARTICIPATION_LABELS[item.participation_status] ?? item.participation_status;
  const date        = item.participated_at ? item.participated_at.slice(0, 10) : '—';
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingBottom: 8, borderBottom: '1px solid rgba(6,3,43,0.05)',
    }}>
      <div>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: pillarColor, marginRight: 6 }}>
          {item.pillar}
        </span>
        <span style={{ fontSize: 12, color: '#06032B' }}>{item.initiative_title}</span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.45)' }}>{partLabel}</span>
        <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', fontFamily: 'monospace' }}>{date}</span>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid rgba(6,3,43,0.05)' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(6,3,43,0.50)' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#06032B', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  );
}

function PlaceholderSection({ title, description }: { title: string; description: string }) {
  return (
    <div style={{
      background: '#f9f9fb', border: '1px dashed rgba(6,3,43,0.15)', borderRadius: 10, padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#06032B', margin: 0 }}>{title}</h3>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
          background: 'rgba(6,3,43,0.07)', color: 'rgba(6,3,43,0.45)', borderRadius: 3, padding: '1px 5px',
        }}>
          Prossimamente
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.45)', margin: 0, lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}
