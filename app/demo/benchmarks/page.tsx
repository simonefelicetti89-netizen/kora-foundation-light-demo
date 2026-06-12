// A-04: Benchmark — posizionamento KORA Index™ Meridiana vs cluster sintetici.
// Scopo: fornire una lettura comparativa direzionale per valutare il posizionamento
//        di un'azienda rispetto al cluster di riferimento.
// Nota: tutti i benchmark sono sintetici — nessun benchmark empirico disponibile
//        prima della calibrazione Delphi post-pilot.

import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';
import { TOKENS, CHART_COLORS } from '@/lib/design/kora-design-tokens';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export default function BenchmarksPage() {
  const benchmarks = adminPreviewService.getBenchmarkPreview();

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '10px', letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.accent }}>
            KORA Admin · Benchmark
          </p>
          <BoundaryBadge mode="DEMO" variant="light" suffix="· dati sintetici" />
        </div>
        <h1 style={{ fontFamily: FONT, fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.03em', lineHeight: 1.06, color: TOKENS.ink, marginBottom: 6 }}>
          Benchmark di posizionamento
        </h1>
        <p style={{ fontFamily: FONT, fontSize: '13.5px', color: TOKENS.inkSecondary, lineHeight: 1.55, maxWidth: '60ch' }}>
          Meridiana Group S.r.l. vs cluster sintetici di riferimento. Lettura direzionale — non certificativa.
        </p>
      </div>

      {/* Disclaimer */}
      <div style={{
        borderRadius: TOKENS.cardRadiusSm,
        border:       `1px solid ${TOKENS.safeguard.watch.dot}40`,
        background:   TOKENS.safeguard.watch.bg,
        padding:      '12px 16px',
        marginBottom: 24,
      }}>
        <p style={{ fontFamily: FONT, fontSize: '11px', fontWeight: 700, color: TOKENS.safeguard.watch.text, marginBottom: 4 }}>Nota metodologica</p>
        <p style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.safeguard.watch.text, lineHeight: 1.6 }}>
          I valori benchmark sono sintetici e creati a scopo dimostrativo. Nessun benchmark empirico è stato calcolato su dati reali.
          La calibrazione Delphi post-pilot stabilirà i reference range definitivi.
        </p>
      </div>

      {/* Benchmark cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {benchmarks.map((b) => (
          <div
            key={b.dimension}
            style={{
              background:   TOKENS.surface,
              border:       TOKENS.cardBorder,
              borderRadius: TOKENS.cardRadius,
              boxShadow:    TOKENS.cardShadow,
              padding:      '20px 24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontFamily: FONT, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: TOKENS.inkHint, marginBottom: 4 }}>
                  {b.dimension}
                </p>
                <p style={{ fontFamily: FONT, fontSize: '14px', fontWeight: 700, color: TOKENS.ink }}>{b.cluster_label}</p>
              </div>
              <span style={{
                borderRadius: 999,
                padding:      '4px 12px',
                fontSize:     '10.5px',
                fontWeight:   700,
                fontFamily:   FONT,
                background:   TOKENS.accentSoft,
                color:        TOKENS.accent,
                border:       `1px solid ${TOKENS.accentSoft}`,
              }}>
                {b.percentile} percentile
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Meridiana Group',  value: b.meridiana_index,      color: CHART_COLORS.primary },
                { label: 'Media cluster',    value: b.cluster_avg,           color: CHART_COLORS.benchmark },
                { label: 'Top quartile',     value: b.cluster_top_quartile, color: CHART_COLORS.positive },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.inkSecondary, width: 140, flexShrink: 0 }}>{row.label}</span>
                  <div style={{ flex: 1, height: 7, borderRadius: 999, background: TOKENS.inkBorder, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, background: row.color, width: `${row.value}%` }} />
                  </div>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: TOKENS.ink, fontWeight: 700, width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
