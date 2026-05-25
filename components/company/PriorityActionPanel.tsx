'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Warning {
  title: string;
  message: string;
  severity: string;
  affected_components: string[];
}

interface Action {
  priority: number;
  action: string;
  detail: string;
  target_components: string[];
}

interface PriorityActionPanelProps {
  warning?: Warning | null;
  action?: Action | null;
  extraWarningsCount?: number;
  extraActionsCount?: number;
  isViewer?: boolean;
  className?: string;
}

export function PriorityActionPanel({
  warning,
  action,
  extraWarningsCount = 0,
  extraActionsCount = 0,
  isViewer = false,
  className,
}: PriorityActionPanelProps) {
  if (!warning && !action) return null;

  const severityBar = warning
    ? (warning.severity === 'critical' ? 'bg-red-500' :
       warning.severity === 'high'     ? 'bg-orange-400' : 'bg-amber-400')
    : '';

  return (
    <div className={cn(
      'rounded-2xl border border-kora-violet/20 overflow-hidden',
      className,
    )} style={{ background: 'linear-gradient(135deg, #FAF9FF 0%, #F4F2FF 100%)' }}>

      {/* Header */}
      <div className="px-7 pt-6 pb-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kora-violet">
          Prossima Azione Consigliata
        </p>
      </div>

      <div className="px-7 pt-5 pb-6 space-y-5">

        {/* Warning */}
        {warning && (
          <div className="flex items-start gap-4">
            <div className={cn('w-0.5 shrink-0 self-stretch rounded-full mt-0.5', severityBar)} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-kora-cosmic-blue leading-snug">
                {warning.title}
              </p>
              <p className="text-xs text-kora-cosmic-blue/60 mt-1 leading-relaxed line-clamp-2">
                {warning.message}
              </p>
              {warning.affected_components.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {warning.affected_components.map((code) => (
                    <span
                      key={code}
                      className="rounded border border-kora-cosmic-blue/15 bg-white px-1.5 py-0.5 text-[10px] font-mono text-kora-cosmic-blue/60"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action */}
        {action && (
          <div className={cn(
            'flex items-start gap-4',
            warning && 'pt-4 border-t border-kora-violet/10',
          )}>
            <div className="shrink-0 h-7 w-7 rounded-full bg-kora-violet flex items-center justify-center text-xs font-bold text-white mt-0.5">
              {action.priority}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-kora-cosmic-blue leading-snug">
                {action.action}
              </p>
              <p className="text-xs text-kora-cosmic-blue/60 mt-1 leading-relaxed line-clamp-2">
                {action.detail}
              </p>
              {action.target_components.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {action.target_components.map((code) => (
                    <span
                      key={code}
                      className="rounded border border-kora-violet/20 bg-white px-1.5 py-0.5 text-[10px] font-mono text-kora-violet"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA row */}
        <div className={cn(
          'flex flex-wrap items-center gap-3 pt-4 border-t border-kora-violet/10',
        )}>
          {!isViewer && (
            <>
              <Link
                href="/company/reports"
                className="rounded-xl bg-kora-violet px-5 py-2 text-xs font-bold text-white hover:bg-violet-700 transition-colors"
              >
                Decision Pack →
              </Link>
              <Link
                href="/company/kora-index"
                className="rounded-xl border border-kora-violet/30 px-5 py-2 text-xs font-semibold text-kora-violet hover:bg-kora-violet/5 transition-colors"
              >
                KORA Index →
              </Link>
            </>
          )}
          <Link
            href="/company/shared"
            className="rounded-xl border border-kora-cosmic-blue/15 px-5 py-2 text-xs font-semibold text-kora-cosmic-blue/70 hover:bg-kora-cosmic-blue/5 transition-colors"
          >
            Shared View →
          </Link>

          {(extraWarningsCount > 0 || extraActionsCount > 0) && (
            <p className="text-[10px] text-kora-cosmic-blue/35 ml-auto">
              {extraWarningsCount > 0 && `+${extraWarningsCount} segnali `}
              {extraActionsCount > 0 && `+${extraActionsCount} azioni `}
              in{' '}
              <Link href="/company/kora-index" className="underline hover:text-kora-cosmic-blue/60">
                KORA Index
              </Link>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
