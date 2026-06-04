'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, CartesianGrid,
} from 'recharts';
import { TOKENS, CHART_COLORS } from '@/lib/design/kora-design-tokens';
import { KORA_INDEX_COMPONENTS, COMPONENT_LABELS } from '@/lib/constants/kora';
import type { KoraIndexComponent } from '@/lib/types';

interface ComponentBreakdownChartProps {
  components?: KoraIndexComponent[];
  weakCodes?: string[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { name: string; fullLabel: string; value: number; weak: boolean } }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background:   CHART_COLORS.tooltipBg,
      border:       `1px solid ${CHART_COLORS.tooltipBorder}`,
      borderRadius: 10,
      padding:      '10px 14px',
      boxShadow:    '0 12px 32px rgba(6,3,43,0.22)',
      minWidth:     160,
    }}>
      <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '10px', fontWeight: 600, color: TOKENS.accent, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
        {d.name}
      </p>
      <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '18px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {d.value}%
      </p>
      <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '10px', color: 'rgba(255,255,255,0.55)', marginTop: 4, lineHeight: 1.4 }}>
        {d.fullLabel}
      </p>
      {d.weak && (
        <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '9px', color: TOKENS.accent, marginTop: 4, fontWeight: 600 }}>
          ↑ Area di miglioramento
        </p>
      )}
    </div>
  );
}

export function ComponentBreakdownChart({ components, weakCodes = [] }: ComponentBreakdownChartProps) {
  const chartData = KORA_INDEX_COMPONENTS.map((code) => {
    const comp = components?.find((c) => c.code === code);
    return {
      name:      code,
      fullLabel: COMPONENT_LABELS[code],
      value:     Math.round((comp?.value ?? 0) * 100),
      weak:      weakCodes.includes(code),
    };
  });

  return (
    <div
      style={{
        padding:      '1.5rem',
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
        boxShadow:    TOKENS.cardShadow,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '1.05rem', color: TOKENS.ink, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
            10-Component Breakdown
          </p>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 3 }}>
            Punteggi percentuali per componente analitico
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '10px', color: TOKENS.inkSecondary, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(6,3,43,0.65)', display: 'inline-block' }} />
            Componente
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '10px', color: TOKENS.inkSecondary, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: CHART_COLORS.primary, display: 'inline-block' }} />
            Area priorità
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 36 }}
          barCategoryGap="30%"
        >
          <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: CHART_COLORS.axis, fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={32}
            tick={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', fill: CHART_COLORS.axis }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={50} stroke={TOKENS.inkBorderStrong} strokeDasharray="4 3" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: TOKENS.accentHover }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.weak ? CHART_COLORS.primary : 'rgba(6,3,43,0.62)'}
                fillOpacity={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
