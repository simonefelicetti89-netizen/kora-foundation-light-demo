'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import { KORA_INDEX_COMPONENTS, COMPONENT_LABELS } from '@/lib/constants/kora';
import type { KoraIndexComponent } from '@/lib/types';

interface ComponentBreakdownChartProps {
  components?: KoraIndexComponent[];
  weakCodes?: string[];
  className?: string;
}

export function ComponentBreakdownChart({
  components,
  weakCodes = [],
  className,
}: ComponentBreakdownChartProps) {
  const chartData = KORA_INDEX_COMPONENTS.map((code) => {
    const comp = components?.find((c) => c.code === code);
    return {
      name: code,
      fullLabel: COMPONENT_LABELS[code],
      value: Math.round((comp?.value ?? 0) * 100),
      weak: weakCodes.includes(code),
    };
  });

  return (
    <div className={cn('rounded-md border border-slate-100 bg-white p-4', className)}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        10-Component Breakdown
      </p>
      <p className="mb-3 text-xs text-slate-400">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-indigo-400 mr-1" />
        Strong &nbsp;
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-400 mr-1" />
        Needs improvement
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
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={28}
            tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={50} stroke="#e2e8f0" strokeDasharray="3 3" />
          <Tooltip
            formatter={(value, _name, props) => [
              `${value}%`,
              props.payload?.fullLabel ?? '',
            ]}
            contentStyle={{ fontSize: 11, borderRadius: '6px', border: '1px solid #e2e8f0' }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.weak ? '#f97316' : '#6366f1'}
                fillOpacity={entry.weak ? 0.75 : 0.65}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
