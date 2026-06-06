'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';

interface BriefInsight {
  signal:      string;  // short headline — what is the signal
  finding:     string;  // what the data shows
  implication: string;  // why it matters
  status:      'positive' | 'attention' | 'critical' | 'neutral';
}

interface IntelligenceBriefProps {
  insights: BriefInsight[];
}

const STATUS_MAP = {
  positive:  { dot: TOKENS.success,  label: 'Positivo',   bg: `rgba(47,125,85,0.08)`,   border: `rgba(47,125,85,0.18)`  },
  attention: { dot: TOKENS.warning,  label: 'Attenzione', bg: `rgba(217,154,43,0.08)`,  border: `rgba(217,154,43,0.20)` },
  critical:  { dot: TOKENS.critical, label: 'Critico',    bg: `rgba(158,59,47,0.07)`,   border: `rgba(158,59,47,0.18)`  },
  neutral:   { dot: TOKENS.inkHint,  label: 'Stabile',    bg: `rgba(6,3,43,0.04)`,      border: TOKENS.inkBorder        },
};

// IntelligenceBrief — renders 3 insight cards from computed data
// Each insight = signal (what) + finding (data) + implication (so what)
export function IntelligenceBrief({ insights }: IntelligenceBriefProps) {
  if (!insights.length) return null;

  return (
    <div>
      <p style={{
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontWeight:    600,
        fontSize:      '10px',
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color:         TOKENS.inkHint,
        marginBottom:  14,
      }}>
        Segnali direzionali chiave
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {insights.slice(0, 3).map((insight, i) => {
          const sm = STATUS_MAP[insight.status];
          return (
            <div
              key={i}
              style={{
                background:   TOKENS.surface,
                border:       `1px solid ${sm.border}`,
                borderTop:    `3px solid ${sm.dot}`,
                borderRadius: TOKENS.cardRadius,
                padding:      '18px 20px',
                display:      'flex',
                flexDirection: 'column',
                gap:          8,
              }}
            >
              {/* Status pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dot, flexShrink: 0 }} />
                <p style={{
                  fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                  fontWeight:    600,
                  fontSize:      '9.5px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color:         sm.dot,
                }}>
                  {sm.label}
                </p>
              </div>

              {/* Signal headline */}
              <p style={{
                fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontWeight:  700,
                fontSize:    '13px',
                color:       TOKENS.ink,
                lineHeight:  1.3,
              }}>
                {insight.signal}
              </p>

              {/* Finding */}
              <p style={{
                fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontSize:   '11.5px',
                color:      TOKENS.inkSecondary,
                lineHeight: 1.5,
                flex:       1,
              }}>
                {insight.finding}
              </p>

              {/* Implication */}
              <p style={{
                fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontSize:   '10.5px',
                color:      TOKENS.inkHint,
                lineHeight: 1.45,
                paddingTop: 8,
                borderTop:  TOKENS.cardBorder,
                fontStyle:  'italic',
              }}>
                → {insight.implication}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper: derives 3 insights from scoring data
export function deriveInsights(params: {
  koraIndexValue: number;
  safeguardStatus: string;
  confidenceScore: number;
  activationRate: number;
  meaningfulActivationRate: number;
  verificationRate: number;
  macroblocks: Array<{ code: string; score: number; weight: number }>;
  nextActionTitle?: string;
}): BriefInsight[] {
  const { koraIndexValue, safeguardStatus, activationRate, meaningfulActivationRate, verificationRate, macroblocks } = params;

  const insights: BriefInsight[] = [];

  // Insight 1 — Activation reach
  const notActivated = Math.round((1 - activationRate) * 100);
  if (notActivated > 40) {
    insights.push({
      signal:      `${notActivated}% della forza lavoro non attivata`,
      finding:     `Il tasso di attivazione è ${Math.round(activationRate * 100)}% — la maggioranza silenziosa supera la soglia di attenzione.`,
      implication: `L'Activation Debt è prioritario. Programmi con accesso allargato possono migliorare AR e MAR.`,
      status:      notActivated > 55 ? 'critical' : 'attention',
    });
  } else {
    insights.push({
      signal:      `Attivazione a ${Math.round(activationRate * 100)}% della workforce`,
      finding:     `Il tasso di attivazione supera la soglia di attenzione. ${Math.round(meaningfulActivationRate * 100)}% ha attivazione significativa.`,
      implication: `Il programma raggiunge una quota sostanziale — priorità: profondità e continuità.`,
      status:      activationRate >= 0.55 ? 'positive' : 'neutral',
    });
  }

  // Insight 2 — Weakest macroblock
  const sorted = [...macroblocks].sort((a, b) => a.score - b.score);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];
  if (weakest) {
    const isLow = weakest.score < 50;
    insights.push({
      signal:      `${weakest.code === 'BTI' ? 'Budget-to-Impact' : weakest.code} è il macroblocco critico`,
      finding:     `${weakest.code} score ${Math.round(weakest.score)}/100 (peso ${Math.round(weakest.weight * 100)}%) — ${strongest.code} è il punto di forza con ${Math.round(strongest.score)}/100.`,
      implication: isLow
        ? `Migliorare ${weakest.code} avrebbe impatto diretto sul KORA Index™ per il peso assegnato.`
        : `Il gap è gestibile — azioni mirate possono chiudere il delta.`,
      status: isLow ? 'attention' : 'neutral',
    });
  }

  // Insight 3 — Verification quality
  const vr = Math.round(verificationRate * 100);
  if (vr < 60) {
    insights.push({
      signal:      `Verification Rate al ${vr}% — copertura evidenze bassa`,
      finding:     `Solo ${vr}% degli Impact Units è supportato da evidenza verificata. Confidence Score riflette questa lacuna.`,
      implication: `Migliorare la qualità delle evidenze aumenterà il Confidence Score™ e rafforzerà il Decision Pack.`,
      status: vr < 40 ? 'critical' : 'attention',
    });
  } else {
    const kv = Math.round(koraIndexValue);
    const level = kv >= 70 ? 'solido' : kv >= 50 ? 'in sviluppo' : 'in fase iniziale';
    insights.push({
      signal:      `KORA Index™ ${kv} — posizionamento ${level}`,
      finding:     `Confidence Score ${Math.round(params.confidenceScore * 100)}%. Safeguard: ${safeguardStatus}. Verifica dati al ${vr}%.`,
      implication: kv >= 65
        ? `Il profilo complessivo è solido. Continuità e profondità sono le priorità per il prossimo periodo.`
        : `Il potenziale di miglioramento è significativo — focus su attivazione profonda e continuità.`,
      status: kv >= 65 ? 'positive' : kv >= 50 ? 'neutral' : 'attention',
    });
  }

  return insights;
}
