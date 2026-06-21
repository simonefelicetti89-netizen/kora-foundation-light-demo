'use client';

// app/worker/dynamic-cv/_components/DynamicCVClient.tsx
// B121: Dynamic Impact CV — client component for the worker's private CV.
// B126: Export & controlled sharing added — printable view + create/revoke share links.
//
// Privacy rules (absolute, non-bypassable):
//   - Fetches from /api/worker/dynamic-cv — workerId always from server session
//   - Displays only this worker's own data
//   - No employer-visible path to this component
//   - No ranking, no score, no percentile, no comparison
//   - cancelled experiences not shown as positive
//   - Share links are worker-controlled, revocable, 30-day default expiry
//   - token_hash never returned or displayed

import { useEffect, useState, useCallback } from 'react';
import type { DynamicCVResponse, CVPillarEntry } from '@/app/api/worker/dynamic-cv/route';
import type { SharesResponse, ShareLinkItem } from '@/app/api/worker/dynamic-cv/shares/route';

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const PILLAR_META: Record<string, { color: string; bg: string; border: string }> = {
  LIFE:       { color: '#2F7D55', bg: 'rgba(47,125,85,0.07)',   border: 'rgba(47,125,85,0.20)'   },
  GROWTH:     { color: '#3B6EBA', bg: 'rgba(59,110,186,0.07)',  border: 'rgba(59,110,186,0.20)'  },
  CONNECTION: { color: '#7C3D8F', bg: 'rgba(124,61,143,0.07)', border: 'rgba(124,61,143,0.20)'  },
  IMPACT:     { color: '#C07D2A', bg: 'rgba(192,125,42,0.07)', border: 'rgba(192,125,42,0.20)'  },
  LEGACY:     { color: '#5A4A3F', bg: 'rgba(90,74,63,0.07)',   border: 'rgba(90,74,63,0.20)'    },
};

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  attended:   { color: '#2F7D55', bg: 'rgba(47,125,85,0.10)'  },
  registered: { color: '#3B6EBA', bg: 'rgba(59,110,186,0.10)' },
  interested: { color: '#C07D2A', bg: 'rgba(192,125,42,0.10)' },
};

interface DynamicCVClientProps {
  userEmail: string;
}

export function DynamicCVClient({ userEmail: _userEmail }: DynamicCVClientProps) {
  const [data,    setData]    = useState<DynamicCVResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Share state
  const [shares,          setShares]          = useState<ShareLinkItem[]>([]);
  const [sharesLoading,   setSharesLoading]   = useState(false);
  const [creating,        setCreating]        = useState(false);
  const [newShareUrl,     setNewShareUrl]      = useState<string | null>(null);
  const [newShareExpires, setNewShareExpires]  = useState<string | null>(null);
  const [revoking,        setRevoking]        = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/worker/dynamic-cv', { credentials: 'include' })
      .then(r => r.json())
      .then((d: DynamicCVResponse) => {
        if (d.ok) setData(d);
        else setError('Impossibile caricare il CV.');
      })
      .catch(() => setError('Errore di rete.'))
      .finally(() => setLoading(false));
  }, []);

  const loadShares = useCallback(() => {
    setSharesLoading(true);
    fetch('/api/worker/dynamic-cv/shares', { credentials: 'include' })
      .then(r => r.json())
      .then((d: SharesResponse) => { if (d.ok) setShares(d.shares); })
      .catch(() => {/* silent — shares not critical */})
      .finally(() => setSharesLoading(false));
  }, []);

  useEffect(() => { loadShares(); }, [loadShares]);

  const handleCreateShare = useCallback(async () => {
    setCreating(true);
    setNewShareUrl(null);
    try {
      const r = await fetch('/api/worker/dynamic-cv/share', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const d = await r.json();
      if (d.ok && d.shareUrl) {
        setNewShareUrl(d.shareUrl as string);
        setNewShareExpires(d.expiresAt as string);
        loadShares();
      }
    } catch {/* silent */} finally {
      setCreating(false);
    }
  }, [loadShares]);

  const handleRevoke = useCallback(async (shareId: string) => {
    setRevoking(shareId);
    try {
      await fetch(`/api/worker/dynamic-cv/shares/${shareId}/revoke`, {
        method: 'PATCH', credentials: 'include',
      });
      loadShares();
    } catch {/* silent */} finally {
      setRevoking(null);
    }
  }, [loadShares]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: FONT, fontSize: 13, color: 'rgba(6,3,43,0.40)' }}>
        Caricamento Dynamic Impact CV…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: FONT, fontSize: 13, color: '#9E3B2F' }}>
        {error ?? 'Errore nel caricamento del CV.'}
      </div>
    );
  }

  const { profile, summary, pillars, experiences, badgeItems, privateItems, excludedCount, narrative } = data;
  const activePillarList  = pillars.filter((p: CVPillarEntry) => p.total_active > 0);
  const missingPillarList = pillars.filter((p: CVPillarEntry) => p.total_active === 0);
  const hasExperiences    = experiences.length > 0;
  const hasBadgeItems     = (badgeItems ?? []).length > 0;
  const hasPrivateItems   = (privateItems ?? []).length > 0;
  const excluded          = excludedCount ?? 0;

  const activeShares   = shares.filter(s => s.status === 'active' && !s.isExpired);
  const inactiveShares = shares.filter(s => s.status !== 'active' || s.isExpired);

  return (
    <div
      data-testid="dynamic-cv-container"
      style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px', fontFamily: FONT }}
    >
      {/* Back link */}
      <a
        href="/worker/workspace"
        style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}
      >
        ← Workspace
      </a>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div
        data-testid="dynamic-cv-hero"
        style={{
          background:   '#06032B',
          borderRadius: 16,
          padding:      '28px 32px',
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 8px' }}>
          Dynamic Impact CV
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
          {profile.displayName ?? 'Il tuo profilo'}
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', margin: '0 0 14px' }}>
          {profile.roleLabel} · {profile.tenantName}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.60)', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
          &ldquo;{narrative.headline}&rdquo;
        </p>
      </div>

      {/* ── Selectivity notice — non-suppressible ─────────────────────────── */}
      <div
        data-testid="dynamic-cv-selectivity-notice"
        style={{
          background:   'rgba(59,110,186,0.05)',
          border:       '1px solid rgba(59,110,186,0.16)',
          borderRadius: 12,
          padding:      '12px 18px',
          marginBottom: 14,
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 700, color: '#3B6EBA', margin: '0 0 3px' }}>
          Il Dynamic Impact CV non contiene tutte le Impact Units.
        </p>
        <p style={{ fontSize: 11, color: 'rgba(59,110,186,0.75)', margin: 0, lineHeight: 1.5 }}>
          Mostra solo esperienze selezionabili, verificabili e controllate dal lavoratore.
          Il lavoratore decide cosa condividere. Alcune esperienze restano private e non sono suggerite per la condivisione.
        </p>
        {excluded > 0 && (
          <p style={{ fontSize: 10, color: 'rgba(59,110,186,0.55)', margin: '4px 0 0', fontStyle: 'italic' }}>
            {excluded} {excluded === 1 ? 'esperienza non inclusa' : 'esperienze non incluse'}: compliance, sollievo economico, o categoria sensibile.
          </p>
        )}
      </div>

      {/* ── Privacy banner — non-suppressible ─────────────────────────────── */}
      <div
        data-testid="dynamic-cv-privacy-banner"
        style={{
          background:   'rgba(47,125,85,0.07)',
          border:       '1px solid rgba(47,125,85,0.20)',
          borderRadius: 12,
          padding:      '14px 18px',
          marginBottom: 20,
          display:      'flex',
          flexDirection: 'column',
          gap:           4,
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 700, color: '#2F7D55', margin: 0 }}>
          Il tuo datore di lavoro non vede questo CV.
        </p>
        <p style={{ fontSize: 11, color: 'rgba(47,125,85,0.80)', margin: 0, lineHeight: 1.5 }}>
          Questo CV non è una valutazione individuale. Non contiene ranking o confronto con colleghi.
          Le esperienze derivano dalle attività registrate in KORA.
        </p>
      </div>

      {/* ── Summary ───────────────────────────────────────────────────────── */}
      <div
        data-testid="dynamic-cv-summary"
        style={{
          display:       'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap:           12,
          marginBottom:  20,
        }}
      >
        {[
          { label: 'Attività tracciate',    value: summary.totalActivities  },
          { label: 'Pillar attivi',          value: summary.activePillars    },
          { label: 'Partecipazioni verify.',  value: summary.totalAttended    },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              border:       '1px solid rgba(6,3,43,0.08)',
              borderRadius: 12,
              padding:      '16px 18px',
              background:   '#FAFAFA',
            }}
          >
            <p style={{ fontSize: 24, fontWeight: 900, color: '#06032B', margin: '0 0 4px', letterSpacing: '-0.03em' }}>
              {value}
            </p>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(6,3,43,0.40)', margin: 0 }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Pillar profile ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 12px' }}>
          Profilo pillar
        </p>
        <div
          data-testid="dynamic-cv-pillar-profile"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}
        >
          {pillars.map((p: CVPillarEntry) => {
            const meta = PILLAR_META[p.pillar];
            return (
              <div
                key={p.pillar}
                data-testid={`dynamic-cv-pillar-${p.pillar.toLowerCase()}`}
                style={{
                  border:       `1px solid ${meta?.border ?? '#ddd'}`,
                  borderRadius: 10,
                  padding:      '12px 12px',
                  background:   p.total_active > 0 ? (meta?.bg ?? '#f9f9f9') : 'rgba(6,3,43,0.02)',
                  opacity:      p.total_active > 0 ? 1 : 0.5,
                }}
              >
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: meta?.color ?? '#06032B', margin: '0 0 6px' }}>
                  {p.pillar}
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: p.total_active > 0 ? (meta?.color ?? '#06032B') : 'rgba(6,3,43,0.25)', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
                  {p.total_active}
                </p>
                <p style={{ fontSize: 9, color: 'rgba(6,3,43,0.40)', margin: 0 }}>
                  {p.total_active === 0 ? 'non esplorato' : 'attività'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Narrative ─────────────────────────────────────────────────────── */}
      {(narrative.strengths.length > 0 || narrative.emergingAreas.length > 0) && (
        <div
          data-testid="dynamic-cv-narrative"
          style={{ marginBottom: 20 }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 12px' }}>
            Il tuo profilo
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {narrative.strengths.map((s, i) => (
              <NarrativeCard key={i} label="Aree più attive" text={s} color="#2F7D55" />
            ))}
            {narrative.emergingAreas.map((e, i) => (
              <NarrativeCard key={i} label="Aree in esplorazione" text={e} color="#C07D2A" />
            ))}
            {missingPillarList.length > 0 && (
              <NarrativeCard
                label="Aree non ancora esplorate"
                text={`${missingPillarList.map(p => p.pillar).join(', ')}`}
                color="rgba(6,3,43,0.35)"
              />
            )}
          </div>
        </div>
      )}

      {/* ── Experiences ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 12px' }}>
          Esperienze
        </p>

        {!hasExperiences && (
          <div
            data-testid="dynamic-cv-empty-state"
            style={{
              border:       '1px dashed rgba(6,3,43,0.12)',
              borderRadius: 12,
              padding:      '32px 24px',
              textAlign:    'center',
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 700, color: '#06032B', margin: '0 0 8px' }}>
              Nessuna esperienza ancora
            </p>
            <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.50)', margin: 0, lineHeight: 1.6 }}>
              Partecipa alle iniziative disponibili per costruire il tuo profilo KORA.
            </p>
            <a
              href="/worker/opportunities"
              style={{
                display:        'inline-block',
                marginTop:      16,
                fontSize:       12,
                fontWeight:     600,
                color:          '#3B6EBA',
                textDecoration: 'none',
                padding:        '7px 14px',
                border:         '1px solid rgba(59,110,186,0.28)',
                borderRadius:   8,
              }}
            >
              Esplora iniziative →
            </a>
          </div>
        )}

        {hasExperiences && (
          <div
            data-testid="dynamic-cv-experiences"
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {experiences.map(exp => {
              const meta   = PILLAR_META[exp.pillar];
              const style  = STATUS_STYLE[exp.status] ?? { color: '#06032B', bg: 'rgba(6,3,43,0.06)' };
              return (
                <div
                  key={exp.initiative_id}
                  style={{
                    border:       '1px solid rgba(6,3,43,0.08)',
                    borderRadius: 10,
                    padding:      '12px 16px',
                    display:      'flex',
                    alignItems:   'flex-start',
                    gap:          12,
                  }}
                >
                  <div
                    style={{
                      minWidth:   36,
                      height:     36,
                      borderRadius: 8,
                      background: meta?.bg ?? 'rgba(6,3,43,0.05)',
                      display:    'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: 8, fontWeight: 800, color: meta?.color ?? '#06032B', letterSpacing: '0.06em' }}>
                      {exp.pillar.slice(0, 2)}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#06032B' }}>
                        {exp.title}
                      </span>
                      <span
                        style={{
                          fontSize:      9,
                          fontWeight:    700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          padding:       '2px 7px',
                          borderRadius:  999,
                          color:         style.color,
                          background:    style.bg,
                        }}
                      >
                        {exp.statusLabel}
                      </span>
                    </div>
                    <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: 0 }}>
                      {exp.pillar}
                      {exp.date && ` · ${exp.date}`}
                      {exp.mode && ` · ${exp.mode}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Badge-ready experiences ───────────────────────────────────────── */}
      {hasBadgeItems && (
        <div
          data-testid="dynamic-cv-badge-section"
          style={{ marginBottom: 20 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: 0 }}>
              Esperienze badge-ready
            </p>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(192,125,42,0.10)', color: '#C07D2A', border: '1px solid rgba(192,125,42,0.22)' }}>
              {(badgeItems ?? []).length} idonee al badge
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.45)', margin: '0 0 10px', lineHeight: 1.5 }}>
            Queste esperienze soddisfano i requisiti di categoria e livello di evidenza per un badge o credenziale.
            Il badge non viene emesso automaticamente — richiedilo su tua iniziativa.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(badgeItems ?? []).map(exp => (
              <div key={exp.initiative_id} style={{ border: '1px solid rgba(192,125,42,0.25)', borderRadius: 8, padding: '10px 14px', background: 'rgba(192,125,42,0.04)' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#06032B', margin: '0 0 2px' }}>{exp.title}</p>
                <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: 0 }}>{exp.pillar} · {exp.date}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.38)', margin: '8px 0 0', fontStyle: 'italic' }}>
            Badge e credenziali: In arrivo · Pianificato — non attivo in Foundation Light.
          </p>
        </div>
      )}

      {/* ── Private-only experiences ───────────────────────────────────────── */}
      {hasPrivateItems && (
        <div
          data-testid="dynamic-cv-private-section"
          style={{ marginBottom: 20 }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 6px' }}>
            Esperienze private
          </p>
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.45)', margin: '0 0 10px', lineHeight: 1.5 }}>
            Queste esperienze sono incluse nel tuo PIB personale ma non sono suggerite per la condivisione.
            Restano visibili solo a te.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(privateItems ?? []).map(exp => (
              <div key={exp.initiative_id} style={{ border: '1px solid rgba(6,3,43,0.08)', borderRadius: 8, padding: '10px 14px', background: 'rgba(6,3,43,0.02)', opacity: 0.75 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#06032B', margin: '0 0 2px' }}>{exp.title}</p>
                <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: 0 }}>{exp.pillar} · {exp.date} · Privata</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Future sharing options — planned, not active ───────────────────── */}
      <div
        data-testid="dynamic-cv-future-sharing"
        style={{
          border:       '1px solid rgba(6,3,43,0.08)',
          borderRadius: 12,
          padding:      '16px 18px',
          marginBottom: 20,
          background:   'rgba(6,3,43,0.02)',
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(6,3,43,0.55)', margin: '0 0 6px' }}>
          Opzioni di condivisione future
        </p>
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: '0 0 12px', fontStyle: 'italic' }}>
          Nessuna condivisione attiva in Foundation Light. Il lavoratore deciderà cosa condividere in Pilot+.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Badge KORA verificato', desc: 'In arrivo · Pianificato' },
            { label: 'Link di verifica pubblica', desc: 'In arrivo · Pianificato' },
            { label: 'Esporta PDF', desc: 'In arrivo · Pianificato' },
            { label: 'LinkedIn badge / credenziale verificabile', desc: 'In arrivo · Pianificato' },
          ].map(({ label, desc }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.52)', margin: 0 }}>{label}</p>
              <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(6,3,43,0.35)', background: 'rgba(6,3,43,0.05)', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Export & condivisione — B126 ───────────────────────────────────── */}
      <div
        data-testid="dynamic-cv-export-section"
        style={{
          border:       '1px solid rgba(6,3,43,0.08)',
          borderRadius: 12,
          padding:      '18px 20px',
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: '#06032B', margin: '0 0 4px' }}>
          Esporta e condividi
        </p>
        <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: '0 0 14px', lineHeight: 1.5 }}>
          La condivisione è volontaria, revocabile e non viene inviata al tuo datore di lavoro.
          KORA non crea CV employer-facing.
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <a
            data-testid="dynamic-cv-print-link"
            href="/worker/dynamic-cv/print"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily:     FONT,
              fontSize:       12,
              fontWeight:     600,
              padding:        '8px 16px',
              borderRadius:   8,
              border:         '1px solid rgba(6,3,43,0.18)',
              background:     '#06032B',
              color:          '#fff',
              cursor:         'pointer',
              textDecoration: 'none',
              display:        'inline-block',
            }}
          >
            Stampa / Salva PDF
          </a>

          <button
            data-testid="dynamic-cv-share-link-btn"
            onClick={handleCreateShare}
            disabled={creating}
            style={{
              fontFamily:   FONT,
              fontSize:     12,
              fontWeight:   600,
              padding:      '8px 16px',
              borderRadius: 8,
              border:       '1px solid rgba(59,110,186,0.30)',
              background:   'rgba(59,110,186,0.08)',
              color:        '#3B6EBA',
              cursor:       creating ? 'not-allowed' : 'pointer',
              opacity:      creating ? 0.6 : 1,
            }}
          >
            {creating ? 'Creazione…' : 'Crea link condivisibile'}
          </button>
        </div>

        {/* New share link created — show URL once */}
        {newShareUrl && (
          <div
            data-testid="dynamic-cv-new-share-url"
            style={{
              background:   'rgba(47,125,85,0.06)',
              border:       '1px solid rgba(47,125,85,0.25)',
              borderRadius: 8,
              padding:      '12px 16px',
              marginBottom: 12,
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1a4731', margin: '0 0 6px' }}>
              Link creato — copialo ora, non verrà mostrato di nuovo.
            </p>
            <code
              style={{
                display:      'block',
                fontSize:     11,
                color:        '#1a4731',
                wordBreak:    'break-all',
                marginBottom: 4,
              }}
            >
              {newShareUrl}
            </code>
            {newShareExpires && (
              <p style={{ fontSize: 10, color: 'rgba(26,71,49,0.60)', margin: 0 }}>
                Scade: {new Date(newShareExpires).toLocaleDateString('it-IT')}
              </p>
            )}
          </div>
        )}

        {/* Active share links */}
        {sharesLoading && (
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.35)', margin: 0 }}>Caricamento link…</p>
        )}

        {!sharesLoading && activeShares.length > 0 && (
          <div
            data-testid="dynamic-cv-active-shares"
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.35)', margin: '0 0 4px' }}>
              Link attivi
            </p>
            {activeShares.map(s => (
              <div
                key={s.id}
                data-testid="dynamic-cv-share-item"
                style={{
                  border:       '1px solid rgba(6,3,43,0.08)',
                  borderRadius: 8,
                  padding:      '10px 14px',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          12,
                  flexWrap:     'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 160 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#06032B', margin: '0 0 2px' }}>
                    Creato {new Date(s.created_at).toLocaleDateString('it-IT')}
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: 0 }}>
                    Scade {new Date(s.expires_at).toLocaleDateString('it-IT')} &middot; {s.access_count} accessi
                  </p>
                </div>
                <button
                  data-testid="dynamic-cv-revoke-btn"
                  onClick={() => handleRevoke(s.id)}
                  disabled={revoking === s.id}
                  style={{
                    fontFamily:   FONT,
                    fontSize:     10,
                    fontWeight:   700,
                    padding:      '5px 12px',
                    borderRadius: 6,
                    border:       '1px solid rgba(158,59,47,0.28)',
                    background:   'rgba(158,59,47,0.06)',
                    color:        '#9E3B2F',
                    cursor:       revoking === s.id ? 'not-allowed' : 'pointer',
                    opacity:      revoking === s.id ? 0.6 : 1,
                  }}
                >
                  {revoking === s.id ? 'Revoca…' : 'Revoca'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Revoked/expired share links */}
        {!sharesLoading && inactiveShares.length > 0 && (
          <div
            data-testid="dynamic-cv-inactive-shares"
            style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}
          >
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.25)', margin: '0 0 2px' }}>
              Link revocati / scaduti
            </p>
            {inactiveShares.map(s => (
              <div
                key={s.id}
                data-testid="dynamic-cv-inactive-share-item"
                style={{
                  border:       '1px solid rgba(6,3,43,0.05)',
                  borderRadius: 8,
                  padding:      '8px 14px',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          10,
                  opacity:      0.5,
                }}
              >
                <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: 0, flex: 1 }}>
                  {s.status === 'revoked' ? 'Revocato' : 'Scaduto'} &middot; creato {new Date(s.created_at).toLocaleDateString('it-IT')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Privacy footer — non-suppressible ─────────────────────────────── */}
      <div
        data-testid="dynamic-cv-privacy-footer"
        style={{ borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 14 }}
      >
        <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(6,3,43,0.45)', margin: '0 0 2px' }}>
          Il Dynamic Impact CV è privato. L&apos;azienda non vede questo CV.
        </p>
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.28)', margin: 0, lineHeight: 1.5 }}>
          KORA misura l&apos;organizzazione, non valuta il singolo lavoratore. Questo CV non è un ranking
          e non contiene confronti con colleghi.
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NarrativeCard({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <div style={{ border: '1px solid rgba(6,3,43,0.07)', borderRadius: 10, padding: '12px 16px' }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color, margin: '0 0 4px' }}>
        {label}
      </p>
      <p style={{ fontSize: 12, color: '#06032B', margin: 0, lineHeight: 1.6 }}>
        {text}
      </p>
    </div>
  );
}
