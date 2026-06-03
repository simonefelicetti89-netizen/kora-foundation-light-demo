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
        groupBadgeStyle: 'bg-[rgba(199,111,61,0.18)] text-[#C76F3D] border border-[rgba(199,111,61,0.35)]',
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
      className="flex flex-col bg-kora-sidebar"
      style={{
        width: '260px',
        minWidth: '260px',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo block */}
      <div
        className="flex items-center"
        style={{
          paddingTop:    28,
          paddingBottom: 24,
          paddingLeft:   24,
          paddingRight:  20,
          borderBottom:  '1px solid rgba(255,255,255,0.07)',
          minHeight:     72,
        }}
      >
        <KoraLogo variant="on-dark" className="h-[26px] w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {groups.map((group) => (
          <div key={group.heading} className="mb-4">
            {/* Section heading */}
            <div className="flex items-center gap-1.5 px-3 pb-1.5">
              <p
                className="text-[9.5px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: 'rgba(255,255,255,0.30)' }}
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

            {/* Nav items */}
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href.includes('#') && pathname === item.href.split('#')[0]);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center justify-between rounded-[12px] py-[8px] px-3 text-[13.5px] font-medium transition-all duration-150',
                    isActive
                      ? 'text-white'
                      : 'text-white/70 hover:text-white',
                    (item.comingSoon || item.inactive) && 'opacity-50',
                  )}
                  style={
                    isActive
                      ? {
                          background:  '#C76F3D',
                          border:      '1px solid rgba(255,255,255,0.10)',
                          boxShadow:   '0 8px 24px rgba(199,111,61,0.22)',
                          margin:      '1px 4px',
                        }
                      : {
                          margin:      '1px 4px',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = '';
                      (e.currentTarget as HTMLElement).style.borderColor = '';
                    }
                  }}
                >
                  <span className="truncate leading-snug">{item.label}</span>

                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {item.badge && (
                      <span
                        className={cn('rounded px-1 py-0.5 text-[8px] font-bold uppercase', item.badgeStyle)}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.comingSoon && (
                      <span
                        className="rounded px-1 py-0.5 text-[9px] font-medium"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          color:      'rgba(255,255,255,0.35)',
                        }}
                      >
                        presto
                      </span>
                    )}
                    {item.inactive && (
                      <span
                        className="rounded px-1 py-0.5 text-[9px] font-medium"
                        style={{
                          background: 'rgba(199,111,61,0.16)',
                          color:      'rgba(199,111,61,0.90)',
                        }}
                      >
                        inattivo
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — role + environment */}
      <div
        className="px-4 pt-3 pb-4 mt-auto"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          {/* Avatar placeholder */}
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{
              background:  'rgba(199,111,61,0.20)',
              border:      '1.5px solid #C76F3D',
              color:       '#C76F3D',
            }}
          >
            {roleLabel.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] font-semibold leading-tight truncate"
              style={{ color: 'rgba(255,255,255,0.90)' }}
            >
              {roleLabel}
            </p>
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.10em] mt-0.5"
              style={{ color: 'rgba(199,111,61,0.80)' }}
            >
              {ENV_LABEL[activeEnvironment] ?? 'DEMO'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
