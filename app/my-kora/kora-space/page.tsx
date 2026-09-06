'use client';
// W-KS: KORA Space — Worker preview.
// B142-A: spazio condiviso per il worker — iniziative, richieste, opportunità.
//
// Privacy invariants:
//   - Nessun dato company individuale (no KORA Index, no KPI aziendali, no scoring)
//   - Nessuna classifica, nessun ranking, nessun confronto tra lavoratori
//   - Partecipazione non visibile all'azienda in forma individuale
//
// B-WORKER-3 (2026-09-06): re-ran the KORA Space parity comparison against
// /worker/commons after fixing WorkerBookingButton's booking-status-persistence
// gap (Slice 2 found it always started 'idle', not reflecting an existing
// booking). /worker/commons now shows the same real discovery + persistent
// booking status this page's live branch did — its own SpaceItemType
// 'opportunity'/'kora_recommendation' items were always demo-only fixtures
// (KORA_SPACE_ITEMS), never part of the live branch. Parity is now FULL:
// the live/empty branches were removed, replaced by a redirect to
// /worker/commons for any confirmed real session. The demo/persona preview
// path (checking /api/worker/pib, non-real → demo) is unchanged.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRole } from '@/lib/demo-state';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

type SpaceItemType = 'initiative' | 'request' | 'opportunity' | 'kora_recommendation';
type SpaceMode = 'checking' | 'redirecting' | 'demo';

interface KoraSpaceItem {
  id:           string;
  type:         SpaceItemType;
  type_label:   string;
  title:        string;
  pillars:      string[];
  status_label: string;
  description:  string;
  cta:          string;
}

const KORA_SPACE_ITEMS: KoraSpaceItem[] = [
  {
    id:           'ks-001',
    type:         'initiative',
    type_label:   'Initiative',
    title:        'Percorso mentoring intergenerazionale',
    pillars:      ['CONNECTION', 'LEGACY'],
    status_label: 'Aperta',
    description:  'Un percorso di incontro tra generazioni per trasferire competenze e costruire relazioni durature.',
    cta:          'Scopri',
  },
  {
    id:           'ks-002',
    type:         'request',
    type_label:   'Request',
    title:        'Raccolta bisogni su formazione digitale',
    pillars:      ['GROWTH'],
    status_label: 'In ascolto',
    description:  "KORA sta raccogliendo segnali aggregati sul fabbisogno formativo digitale dell'organizzazione.",
    cta:          'Vedi richiesta',
  },
  {
    id:           'ks-003',
    type:         'opportunity',
    type_label:   'Opportunity',
    title:        'Volontariato territoriale Q2',
    pillars:      ['IMPACT'],
    status_label: 'Disponibile',
    description:  'Opportunità di impatto locale con partner certificati KORA nel territorio.',
    cta:          'Partecipa',
  },
  {
    id:           'ks-004',
    type:         'kora_recommendation',
    type_label:   'KORA Recommendation',
    title:        'Bilanciare il trimestre con iniziative LIFE',
    pillars:      ['LIFE'],
    status_label: 'Suggerimento KORA',
    description:  "L'attivazione LIFE è sotto la media del periodo. KORA raccomanda di ampliare le iniziative benessere.",
    cta:          'Approfondisci',
  },
];

const TYPE_STYLE: Record<SpaceItemType, { color: string; bg: string; border: string }> = {
  initiative:          { color: '#2F7D55', bg: 'rgba(47,125,85,0.08)',   border: 'rgba(47,125,85,0.22)'   },
  request:             { color: '#8A5A00', bg: 'rgba(217,154,43,0.08)',  border: 'rgba(217,154,43,0.22)'  },
  opportunity:         { color: '#4A7FE0', bg: 'rgba(74,127,224,0.08)', border: 'rgba(74,127,224,0.22)'  },
  kora_recommendation: { color: '#B5512E', bg: 'rgba(181,81,46,0.08)',  border: 'rgba(181,81,46,0.22)'   },
};

const PILLAR_COLORS: Record<string, string> = {
  LIFE: '#C76F3D', GROWTH: '#2F7D55', CONNECTION: '#D99767', IMPACT: '#4A7FE0', LEGACY: '#8A7562',
};

function OperatingModelNotice() {
  return (
    <div
      data-testid="space-operating-model-worker"
      style={{
        background: 'rgba(6,3,43,0.03)', border: '1px solid rgba(6,3,43,0.09)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 16,
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 700, color: TOKENS.ink, margin: '0 0 6px', lineHeight: 1.4 }}>
        KORA Space è il luogo in cui KORA passa dalla misurazione all&apos;attivazione.
      </p>
      <p style={{ fontSize: 12, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.65 }}>
        Non è un social network. Non è sorveglianza dei lavoratori.
        La partecipazione individuale resta privata. Le aziende vedono solo segnali aggregati.
        KORA Contribution™ è un indicatore companion — non è una componente del KORA Index™.
      </p>
    </div>
  );
}

function PrivacyNotice() {
  return (
    <div
      data-testid="kora-space-worker-privacy"
      style={{
        background: 'rgba(47,125,85,0.06)', border: '1.5px solid rgba(47,125,85,0.22)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 24,
      }}
    >
      <p
        data-testid="space-employer-privacy-notice"
        style={{ fontSize: 12, color: '#2F7D55', margin: 0, lineHeight: 1.75 }}
      >
        KORA Space mostra contenuti e opportunità condivise. Non espone dati individuali dei lavoratori.{' '}
        Le richieste dei lavoratori sono gestite solo in forma aggregata o supervisionata.{' '}
        La partecipazione individuale non è visibile all&apos;azienda in questa vista.{' '}
        KORA misura l&apos;organizzazione, non classifica le persone.{' '}
        <strong>Il datore di lavoro non vede il tuo percorso individuale.</strong>{' '}
        La tua partecipazione può contribuire alla tua timeline personale e, in forma aggregata,
        alla KORA Contribution dell&apos;ecosistema.{' '}
        Nessuna condivisione pubblica avviene automaticamente.
      </p>
    </div>
  );
}

function TimelineConnectionNote() {
  return (
    <div
      data-testid="space-timeline-connection-note"
      style={{
        background: TOKENS.canvas, border: `1px solid ${TOKENS.inkBorder}`,
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 700, color: TOKENS.ink, margin: '0 0 6px', lineHeight: 1.4 }}>
        Partecipazione, traccia personale e Dynamic Impact CV
      </p>
      <ul style={{ fontSize: 12, color: TOKENS.inkSecondary, margin: 0, paddingLeft: 16, lineHeight: 1.75 }}>
        <li>
          La partecipazione confermata può apparire nella tua timeline personale come traccia privata,
          quando sarà disponibile un ciclo di scoring collegato.
        </li>
        <li>
          L&apos;inclusione nel Dynamic Impact CV dipende dalla Dynamic Impact CV policy e dalla
          classificazione CV-eligible dell&apos;iniziativa.
        </li>
        <li>
          Non tutta la partecipazione in KORA Space diventa badge condivisibile.
        </li>
        <li>
          Sei tu a decidere cosa condividere dalla tua timeline personale — il datore di lavoro
          non vede il tuo percorso individuale.
        </li>
      </ul>
    </div>
  );
}

function PageHeader() {
  return (
    <>
      <Link
        href="/my-kora"
        style={{ fontSize: 11, color: TOKENS.inkHint, textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}
      >
        ← My KORA
      </Link>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#B5512E', background: 'rgba(181,81,46,0.08)', borderRadius: 4,
            padding: '2px 8px', border: '1px solid rgba(181,81,46,0.22)',
          }}>
            supervisionato da KORA
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: TOKENS.inkHint, background: TOKENS.taupe, borderRadius: 4,
            padding: '2px 8px', border: `1px solid ${TOKENS.inkBorder}`,
          }}>
            Foundation Light preview
          </span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: TOKENS.ink, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          KORA Space
        </h1>
        <p style={{ fontSize: 13, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.55 }}>
          Lo spazio condiviso per iniziative, richieste e opportunità di attivazione.
        </p>
      </div>
    </>
  );
}

export default function WorkerKoraSpacePage() {
  const { activeRole } = useRole();
  const router = useRouter();
  const [mode, setMode] = useState<SpaceMode>('checking');

  useEffect(() => {
    fetch('/api/worker/pib')
      .then((r) => r.json())
      .then((data) => {
        if (data?.isSynthetic !== false) {
          setMode('demo');
        } else {
          setMode('redirecting');
          router.replace('/worker/commons');
        }
      })
      .catch(() => setMode('demo'));
  }, [router]);

  if (!myKoraPreviewService.canAccess(activeRole) && mode !== 'checking') {
    return (
      <div
        data-testid="access-denied"
        style={{
          borderRadius: 12, border: '1px solid rgba(158,59,47,0.20)',
          background: 'rgba(158,59,47,0.06)', padding: '24px', textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: '#9E3B2F', margin: '0 0 4px' }}>Accesso Limitato</p>
        <p style={{ fontSize: 12, color: 'rgba(158,59,47,0.90)', margin: 0 }}>
          KORA Space worker preview è accessibile solo ai lavoratori.
        </p>
      </div>
    );
  }

  if (mode === 'checking' || mode === 'redirecting') return null;


  // demo mode — synthetic content with visible label
  return (
    <div style={{ fontFamily: FONT }} data-testid="kora-space-worker">
      <PageHeader />

      {/* Demo label */}
      <div
        data-testid="kora-space-demo-label"
        style={{
          background: 'rgba(74,127,224,0.06)', border: '1px solid rgba(74,127,224,0.18)',
          borderRadius: 8, padding: '8px 14px', marginBottom: 16,
          fontSize: 10, color: '#3B5A8A',
        }}
      >
        Demo preview · Dati dimostrativi · Non rappresenta iniziative reali del lavoratore
      </div>

      <OperatingModelNotice />
      <PrivacyNotice />

      {/* In evidenza */}
      <h2 style={{
        fontSize: 13, fontWeight: 700, color: TOKENS.inkSecondary,
        margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        In evidenza
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {KORA_SPACE_ITEMS.map((item) => {
          const ts = TYPE_STYLE[item.type];
          return (
            <div
              key={item.id}
              data-testid={`kora-space-worker-card-${item.id}`}
              style={{
                background: '#FFFFFF', border: '1px solid rgba(6,3,43,0.09)',
                borderRadius: 14, padding: '18px 20px',
              }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: ts.color, background: ts.bg, border: `1px solid ${ts.border}`,
                  borderRadius: 999, padding: '2px 10px',
                }}>
                  {item.type_label}
                </span>
                {item.pillars.map((p) => (
                  <span key={p} style={{
                    fontSize: 10, fontWeight: 600,
                    color: PILLAR_COLORS[p], background: `${PILLAR_COLORS[p]}18`,
                    borderRadius: 4, padding: '2px 8px',
                  }}>
                    {p}
                  </span>
                ))}
                <span style={{
                  fontSize: 10, color: TOKENS.inkHint, background: 'rgba(6,3,43,0.05)',
                  borderRadius: 4, padding: '2px 8px', marginLeft: 'auto',
                }}>
                  {item.status_label}
                </span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: TOKENS.ink, margin: '0 0 6px', lineHeight: 1.3 }}>
                {item.title}
              </p>
              <p style={{ fontSize: 12, color: TOKENS.inkSecondary, margin: '0 0 14px', lineHeight: 1.6 }}>
                {item.description}
              </p>
              <button
                disabled
                style={{
                  fontSize: 11, fontWeight: 600, color: TOKENS.inkSecondary,
                  background: 'rgba(6,3,43,0.05)', border: '1px solid rgba(6,3,43,0.12)',
                  borderRadius: 8, padding: '6px 14px', cursor: 'not-allowed', opacity: 0.6,
                  fontFamily: FONT,
                }}
              >
                {item.cta} · preview
              </button>
            </div>
          );
        })}
      </div>

      <TimelineConnectionNote />

      {/* Regole dello spazio */}
      <div style={{
        background: TOKENS.surface, border: `1px solid ${TOKENS.inkBorder}`,
        borderRadius: 12, padding: '16px 20px', marginBottom: 24,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: TOKENS.ink, margin: '0 0 8px' }}>
          Regole dello spazio
        </p>
        <ul style={{ fontSize: 12, color: TOKENS.inkSecondary, margin: 0, paddingLeft: 16, lineHeight: 1.75 }}>
          <li>I contenuti sono supervisionati da KORA — nessun contenuto non moderato.</li>
          <li>La tua partecipazione è volontaria. KORA non misura pressione né compliance.</li>
          <li>Non c&apos;è ranking, classifica, né confronto tra lavoratori.</li>
          <li>Le richieste dei lavoratori sono aggregate — nessuna visibilità individuale verso l&apos;azienda.</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Link href="/my-kora/personal-impact-balance" style={{ fontSize: 12, fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>
          → Personal Impact Balance
        </Link>
        <Link href="/my-kora/dynamic-cv" style={{ fontSize: 12, fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>
          → Dynamic Impact CV
        </Link>
        <Link href="/worker/workspace" style={{ fontSize: 12, fontWeight: 600, color: TOKENS.inkSecondary, textDecoration: 'none' }}>
          → Spazio operativo
        </Link>
      </div>

      <p style={{ fontSize: 10, fontFamily: 'monospace', color: TOKENS.inkHint, marginTop: 28 }}>
        synthetic_demo_data: true · Foundation Light Preview · KORA Space v0.1 · B142-A
      </p>
    </div>
  );
}
