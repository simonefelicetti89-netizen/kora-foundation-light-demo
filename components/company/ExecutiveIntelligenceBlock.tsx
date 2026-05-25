'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Fact {
  label: string;
  value: string;
  highlight?: 'positive' | 'negative' | 'neutral' | 'debt';
}

interface ExecutiveIntelligenceBlockProps {
  title: string;
  mainValue: string;
  mainLabel: string;
  mainCaption: string;
  facts: Fact[];
  interpretation: string;
  link?: { href: string; label: string };
  surface?: 'light' | 'dark' | 'accent';
  className?: string;
}

const HIGHLIGHT_CLASS: Record<string, string> = {
  positive: 'text-kora-fun-green',
  negative: 'text-rose-600',
  neutral:  'text-white/80',
  debt:     'text-rose-400',
};

const HIGHLIGHT_CLASS_LIGHT: Record<string, string> = {
  positive: 'text-emerald-700',
  negative: 'text-rose-700',
  neutral:  'text-kora-cosmic-blue',
  debt:     'text-rose-700',
};

export function ExecutiveIntelligenceBlock({
  title,
  mainValue,
  mainLabel,
  mainCaption,
  facts,
  interpretation,
  link,
  surface = 'light',
  className,
}: ExecutiveIntelligenceBlockProps) {
  const isDark = surface === 'dark';

  return (
    <div
      className={cn(
        'rounded-2xl flex flex-col gap-5 p-6',
        surface === 'light'  && 'border border-kora-cosmic-blue/8',
        surface === 'accent' && 'border border-kora-violet/15',
        className,
      )}
      style={
        surface === 'light'  ? { background: '#F0F1F8' } :
        surface === 'accent' ? { background: '#FFFFFF' } :
        { background: 'linear-gradient(145deg, #06032B 0%, #0D0A3B 100%)' }
      }
    >

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <p className={cn(
          'text-[10px] font-semibold uppercase tracking-[0.2em]',
          isDark ? 'text-white/35' : surface === 'accent' ? 'text-kora-violet/70' : 'text-kora-cosmic-blue/45',
        )}>
          {title}
        </p>
        {link && (
          <Link
            href={link.href}
            className={cn(
              'text-[10px] font-semibold hover:underline shrink-0',
              isDark ? 'text-kora-violet' : 'text-kora-violet',
            )}
          >
            {link.label} →
          </Link>
        )}
      </div>

      {/* Main metric */}
      <div>
        <p className={cn(
          'text-[10px]',
          isDark ? 'text-white/35' : 'text-kora-cosmic-blue/45',
        )}>
          {mainLabel}
        </p>
        <p
          className={cn('font-kora-editorial font-black leading-none mt-1.5 tabular-nums', isDark ? 'text-white' : 'text-kora-cosmic-blue')}
          style={{ fontSize: 'clamp(3rem, 6vw, 4rem)', letterSpacing: '-0.03em' }}
        >
          {mainValue}
        </p>
        <p className={cn('text-xs mt-1.5', isDark ? 'text-white/35' : 'text-kora-cosmic-blue/45')}>
          {mainCaption}
        </p>
      </div>

      {/* Support facts */}
      <div className={cn(
        'space-y-2.5 pt-4 border-t flex-1',
        isDark ? 'border-white/10' : surface === 'accent' ? 'border-kora-violet/10' : 'border-kora-cosmic-blue/10',
      )}>
        {facts.map(({ label, value, highlight = 'neutral' }) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <p className={cn('text-xs', isDark ? 'text-white/40' : 'text-kora-cosmic-blue/50')}>
              {label}
            </p>
            <p className={cn(
              'text-sm font-bold tabular-nums shrink-0',
              isDark
                ? (HIGHLIGHT_CLASS[highlight] ?? 'text-white/80')
                : (HIGHLIGHT_CLASS_LIGHT[highlight] ?? 'text-kora-cosmic-blue'),
            )}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Interpretation */}
      <p className={cn(
        'text-[10px] leading-snug pt-3 border-t',
        isDark ? 'text-white/25 border-white/10' : surface === 'accent' ? 'text-kora-cosmic-blue/40 border-kora-violet/10' : 'text-kora-cosmic-blue/40 border-kora-cosmic-blue/10',
      )}>
        {interpretation}
      </p>

    </div>
  );
}
