'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { KoraIndexOutput } from '@/lib/types';
import { formatKoraIndex, formatConfidenceScore } from '@/lib/formatters';
import { METHODOLOGY_VERSION, CALIBRATION_STATUS } from '@/lib/constants/kora';

interface MacroblockEntry {
  code: string;
  weight: number;
  score: number;
}

interface KoraIndexCommandCenterProps {
  output?: KoraIndexOutput;
  macroblocks?: MacroblockEntry[];
  className?: string;
}

const MACROBLOCK_LABEL: Record<string, string> = {
  REACH:   'Activation Reach',
  QUALITY: 'Activation Quality',
  EQUITY:  'Distribution & Equity',
  BTI:     'Budget-to-Human-Impact',
};

const MACROBLOCK_COLOR: Record<string, string> = {
  REACH:   '#6156F5',
  QUALITY: '#7B61F5',
  EQUITY:  '#9574EA',
  BTI:     '#C8FF47',
};

const SAFEGUARD_COLOR: Record<string, string> = {
  CLEAR:   '#C8FF47',
  WARNING: '#F59E0B',
  FLAGGED: '#EF4444',
};

const SAFEGUARD_INTERPRETATION: Record<string, string> = {
  CLEAR:   'Attivazione organizzativa sufficientemente ampia e significativa. KORA Index interpretabile con piena validità.',
  WARNING: 'Una o più soglie di attivazione non raggiunte. KORA Index disponibile — interpretare con cautela.',
  FLAGGED: 'Attivazione insufficiente (AR < 20% o MAR < 15%). KORA Index fortemente qualificato dai segnali di attivazione.',
};

// Non-suppressible per doc 21b: CS, SafeguardBadge, CalibrationBadge, methodology_version_id, calibration_status
export function KoraIndexCommandCenter({
  output,
  macroblocks = [],
  className,
}: KoraIndexCommandCenterProps) {
  const indexValue           = output?.kora_index_value ?? null;
  const confidenceScore      = output?.confidence_score ?? null;
  const safeguardStatus      = output?.safeguard_status ?? 'WARNING';
  const methodologyVersionId = output?.methodology_version_id ?? METHODOLOGY_VERSION;
  const calibrationStatus    = output?.calibration_status ?? CALIBRATION_STATUS;
  const interpretation       = SAFEGUARD_INTERPRETATION[safeguardStatus] ?? '';
  const safeguardColor       = SAFEGUARD_COLOR[safeguardStatus] ?? '#F59E0B';

  return (
    <div
      className={cn('rounded-2xl overflow-hidden', className)}
      style={{ background: 'linear-gradient(150deg, #06032B 0%, #0D0A3B 60%, #06032B 100%)' }}
    >

      {/* ── Top header bar ── */}
      <div className="flex items-center justify-between px-8 pt-7 pb-0 gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
          KORA Index v3
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold tracking-wide"
            style={{ borderColor: `${safeguardColor}40`, color: safeguardColor, background: `${safeguardColor}10` }}
          >
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: safeguardColor }} />
            {safeguardStatus}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-mono text-white/30">
            {calibrationStatus === 'pre_empirical_calibration' ? 'pre-empirical' : calibrationStatus}
          </span>
        </div>
      </div>

      {/* ── Main score / Confidence Score ── */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-6 px-8 pt-5 pb-8">

        {/* Score — dominant */}
        <div className="flex-1 min-w-0">
          <div className="flex items-end gap-3 leading-none">
            <span
              className="font-kora-editorial font-black text-white tabular-nums"
              style={{ fontSize: 'clamp(5.5rem, 12vw, 9rem)', letterSpacing: '-0.035em', lineHeight: 1 }}
            >
              {indexValue !== null ? formatKoraIndex(indexValue) : '—'}
            </span>
            <span className="text-xl text-white/20 font-light pb-3 shrink-0">/ 100</span>
          </div>
          <p className="mt-5 text-sm text-white/50 leading-relaxed max-w-sm font-kora-interface">
            {interpretation}
          </p>
        </div>

        {/* Confidence Score — external companion */}
        <div className="shrink-0 sm:pb-1 border-t sm:border-t-0 sm:border-l border-white/10 pt-5 sm:pt-0 sm:pl-8">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
            Confidence Score
          </p>
          <p className="text-[2.75rem] font-bold tabular-nums mt-1.5 leading-none" style={{ color: '#6156F5' }}>
            {confidenceScore !== null ? formatConfidenceScore(confidenceScore) : '—'}
          </p>
          <p className="text-[10px] text-white/25 mt-3 font-mono leading-relaxed">
            {methodologyVersionId}
          </p>
          <p className="text-[10px] text-white/20 mt-0.5 max-w-[180px] leading-snug">
            Indicatore esterno — non componente del KORA Index
          </p>
        </div>
      </div>

      {/* ── Macroblocchi ── */}
      {macroblocks.length > 0 && (
        <div className="border-t border-white/10 px-8 py-6">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/30 mb-5">
            4 Macroblocchi · Pesi pre-empirici v0.1
          </p>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
            {macroblocks.map((mb) => {
              const label = MACROBLOCK_LABEL[mb.code] ?? mb.code;
              const color = MACROBLOCK_COLOR[mb.code] ?? '#6156F5';
              return (
                <div key={mb.code}>
                  <div className="flex items-center justify-between mb-1.5 gap-3">
                    <p className="text-xs text-white/55 font-kora-interface">{label}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-white/25">
                        {(mb.weight * 100).toFixed(0)}%
                      </span>
                      <span className="text-sm font-bold text-white tabular-nums w-9 text-right">
                        {mb.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div
                      className="h-1 rounded-full"
                      style={{ width: `${Math.min(mb.score, 100)}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="border-t border-white/10 px-8 py-4 flex items-center justify-between gap-4">
        <p className="text-[10px] font-mono text-white/20 truncate">
          {methodologyVersionId} · Misura organizzazione · aggregati privacy-safe
        </p>
        <Link
          href="/company/kora-index"
          className="shrink-0 text-[10px] font-semibold text-kora-violet hover:text-violet-400 transition-colors"
        >
          Scomposizione completa (10 componenti) →
        </Link>
      </div>
    </div>
  );
}
