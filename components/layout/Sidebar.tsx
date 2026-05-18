'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/lib/demo-state';
import { isEmployerRole, isWorkerRole, isAdminRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  comingSoon?: boolean;
  inactive?: boolean;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const DEMO_GROUP: NavGroup = {
  heading: 'Demo',
  items: [{ href: '/demo-guide', label: 'Demo Guide' }],
};

function buildNavGroups(role: string): NavGroup[] {
  if (isAdminRole(role as Parameters<typeof isAdminRole>[0])) {
    return [
      DEMO_GROUP,
      {
        heading: 'KORA Console',
        items: [
          { href: '/admin',                label: 'Operating Console' },
          { href: '/admin/portfolio',      label: 'Company Portfolio' },
          { href: '/admin/index-registry', label: 'Index Registry' },
          { href: '/admin/benchmarks',     label: 'Benchmarks' },
          { href: '/admin/network',        label: 'Advisor & Partners' },
          { href: '/admin/gtm',            label: 'GTM Pipeline' },
          { href: '/admin/ai-onboarding',  label: 'AI Onboarding' },
        ],
      },
      {
        heading: 'Company Intelligence',
        items: [
          { href: '/company',              label: 'Executive Cockpit' },
          { href: '/company/kora-index',   label: 'KORA Index' },
          { href: '/company/activation',   label: 'Activation' },
          { href: '/company/contribution', label: 'KORA Contribution' },
          { href: '/company/pillars',      label: 'Pillars & Initiatives' },
        ],
      },
      {
        heading: 'Internal Tools',
        items: [
          { href: '/company/ingestion',  label: 'AI Upload Studio' },
          { href: '/company/uef-review', label: 'UEF Review' },
          { href: '/company/scoring',    label: 'Scoring Run' },
          { href: '/company/reports',    label: 'Reports' },
          { href: '/company/data',       label: 'Data & Evidence' },
          { href: '/company/financial',  label: 'Financial Governance' },
        ],
      },
      {
        heading: 'Other',
        items: [{ href: '/future-vision', label: 'Future Vision', inactive: true }],
      },
    ];
  }

  if (isEmployerRole(role as Parameters<typeof isEmployerRole>[0])) {
    const groups: NavGroup[] = [
      DEMO_GROUP,
      {
        heading: 'Company Intelligence',
        items: [
          { href: '/company',              label: 'Executive Cockpit' },
          { href: '/company/kora-index',   label: 'KORA Index' },
          { href: '/company/activation',   label: 'Activation' },
          { href: '/company/contribution', label: 'KORA Contribution' },
          { href: '/company/pillars',      label: 'Pillars & Initiatives' },
        ],
      },
      {
        heading: 'Data & Governance',
        items: [
          { href: '/company/data',      label: 'Data & Evidence' },
          { href: '/company/financial', label: 'Financial Governance' },
        ],
      },
    ];

    if (role === 'COMPANY_ADMIN' || role === 'COMPANY_HR') {
      groups.push({
        heading: 'Internal Tools',
        items: [
          { href: '/company/ingestion',  label: 'AI Upload Studio', comingSoon: true },
          { href: '/company/uef-review', label: 'UEF Review',       comingSoon: true },
          { href: '/company/scoring',    label: 'Scoring Run',      comingSoon: true },
          { href: '/company/reports',    label: 'Reports',          comingSoon: true },
        ],
      });
    }

    groups.push({
      heading: 'Other',
      items: [{ href: '/future-vision', label: 'Future Vision', inactive: true }],
    });

    return groups;
  }

  if (isWorkerRole(role as Parameters<typeof isWorkerRole>[0])) {
    return [
      DEMO_GROUP,
      {
        heading: 'My KORA',
        items: [
          { href: '/my-kora',               label: 'My KORA Home' },
          { href: '/my-kora/privacy',       label: 'Privacy & Sharing' },
          { href: '/my-kora/dynamic-cv',    label: 'Dynamic Impact CV' },
          { href: '/my-kora/opportunities', label: 'Opportunities',    comingSoon: true },
          { href: '/my-kora/bookings',      label: 'Bookings',         comingSoon: true },
          { href: '/my-kora/collective',    label: 'Collective Impact', comingSoon: true },
        ],
      },
      {
        heading: 'Other',
        items: [{ href: '/future-vision', label: 'Future Vision', inactive: true }],
      },
    ];
  }

  if (role === 'PARTNER_ADMIN_LIGHT') {
    return [
      DEMO_GROUP,
      {
        heading: 'Partner',
        items: [{ href: '/partner', label: 'Partner Workspace' }],
      },
      {
        heading: 'Other',
        items: [{ href: '/future-vision', label: 'Future Vision', inactive: true }],
      },
    ];
  }

  if (role === 'ADVISOR_EXTERNAL_LIGHT') {
    return [
      DEMO_GROUP,
      {
        heading: 'Advisor',
        items: [{ href: '/advisor', label: 'Advisor Workspace' }],
      },
      {
        heading: 'Other',
        items: [{ href: '/future-vision', label: 'Future Vision', inactive: true }],
      },
    ];
  }

  return [
    DEMO_GROUP,
    {
      heading: 'Other',
      items: [{ href: '/future-vision', label: 'Future Vision', inactive: true }],
    },
  ];
}

export function Sidebar() {
  const { activeRole } = useRole();
  const pathname = usePathname();
  const groups = buildNavGroups(activeRole);

  return (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-slate-50">
      <nav className="flex-1 overflow-y-auto py-3">
        {groups.map((group) => (
          <div key={group.heading} className="mb-4">
            <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
              {group.heading}
            </p>
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between rounded-md mx-2 px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-white border border-slate-200 text-slate-900 font-medium shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900',
                    (item.comingSoon || item.inactive) && 'opacity-60',
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  {item.comingSoon && (
                    <span className="ml-1 shrink-0 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-medium text-slate-400">
                      soon
                    </span>
                  )}
                  {item.inactive && (
                    <span className="ml-1 shrink-0 rounded border border-orange-200 bg-orange-50 px-1 py-0.5 text-[10px] font-medium text-orange-400">
                      inactive
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-400">
        Role: {activeRole}
      </div>
    </aside>
  );
}
