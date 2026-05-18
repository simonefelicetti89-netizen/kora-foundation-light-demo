'use client';

import { cn } from '@/lib/utils';
import type { ExplainabilityAction } from '@/services/explainability/ExplainabilityService';

interface NextActionCardProps {
  action: ExplainabilityAction;
  className?: string;
}

const PRIORITY_STYLES: Record<number, { dot: string; badge: string }> = {
  1: { dot: 'bg-indigo-600', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  2: { dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  3: { dot: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export function NextActionCard({ action, className }: NextActionCardProps) {
  const styles = PRIORITY_STYLES[action.priority] ?? PRIORITY_STYLES[3];

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-3 space-y-1.5',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'mt-0.5 shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white',
            styles.dot,
          )}
        >
          {action.priority}
        </span>
        <p className="text-sm font-semibold text-slate-800 leading-tight">{action.action}</p>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed pl-7 line-clamp-3">
        {action.detail}
      </p>
      {action.target_components.length > 0 && (
        <div className="flex gap-1 flex-wrap pl-7 pt-0.5">
          {action.target_components.map((code) => (
            <span
              key={code}
              className={cn(
                'rounded border px-1.5 py-0.5 text-xs font-mono',
                styles.badge,
              )}
            >
              {code}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
