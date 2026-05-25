'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { KoraLogo } from '@/components/brand/KoraLogo';

interface ExecutiveCockpitHeroProps {
  companyName: string;
  period: string;
  tenantStatus?: string;
  isViewer: boolean;
  hasKoraData?: boolean;
  className?: string;
}

export function ExecutiveCockpitHero({
  companyName,
  period,
  tenantStatus,
  isViewer,
  hasKoraData = true,
  className,
}: ExecutiveCockpitHeroProps) {
  return (
    <div
      className={cn('rounded-2xl overflow-hidden relative', className)}
      style={{ background: 'linear-gradient(155deg, #06032B 0%, #0D0A3B 55%, #080620 100%)' }}
    >
      {/* Decorative brandmark watermark */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-[320px] w-[320px] opacity-[0.04]"
        aria-hidden="true"
      >
        <svg viewBox="0 0 424 418" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M148.768 117.887C189.054 101.199 234.334 101.199 274.606 117.887C287.456 123.227 297.663 133.434 302.989 146.27C319.677 186.556 319.677 231.836 302.989 272.108C297.649 284.958 287.442 295.165 274.606 300.491C234.32 317.179 189.04 317.179 148.768 300.491C135.918 295.151 125.711 284.944 120.385 272.108C103.697 231.822 103.697 186.542 120.385 146.27C125.725 133.42 135.932 123.213 148.768 117.887ZM211.498 124.924C190.444 124.924 171.74 138.302 159.961 158.98C139.268 170.759 125.904 189.463 125.904 210.518C125.904 231.572 139.282 250.276 159.961 262.055C171.74 282.747 190.444 296.111 211.498 296.111C232.552 296.111 251.257 282.733 263.035 262.055C283.728 250.276 297.092 231.572 297.092 210.518C297.092 189.463 283.714 170.759 263.035 158.98C251.257 138.288 232.552 124.924 211.498 124.924Z"
            fill="white"
          />
        </svg>
      </div>

      <div className="relative px-8 py-9">

        {/* Row 1: Logo + status badge */}
        <div className="flex items-start justify-between gap-4">
          <KoraLogo variant="on-dark" className="h-7 w-auto" />
          <div className="flex items-center gap-2 shrink-0">
            {tenantStatus === 'active' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-kora-fun-green/25 bg-kora-fun-green/5 px-3 py-1 text-[11px] font-semibold text-kora-fun-green">
                <span className="h-1.5 w-1.5 rounded-full bg-kora-fun-green" />
                Tenant attivo
              </span>
            )}
            {!hasKoraData && (
              <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-300">
                KORA Index non disponibile
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Company name */}
        <div className="mt-8">
          <h1
            className="font-kora-editorial font-bold text-white leading-none"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', letterSpacing: '-0.025em' }}
          >
            {companyName}
          </h1>
          <p className="mt-2 text-base text-white/45 font-kora-editorial tracking-wide">
            Executive Cockpit · Cabina di Regia
          </p>
        </div>

        {/* Row 3: Meta strip */}
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-xs font-mono text-white/30">{period}</span>
          <span className="h-3 w-px bg-white/10" aria-hidden="true" />
          <span className="text-xs text-white/25">Foundation Light</span>
          <span className="h-3 w-px bg-white/10" aria-hidden="true" />
          <span className="text-[10px] font-mono text-white/20">pre_empirical_calibration</span>
          <span className="h-3 w-px bg-white/10" aria-hidden="true" />
          <span className="text-[10px] font-mono text-white/15">synthetic_demo_data: true</span>
        </div>

        {/* Row 4: CTAs */}
        <div className="mt-8 flex flex-wrap gap-3">
          {isViewer ? (
            <>
              <Link
                href="/company/shared"
                className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-kora-cosmic-blue hover:bg-kora-gray-base transition-colors"
              >
                KORA Shared View →
              </Link>
              <Link
                href="/company/kora-index"
                className="rounded-xl border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                KORA Index →
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/company/reports"
                className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-kora-cosmic-blue hover:bg-kora-gray-base transition-colors"
              >
                Decision Pack →
              </Link>
              <Link
                href="/company/shared"
                className="rounded-xl border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
              >
                Shared View →
              </Link>
              <Link
                href="/company/kora-index"
                className="rounded-xl border border-white/8 px-6 py-2.5 text-sm font-semibold text-white/40 hover:text-white/70 hover:border-white/15 transition-colors"
              >
                KORA Index →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
