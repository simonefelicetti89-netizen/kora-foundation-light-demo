'use client';
// app/worker/workspace/_components/InitiativeCardsClient.tsx
// B110: Interactive initiative cards — client component for worker CTAs.
// Server component fetches initial data and passes it via props.
// Client manages participation status updates without page reload.
// NEVER shows other workers' data or any employer-visible aggregate.

import { useState } from 'react';
import type { WorkerInitiativeRow, WorkerParticipationRow } from '@/lib/supabase/types';

export type InitiativeItem = {
  id: string;
  title: string;
  pillar: WorkerInitiativeRow['pillar'];
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  mode: string | null;
  location: string | null;
  eligibility_class: string | null;
  participation_status: WorkerParticipationRow['status'] | null;
};

const PILLAR_COLORS: Record<string, string> = {
  LIFE: '#16a34a', GROWTH: '#2563eb', CONNECTION: '#9333ea',
  IMPACT: '#dc2626', LEGACY: '#ca8a04',
};

const PILLAR_LABELS: Record<string, string> = {
  LIFE: 'Life', GROWTH: 'Growth', CONNECTION: 'Connection',
  IMPACT: 'Impact', LEGACY: 'Legacy',
};

const STATUS_LABELS: Record<WorkerParticipationRow['status'], string> = {
  interested: 'Interessato',
  registered: 'Registrato',
  attended:   'Partecipato',
  cancelled:  'Cancellato',
};

const ELIGIBILITY_LABELS: Record<string, string> = {
  eligible: 'Tutti i worker',
  limited:  'Accesso limitato',
};

async function postInterest(
  initiativeId: string,
  status: WorkerParticipationRow['status'],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/worker/initiatives/${initiativeId}/interest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
      credentials: 'include',
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data as { error?: string }).error ?? 'Errore nel salvataggio.' };
  } catch {
    return { ok: false, error: 'Errore di rete. Riprova.' };
  }
}

function CTAButton({
  label, onClick, disabled, variant,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  variant: 'primary' | 'secondary' | 'danger';
}) {
  const base: React.CSSProperties = {
    padding: '7px 16px', borderRadius: 6, fontSize: 11, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1, transition: 'opacity 0.1s',
  };
  const variants: Record<string, React.CSSProperties> = {
    primary:   { background: '#06032B', color: '#fff', border: 'none' },
    secondary: { background: 'transparent', color: '#06032B', border: '1px solid rgba(6,3,43,0.25)' },
    danger:    { background: 'transparent', color: '#9e3b2f', border: '1px solid rgba(158,59,47,0.30)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {label}
    </button>
  );
}

function InitiativeCard({
  init,
  currentStatus,
  onStatusChange,
}: {
  init: InitiativeItem;
  currentStatus: WorkerParticipationRow['status'] | null;
  onStatusChange: (id: string, status: WorkerParticipationRow['status']) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const pillarColor = PILLAR_COLORS[init.pillar] ?? '#555';
  const isAttended  = currentStatus === 'attended';

  async function handleCTA(status: WorkerParticipationRow['status']) {
    setLoading(true);
    setError(null);
    const result = await postInterest(init.id, status);
    if (result.ok) {
      onStatusChange(init.id, status);
    } else {
      setError(result.error ?? 'Errore sconosciuto.');
    }
    setLoading(false);
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(6,3,43,0.09)',
      borderRadius: 10, padding: '16px 18px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: pillarColor,
            }}>
              {PILLAR_LABELS[init.pillar] ?? init.pillar}
            </span>
            {init.mode && (
              <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.40)' }}>· {init.mode}</span>
            )}
            {init.location && (
              <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.40)' }}>· {init.location}</span>
            )}
            {init.eligibility_class && init.eligibility_class !== 'eligible' && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                background: '#fef9c3', color: '#854d0e', borderRadius: 4, padding: '1px 5px',
              }}>
                {ELIGIBILITY_LABELS[init.eligibility_class] ?? init.eligibility_class}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#06032B', marginBottom: 2 }}>
            {init.title}
          </div>
          {init.description && (
            <div style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', lineHeight: 1.4 }}>
              {init.description.slice(0, 160)}
            </div>
          )}
          {(init.start_date ?? init.end_date) && (
            <div style={{ fontSize: 10, color: 'rgba(6,3,43,0.35)', marginTop: 4 }}>
              {init.start_date && `Dal ${init.start_date}`}
              {init.end_date && ` al ${init.end_date}`}
            </div>
          )}
        </div>

        {/* Current status badge */}
        {currentStatus && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            background: currentStatus === 'attended' ? '#dcfce7' : currentStatus === 'registered' ? '#dbeafe' : currentStatus === 'interested' ? 'rgba(6,3,43,0.06)' : '#f3f4f6',
            color: currentStatus === 'attended' ? '#15803d' : currentStatus === 'registered' ? '#1d4ed8' : currentStatus === 'interested' ? 'rgba(6,3,43,0.60)' : '#6b7280',
            borderRadius: 4, padding: '2px 7px', flexShrink: 0, marginLeft: 10,
          }}>
            {STATUS_LABELS[currentStatus]}
          </span>
        )}
      </div>

      {/* CTAs — not shown if attended (set by admin/system, immutable) */}
      {!isAttended && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {(currentStatus === null || currentStatus === 'cancelled') && (
            <CTAButton
              label="Mi interessa"
              onClick={() => handleCTA('interested')}
              disabled={loading}
              variant="secondary"
            />
          )}
          {(currentStatus === null || currentStatus === 'interested' || currentStatus === 'cancelled') && (
            <CTAButton
              label="Mi iscrivo"
              onClick={() => handleCTA('registered')}
              disabled={loading}
              variant="primary"
            />
          )}
          {(currentStatus === 'interested' || currentStatus === 'registered') && (
            <CTAButton
              label="Annulla partecipazione"
              onClick={() => handleCTA('cancelled')}
              disabled={loading}
              variant="danger"
            />
          )}
          {loading && (
            <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', fontStyle: 'italic' }}>
              Aggiornamento…
            </span>
          )}
        </div>
      )}

      {error && (
        <p style={{ fontSize: 10, color: '#dc2626', marginTop: 8, marginBottom: 0 }}>{error}</p>
      )}
    </div>
  );
}

export function InitiativeCardsClient({ initiatives }: { initiatives: InitiativeItem[] }) {
  const [statuses, setStatuses] = useState<Record<string, WorkerParticipationRow['status'] | null>>(
    Object.fromEntries(initiatives.map(i => [i.id, i.participation_status])),
  );

  function handleStatusChange(id: string, status: WorkerParticipationRow['status']) {
    setStatuses(prev => ({ ...prev, [id]: status }));
  }

  if (initiatives.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.40)', margin: 0, lineHeight: 1.5 }}>
        Nessuna iniziativa disponibile per il tuo tenant.
        L&apos;amministratore KORA le pubblica quando pronte.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {initiatives.map(init => (
        <InitiativeCard
          key={init.id}
          init={init}
          currentStatus={statuses[init.id] ?? null}
          onStatusChange={handleStatusChange}
        />
      ))}
    </div>
  );
}
