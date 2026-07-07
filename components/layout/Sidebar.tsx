'use client';
// Sidebar — chrome condiviso. Navigazione per ruolo, badge Layer-aligned.
// Scopo: fornire la struttura di navigazione coerente per tutti i ruoli KORA.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useRole, useEnvironment } from '@/lib/demo-state';
import { resolveRealRoleFromSession, resolveBannerEnvironment } from '@/lib/demo-state/demo-controls-guard';
import type { BannerEnvironment } from '@/lib/demo-state/demo-controls-guard';
import { isWorkerRole, isAdminRole } from '@/lib/permissions';
import { KoraLogo } from '@/components/brand/KoraLogo';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ADMIN_NAV_GROUPS } from '@/lib/navigation/admin-nav-groups';

const ENV_LABEL: Record<string, string> = {
  demo:   'DEMO',
  live:   'LIVE',
  future: 'ROADMAP',
};

const ROLE_DISPLAY: Record<string, string> = {
  KORA_ADMIN:    'KORA Admin',
  COMPANY_ADMIN: 'Company Admin',
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
  FOUNDER:   { background: 'rgba(199,111,61,0.14)',  color: 'rgba(220,140,80,0.90)',  border: '1px solid rgba(199,111,61,0.30)' },
};

interface NavItem {
  href:         string;
  label:        string;
  comingSoon?:  boolean;  // disabled + muted (non-clickable)
  inactive?:    boolean;  // disabled + "inattivo" badge (Future Vision)
  preview?:     boolean;  // clickable + "preview" badge (PREVIEW routes)
  description?: string;
}

interface NavGroup {
  heading:      string;
  groupBadge?:  string;    // badge text
  badgeKey?:    string;    // key into BADGE object
  items:        NavItem[];
}

// ── Navigation builds — groups communicate KORA logic, not lists of routes ──

// Exported for unit testing (b95c-workforce-navigation.test.ts).
// activeCompanyId: extracted from pathname when on /admin/companies/[id]/... routes.
// isAdminPreview: true when a real KORA_ADMIN is using demo-state WORKER role —
//   routes to /admin/preview/worker/* instead of live /worker/* routes.
// B169 FASE 3: buildNavGroups for KORA_ADMIN now derives from ADMIN_NAV_GROUPS
// (lib/navigation/admin-nav-groups.ts). Non-admin groups unchanged.
// activeCompanyId parameter retained for signature compat but unused for admin
// (company-specific nav is now in CompanyTabNav drill-in — B169 FASE 2).
export function buildNavGroups(role: string, activeCompanyId?: string, isAdminPreview = false): NavGroup[] {
  void activeCompanyId; // unused for admin since B169

  // Guard: session not yet resolved — no role can be shown, return empty.
  // The Sidebar renders a skeleton instead; this prevents any href leaking into the DOM.
  if (role === 'PENDING') return [];

  if (isAdminRole(role as Parameters<typeof isAdminRole>[0])) {
    return ADMIN_NAV_GROUPS.map((group) => ({
      heading:    group.label,
      groupBadge: group.environmentTag,
      badgeKey:   group.environmentTag,
      items:      group.items as NavItem[],
    }));
  }

  // ── Company Admin: intelligence architecture ─────────────────────────────────
  if (role === 'COMPANY_ADMIN') {
    return [
      {
        heading: 'Command',
        items: [
          { href: '/company',            label: 'Executive Cockpit', description: 'Punto di partenza — naviga tutte le aree' },
          { href: '/company/status',     label: 'Status Center',     description: 'Stato pipeline, onboarding, prossimi passi' },
          { href: '/company/kora-index', label: 'KORA Index™',       description: 'Punteggio, componenti e calibrazione' },
          { href: '/company/workspace',  label: 'KORA Workspace',    description: 'Riepilogo del periodo corrente' },
        ],
      },
      {
        heading: 'Intelligence',
        items: [
          { href: '/company/opportunities', label: 'Opportunità', preview: true },
          { href: '/company/financial',    label: 'Budget-to-Human-Impact™' },
          { href: '/company/activation',   label: 'Activation Intelligence™' },
          { href: '/company/contribution', label: 'KORA Contribution™' },
          { href: '/company/pillars',      label: 'Pillar Analysis' },
        ],
      },
      {
        heading: 'Evidence & Report',
        items: [
          { href: '/company/data',      label: 'Stato Dati' },
          { href: '/company/reports',   label: 'Decision Pack' },
          { href: '/company/wallboard', label: 'KORA Wallboard' },
        ],
      },
      {
        heading: 'Network',
        items: [
          { href: '/company/commons', label: 'KORA Space' },
          { href: '/company/kora-link', label: 'KORA Link' },
        ],
      },
      {
        heading: 'Governance',
        items: [
          { href: '/company/profile', label: 'Profilo & Stato' },
        ],
      },
    ];
  }

  // ── Worker: personal, sovereign, private ────────────────────────────────────
  // isAdminPreview=true: KORA_ADMIN previewing worker space in demo mode.
  // Live /worker/* routes require WORKER session — route to /admin/preview/worker/* instead.
  if (isWorkerRole(role as Parameters<typeof isWorkerRole>[0])) {
    return [
      {
        heading: isAdminPreview ? 'Worker Preview (Admin)' : 'Il tuo spazio',
        items: [
          { href: '/my-kora', label: 'My KORA Home' },
          { href: '/my-kora/personal-impact-balance', label: 'Personal Impact Balance' },
        ],
      },
      {
        heading: 'Attivazione',
        items: [
          {
            href:    isAdminPreview ? '/admin/preview/worker/dynamic-cv' : '/worker/dynamic-cv',
            label:   'Dynamic Impact CV',
            preview: isAdminPreview ? true : undefined,
          },
          {
            href:    isAdminPreview ? '/admin/preview/worker/opportunities' : '/worker/opportunities',
            label:   'Opportunità',
            preview: isAdminPreview ? true : undefined,
          },
          { href: '/my-kora/kora-space', label: 'KORA Space (Anteprima)', preview: true },
          { href: '/worker/commons',   label: 'KORA Space' },
          { href: '/my-kora/kora-link', label: 'My KORA Link' },
          { href: '/my-kora/bookings', label: 'Prenotazioni', comingSoon: true },
          { href: '/my-kora/collective', label: 'Collettivo', comingSoon: true },
        ],
      },
      {
        heading: 'Privacy',
        items: [
          {
            href:    isAdminPreview ? '/admin/preview/worker/privacy' : '/worker/privacy',
            label:   'Privacy & Condivisione',
            preview: isAdminPreview ? true : undefined,
          },
        ],
      },
      {
        heading: 'Roadmap',
        items: [
          { href: '/demo/future-vision', label: 'Future Vision', inactive: true },
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
          { href: '/partner/workspace', label: 'Workspace Partner' },
          { href: '/partner/kora-link', label: 'KORA Link' },
          { href: '/demo/guide',  label: 'Demo Guide' },
        ],
      },
      {
        heading: 'Roadmap',
        items: [
          { href: '/demo/future-vision', label: 'Future Vision', inactive: true },
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
          { href: '/demo/advisor', label: 'Review & Governance' },
          { href: '/demo/guide',   label: 'Demo Guide' },
        ],
      },
      {
        heading: 'Roadmap',
        items: [
          { href: '/demo/future-vision', label: 'Future Vision', inactive: true },
        ],
      },
    ];
  }

  // ── Fallback ─────────────────────────────────────────────────────────────────
  return [
    {
      heading: 'KORA',
      items: [
        { href: '/demo/guide',        label: 'Demo Guide' },
        { href: '/demo/future-vision', label: 'Future Vision', inactive: true },
      ],
    },
  ];
}

// Exported for unit testing.
//
// Returns 'PENDING' when the session is not yet resolved (realRole === undefined).
// No role-guessing during pending — the Sidebar renders a skeleton with zero nav hrefs.
//
// Role resolution matrix:
//   realRole === undefined        → 'PENDING'   (session not yet resolved)
//   realRole confirmed non-admin  → realRole    (session wins over stale context)
//   realRole === 'KORA_ADMIN'     → activeRole  (demo-state drives nav for role preview)
//   realRole === 'AUTHENTICATED'  → activeRole  (provisioning gap, no kora_role yet)
//   realRole === null             → activeRole  (no session: demo/visitor mode)
export const NAV_PENDING = 'PENDING' as const;

export function resolveNavRole(realRole: string | null | undefined, activeRole: string): string {
  if (realRole === undefined) return NAV_PENDING;
  if (realRole && realRole !== 'KORA_ADMIN' && realRole !== 'AUTHENTICATED') {
    return realRole;
  }
  return activeRole;
}

export function Sidebar() {
  const { activeRole } = useRole();
  const { activeEnvironment } = useEnvironment();
  const pathname = usePathname();

  // B117-G: read real Supabase session role to detect admin-preview mode.
  // When real role = KORA_ADMIN but demo-state = WORKER, route to /admin/preview/worker/* paths.
  const [realRole, setRealRole] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setRealRole(resolveRealRoleFromSession(data.session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setRealRole(resolveRealRoleFromSession(session));
    });
    return () => subscription.unsubscribe();
  }, []);

  // isAdminPreview: real session is KORA_ADMIN but demo state shows WORKER navigation
  const isAdminPreview = realRole === 'KORA_ADMIN' && isWorkerRole(activeRole as Parameters<typeof isWorkerRole>[0]);
  // effectiveEnv: null during pending (no badge), 'live' for real users, activeEnvironment for demo/KORA_ADMIN
  const effectiveEnv = resolveBannerEnvironment(realRole, activeEnvironment as BannerEnvironment);

  // Extract companyId from /admin/companies/[companyId]/... but not from /admin/companies/new.
  const companyIdMatch = pathname.match(/^\/admin\/companies\/([^/]+)(?:\/|$)/);
  const activeCompanyId = companyIdMatch?.[1] !== 'new' ? companyIdMatch?.[1] : undefined;

  const navRole   = resolveNavRole(realRole, activeRole);
  const isPending = navRole === NAV_PENDING;

  const isAdmin   = isAdminRole(navRole as Parameters<typeof isAdminRole>[0]);
  const groups    = buildNavGroups(navRole, activeCompanyId, isAdminPreview);
  const roleLabel = ROLE_DISPLAY[navRole] ?? navRole;

  // Collapsible groups — admin only. Expand the group containing the active path; collapse others.
  // Non-admin: all groups always expanded (no state needed).
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    if (!isAdmin) return {};
    const init: Record<string, boolean> = {};
    for (const group of ADMIN_NAV_GROUPS) {
      init[group.id] = group.items.some(
        (item) => pathname === item.href ||
          (item.href !== '/admin/companies' && pathname.startsWith(item.href + '/')),
      );
    }
    return init;
  });

  // When realRole resolves to KORA_ADMIN (after the pending phase), isAdmin transitions
  // false → true and expandedGroups is still empty (initialized during non-admin pending).
  // Re-initialize with path-based defaults so the active group is expanded on first paint.
  useEffect(() => {
    if (!isAdmin) return;
    setExpandedGroups((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const init: Record<string, boolean> = {};
      for (const group of ADMIN_NAV_GROUPS) {
        init[group.id] = group.items.some(
          (item) => pathname === item.href ||
            (item.href !== '/admin/companies' && pathname.startsWith(item.href + '/')),
        );
      }
      return init;
    });
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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

      {/* Nav — skeleton while session is unresolved (zero hrefs in DOM) */}
      {isPending ? (
        <nav
          className="flex-1 overflow-y-auto py-4 px-2"
          aria-label="Navigazione principale"
          aria-busy="true"
          data-pending="true"
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                margin:       '1px 4px',
                marginBottom: 6,
                height:       32,
                borderRadius: 12,
                background:   'rgba(255,255,255,0.05)',
              }}
            />
          ))}
        </nav>
      ) : (
      <nav
        className="flex-1 overflow-y-auto py-4 px-2"
        aria-label="Navigazione principale"
      >
        {groups.map((group, groupIdx) => {
          // For admin: use group id from ADMIN_NAV_GROUPS for collapse state.
          const adminGroup = isAdmin ? ADMIN_NAV_GROUPS[groupIdx] : null;
          const groupId    = adminGroup?.id ?? group.heading;
          const isExpanded = isAdmin ? (expandedGroups[groupId] ?? false) : true;

          return (
          <div key={group.heading} className="mb-5">
            {/* Section heading + badge — clickable for admin (toggle collapse) */}
            {isAdmin ? (
              <button
                type="button"
                onClick={() => toggleGroup(groupId)}
                className="w-full flex items-center gap-1.5 px-3 pb-1.5 text-left hover:opacity-75 transition-opacity"
                aria-expanded={isExpanded}
              >
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.20em] flex-1"
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
                <span style={{ color: 'rgba(255,255,255,0.20)', fontSize: '8px', marginLeft: 2 }}>
                  {isExpanded ? '▾' : '▸'}
                </span>
              </button>
            ) : (
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
            )}

            {/* Nav items — hidden when group is collapsed (admin only) */}
            {isExpanded && group.items.map((item) => {
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
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                      {item.label}
                    </span>
                    {item.description && (
                      <span style={{ display: 'block', fontSize: '9px', color: 'rgba(255,255,255,0.30)', fontWeight: 400, marginTop: 1, whiteSpace: 'normal', lineHeight: 1.2, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                        {item.description}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 4 }}>
                    {item.preview && (
                      <span
                        style={{
                          borderRadius: 4,
                          padding:      '1px 5px',
                          fontSize:     '8px',
                          fontWeight:   700,
                          fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                          background:   'rgba(199,111,61,0.22)',
                          color:        'rgba(199,111,61,0.95)',
                          border:       '1px solid rgba(199,111,61,0.35)',
                        }}
                      >
                        preview
                      </span>
                    )}
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
          );
        })}
      </nav>
      )}

      {/* Footer — role + environment; skeleton while pending */}
      <div
        className="px-4 pt-3 pb-4 mt-auto"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        {isPending ? (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div className="flex-shrink-0 w-7 h-7 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ height: 10, width: '55%', background: 'rgba(255,255,255,0.08)', borderRadius: 6 }} />
          </div>
        ) : (
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
            {effectiveEnv !== null && (
              <p
                className="text-[8.5px] font-semibold uppercase tracking-[0.10em] mt-0.5"
                style={{ color: 'rgba(199,111,61,0.75)', fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}
              >
                {ENV_LABEL[effectiveEnv]}
              </p>
            )}
          </div>
        </div>
        )}
      </div>
    </aside>
  );
}
