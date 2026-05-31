'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { TOKENS } from '@/lib/design/kora-design-tokens';
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
      className="p-4"
      style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius }}
    >
      <p
        className="mb-1 text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: TOKENS.inkHint }}
      >
        10-Component Breakdown
      </p>
      <p className="mb-3 text-[10px]" style={{ color: TOKENS.inkHint }}>
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm mr-1"
          style={{ background: TOKENS.ink }}
        />
        Componente&nbsp;
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm mr-1 ml-2"
          style={{ background: TOKENS.accent }}
        />
        Area di miglioramento
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 32, bottom: 0, left: 32 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'rgba(20,18,46,0.40)' }}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={28}
            tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'rgba(20,18,46,0.55)' }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={50} stroke="rgba(20,18,46,0.08)" strokeDasharray="3 3" />
          <Tooltip
            formatter={(value, _name, props) => [`${value}%`, props.payload?.fullLabel ?? '']}
            contentStyle={{
              fontSize: 11,
              borderRadius: '8px',
              border: '1px solid rgba(20,18,46,0.08)',
              background: '#FFFFFF',
              color: '#14122E',
            }}
            cursor={{ fill: 'rgba(20,18,46,0.04)' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.weak ? TOKENS.accent : TOKENS.ink}
                fillOpacity={entry.weak ? 0.80 : 0.65}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
