'use client';

import { useEnvironment } from '@/lib/demo-state';
import type { Environment } from '@/lib/types';
import { cn } from '@/lib/utils';

const ENVS: Environment[] = ['demo', 'live', 'future'];

const ENV_CONFIG: Record<Environment, { label: string; title: string }> = {
  demo:   { label: 'DEMO',   title: 'Dati simulati · demo commerciale' },
  live:   { label: 'LIVE',   title: 'Service-assisted · operata da KORA' },
  future: { label: 'FUTURE', title: 'Roadmap · non attivo' },
};

export function EnvironmentSwitcher() {
  const { activeEnvironment, setEnvironment } = useEnvironment();

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 select-none whitespace-nowrap">
        Ambiente
      </span>
      <div className="flex rounded-md border border-[var(--env-border)] overflow-hidden shadow-sm">
        {ENVS.map((env, i) => {
          const isActive = activeEnvironment === env;
          const { label, title } = ENV_CONFIG[env];
          return (
            <button
              key={env}
              onClick={() => setEnvironment(env)}
              title={title}
              aria-pressed={isActive}
              className={cn(
                'px-3 py-1.5 text-[11px] font-bold tracking-wide transition-colors whitespace-nowrap',
                i > 0 && 'border-l border-[var(--env-border)]',
                isActive
                  ? 'text-white'
                  : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600',
              )}
              style={isActive ? { backgroundColor: 'var(--env-accent)' } : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
