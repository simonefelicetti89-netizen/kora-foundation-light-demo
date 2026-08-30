'use client';
// CompanyTabNav — 8-tab navigation for company drill-in workspace.
// Terracotta underline on active tab, Hanken Grotesk font.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// B-TRUTH Gen 0/1 Retirement Wave 1 (2026-08-30): removed the Workforce,
// Data Intake, and Onboarding tabs — those pages were 100% synthetic
// (TenantService/tenants.json-rooted) demo dashboards with no unique
// capability beyond what real live surfaces already provide (real upload:
// /admin/data-intake; real worker provisioning: /admin/workers; real
// per-tenant status: the Workspace tab).
//
// CC-019A (2026-08-31): removed the Users tab — [companyId]/users was the
// same kind of 100% synthetic, read-only demo dashboard (TenantService +
// AccountProvisioningService), and app/admin/company-users-live already
// covers the same capability against real Supabase data (plus real
// invite/status mutation the legacy page never had). Not relinked here:
// company-users-live is keyed by tenantId (analytics.tenant.id, a UUID),
// while this component only has tenant_code (companyId) — bridging the two
// would require a new lookup, which is out of scope for a tab-nav cleanup.
const TABS = [
  { label: 'Workspace',   slug: 'workspace'   },
  { label: 'Preview',     slug: 'preview'     },
  { label: 'Submissions', slug: 'submissions' },
  { label: 'Evidence',    slug: 'evidence'    },
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
