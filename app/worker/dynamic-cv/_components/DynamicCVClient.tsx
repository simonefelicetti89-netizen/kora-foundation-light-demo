'use client';

// app/worker/dynamic-cv/_components/DynamicCVClient.tsx
// B121: Dynamic Impact CV — client component for the worker's private CV.
//
// Privacy rules (absolute, non-bypassable):
//   - Fetches from /api/worker/dynamic-cv — workerId always from server session
//   - Displays only this worker's own data
//   - No employer-visible path to this component
//   - No ranking, no score, no percentile, no comparison
//   - cancelled experiences not shown as positive
//   - export/share: disabled (coming soon) — no public anonymous link

import { useEffect, useState } from 'react';
import type { DynamicCVResponse, CVPillarEntry } from '@/app/api/worker/dynamic-cv/route';

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

  const { profile, summary, pillars, experiences, narrative } = data;
  const activePillarList  = pillars.filter((p: CVPillarEntry) => p.total_active > 0);
  const missingPillarList = pillars.filter((p: CVPillarEntry) => p.total_active === 0);
  const hasExperiences    = experiences.length > 0;

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

      {/* ── Export / share — foundation, non implementato ─────────────────── */}
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
          La condivisione sarà sempre sotto il tuo controllo.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            data-testid="dynamic-cv-export-pdf-btn"
            disabled
            style={{
              fontFamily:   FONT,
              fontSize:     12,
              fontWeight:   600,
              padding:      '8px 16px',
              borderRadius: 8,
              border:       '1px solid rgba(6,3,43,0.15)',
              background:   'rgba(6,3,43,0.04)',
              color:        'rgba(6,3,43,0.35)',
              cursor:       'not-allowed',
            }}
          >
            Scarica PDF (prossimamente)
          </button>
          <button
            data-testid="dynamic-cv-share-link-btn"
            disabled
            style={{
              fontFamily:   FONT,
              fontSize:     12,
              fontWeight:   600,
              padding:      '8px 16px',
              borderRadius: 8,
              border:       '1px solid rgba(6,3,43,0.15)',
              background:   'rgba(6,3,43,0.04)',
              color:        'rgba(6,3,43,0.35)',
              cursor:       'not-allowed',
            }}
          >
            Crea link condivisibile (prossimamente)
          </button>
        </div>
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
