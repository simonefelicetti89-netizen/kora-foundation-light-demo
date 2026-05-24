'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { PILLAR_CODES, PILLAR_LABELS } from '@/lib/constants/kora';
import { PILLAR_COLORS as KORA_PILLAR_COLORS } from '@/lib/design/kora-design-tokens';
import type { PillarCode } from '@/lib/types';

const PILLAR_COLORS: Record<string, string> = {
  LIFE:       KORA_PILLAR_COLORS.LIFE,
  GROWTH:     KORA_PILLAR_COLORS.GROWTH,
  CONNECTION: KORA_PILLAR_COLORS.CONNECTION,
  IMPACT:     KORA_PILLAR_COLORS.IMPACT,
  LEGACY:     KORA_PILLAR_COLORS.LEGACY,
};

interface PillarChartProps {
  data?: Partial<Record<PillarCode, number>>;
  className?: string;
}

export function PillarChart({ data, className }: PillarChartProps) {
  const chartData = PILLAR_CODES.map((code) => ({
    name: PILLAR_LABELS[code],
    code,
    value: Math.round((data?.[code] ?? 0) * 100),
  }));

  return (
    <div className={cn('rounded-md border border-slate-100 bg-white p-4', className)}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Pillar Distribution — Share of Impact Units
      </p>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 32, bottom: 0, left: 64 }}
        >
          <XAxis
            type="number"
            domain={[0, 60]}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={60}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, 'Share of IU']}
            contentStyle={{ fontSize: 11, borderRadius: '6px', border: '1px solid #e2e8f0' }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {chartData.map((entry) => (
              <Cell key={entry.code} fill={PILLAR_COLORS[entry.code] ?? '#6366f1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
