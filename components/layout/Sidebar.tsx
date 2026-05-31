'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole, useEnvironment } from '@/lib/demo-state';
import { isWorkerRole, isAdminRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const ENV_SIDEBAR_LABEL: Record<string, string> = {
  demo:   'Ambiente demo',
  live:   'Ambiente live',
  future: 'Roadmap',
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
          { href: '/admin/companies',                      label: 'Company Registry' },
          { href: '/admin/companies/setup',                label: 'Enterprise Onboarding' },
          { href: '/admin/companies/onboarding',           label: 'Onboarding Studio' },
          { href: '/admin/companies/workforce-baseline',   label: 'Workforce Baseline' },
          { href: '/admin/companies/data-intake',          label: 'Data Intake' },
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
          { href: '/admin/companies/data-intake',        label: 'Data Intake Studio' },
          { href: '/company/ingestion',                  label: 'Ingestion Preview' },
          { href: '/company/uef-review',                 label: 'Operator Review Queue' },
          { href: '/company/scoring',                    label: 'Scoring Preview' },
          { href: '/company/reports',                    label: 'Decision Pack' },
          { href: '/company/financial',                  label: 'Governance Finanziaria' },
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

  return (
    <aside
      className="flex w-56 flex-col bg-kora-canvas"
      style={{ borderRight: '1px solid rgba(20,18,46,0.08)' }}
    >
      <nav className="flex-1 overflow-y-auto py-3">
        {groups.map((group) => (
          <div key={group.heading} className="mb-4">
            <p
              className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(20,18,46,0.38)' }}
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
                    'flex items-center justify-between rounded-[10px] mx-2 px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-kora-surface font-medium shadow-sm'
                      : 'hover:bg-white/60',
                    (item.comingSoon || item.inactive) && 'opacity-50',
                  )}
                  style={
                    isActive
                      ? {
                          color:  '#14122E',
                          border: '1px solid rgba(20,18,46,0.08)',
                        }
                      : {
                          color: 'rgba(20,18,46,0.58)',
                        }
                  }
                >
                  <span className="truncate">{item.label}</span>
                  {item.comingSoon && (
                    <span
                      className="ml-1 shrink-0 rounded px-1 py-0.5 text-[9px] font-medium"
                      style={{
                        background: 'rgba(20,18,46,0.06)',
                        color:      'rgba(20,18,46,0.38)',
                      }}
                    >
                      presto
                    </span>
                  )}
                  {item.inactive && (
                    <span
                      className="ml-1 shrink-0 rounded px-1 py-0.5 text-[9px] font-medium"
                      style={{
                        background: 'rgba(186,117,23,0.10)',
                        color:      '#854F0B',
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
      <div
        className="px-4 pt-3 pb-2 space-y-0.5"
        style={{ borderTop: '2px solid var(--env-accent)' }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-wide"
          style={{ color: 'var(--env-accent)' }}
        >
          {ENV_SIDEBAR_LABEL[activeEnvironment] ?? 'Ambiente demo'}
        </p>
        <p className="text-[9px] font-semibold" style={{ color: 'rgba(20,18,46,0.45)' }}>
          Foundation Light v0.1
        </p>
        <p className="font-mono text-[9px]" style={{ color: 'rgba(20,18,46,0.32)' }}>
          pre_empirical_calibration
        </p>
        <p className="text-[9px] pt-0.5" style={{ color: 'rgba(20,18,46,0.30)' }}>
          Ruolo: {activeRole}
        </p>
      </div>
    </aside>
  );
}
