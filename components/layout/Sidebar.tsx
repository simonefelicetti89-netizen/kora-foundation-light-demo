'use client';
// Sidebar — chrome condiviso. Navigazione per ruolo, badge Layer-aligned.
// Scopo: fornire la struttura di navigazione coerente per tutti i ruoli KORA.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole, useEnvironment } from '@/lib/demo-state';
import { isWorkerRole, isAdminRole } from '@/lib/permissions';
import { KoraLogo } from '@/components/brand/KoraLogo';
import { TOKENS } from '@/lib/design/kora-design-tokens';

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

// ── Badge styles — inline, Layer token–aligned, no raw Tailwind color classes ──
// Sidebar background: #06032B. Badges must be readable against dark bg.
const BADGE: Record<string, React.CSSProperties> = {
  LIVE:      { background: 'rgba(47,125,85,0.22)',  color: 'rgba(120,210,145,0.90)', border: '1px solid rgba(47,125,85,0.40)' },
  LIVE_PILOT:{ background: 'rgba(47,125,85,0.22)',  color: 'rgba(120,210,145,0.90)', border: '1px solid rgba(47,125,85,0.40)' },
  PIPELINE:  { background: 'rgba(74,127,224,0.18)', color: 'rgba(130,180,240,0.88)', border: '1px solid rgba(74,127,224,0.35)' },
  ADMIN:     { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.48)', border: '1px solid rgba(255,255,255,0.14)' },
  STRATEGIA: { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.48)', border: '1px solid rgba(255,255,255,0.14)' },
  ROADMAP:   { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.10)' },
  SYNTHETIC: { background: 'rgba(199,111,61,0.18)',  color: '#C76F3D',                border: '1px solid rgba(199,111,61,0.38)' },
};

interface NavItem {
  href:        string;
  label:       string;
  comingSoon?: boolean;
  inactive?:   boolean;
}

interface NavGroup {
  heading:      string;
  groupBadge?:  string;    // badge text
  badgeKey?:    string;    // key into BADGE object
  items:        NavItem[];
}

// ── Navigation builds — groups communicate KORA logic, not lists of routes ──

function buildNavGroups(role: string): NavGroup[] {

  // ── KORA Admin: Control Tower — B61-B restructured ─────────────────────────
  // Group 1: Onboarding Pilot — canonical live onboarding entry points.
  // Group 2: Scoring Pipeline — intake → UEF → scoring → lifecycle.
  // Group 3: Delivery & Preview — workspace, preview, submissions.
  // Group 4: Demo Lab — all synthetic/demo flows clearly separated.
  // Group 5: Visione — roadmap only.
  // B80-B: Admin sidebar split into LIVE OPERATIONS / DEMO PREVIEW / FUTURE VISION.
  // Live routes (backed by real Supabase) are strictly separated from demo preview routes.
  if (isAdminRole(role as Parameters<typeof isAdminRole>[0])) {
    return [
      {
        heading: 'Live Operations',
        groupBadge: 'LIVE',
        badgeKey: 'LIVE',
        items: [
          { href: '/admin/pipeline',                 label: 'Pilot Lifecycle' },
          { href: '/admin/companies',                label: 'Company Console' },
          { href: '/admin/company-live-preview',     label: 'Anteprima Live Cockpit' },
          { href: '/admin/companies/new',            label: 'Crea Azienda Live' },
          { href: '/admin/company-workspace',        label: 'Workspace Admin' },
          { href: '/admin/company-users',            label: 'Utenti Aziendali' },
          { href: '/admin/company-submissions',      label: 'Submission Queue' },
          { href: '/admin/tenants',                  label: 'Registro Tenant' },
          { href: '/admin/data-intake',              label: 'Data Intake' },
          { href: '/admin/uef-review',               label: 'UEF™ Review & Scoring' },
          { href: '/admin/impact-units',             label: 'Impact Units™' },
          { href: '/admin/data-lifecycle',           label: 'Data Lifecycle' },
          { href: '/admin/company-evidence-archive', label: 'Evidence Archive' },
        ],
      },
      {
        heading: 'Demo · Sintetico',
        groupBadge: 'SYNTHETIC',
        badgeKey: 'SYNTHETIC',
        // All routes in this group use synthetic/demo data — no live Supabase queries.
        items: [
          { href: '/admin/demo/acme-001', label: 'Guided Demo — ACME-001' },
          { href: '/admin/index-registry', label: 'Registro KORA Index' },
          { href: '/admin/portfolio',      label: 'Portfolio Aziende' },
          { href: '/admin/network',       label: 'Rete Advisor & Partner' },
          { href: '/admin/operator',      label: 'Demo Scoring (Synthetic)' },
          { href: '/admin/ai-onboarding', label: 'Anteprima Classificazione' },
          { href: '/admin/gtm',           label: 'GTM Preview' },
          { href: '/admin/benchmarks',    label: 'Benchmark Preview' },
          { href: '/demo-guide',          label: 'Demo Guide' },
        ],
      },
      {
        heading: 'Future Vision',
        groupBadge: 'ROADMAP',
        badgeKey: 'ROADMAP',
        items: [
          { href: '/future-vision', label: 'Future Vision', inactive: true },
        ],
      },
    ];
  }

  // ── Company Admin: intelligence architecture ─────────────────────────────────
  if (role === 'COMPANY_ADMIN') {
    return [
      {
        heading: 'Command',
        items: [
          { href: '/company',            label: 'Executive Cockpit' },
          { href: '/company/status',     label: 'Status Center' },
          { href: '/company/kora-index', label: 'KORA Index™' },
          { href: '/company/workspace',  label: 'Worker Space' },
        ],
      },
      {
        heading: 'Intelligence',
        items: [
          { href: '/company/opportunities', label: 'Opportunità' },
          { href: '/company/financial',    label: 'Budget-to-Human-Impact™' },
          { href: '/company/activation',   label: 'Activation Intelligence™' },
          { href: '/company/contribution', label: 'Contribution' },
          { href: '/company/pillars',      label: 'Pillar Analysis' },
        ],
      },
      {
        heading: 'Evidence & Report',
        items: [
          { href: '/company/data',    label: 'Stato Dati' },
          { href: '/company/reports', label: 'Decision Pack' },
        ],
      },
      {
        heading: 'Network',
        items: [
          { href: '/company/shared', label: 'Spazio Condiviso' },
        ],
      },
      {
        heading: 'Governance',
        items: [
          { href: '/company/profile', label: 'Profilo & Stato' },
          { href: '/my-kora',         label: 'My KORA Preview' },
        ],
      },
    ];
  }

  // ── Company Viewer: read-only subset ────────────────────────────────────────
  if (role === 'COMPANY_VIEWER') {
    return [
      {
        heading: 'Command',
        items: [
          { href: '/company',            label: 'Executive Cockpit' },
          { href: '/company/kora-index', label: 'KORA Index™' },
          { href: '/company/workspace',  label: 'Worker Space' },
        ],
      },
      {
        heading: 'Intelligence',
        items: [
          { href: '/company/opportunities', label: 'Opportunità' },
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
          { href: '/company/profile', label: 'Profilo & Stato' },
          { href: '/my-kora',         label: 'My KORA Preview' },
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
        { href: '/demo-guide',   label: 'Demo Guide' },
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
      {/* Logo — KoraLogo asset reale, variante on-dark */}
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
      <nav
        className="flex-1 overflow-y-auto py-4 px-2"
        aria-label="Navigazione principale"
      >
        {groups.map((group) => (
          <div key={group.heading} className="mb-5">
            {/* Section heading + badge */}
            <div className="flex items-center gap-1.5 px-3 pb-1.5">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.20em]"
                style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}
              >
                {group.heading}
              </p>
              {group.groupBadge && group.badgeKey && (
                <span
                  style={{
                    borderRadius: 4,
                    padding:      '1px 5px',
                    fontSize:     '7.5px',
                    fontWeight:   700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                    ...BADGE[group.badgeKey],
                  }}
                >
                  {group.groupBadge}
                </span>
              )}
            </div>

            {/* Nav items */}
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/company' && pathname.startsWith(item.href)) ||
                (item.href.includes('#') && pathname === item.href.split('#')[0]);

              const isDisabled = item.comingSoon || item.inactive;

              const sharedStyle: React.CSSProperties = {
                fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                margin:        '1px 4px',
                display:       'flex',
                alignItems:    'center',
                justifyContent: 'space-between',
                borderRadius:  12,
                padding:       '7px 12px',
                fontSize:      '13px',
                fontWeight:    500,
                transition:    'all 150ms',
                opacity:       isDisabled ? 0.40 : 1,
                cursor:        isDisabled ? 'not-allowed' : 'pointer',
                pointerEvents: isDisabled ? 'none' : undefined,
                color:         isActive ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
                ...(isActive && !isDisabled
                  ? {
                      background: TOKENS.accent,
                      border:     '1px solid rgba(255,255,255,0.10)',
                      boxShadow:  '0 6px 20px rgba(199,111,61,0.22)',
                    }
                  : {}),
              };

              const innerContent = (
                <>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                    {item.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 4 }}>
                    {item.comingSoon && (
                      <span
                        style={{
                          borderRadius: 4,
                          padding:      '1px 5px',
                          fontSize:     '8px',
                          fontWeight:   600,
                          fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                          background:   'rgba(255,255,255,0.07)',
                          color:        'rgba(255,255,255,0.35)',
                        }}
                      >
                        preview
                      </span>
                    )}
                    {item.inactive && (
                      <span
                        style={{
                          borderRadius: 4,
                          padding:      '1px 5px',
                          fontSize:     '8px',
                          fontWeight:   600,
                          fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                          background:   'rgba(199,111,61,0.14)',
                          color:        'rgba(199,111,61,0.70)',
                        }}
                      >
                        inattivo
                      </span>
                    )}
                  </div>
                </>
              );

              // B80-B: inactive and comingSoon items are NOT rendered as navigable links.
              // They render as non-interactive div elements with pointer-events: none.
              if (isDisabled) {
                return (
                  <div
                    key={item.href}
                    aria-hidden="true"
                    title="Non attivo in Foundation Light"
                    style={sharedStyle}
                  >
                    {innerContent}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  style={sharedStyle}
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
                  {innerContent}
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
          {/* Avatar initials */}
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
            aria-hidden="true"
            style={{
              background:  'rgba(199,111,61,0.20)',
              border:      '1.5px solid #C76F3D',
              color:       '#C76F3D',
              fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            }}
          >
            {roleLabel.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[10.5px] font-semibold leading-tight truncate"
              style={{ color: 'rgba(255,255,255,0.88)', fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}
            >
              {roleLabel}
            </p>
            <p
              className="text-[8.5px] font-semibold uppercase tracking-[0.10em] mt-0.5"
              style={{ color: 'rgba(199,111,61,0.75)', fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}
            >
              {ENV_LABEL[activeEnvironment] ?? 'DEMO'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
