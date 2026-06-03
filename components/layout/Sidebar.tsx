'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole, useEnvironment } from '@/lib/demo-state';
import { isWorkerRole, isAdminRole } from '@/lib/permissions';
import { KoraLogo } from '@/components/brand/KoraLogo';
import { cn } from '@/lib/utils';

const ENV_LABEL: Record<string, string> = {
  demo:   'DEMO',
  live:   'LIVE',
  future: 'ROADMAP',
};

const ROLE_DISPLAY: Record<string, string> = {
  KORA_ADMIN:    'Operatore · KORA Admin',
  COMPANY_ADMIN: 'Company Admin',
  COMPANY_VIEWER:'Company Viewer',
  WORKER:        'Lavoratore',
  PARTNER:       'Partner',
  ADVISOR:       'Advisor',
};

interface NavItem {
  href: string;
  label: string;
  comingSoon?: boolean;
  inactive?: boolean;
  badge?: string;
  badgeStyle?: string;
}

interface NavGroup {
  heading: string;
  groupBadge?: string;
  groupBadgeStyle?: string;
  items: NavItem[];
}

function buildNavGroups(role: string): NavGroup[] {
  if (isAdminRole(role as Parameters<typeof isAdminRole>[0])) {
    // B36.1: 4 clear groups — Live Pilot Operations / Data Pipeline / Demo Lab / Strategy & Admin
    return [
      {
        heading: 'Live Pilot Operations',
        groupBadge: 'LIVE PILOT',
        groupBadgeStyle: 'bg-green-900/40 text-green-400 border border-green-800/50',
        items: [
          { href: '/admin/companies',              label: 'Company Console' },
          { href: '/admin/company-submissions',    label: 'Submission Queue' },
          { href: '/admin/tenants',                label: 'Onboarding Tenant' },
          { href: '/admin/company-workspace',      label: 'Workspace Azienda' },
          { href: '/admin/company-users',          label: 'Utenti Aziendali' },
          { href: '/admin/company-evidence-archive', label: 'Evidence Archive' },
          { href: '/admin/company-live-preview',   label: 'Live Preview' },
        ],
      },
      {
        heading: 'Data Pipeline',
        groupBadge: 'ADMIN ONLY',
        groupBadgeStyle: 'bg-blue-900/30 text-blue-400 border border-blue-800/40',
        items: [
          { href: '/admin/data-intake',    label: 'Data Intake' },
          { href: '/admin/uef-review',     label: 'UEF Review & Scoring' },
          { href: '/admin/data-lifecycle', label: 'Data Lifecycle' },
        ],
      },
      {
        heading: 'Demo Lab',
        groupBadge: 'SYNTHETIC DEMO',
        groupBadgeStyle: 'bg-amber-900/30 text-amber-400 border border-amber-800/40',
        items: [
          { href: '/admin/demo/acme-001', label: 'Guided Demo — ACME-001' },
          { href: '/company',             label: 'Meridiana Demo' },
          { href: '/admin/operator',      label: 'Synthetic Benchmark' },
          { href: '/demo-guide',          label: 'Demo Guide' },
        ],
      },
      {
        heading: 'Strategy & Admin',
        groupBadge: 'ADMIN',
        groupBadgeStyle: 'bg-slate-700/40 text-slate-400 border border-slate-600/40',
        items: [
          { href: '/admin',         label: 'Admin Console' },
          { href: '/admin/gtm',     label: 'GTM & Roadmap' },
          { href: '/future-vision', label: 'Future Vision', inactive: true },
        ],
      },
    ];
  }

  if (role === 'COMPANY_ADMIN') {
    // B36.1/B39: workspace-only sidebar — no demo routes, no future-vision, no admin tools.
    return [
      {
        heading: 'Workspace',
        items: [
          { href: '/company/workspace', label: 'Il Tuo Workspace KORA' },
        ],
      },
      {
        heading: 'Sezioni',
        items: [
          { href: '/company/workspace#kora-index',          label: 'KORA Index' },
          { href: '/company/workspace#evidence-archive',    label: 'Archivio Evidenze' },
          { href: '/company/workspace#data-submission',     label: 'Data Submission' },
          { href: '/company/workspace#decision-pack',       label: 'Decision Pack' },
          { href: '/company/workspace#reporting-readiness', label: 'Reporting Readiness' },
          { href: '/company/workspace#methodology',         label: 'Metodologia & Privacy' },
        ],
      },
    ];
  }

  if (role === 'COMPANY_VIEWER') {
    // B36.1/B39: viewer — read-only subset of workspace sections.
    return [
      {
        heading: 'Workspace',
        items: [
          { href: '/company/workspace', label: 'Il Tuo Workspace KORA' },
        ],
      },
      {
        heading: 'Sezioni',
        items: [
          { href: '/company/workspace#kora-index',          label: 'KORA Index' },
          { href: '/company/workspace#data-submission',     label: 'Submission Status' },
          { href: '/company/workspace#reporting-readiness', label: 'Reporting Readiness' },
          { href: '/company/workspace#methodology',         label: 'Metodologia & Privacy' },
        ],
      },
    ];
  }

  if (isWorkerRole(role as Parameters<typeof isWorkerRole>[0])) {
    return [
      {
        heading: 'Demo',
        items: [
          { href: '/demo-guide', label: 'Demo Guide' },
          { href: '/pilot',      label: 'Foundation Light Pilot' },
        ],
      },
      {
        heading: 'My KORA',
        items: [
          { href: '/my-kora',               label: 'My KORA Home' },
          { href: '/my-kora/privacy',       label: 'Privacy & Condivisione' },
          { href: '/my-kora/dynamic-cv',    label: 'Dynamic Impact CV' },
          { href: '/my-kora/opportunities', label: 'Opportunità' },
          { href: '/my-kora/bookings',      label: 'Prenotazioni',      comingSoon: true },
          { href: '/my-kora/collective',    label: 'Impatto Collettivo', comingSoon: true },
        ],
      },
      {
        heading: 'Altro',
        items: [{ href: '/future-vision', label: 'Future Vision', inactive: true }],
      },
    ];
  }

  if (role === 'PARTNER') {
    return [
      {
        heading: 'Demo',
        items: [
          { href: '/demo-guide', label: 'Demo Guide' },
          { href: '/pilot',      label: 'Foundation Light Pilot' },
        ],
      },
      {
        heading: 'Partner',
        items: [{ href: '/partner', label: 'Workspace Partner' }],
      },
      {
        heading: 'Altro',
        items: [{ href: '/future-vision', label: 'Future Vision', inactive: true }],
      },
    ];
  }

  if (role === 'ADVISOR') {
    return [
      {
        heading: 'Demo',
        items: [
          { href: '/demo-guide', label: 'Demo Guide' },
          { href: '/pilot',      label: 'Foundation Light Pilot' },
        ],
      },
      {
        heading: 'Advisor',
        items: [{ href: '/advisor', label: 'Workspace Advisor' }],
      },
      {
        heading: 'Altro',
        items: [{ href: '/future-vision', label: 'Future Vision', inactive: true }],
      },
    ];
  }

  return [
    {
      heading: 'Demo',
      items: [
        { href: '/demo-guide', label: 'Demo Guide' },
        { href: '/pilot',      label: 'Foundation Light Pilot' },
      ],
    },
    {
      heading: 'Altro',
      items: [{ href: '/future-vision', label: 'Future Vision', inactive: true }],
    },
  ];
}

export function Sidebar() {
  const { activeRole } = useRole();
  const { activeEnvironment } = useEnvironment();
  const pathname = usePathname();
  const groups = buildNavGroups(activeRole);
  const roleLabel = ROLE_DISPLAY[activeRole] ?? activeRole;

  return (
    <aside
      className="flex w-56 flex-col bg-kora-sidebar"
      style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Logo header */}
      <div
        className="flex items-center px-[18px] py-[18px]"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <KoraLogo variant="on-dark" className="h-[28px] w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {groups.map((group) => (
          <div key={group.heading} className="mb-3">
            <div className="flex items-center gap-1.5 px-[18px] pb-1">
              <p
                className="text-[10px] font-medium uppercase tracking-[0.20em]"
                style={{ color: 'rgba(255,255,255,0.22)' }}
              >
                {group.heading}
              </p>
              {group.groupBadge && (
                <span
                  className={cn('rounded px-1 py-[1px] text-[8px] font-bold uppercase tracking-wide', group.groupBadgeStyle)}
                >
                  {group.groupBadge}
                </span>
              )}
            </div>
            {group.items.map((item) => {
              // Active: exact match, or workspace base path for anchor sub-items
              const isActive =
                pathname === item.href ||
                (item.href.includes('#') && pathname === item.href.split('#')[0]);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between py-[8px] text-[14.5px] transition-colors',
                    isActive
                      ? 'font-medium'
                      : 'hover:text-white/65',
                    (item.comingSoon || item.inactive) && 'opacity-50',
                  )}
                  style={
                    isActive
                      ? {
                          color:           '#FFFFFF',
                          background:      'rgba(255,255,255,0.07)',
                          borderLeft:      '2px solid #6156F5',
                          paddingLeft:     16,
                          paddingRight:    14,
                          marginRight:     6,
                          borderRadius:    '0 5px 5px 0',
                        }
                      : {
                          color:           'rgba(244,241,233,0.62)',
                          paddingLeft:     18,
                          paddingRight:    14,
                        }
                  }
                >
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn('ml-1 shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase', item.badgeStyle)}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.comingSoon && (
                    <span
                      className="ml-1 shrink-0 rounded px-1 py-0.5 text-[9px]"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        color:      'rgba(255,255,255,0.30)',
                      }}
                    >
                      presto
                    </span>
                  )}
                  {item.inactive && (
                    <span
                      className="ml-1 shrink-0 rounded px-1 py-0.5 text-[9px]"
                      style={{
                        background: 'rgba(186,117,23,0.18)',
                        color:      '#ba7517',
                      }}
                    >
                      inattivo
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="px-[16px] pt-3 pb-4 mt-auto"
        style={{ borderTop: `1px solid rgba(255,255,255,0.08)` }}
      >
        <p
          className="text-[10.5px] font-medium leading-snug"
          style={{ color: 'rgba(244,241,233,0.72)' }}
        >
          {roleLabel}
        </p>
        <p
          className="text-[9px] font-semibold uppercase tracking-[0.10em] mt-0.5"
          style={{ color: 'var(--env-accent)' }}
        >
          {ENV_LABEL[activeEnvironment] ?? 'DEMO'}
        </p>
        <button
          className="mt-2 text-[10.5px] transition-opacity hover:opacity-80"
          style={{ color: 'rgba(244,241,233,0.35)' }}
          onClick={() => {}}
          type="button"
        >
          Esci
        </button>
      </div>
    </aside>
  );
}
