'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { TOKENS, CHART_COLORS } from '@/lib/design/kora-design-tokens';
import { KORA_INDEX_COMPONENTS, COMPONENT_LABELS } from '@/lib/constants/kora';
import type { KoraIndexComponent } from '@/lib/types';

interface ComponentBreakdownChartProps {
  components?: KoraIndexComponent[];
  weakCodes?: string[];
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
        padding:      '1.25rem',
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
        boxShadow:    TOKENS.cardShadow,
      }}
    >
      <p
        className="mb-1 text-[10px] font-semibold uppercase tracking-wide"
        style={{
          fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          color:      TOKENS.inkHint,
        }}
      >
        10-Component Breakdown
      </p>
      <div className="flex items-center gap-4 mb-3">
        <span className="flex items-center gap-1.5 text-[10px]" style={{ color: TOKENS.inkHint, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: TOKENS.ink }} />
          Componente
        </span>
        <span className="flex items-center gap-1.5 text-[10px]" style={{ color: TOKENS.inkHint, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS.primary }} />
          Area di miglioramento
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 32, bottom: 0, left: 32 }}
        >
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
            width={28}
            tick={{ fontSize: 11, fontFamily: 'monospace', fill: CHART_COLORS.axis }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={50} stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <Tooltip
            formatter={(value, _name, props) => [`${value}%`, props.payload?.fullLabel ?? '']}
            contentStyle={{
              fontSize:     11,
              fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
              borderRadius: '10px',
              border:       `1px solid ${CHART_COLORS.tooltipBorder}`,
              background:   CHART_COLORS.tooltipBg,
              color:        CHART_COLORS.tooltipText,
              boxShadow:    '0 12px 32px rgba(6,3,43,0.18)',
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.65)', fontSize: 10 }}
            cursor={{ fill: TOKENS.accentHover }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.weak ? CHART_COLORS.primary : TOKENS.ink}
                fillOpacity={entry.weak ? 0.85 : 0.60}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
