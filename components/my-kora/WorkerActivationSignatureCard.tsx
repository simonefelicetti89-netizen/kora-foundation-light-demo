'use client';

// WorkerActivationSignatureCard — B141-F
// Unified personal signature object: STRATO + KoraLogo + pillar breakdown in one block.
// Merchandising-ready: max-width capped by page wrapper, compact, light canvas surface.
// Pillar rows are inside the card — no separate column layout on the page.

import { KoraActivationSignature } from './KoraActivationSignature';
import { KoraLogo } from '@/components/brand/KoraLogo';
import { ACTIVATION_SIGNATURE } from '@/lib/design/kora-design-tokens';
import type { PillarPreview } from '@/services/my-kora-preview/MyKoraPreviewService';

type WorkerActivationSignatureCardProps = {
  pillarBreakdown: PillarPreview[];
  activationProfile: string;
  periodIuTotal: number;
  className?: string;
};

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const PILLAR_TEXT_COLORS: Record<string, string> = {
  LIFE: '#C76F3D', GROWTH: '#2F7D55', CONNECTION: '#D99767', IMPACT: '#D99A2B', LEGACY: '#8A7562',
};

const PILLAR_BAR_COLORS: Record<string, string> = {
  LIFE: '#C76F3D', GROWTH: '#2F7D55', CONNECTION: '#D99767', IMPACT: '#D99A2B', LEGACY: '#8A7562',
};

export function WorkerActivationSignatureCard({
  pillarBreakdown,
  activationProfile,
  periodIuTotal,
  className,
}: WorkerActivationSignatureCardProps) {
  return (
    <div
      className={className}
      data-testid="worker-activation-signature-card"
      style={{
        background:   ACTIVATION_SIGNATURE.canvas,
        border:       '1px solid rgba(181,81,46,0.30)',
        borderRadius: 20,
        overflow:     'hidden',
      }}
    >
      {/* ── Top: header · STRATO · logo · profile ─────────────────────────────── */}
      <div style={{
        padding:       '32px 32px 24px',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           16,
        textAlign:     'center',
      }}>
        <p style={{
          fontSize:      9,
          fontWeight:    700,
          letterSpacing: '0.14em',
          color:         'rgba(6,3,43,0.38)',
          textTransform: 'uppercase',
          fontFamily:    FONT,
        }}>
          KORA Activation Signature
        </p>

        <KoraActivationSignature
          pillarBreakdown={pillarBreakdown}
          className="w-52"
        />

        <KoraLogo variant="on-light" className="h-5 w-auto opacity-50" />

        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(6,3,43,0.82)', fontFamily: FONT }}>
            {activationProfile || 'Profilo del periodo'}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.48)', fontFamily: FONT, marginTop: 4 }}>
            {periodIuTotal.toFixed(1).replace('.', ',')} Impact Units attivate
          </p>
          <p style={{
            fontSize:      9,
            color:         'rgba(6,3,43,0.32)',
            letterSpacing: '0.06em',
            fontFamily:    FONT,
            marginTop:     5,
          }}>
            privato · worker-owned
          </p>
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(181,81,46,0.15)' }} />

      {/* ── Bottom: pillar breakdown ──────────────────────────────────────────── */}
      <div style={{ padding: '18px 32px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pillarBreakdown.map((p) => (
          <div key={p.pillar} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              width:      90,
              fontSize:   11,
              fontWeight: 600,
              fontFamily: FONT,
              color:      PILLAR_TEXT_COLORS[p.pillar] ?? 'rgba(6,3,43,0.60)',
              flexShrink: 0,
            }}>
              {p.pillar}
            </span>
            <span style={{
              width:      64,
              fontSize:   11,
              fontFamily: FONT,
              color:      'rgba(6,3,43,0.52)',
              flexShrink: 0,
            }}>
              {p.iu_total.toFixed(1).replace('.', ',')} IU
            </span>
            <div style={{
              flex:         1,
              height:       4,
              borderRadius: 2,
              background:   'rgba(6,3,43,0.08)',
              overflow:     'hidden',
            }}>
              <div style={{
                width:        p.event_count > 0 ? `${p.score}%` : '0%',
                height:       '100%',
                borderRadius: 2,
                background:   p.event_count > 0
                  ? (PILLAR_BAR_COLORS[p.pillar] ?? 'rgba(6,3,43,0.30)')
                  : 'transparent',
              }} />
            </div>
          </div>
        ))}
        <p style={{
          fontSize:   10,
          color:      'rgba(6,3,43,0.35)',
          fontStyle:  'italic',
          marginTop:  6,
          fontFamily: FONT,
        }}>
          Composizione del periodo, non una classifica.
        </p>
      </div>
    </div>
  );
}
