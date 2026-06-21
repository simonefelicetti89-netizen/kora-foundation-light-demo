'use client';
// C-01 (Commons): KORA Commons — layer condiviso di attivazione tra organizzazioni.
// KORA Commons NON è un social network. È uno spazio per opportunità di attivazione umana.
// Ogni iniziativa risponde a: "Quale opportunità di attivazione umana esiste?"
// PREVIEW — KORA Foundation Light. Nessun IU generato da questa pagina.

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { commonsService } from '@/services/commons/CommonsService';
import {
  INITIATIVE_TYPE_LABELS,
  STATUS_LABELS,
  type InitiativeType,
  type InitiativeStatus,
  type CommonsInitiative,
} from '@/lib/commons/types';

// ── Pillar styling ────────────────────────────────────────────────────────────

const PILLAR_ACCENT: Record<string, string> = {
  LIFE:       '#C76F3D',
  GROWTH:     '#2F7D55',
  CONNECTION: '#D99767',
  IMPACT:     '#4A7FE0',
  LEGACY:     '#8A7562',
};

const PILLAR_BG: Record<string, string> = {
  LIFE:       'rgba(199,111,61,0.10)',
  GROWTH:     'rgba(47,125,85,0.10)',
  CONNECTION: 'rgba(217,151,103,0.12)',
  IMPACT:     'rgba(74,127,224,0.10)',
  LEGACY:     'rgba(138,117,98,0.10)',
};

const PILLAR_LABELS: Record<string, string> = {
  LIFE:       'LIFE',
  GROWTH:     'GROWTH',
  CONNECTION: 'CONNECTION',
  IMPACT:     'IMPACT',
  LEGACY:     'LEGACY',
};

const STATUS_COLORS: Record<string, string> = {
  open:      '#2F7D55',
  upcoming:  '#4A7FE0',
  full:      '#9E3B2F',
  completed: 'rgba(6,3,43,0.35)',
};

const STATUS_BG: Record<string, string> = {
  open:      'rgba(47,125,85,0.10)',
  upcoming:  'rgba(74,127,224,0.10)',
  full:      'rgba(158,59,47,0.08)',
  completed: 'rgba(6,3,43,0.06)',
};

const POTENTIAL_COLORS: Record<string, string> = {
  high:   '#2F7D55',
  medium: '#D99A2B',
  low:    'rgba(6,3,43,0.40)',
};

const PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];
const ALL_TYPES = Object.keys(INITIATIVE_TYPE_LABELS) as InitiativeType[];
const ALL_STATUSES: InitiativeStatus[] = ['open', 'upcoming', 'full', 'completed'];

// ── Initiative Card ────────────────────────────────────────────────────────────

function InitiativeCard({ initiative, featured = false }: { initiative: CommonsInitiative; featured?: boolean }) {
  const accent = PILLAR_ACCENT[initiative.pillar];
  const bg     = PILLAR_BG[initiative.pillar];

  const capacityPct = initiative.capacity
    ? Math.min(100, Math.round((initiative.participants_enrolled / initiative.capacity) * 100))
    : null;

  return (
    <div
      style={{
        background:   '#FFFFFF',
        borderRadius: 16,
        border:       featured ? `1.5px solid ${accent}40` : '1px solid rgba(6,3,43,0.08)',
        padding:      24,
        display:      'flex',
        flexDirection:'column',
        gap:          14,
        boxShadow:    featured ? `0 4px 24px ${accent}14` : '0 1px 6px rgba(6,3,43,0.04)',
        transition:   'box-shadow 150ms',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            display:      'inline-flex',
            alignItems:   'center',
            borderRadius: 6,
            padding:      '2px 8px',
            fontSize:     11,
            fontWeight:   700,
            fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
            background:   bg,
            color:        accent,
          }}>
            {PILLAR_LABELS[initiative.pillar]}
          </span>
          <span style={{
            display:      'inline-flex',
            alignItems:   'center',
            borderRadius: 6,
            padding:      '2px 8px',
            fontSize:     10,
            fontWeight:   600,
            fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
            background:   'rgba(6,3,43,0.05)',
            color:        'rgba(6,3,43,0.50)',
          }}>
            {INITIATIVE_TYPE_LABELS[initiative.initiative_type]}
          </span>
        </div>
        <span style={{
          flexShrink:   0,
          display:      'inline-flex',
          alignItems:   'center',
          borderRadius: 6,
          padding:      '3px 8px',
          fontSize:     10,
          fontWeight:   700,
          fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
          background:   STATUS_BG[initiative.status],
          color:        STATUS_COLORS[initiative.status],
        }}>
          {STATUS_LABELS[initiative.status]}
        </span>
      </div>

      {/* Title & description */}
      <div>
        <h3 style={{
          fontFamily:  'Plus Jakarta Sans, system-ui, sans-serif',
          fontWeight:  700,
          fontSize:    15,
          color:       '#06032B',
          lineHeight:  1.35,
          margin:      0,
        }}>
          {initiative.title}
        </h3>
        <p style={{
          fontFamily:  'Plus Jakarta Sans, system-ui, sans-serif',
          fontSize:    12.5,
          color:       'rgba(6,3,43,0.55)',
          lineHeight:  1.5,
          marginTop:   6,
          marginBottom: 0,
          display:     '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow:    'hidden',
        }}>
          {initiative.description}
        </p>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
        <span style={{ fontSize: 11.5, color: 'rgba(6,3,43,0.50)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
          <strong style={{ color: 'rgba(6,3,43,0.70)', fontWeight: 600 }}>{initiative.owner_organization}</strong>
        </span>
        <span style={{ fontSize: 11.5, color: 'rgba(6,3,43,0.45)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
          {initiative.location_type === 'remote' ? 'Remote' : initiative.location_type === 'hybrid' ? `Hybrid · ${initiative.location}` : initiative.location}
        </span>
        <span style={{ fontSize: 11.5, color: 'rgba(6,3,43,0.45)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
          {new Date(initiative.start_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Capacity bar */}
      {capacityPct !== null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10.5, color: 'rgba(6,3,43,0.45)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
              {initiative.participants_enrolled} / {initiative.capacity} iscritti
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: capacityPct >= 80 ? '#9E3B2F' : 'rgba(6,3,43,0.45)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
              {capacityPct}%
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: 'rgba(6,3,43,0.08)', overflow: 'hidden' }}>
            <div style={{
              height:       '100%',
              width:        `${capacityPct}%`,
              borderRadius: 4,
              background:   capacityPct >= 80 ? '#9E3B2F' : accent,
              transition:   'width 400ms',
            }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.38)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
            Potenziale attivazione:
          </span>
          <span style={{
            fontSize:  10,
            fontWeight: 700,
            color:      POTENTIAL_COLORS[initiative.activation_potential],
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
          }}>
            {initiative.activation_potential === 'high' ? 'Alto' : initiative.activation_potential === 'medium' ? 'Medio' : 'Basso'}
          </span>
          <span
            data-testid={`recognition-eligibility-${initiative.id}`}
            style={{
              fontSize:     9,
              fontWeight:   600,
              padding:      '1px 6px',
              borderRadius: 4,
              fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
              background:   initiative.verification_possible
                ? 'rgba(47,125,85,0.10)'
                : 'rgba(6,3,43,0.05)',
              color:        initiative.verification_possible
                ? '#2F7D55'
                : 'rgba(6,3,43,0.40)',
            }}
          >
            {initiative.verification_possible
              ? 'Può generare un riconoscimento verificabile'
              : 'Non genera riconoscimenti'}
          </span>
        </div>
        <button
          style={{
            fontSize:     12,
            fontWeight:   700,
            padding:      '6px 14px',
            borderRadius: 8,
            border:       `1.5px solid ${accent}`,
            background:   'transparent',
            color:        accent,
            cursor:       'pointer',
            fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
            transition:   'background 150ms',
          }}
          disabled={initiative.status === 'full' || initiative.status === 'completed'}
        >
          {initiative.status === 'full' ? 'Completa' : initiative.status === 'completed' ? 'Conclusa' : 'Scopri'}
        </button>
      </div>
    </div>
  );
}

// ── Network Stats Bar ─────────────────────────────────────────────────────────

function NetworkStats() {
  const stats = commonsService.getNetworkStats();
  return (
    <div style={{
      background:    '#06032B',
      borderRadius:  16,
      padding:       '20px 28px',
      display:       'flex',
      alignItems:    'center',
      flexWrap:      'wrap',
      gap:           '16px 32px',
      border:        '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <span style={{
          fontSize:     10,
          fontWeight:   700,
          padding:      '2px 8px',
          borderRadius: 5,
          background:   'rgba(74,127,224,0.22)',
          color:        'rgba(130,180,240,0.90)',
          fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          border:       '1px solid rgba(74,127,224,0.35)',
        }}>
          Rete pilota dimostrativa
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
          Dati sintetici pre-launch · La rete live cresce con le organizzazioni pilota
        </span>
      </div>
      {[
        { value: stats.total_initiatives, label: 'Iniziative totali' },
        { value: stats.open_initiatives,  label: 'Aperte / in arrivo' },
        { value: stats.organizations_active, label: 'Organizzazioni attive' },
        { value: stats.total_participants, label: 'Partecipanti totali' },
        { value: stats.pillars_covered,   label: 'Pillar attivi' },
      ].map(({ value, label }) => (
        <div key={label} style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
            fontWeight: 800,
            fontSize:   22,
            color:      '#FFFFFF',
            lineHeight: 1,
          }}>
            {value}
          </div>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
            fontSize:   10,
            color:      'rgba(255,255,255,0.40)',
            marginTop:  3,
          }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CommonsPage() {
  const [pillarFilter, setPillarFilter]  = useState<string>('');
  const [typeFilter, setTypeFilter]      = useState<InitiativeType | ''>('');
  const [statusFilter, setStatusFilter]  = useState<InitiativeStatus | ''>('');

  const featured     = commonsService.getFeaturedInitiatives();
  const allInitiatives = commonsService.getInitiatives();

  const filtered = useMemo(() => {
    return commonsService.getInitiatives({
      pillar: pillarFilter   || undefined,
      type:   (typeFilter    || undefined) as InitiativeType | undefined,
      status: (statusFilter  || undefined) as InitiativeStatus | undefined,
    });
  }, [pillarFilter, typeFilter, statusFilter]);

  const hasFilters = !!pillarFilter || !!typeFilter || !!statusFilter;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 80px 0', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>

      {/* Pilot preview banner */}
      <div
        data-testid="commons-pilot-preview-banner"
        style={{
          background:   'rgba(74,127,224,0.06)',
          border:       '1px solid rgba(74,127,224,0.18)',
          borderRadius: 10,
          padding:      '10px 16px',
          marginBottom: 24,
          display:      'flex',
          alignItems:   'center',
          gap:          10,
        }}
      >
        <span style={{
          fontSize:      9,
          fontWeight:    700,
          padding:       '2px 8px',
          borderRadius:  4,
          background:    'rgba(74,127,224,0.15)',
          color:         '#3B6EBA',
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
          border:        '1px solid rgba(74,127,224,0.25)',
          flexShrink:    0,
        }}>
          KORA Space · Pilot Preview
        </span>
        <span style={{ fontSize: 11, color: 'rgba(6,3,43,0.55)', lineHeight: 1.5 }}>
          Questa è una rete dimostrativa pre-launch con dati sintetici. Il layer live si attiverà
          quando le prime organizzazioni pilota pubblicheranno iniziative reali.
          KORA Space e KORA Commons aziendali (nella sidebar) usano già dati reali per il tuo tenant.
        </span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{
            fontWeight:    800,
            fontSize:      32,
            color:         '#06032B',
            letterSpacing: '-0.03em',
            lineHeight:    1.06,
            margin:        0,
          }}>
            KORA Commons
          </h1>
          <span style={{
            fontSize:      10,
            fontWeight:    700,
            padding:       '3px 9px',
            borderRadius:  5,
            background:    'rgba(74,127,224,0.10)',
            color:         'rgba(74,127,224,0.85)',
            border:        '1px solid rgba(74,127,224,0.22)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Preview
          </span>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(6,3,43,0.55)', marginTop: 8, maxWidth: 620, lineHeight: 1.5 }}>
          Il layer condiviso di attivazione umana tra organizzazioni. Opportunità reali di crescita, impatto e connessione — aperte alla rete KORA.
        </p>
      </div>

      {/* Social network disclaimer */}
      <div style={{
        background:   'rgba(6,3,43,0.04)',
        border:       '1px solid rgba(6,3,43,0.10)',
        borderRadius: 12,
        padding:      '14px 20px',
        marginBottom: 28,
        display:      'flex',
        alignItems:   'flex-start',
        gap:          12,
      }}>
        <span style={{ fontSize: 18, lineHeight: 1, marginTop: 1 }}>⚠</span>
        <div>
          <p style={{ fontWeight: 700, fontSize: 12.5, color: '#06032B', margin: 0 }}>
            KORA Commons non è un social network.
          </p>
          <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.55)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
            Non ci sono like, commenti, follower o feed algoritmici. KORA Commons è uno spazio per opportunità di attivazione umana: ogni iniziativa deve rispondere alla domanda "quale opportunità di crescita, impatto o connessione esiste?". Il lavoratore rimane sovrano sui propri dati.
          </p>
        </div>
      </div>

      {/* Network stats */}
      <div style={{ marginBottom: 36 }}>
        <NetworkStats />
      </div>

      {/* Featured initiatives */}
      {!hasFilters && (
        <section style={{ marginBottom: 44 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: 18, color: '#06032B', margin: 0 }}>
                Iniziative in evidenza
              </h2>
              <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.45)', marginTop: 3 }}>
                Alto potenziale di attivazione · Aperte o in arrivo
              </p>
            </div>
            <Link href="/company/commons" style={{
              fontSize:     12,
              fontWeight:   700,
              padding:      '8px 16px',
              borderRadius: 8,
              background:   '#06032B',
              color:        '#FFFFFF',
              textDecoration: 'none',
              fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
            }}>
              + Pubblica in KORA Space
            </Link>
          </div>
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap:                 20,
          }}>
            {featured.map((i) => (
              <InitiativeCard key={i.id} initiative={i} featured />
            ))}
          </div>
        </section>
      )}

      {/* Explore by pillar */}
      {!hasFilters && (
        <section style={{ marginBottom: 44 }}>
          <h2 style={{ fontWeight: 800, fontSize: 18, color: '#06032B', marginBottom: 14 }}>
            Esplora per Pillar
          </h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {PILLARS.map((pillar) => {
              const count = allInitiatives.filter((i) => i.pillar === pillar).length;
              return (
                <button
                  key={pillar}
                  onClick={() => setPillarFilter(pillar)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          8,
                    padding:      '10px 18px',
                    borderRadius: 10,
                    border:       `1.5px solid ${PILLAR_ACCENT[pillar]}30`,
                    background:   PILLAR_BG[pillar],
                    cursor:       'pointer',
                    fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
                    transition:   'all 150ms',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: 13, color: PILLAR_ACCENT[pillar] }}>
                    {pillar}
                  </span>
                  <span style={{
                    fontSize:     11,
                    fontWeight:   700,
                    padding:      '1px 6px',
                    borderRadius: 4,
                    background:   `${PILLAR_ACCENT[pillar]}20`,
                    color:        PILLAR_ACCENT[pillar],
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Explore by type */}
      {!hasFilters && (
        <section style={{ marginBottom: 44 }}>
          <h2 style={{ fontWeight: 800, fontSize: 18, color: '#06032B', marginBottom: 14 }}>
            Esplora per Tipo
          </h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ALL_TYPES.map((type) => {
              const count = allInitiatives.filter((i) => i.initiative_type === type).length;
              if (count === 0) return null;
              return (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          6,
                    padding:      '7px 14px',
                    borderRadius: 8,
                    border:       '1px solid rgba(6,3,43,0.10)',
                    background:   'rgba(6,3,43,0.04)',
                    cursor:       'pointer',
                    fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
                    transition:   'all 150ms',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 12.5, color: 'rgba(6,3,43,0.70)' }}>
                    {INITIATIVE_TYPE_LABELS[type]}
                  </span>
                  <span style={{
                    fontSize:     10,
                    fontWeight:   700,
                    padding:      '1px 5px',
                    borderRadius: 4,
                    background:   'rgba(6,3,43,0.08)',
                    color:        'rgba(6,3,43,0.45)',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Filter bar (when filters active) + All initiatives */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <h2 style={{ fontWeight: 800, fontSize: 18, color: '#06032B', margin: 0, flex: 1 }}>
            {hasFilters ? `Risultati (${filtered.length})` : `Tutte le iniziative (${allInitiatives.length})`}
          </h2>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={pillarFilter}
              onChange={(e) => setPillarFilter(e.target.value)}
              style={{
                fontSize:     12,
                padding:      '6px 10px',
                borderRadius: 8,
                border:       '1px solid rgba(6,3,43,0.12)',
                background:   '#FFFFFF',
                color:        'rgba(6,3,43,0.70)',
                fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
                cursor:       'pointer',
              }}
            >
              <option value="">Tutti i pillar</option>
              {PILLARS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as InitiativeType | '')}
              style={{
                fontSize:     12,
                padding:      '6px 10px',
                borderRadius: 8,
                border:       '1px solid rgba(6,3,43,0.12)',
                background:   '#FFFFFF',
                color:        'rgba(6,3,43,0.70)',
                fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
                cursor:       'pointer',
              }}
            >
              <option value="">Tutti i tipi</option>
              {ALL_TYPES.map((t) => <option key={t} value={t}>{INITIATIVE_TYPE_LABELS[t]}</option>)}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InitiativeStatus | '')}
              style={{
                fontSize:     12,
                padding:      '6px 10px',
                borderRadius: 8,
                border:       '1px solid rgba(6,3,43,0.12)',
                background:   '#FFFFFF',
                color:        'rgba(6,3,43,0.70)',
                fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
                cursor:       'pointer',
              }}
            >
              <option value="">Tutti gli stati</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>

            {hasFilters && (
              <button
                onClick={() => { setPillarFilter(''); setTypeFilter(''); setStatusFilter(''); }}
                style={{
                  fontSize:     12,
                  fontWeight:   600,
                  padding:      '6px 12px',
                  borderRadius: 8,
                  border:       '1px solid rgba(6,3,43,0.12)',
                  background:   'transparent',
                  color:        '#9E3B2F',
                  cursor:       'pointer',
                  fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
                }}
              >
                Rimuovi filtri
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{
            padding:      48,
            textAlign:    'center',
            background:   'rgba(6,3,43,0.03)',
            borderRadius: 12,
            border:       '1px solid rgba(6,3,43,0.06)',
          }}>
            <p style={{ fontSize: 14, color: 'rgba(6,3,43,0.40)', margin: 0 }}>
              Nessuna iniziativa corrisponde ai filtri selezionati.
            </p>
          </div>
        ) : (
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap:                 20,
          }}>
            {filtered.map((i) => (
              <InitiativeCard key={i.id} initiative={i} />
            ))}
          </div>
        )}
      </section>

      {/* Next activation layer panel */}
      <div
        data-testid="commons-next-activation-layer"
        style={{
          marginTop:    44,
          padding:      '28px 32px',
          background:   '#06032B',
          borderRadius: 16,
          display:      'flex',
          alignItems:   'flex-start',
          justifyContent: 'space-between',
          gap:          24,
          flexWrap:     'wrap',
        }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(199,111,61,0.90)', textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 8px' }}>
            Prossimo layer di attivazione
          </p>
          <h3 style={{ fontWeight: 800, fontSize: 17, color: '#FFFFFF', margin: '0 0 8px', lineHeight: 1.25 }}>
            Vuoi portare la tua organizzazione nella rete?
          </h3>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.50)', margin: 0, lineHeight: 1.6 }}>
            Le organizzazioni pilota potranno pubblicare iniziative reali, ricevere partecipazioni cross-azienda
            e generare eventi di contribuzione che alimentano KORA Contribution™.
            La pubblicazione in questa fase pre-launch è disponibile per aziende pilota via KORA Space (sidebar → KORA Space).
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
          <Link href="/company/commons" style={{
            fontSize:     13,
            fontWeight:   700,
            padding:      '10px 22px',
            borderRadius: 10,
            background:   '#C76F3D',
            color:        '#FFFFFF',
            textDecoration: 'none',
            fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
            whiteSpace:   'nowrap',
            textAlign:    'center',
            display:      'block',
          }}>
            Vai a KORA Space →
          </Link>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', textAlign: 'center', margin: 0 }}>
            La pubblicazione richiede approvazione KORA
          </p>
        </div>
      </div>
    </div>
  );
}
