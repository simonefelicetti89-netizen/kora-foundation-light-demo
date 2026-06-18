'use client';
// CompanyTabNav — 8-tab navigation for company drill-in workspace.
// Terracotta underline on active tab, Hanken Grotesk font.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Workspace',   slug: 'workspace'   },
  { label: 'Preview',     slug: 'preview'     },
  { label: 'Submissions', slug: 'submissions' },
  { label: 'Evidence',    slug: 'evidence'    },
  { label: 'Users',       slug: 'users'       },
  { label: 'Workforce',   slug: 'workforce'   },
  { label: 'Data Intake', slug: 'data-intake' },
  { label: 'Onboarding',  slug: 'onboarding'  },
] as const;

interface Props {
  companyId:   string;
  companyName: string;
}

export function CompanyTabNav({ companyId, companyName }: Props) {
  const pathname = usePathname();

  return (
    <div className="border-b border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]">
      {/* Company identity strip */}
      <div className="flex items-center gap-3 px-6 pt-4 pb-2">
        <Link
          href="/admin/companies"
          className="text-[11px] font-medium text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] transition-colors"
        >
          ← Tutte le aziende
        </Link>
        <span className="text-[rgba(6,3,43,0.20)]">/</span>
        <span className="text-[11px] font-semibold text-[rgba(6,3,43,0.78)]"
          style={{ fontFamily: 'var(--font-hanken, sans-serif)' }}>
          {companyName}
        </span>
        <span className="font-mono text-[10px] text-[rgba(6,3,43,0.35)] ml-1">{companyId}</span>
      </div>

      {/* Tab row */}
      <div className="flex overflow-x-auto gap-0 px-6" style={{ fontFamily: 'var(--font-hanken, sans-serif)' }}>
        {TABS.map(({ label, slug }) => {
          const href    = `/admin/companies/${companyId}/${slug}`;
          const isActive = pathname === href || pathname.startsWith(href + '/');

          return (
            <Link
              key={slug}
              href={href}
              className="relative shrink-0 px-4 py-2.5 text-[12px] font-medium transition-colors"
              style={{
                color: isActive ? '#06032B' : 'rgba(6,3,43,0.48)',
              }}
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
