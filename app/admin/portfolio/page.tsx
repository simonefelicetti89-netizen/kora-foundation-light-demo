// A-02: Company Portfolio — vista aggregata di tutte le company demo.
// Scopo: fornire a KORA Admin una tabella leggibile di tutte le aziende pilot
//        con KORA Index™, Confidence Score™ e Activation Safeguard™.

import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const SAFEGUARD_STYLE: Record<string, React.CSSProperties> = {
  CLEAR:   { background: TOKENS.safeguard.pass.bg,  color: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40`  },
  WARNING: { background: TOKENS.safeguard.watch.bg, color: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` },
  FLAGGED: { background: TOKENS.safeguard.cap.bg,   color: TOKENS.safeguard.cap.text,   border: `1px solid ${TOKENS.safeguard.cap.dot}40`   },
};

export default function CompanyPortfolio() {
  const portfolio = adminPreviewService.getCompanyPortfolioPreview();

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '10px', letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.accent, marginBottom: 8 }}>
          KORA Admin · Portafoglio
        </p>
        <h1 style={{ fontFamily: FONT, fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.03em', lineHeight: 1.06, color: TOKENS.ink, marginBottom: 6 }}>
          Company Portfolio
        </h1>
        <p style={{ fontFamily: FONT, fontSize: '13.5px', color: TOKENS.inkSecondary, lineHeight: 1.55, maxWidth: '60ch' }}>
          Tutte le aziende nel portafoglio demo KORA — dati sintetici. Confidence Score™ è esterno al KORA Index™ (peso = 0).
        </p>
      </div>

      {/* Table */}
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 70px 90px 70px 100px', gap: 0, padding: '10px 20px', borderBottom: TOKENS.cardBorder, background: TOKENS.taupe }}>
          {['Azienda', 'Settore', 'Lavoratori', 'KORA Index™', 'CS™', 'Safeguard™'].map((h) => (
            <p key={h} style={{ fontFamily: FONT, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: TOKENS.inkHint }}>{h}</p>
          ))}
        </div>

        {/* Data rows */}
        <div>
          {portfolio.map((c, i) => (
            <div
              key={c.id}
              style={{
                display:      'grid',
                gridTemplateColumns: '1fr 130px 70px 90px 70px 100px',
                gap:          0,
                padding:      '13px 20px',
                borderBottom: i < portfolio.length - 1 ? TOKENS.cardBorder : 'none',
                alignItems:   'center',
              }}
            >
              <div>
                <p style={{ fontFamily: FONT, fontSize: '13px', fontWeight: 600, color: TOKENS.ink }}>{c.company_name}</p>
                <p style={{ fontFamily: FONT, fontSize: '10.5px', color: TOKENS.inkHint, marginTop: 2 }}>{c.territory}</p>
                {c.is_primary_demo && (
                  <span style={{ marginTop: 4, display: 'inline-block', borderRadius: 4, border: `1px solid ${TOKENS.accentSoft}`, background: TOKENS.accentHover, padding: '1px 6px', fontSize: '9.5px', fontWeight: 600, color: TOKENS.accent, fontFamily: FONT }}>
                    Primary demo
                  </span>
                )}
              </div>
              <p style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.inkSecondary }}>{c.sector}</p>
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: TOKENS.inkSecondary, fontVariantNumeric: 'tabular-nums' }}>{c.headcount}</p>
              <p style={{ fontFamily: FONT, fontSize: '17px', fontWeight: 800, color: TOKENS.ink, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {c.kora_index_value !== null ? c.kora_index_value : '—'}
              </p>
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11.5px', color: TOKENS.inkSecondary, fontVariantNumeric: 'tabular-nums' }}>
                {c.confidence_score !== null ? `${(c.confidence_score * 100).toFixed(0)}%` : '—'}
              </p>
              <div>
                {c.safeguard_status ? (
                  <span style={{ borderRadius: 999, padding: '3px 10px', fontSize: '9.5px', fontWeight: 700, fontFamily: FONT, ...SAFEGUARD_STYLE[c.safeguard_status] }}>
                    {c.safeguard_status}
                  </span>
                ) : (
                  <span style={{ fontFamily: FONT, fontSize: '12px', color: TOKENS.inkHint }}>—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo notes */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {portfolio.map((c) => (
          <div key={c.id} style={{ borderRadius: TOKENS.cardRadiusSm, border: TOKENS.cardBorder, background: TOKENS.taupe, padding: '10px 16px' }}>
            <p style={{ fontFamily: FONT, fontSize: '11.5px', fontWeight: 600, color: TOKENS.ink }}>{c.company_name}</p>
            <p style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.inkSecondary, marginTop: 3, lineHeight: 1.55 }}>{c.demo_note}</p>
            <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '9.5px', color: TOKENS.inkMeta, marginTop: 4 }}>
              data_completeness: {(c.data_completeness * 100).toFixed(0)}% · synthetic_demo_data: true
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
