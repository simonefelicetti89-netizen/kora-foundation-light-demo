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
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const DEMO_GROUP: NavGroup = {
  heading: 'Demo',
  items: [
    { href: '/demo-guide', label: 'Demo Guide' },
    { href: '/pilot',      label: 'Foundation Light Pilot' },
  ],
};

function buildNavGroups(role: string): NavGroup[] {
  if (isAdminRole(role as Parameters<typeof isAdminRole>[0])) {
    return [
      DEMO_GROUP,
      {
        heading: 'KORA Console',
        items: [
          { href: '/admin',                label: 'Console Operativa' },
          { href: '/admin/portfolio',      label: 'Portfolio Aziendale' },
          { href: '/admin/index-registry', label: 'Registro Index' },
          { href: '/admin/benchmarks',     label: 'Benchmark' },
          { href: '/admin/network',        label: 'Advisor & Partner' },
          { href: '/admin/gtm',            label: 'GTM Pipeline' },
          { href: '/admin/ai-onboarding',  label: 'AI Onboarding' },
        ],
      },
      {
        heading: 'Aziende Cliente',
        items: [
          { href: '/admin/companies',                    label: 'Company Registry' },
          { href: '/admin/companies/setup',              label: 'Enterprise Onboarding' },
          { href: '/admin/companies/onboarding',         label: 'Onboarding Studio' },
          { href: '/admin/companies/workforce-baseline', label: 'Workforce Baseline' },
          { href: '/admin/companies/data-intake',        label: 'Data Intake' },
        ],
      },
      {
        heading: 'Intelligence Aziendale',
        items: [
          { href: '/company',              label: 'Executive Cockpit' },
          { href: '/company/kora-index',   label: 'KORA Index' },
          { href: '/company/activation',   label: 'Attivazione & Partecipazione' },
          { href: '/company/contribution', label: 'KORA Contribution' },
          { href: '/company/pillars',      label: 'Pilastri & Iniziative' },
        ],
      },
      {
        heading: 'Pipeline Operativa',
        items: [
          { href: '/admin/companies/data-intake', label: 'Data Intake Studio' },
          { href: '/company/ingestion',           label: 'Ingestion Preview' },
          { href: '/company/uef-review',          label: 'Operator Review Queue' },
          { href: '/company/scoring',             label: 'Scoring Preview' },
          { href: '/company/reports',             label: 'Decision Pack' },
          { href: '/company/financial',           label: 'Governance Finanziaria' },
        ],
      },
      {
        heading: 'Altro',
        items: [{ href: '/future-vision', label: 'Future Vision', inactive: true }],
      },
    ];
  }

  if (role === 'COMPANY_ADMIN') {
    return [
      DEMO_GROUP,
      {
        heading: 'Il Tuo Spazio KORA',
        items: [
          { href: '/company/profile',      label: 'Profilo & Stato KORA' },
          { href: '/company',              label: 'Executive Cockpit' },
          { href: '/company/shared',       label: 'KORA Shared View' },
          { href: '/company/kora-index',   label: 'KORA Index' },
          { href: '/company/activation',   label: 'Attivazione & Partecipazione' },
          { href: '/company/contribution', label: 'KORA Contribution' },
          { href: '/company/pillars',      label: 'Pilastri & Iniziative' },
          { href: '/company/onboarding',   label: 'Stato Progetto' },
        ],
      },
      {
        heading: 'Governance & Output',
        items: [
          { href: '/company/financial', label: 'Governance Finanziaria' },
          { href: '/company/reports',   label: 'Decision Pack' },
        ],
      },
      {
        heading: 'Altro',
        items: [{ href: '/future-vision', label: 'Future Vision', inactive: true }],
      },
    ];
  }

  if (role === 'COMPANY_VIEWER') {
    return [
      DEMO_GROUP,
      {
        heading: 'Il Tuo Spazio KORA',
        items: [
          { href: '/company/shared',     label: 'KORA Shared View' },
          { href: '/company/profile',    label: 'Profilo & Stato KORA' },
          { href: '/company',            label: 'Executive Cockpit' },
          { href: '/company/kora-index', label: 'KORA Index' },
        ],
      },
      {
        heading: 'Altro',
        items: [{ href: '/future-vision', label: 'Future Vision', inactive: true }],
      },
    ];
  }

  if (isWorkerRole(role as Parameters<typeof isWorkerRole>[0])) {
    return [
      DEMO_GROUP,
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
      DEMO_GROUP,
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
      DEMO_GROUP,
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
    DEMO_GROUP,
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
            <p
              className="px-[18px] pb-1 text-[11px] font-medium uppercase tracking-[0.20em]"
              style={{ color: 'rgba(255,255,255,0.22)' }}
            >
              {group.heading}
            </p>
            {group.items.map((item) => {
              const isActive = pathname === item.href;
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

      {/* Footer — ancorato in fondo via mt-auto su nav flex-1 */}
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
