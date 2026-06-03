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
  KORA_ADMIN:    'KORA Admin',
  COMPANY_ADMIN: 'Company Admin',
  COMPANY_VIEWER:'Company Viewer',
  WORKER:        'Lavoratore',
  PARTNER:       'Partner',
  ADVISOR:       'Advisor',
};

interface NavItem {
  href:        string;
  label:       string;
  comingSoon?: boolean;
  inactive?:   boolean;
  badge?:      string;
  badgeStyle?: string;
}

interface NavGroup {
  heading:        string;
  groupBadge?:    string;
  groupBadgeStyle?: string;
  items:          NavItem[];
}

// ── Navigation builds — groups communicate KORA logic, not lists of routes ──

function buildNavGroups(role: string): NavGroup[] {

  // ── KORA Admin: Control Tower architecture ──────────────────────────────────
  if (isAdminRole(role as Parameters<typeof isAdminRole>[0])) {
    return [
      {
        heading: 'Controllo Operativo',
        groupBadge: 'LIVE',
        groupBadgeStyle: 'bg-green-900/40 text-green-400 border border-green-800/50',
        items: [
          { href: '/admin',                      label: 'Control Tower' },
          { href: '/admin/companies',            label: 'Company Console' },
          { href: '/admin/company-submissions',  label: 'Submission Queue' },
          { href: '/admin/tenants',              label: 'Onboarding' },
        ],
      },
      {
        heading: 'Intake & Pipeline',
        groupBadge: 'PIPELINE',
        groupBadgeStyle: 'bg-blue-900/30 text-blue-400 border border-blue-800/40',
        items: [
          { href: '/admin/data-intake',              label: 'Data Intake' },
          { href: '/admin/uef-review',               label: 'UEF™ Review & Scoring' },
          { href: '/admin/data-lifecycle',           label: 'Data Lifecycle' },
          { href: '/admin/company-evidence-archive', label: 'Evidence Archive' },
        ],
      },
      {
        heading: 'Workspace Aziende',
        groupBadge: 'ADMIN',
        groupBadgeStyle: 'bg-slate-700/40 text-white/50 border border-white/20',
        items: [
          { href: '/admin/company-workspace',      label: 'Workspace Admin' },
          { href: '/admin/company-users',          label: 'Utenti Aziendali' },
          { href: '/admin/company-live-preview',   label: 'Live Preview' },
        ],
      },
      {
        heading: 'Network & GTM',
        groupBadge: 'STRATEGIA',
        groupBadgeStyle: 'bg-slate-700/40 text-white/50 border border-white/20',
        items: [
          { href: '/admin/network',   label: 'Rete Advisor & Partner' },
          { href: '/admin/gtm',       label: 'GTM & Validazione' },
          { href: '/admin/operator',  label: 'Operator Console' },
          { href: '/admin/benchmarks', label: 'Benchmark' },
        ],
      },
      {
        heading: 'Demo Lab',
        groupBadge: 'SYNTHETIC',
        groupBadgeStyle: 'bg-[rgba(199,111,61,0.18)] text-[#C76F3D] border border-[rgba(199,111,61,0.35)]',
        items: [
          { href: '/admin/demo/acme-001', label: 'Guided Demo — ACME-001' },
          { href: '/company',             label: 'Demo Meridiana' },
          { href: '/admin/operator',      label: 'Benchmark sintetico' },
          { href: '/demo-guide',          label: 'Demo Guide' },
        ],
      },
      {
        heading: 'Visione',
        groupBadge: 'ROADMAP',
        groupBadgeStyle: 'bg-slate-700/40 text-white/50 border border-white/20',
        items: [
          { href: '/future-vision', label: 'Future Vision', inactive: true },
        ],
      },
    ];
  }

  // ── Company Admin: KORA intelligence architecture ───────────────────────────
  if (role === 'COMPANY_ADMIN') {
    return [
      {
        heading: 'Command',
        items: [
          { href: '/company',             label: 'Executive Cockpit' },
          { href: '/company/kora-index',  label: 'KORA Index™' },
        ],
      },
      {
        heading: 'Intelligence',
        items: [
          { href: '/company/financial',    label: 'Budget-to-Human-Impact™' },
          { href: '/company/activation',   label: 'Activation Intelligence™' },
          { href: '/company/contribution', label: 'Contribution' },
          { href: '/company/pillars',      label: 'Pillar Analysis' },
        ],
      },
      {
        heading: 'Evidence & Report',
        items: [
          { href: '/company/data',    label: 'Data Intake' },
          { href: '/company/reports', label: 'Decision Pack' },
        ],
      },
      {
        heading: 'Network',
        items: [
          { href: '/company/shared',  label: 'Spazio Condiviso' },
        ],
      },
      {
        heading: 'Governance',
        items: [
          { href: '/company/profile',    label: 'Profilo & Stato' },
          { href: '/company/workspace',  label: 'Workspace Live' },
        ],
      },
    ];
  }

  // ── Company Viewer: read-only subset ────────────────────────────────────────
  if (role === 'COMPANY_VIEWER') {
    return [
      {
        heading: 'Intelligence',
        items: [
          { href: '/company',            label: 'Executive Cockpit' },
          { href: '/company/kora-index', label: 'KORA Index™' },
        ],
      },
      {
        heading: 'Report',
        items: [
          { href: '/company/reports', label: 'Decision Pack' },
        ],
      },
      {
        heading: 'Governance',
        items: [
          { href: '/company/workspace', label: 'Workspace Live' },
          { href: '/company/profile',   label: 'Profilo & Stato' },
        ],
      },
    ];
  }

  // ── Worker: personal, sovereign, private ────────────────────────────────────
  if (isWorkerRole(role as Parameters<typeof isWorkerRole>[0])) {
    return [
      {
        heading: 'Il tuo spazio',
        items: [
          { href: '/my-kora', label: 'My KORA Home' },
        ],
      },
      {
        heading: 'Attivazione',
        items: [
          { href: '/my-kora/dynamic-cv',    label: 'Dynamic Impact CV' },
          { href: '/my-kora/opportunities', label: 'Opportunità' },
          { href: '/my-kora/bookings',      label: 'Prenotazioni', comingSoon: true },
          { href: '/my-kora/collective',    label: 'Collettivo',   comingSoon: true },
        ],
      },
      {
        heading: 'Privacy',
        items: [
          { href: '/my-kora/privacy', label: 'Privacy & Condivisione' },
        ],
      },
      {
        heading: 'Roadmap',
        items: [
          { href: '/future-vision', label: 'Future Vision', inactive: true },
        ],
      },
    ];
  }

  // ── Partner: operational portal ─────────────────────────────────────────────
  if (role === 'PARTNER') {
    return [
      {
        heading: 'Portale Partner',
        items: [
          { href: '/partner',    label: 'Workspace Partner' },
          { href: '/demo-guide', label: 'Demo Guide' },
        ],
      },
      {
        heading: 'Roadmap',
        items: [
          { href: '/future-vision', label: 'Future Vision', inactive: true },
        ],
      },
    ];
  }

  // ── Advisor: governance workspace ────────────────────────────────────────────
  if (role === 'ADVISOR') {
    return [
      {
        heading: 'Workspace Advisor',
        items: [
          { href: '/advisor',    label: 'Review & Governance' },
          { href: '/demo-guide', label: 'Demo Guide' },
        ],
      },
      {
        heading: 'Roadmap',
        items: [
          { href: '/future-vision', label: 'Future Vision', inactive: true },
        ],
      },
    ];
  }

  // ── Fallback ─────────────────────────────────────────────────────────────────
  return [
    {
      heading: 'KORA',
      items: [
        { href: '/demo-guide', label: 'Demo Guide' },
        { href: '/future-vision', label: 'Future Vision', inactive: true },
      ],
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
        width:       '264px',
        minWidth:    '264px',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {groups.map((group) => (
          <div key={group.heading} className="mb-5">
            {/* Section heading */}
            <div className="flex items-center gap-1.5 px-3 pb-1.5">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.20em]"
                style={{ color: 'rgba(255,255,255,0.25)' }}
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

            {/* Items */}
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/company' && pathname.startsWith(item.href)) ||
                (item.href.includes('#') && pathname === item.href.split('#')[0]);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center justify-between rounded-[12px] py-[7px] px-3 text-[13px] font-medium transition-all duration-150',
                    isActive ? 'text-white' : 'text-white/65 hover:text-white/90',
                    (item.comingSoon || item.inactive) && 'opacity-45',
                  )}
                  style={
                    isActive
                      ? {
                          background: '#C76F3D',
                          border:     '1px solid rgba(255,255,255,0.10)',
                          boxShadow:  '0 6px 20px rgba(199,111,61,0.22)',
                          margin:     '1px 4px',
                        }
                      : { margin: '1px 4px' }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = '';
                    }
                  }}
                >
                  <span className="truncate leading-snug">{item.label}</span>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {item.comingSoon && (
                      <span className="rounded px-1 py-0.5 text-[8.5px] font-medium"
                        style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.30)' }}>
                        presto
                      </span>
                    )}
                    {item.inactive && (
                      <span className="rounded px-1 py-0.5 text-[8.5px] font-medium"
                        style={{ background: 'rgba(199,111,61,0.14)', color: 'rgba(199,111,61,0.80)' }}>
                        inattivo
                      </span>
                    )}
                    {item.badge && (
                      <span className={cn('rounded px-1 py-0.5 text-[7.5px] font-bold uppercase', item.badgeStyle)}>
                        {item.badge}
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
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{
              background: 'rgba(199,111,61,0.20)',
              border:     '1.5px solid #C76F3D',
              color:      '#C76F3D',
            }}
          >
            {roleLabel.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] font-semibold leading-tight truncate"
              style={{ color: 'rgba(255,255,255,0.88)' }}>
              {roleLabel}
            </p>
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.10em] mt-0.5"
              style={{ color: 'rgba(199,111,61,0.75)' }}>
              {ENV_LABEL[activeEnvironment] ?? 'DEMO'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
