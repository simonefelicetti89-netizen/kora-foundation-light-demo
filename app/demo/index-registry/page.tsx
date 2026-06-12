// A-03: KORA Index™ Registry — registro cross-company dei punteggi KORA.
// Scopo: fornire a KORA Admin una vista tabulare degli output KORA Index™
//        per tutte le aziende e scenari, con Confidence Score™ e Safeguard™.
// Nota: valori sintetici (marcati ~) non derivati da scoring run reali.

import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const SAFEGUARD_STYLE: Record<string, React.CSSProperties> = {
  CLEAR:   { background: TOKENS.safeguard.pass.bg,  color: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40`  },
  WARNING: { background: TOKENS.safeguard.watch.bg, color: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` },
  FLAGGED: { background: TOKENS.safeguard.cap.bg,   color: TOKENS.safeguard.cap.text,   border: `1px solid ${TOKENS.safeguard.cap.dot}40`   },
};

export default function IndexRegistry() {
  const entries = adminPreviewService.getIndexRegistryPreview();

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '10px', letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.accent }}>
            KORA Admin · Registro
          </p>
          <BoundaryBadge mode="DEMO" variant="light" suffix="· dati sintetici" />
        </div>
        <h1 style={{ fontFamily: FONT, fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.03em', lineHeight: 1.06, color: TOKENS.ink, marginBottom: 6 }}>
          KORA Index™ Registry
        </h1>
        <p style={{ fontFamily: FONT, fontSize: '13.5px', color: TOKENS.inkSecondary, lineHeight: 1.55, maxWidth: '64ch' }}>
          Output KORA Index™ cross-company. Voci ~ = valori sintetici coerenti con le narrative demo — non calcolati da scoring run reali.
          Confidence Score™ è esterno al KORA Index™ (peso = 0).
        </p>
      </div>

      {/* Registry table */}
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 60px 150px 90px 65px 100px 120px', gap: 0, padding: '10px 20px', borderBottom: TOKENS.cardBorder, background: TOKENS.taupe }}>
          {['Azienda', 'S', 'Periodo', 'KORA Index™', 'CS™', 'Safeguard™', 'Calibrazione'].map((h) => (
            <p key={h} style={{ fontFamily: FONT, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: TOKENS.inkHint }}>{h}</p>
          ))}
        </div>
        <div>
          {entries.map((e, i) => (
            <div
              key={`${e.company_id}-${e.scenario_id}`}
              style={{
                display:     'grid',
                gridTemplateColumns: '1.2fr 60px 150px 90px 65px 100px 120px',
                gap:         0,
                padding:     '12px 20px',
                borderBottom: i < entries.length - 1 ? TOKENS.cardBorder : 'none',
                alignItems:  'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                <p style={{ fontFamily: FONT, fontSize: '12.5px', color: TOKENS.inkSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.company_name}
                </p>
                {e.is_synthetic && (
                  <span title="Valore sintetico" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '9.5px', color: TOKENS.inkHint, flexShrink: 0 }}>~</span>
                )}
              </div>
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: TOKENS.inkHint }}>{e.scenario_id}</p>
              <p style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.inkSecondary }}>{e.reporting_period}</p>
              <p style={{ fontFamily: FONT, fontSize: '18px', fontWeight: 800, color: TOKENS.ink, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>{e.kora_index_value}</p>
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11.5px', color: TOKENS.inkSecondary, fontVariantNumeric: 'tabular-nums' }}>{(e.confidence_score * 100).toFixed(0)}%</p>
              <div>
                <span style={{ borderRadius: 999, padding: '3px 10px', fontSize: '9.5px', fontWeight: 700, fontFamily: FONT, ...(SAFEGUARD_STYLE[e.safeguard_status] ?? { background: TOKENS.inkBorder, color: TOKENS.inkHint, border: TOKENS.cardBorder }) }}>
                  {e.safeguard_status}
                </span>
              </div>
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '9px', color: TOKENS.inkMeta, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.calibration_status}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Registry note */}
      <div style={{ marginTop: 16, borderRadius: TOKENS.cardRadiusSm, border: TOKENS.cardBorder, background: TOKENS.taupe, padding: '12px 16px' }}>
        <p style={{ fontFamily: FONT, fontSize: '11px', fontWeight: 600, color: TOKENS.ink, marginBottom: 4 }}>Nota metodologica</p>
        <p style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Solo Meridiana Group è sostenuta da un full scoring run (S1 e S2). Le altre aziende usano valori sintetici
          coerenti con settore, dimensione e contesto di attivazione. Tutti gli output sono pre_empirical_calibration
          — pesi metodologici provvisori v0.1.
        </p>
      </div>
    </div>
  );
}
