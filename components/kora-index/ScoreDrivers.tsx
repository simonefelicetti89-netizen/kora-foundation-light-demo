'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';

interface WeakComponent {
  code:  string;
  label: string;
}

interface ScoreDriversProps {
  weakComponents: WeakComponent[];
  macroblockScores?: Record<string, number>;
}

// Business-language driver descriptions for each component code
const DRIVER_LIBRARY: Record<string, {
  title:   string;
  impact:  string;
  action:  string;
  macro:   string;
}> = {
  AR:  {
    title:  'Copertura insufficiente',
    impact: 'Una quota significativa della workforce non ha ancora ricevuto attivazione verificata nel periodo.',
    action: 'Espandere le iniziative alle sedi e ai reparti con minore partecipazione.',
    macro:  'REACH',
  },
  MAR: {
    title:  'Profondità limitata',
    impact: 'L\'attivazione significativa (sopra soglia materialità) è concentrata su una minoranza.',
    action: 'Intensificare i programmi ad attivazione profonda e verificata.',
    macro:  'REACH',
  },
  NI:  {
    title:  'Intensità bassa',
    impact: 'La media degli Impact Units per lavoratore attivo è sotto il benchmark target.',
    action: 'Prioritizzare programmi con alta additionality e continuità strutturata.',
    macro:  'QUALITY',
  },
  VR:  {
    title:  'Evidenze incomplete',
    impact: 'Una parte degli Impact Units non è supportata da evidenza verificata — il Confidence Score™ ne risente.',
    action: 'Completare il data intake con fonti strutturate e protocolli advisor.',
    macro:  'QUALITY',
  },
  CO:  {
    title:  'Continuità assente',
    impact: 'L\'attivazione avviene a burst senza ricorrenza — segnale CO debole.',
    action: 'Introdurre programmi ricorrenti e misurare la partecipazione nel tempo.',
    macro:  'QUALITY',
  },
  WB:  {
    title:  'Distribuzione squilibrata',
    impact: 'Gli Impact Units sono concentrati su pochi lavoratori — il bottom 50% è escluso.',
    action: 'Ribilanciare l\'accesso alle iniziative verso i segmenti meno attivi.',
    macro:  'EQUITY',
  },
  PC:  {
    title:  'Copertura pillar incompleta',
    impact: 'Non tutti i 5 pilastri KORA sono rappresentati con sufficiente presenza.',
    action: 'Attivare programmi sui pilastri scoperti — in particolare CONNECTION e LEGACY.',
    macro:  'EQUITY',
  },
  PB:  {
    title:  'Squilibrio tra pilastri',
    impact: 'Un pilastro domina (tipicamente LIFE) — la distribuzione è asimmetrica.',
    action: 'Diversificare il mix di iniziative verso i pilastri sottorappresentati.',
    macro:  'EQUITY',
  },
  EQ:  {
    title:  'Equità distributiva bassa',
    impact: 'L\'attivazione è concentrata sui segmenti già ad alta partecipazione.',
    action: 'Programmi ad accesso allargato per i segmenti con bassa partecipazione storica.',
    macro:  'EQUITY',
  },
  CS:  {
    title:  'Confidence Score™ basso',
    impact: 'L\'affidabilità delle fonti dati è limitata — output direzionale, non certificativo.',
    action: 'Completare data intake e aumentare la copertura delle fonti strutturate.',
    macro:  'QUALITY',
  },
  BTI: {
    title:  'Budget non si converte in attivazione',
    impact: 'La quota di budget che genera attivazione profonda è inferiore al target.',
    action: 'Ridurre economic relief e riallocare verso iniziative con Impact Units verificabili.',
    macro:  'BTI',
  },
};

const STATUS_COLORS = ['#9E3B2F', '#D99A2B', 'rgba(6,3,43,0.40)'];

// ScoreDrivers — shows 3 business-language score drivers BEFORE any technical detail.
// Translates component codes into decisions executives can act on.
export function ScoreDrivers({ weakComponents, macroblockScores }: ScoreDriversProps) {
  const drivers = weakComponents.slice(0, 3).map((wc) => ({
    ...DRIVER_LIBRARY[wc.code] ?? {
      title:  wc.label,
      impact: 'Questo componente sta limitando il KORA Index™.',
      action: 'Analizzare le iniziative correlate e verificare la qualità delle evidenze.',
      macro:  '—',
    },
    code: wc.code,
  }));

  if (drivers.length === 0) return null;

  return (
    <div>
      {/* Section header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <p style={{
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:      '1.375rem',
          color:         TOKENS.ink,
          letterSpacing: '-0.01em',
          lineHeight:    1.2,
        }}>
          Cosa limita il punteggio
        </p>
        <p style={{
          fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:   '11px',
          color:      TOKENS.inkHint,
        }}>
          — {drivers.length} vincoli identificati
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {drivers.map((driver, i) => (
          <div
            key={driver.code}
            style={{
              background:   TOKENS.surface,
              border:       TOKENS.cardBorder,
              borderTop:    `3px solid ${STATUS_COLORS[i] ?? TOKENS.inkBorder}`,
              borderRadius: TOKENS.cardRadius,
              padding:      '20px 22px',
              display:      'flex',
              flexDirection: 'column',
              gap:          10,
              boxShadow:    TOKENS.cardShadow,
            }}
          >
            {/* Rank + macro label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width:      20,
                height:     20,
                borderRadius: '50%',
                background: STATUS_COLORS[i] ?? TOKENS.inkBorder,
                color:      '#FFF',
                fontSize:   '9px',
                fontWeight: 700,
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <p style={{
                fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontSize:      '9.5px',
                fontWeight:    600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color:         TOKENS.inkHint,
              }}>
                {driver.macro} · {driver.code}
              </p>
            </div>

            {/* Driver title */}
            <p style={{
              fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:  700,
              fontSize:    '14px',
              color:       TOKENS.ink,
              lineHeight:  1.25,
              letterSpacing: '-0.005em',
            }}>
              {driver.title}
            </p>

            {/* Impact — what is happening */}
            <p style={{
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:   '12px',
              color:      TOKENS.inkSecondary,
              lineHeight: 1.55,
              flex:       1,
            }}>
              {driver.impact}
            </p>

            {/* Action — what to do */}
            <div style={{
              paddingTop:  10,
              borderTop:   TOKENS.cardBorder,
              display:     'flex',
              alignItems:  'flex-start',
              gap:         8,
            }}>
              <span style={{ color: TOKENS.accent, fontSize: '12px', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
              <p style={{
                fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontSize:   '11.5px',
                color:      TOKENS.accent,
                lineHeight: 1.45,
                fontWeight: 500,
              }}>
                {driver.action}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
