'use client';
// DiagnosticsTabNav — 3-tab navigation for consolidated diagnostics workspace.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Live Spine',    slug: 'live-spine'    },
  { label: 'Worker',        slug: 'worker'        },
  { label: 'Provisioning',  slug: 'provisioning'  },
] as const;

const BASE = '/admin/platform/diagnostics';

export function DiagnosticsTabNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]">
      <div className="flex items-center gap-2 px-6 pt-3 pb-1">
        <span className="text-[11px] font-semibold text-[rgba(6,3,43,0.60)]"
          style={{ fontFamily: 'var(--font-hanken, sans-serif)' }}>
          Diagnostics
        </span>
        <span className="text-[10px] font-mono text-[rgba(6,3,43,0.30)] bg-[rgba(6,3,43,0.05)] px-1.5 py-0.5 rounded">
          LIVE
        </span>
      </div>

      <div className="flex overflow-x-auto gap-0 px-6" style={{ fontFamily: 'var(--font-hanken, sans-serif)' }}>
        {TABS.map(({ label, slug }) => {
          const href     = `${BASE}/${slug}`;
          const isActive = pathname === href || pathname.startsWith(href + '/');

          return (
            <Link
              key={slug}
              href={href}
              className="relative shrink-0 px-4 py-2.5 text-[12px] font-medium transition-colors"
              style={{ color: isActive ? '#06032B' : 'rgba(6,3,43,0.48)' }}
            >
              {label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                  style={{ background: '#C76F3D' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
