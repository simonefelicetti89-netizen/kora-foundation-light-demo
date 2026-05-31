'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DecisionPackCTAStripProps {
  hasKoraData?: boolean;
  decisionPackStatus?: string;
  versionCount?: number;
  className?: string;
}

export function DecisionPackCTAStrip({
  decisionPackStatus,
  versionCount,
  className,
}: DecisionPackCTAStripProps) {
  return (
    <div
      className={cn('rounded-2xl overflow-hidden', className)}
      style={{ background: 'linear-gradient(155deg, #06032B 0%, #0D0A3B 55%, #06032B 100%)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-7 py-7">

        {/* Left: claim */}
        <div className="space-y-2 flex-1 min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/30">
            KORA Decision Output
          </p>
          <p
            className="font-kora-editorial font-bold text-white leading-tight"
            style={{ fontSize: 'clamp(1.05rem, 2.2vw, 1.35rem)', letterSpacing: '-0.015em' }}
          >
            KORA misura ciò che accade dopo la spesa.
          </p>
          <p className="text-xs text-white/40 leading-relaxed max-w-sm">
            Da attivazione organizzativa verificata a output direzionale board-ready.
          </p>
        </div>

        {/* Right: CTAs */}
        <div className="flex flex-col items-start sm:items-end gap-2.5 shrink-0">
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/company/reports"
              className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-kora-cosmic-blue hover:bg-kora-gray-base transition-colors whitespace-nowrap"
            >
              Apri Decision Pack →
            </Link>
            <Link
              href="/company/reports/board-pack"
              className="rounded-xl border border-white/20 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/8 transition-colors whitespace-nowrap"
            >
              Board Pack Preview
            </Link>
          </div>
          {decisionPackStatus && (
            <div className="flex items-center gap-2 text-[9px] font-mono text-white/25">
              {versionCount != null && (
                <>
                  <span>{versionCount} {versionCount === 1 ? 'versione' : 'versioni'}</span>
                  <span>·</span>
                </>
              )}
              <span>{decisionPackStatus.replace(/_/g, ' ')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-7 py-2.5 border-t border-white/8">
        <p className="text-[9px] font-mono text-white/18">
          KORA Methodology v0.1 · pre_empirical_calibration · synthetic_demo_data: true
        </p>
      </div>
    </div>
  );
}
