'use client';
// Sidebar — chrome condiviso. Navigazione per ruolo, badge Layer-aligned.
// Scopo: fornire la struttura di navigazione coerente per tutti i ruoli KORA.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useRole } from '@/lib/demo-state';
import { resolveRealRoleFromSession } from '@/lib/demo-state/demo-controls-guard';
import { isWorkerRole, isAdminRole } from '@/lib/permissions';
import { KoraLogo } from '@/components/brand/KoraLogo';
import { PX, TOKENS } from '@/lib/design/kora-design-tokens';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ADMIN_NAV_GROUPS } from '@/lib/navigation/admin-nav-groups';
import { useSidebarDrawer, SIDEBAR_DRAWER_ID } from '@/components/layout/SidebarDrawerContext';
import { navIconFor } from '@/components/layout/nav-icons';
import { usePxShellState } from '@/components/layout/usePxShellState';

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
  SYNTHETIC: { background: 'rgba(199,111,61,0.18)',  color: TOKENS.accent,                border: '1px solid rgba(199,111,61,0.38)' },
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
          { href: '/company/living-koral',  label: 'Living KORAL', description: 'Identità organizzativa costruita da trasformazioni riconosciute' },
          { href: '/company/financial',    label: 'Budget-to-Human-Impact™' },
          { href: '/company/activation',   label: 'Activation Intelligence™' },
          { href: '/company/contribution', label: 'KORA Contribution™' },
          { href: '/company/pillars',      label: 'Pillar Analysis' },
          { href: '/company/needs',        label: 'Bisogni Aziendali', description: 'Ipotesi di bisogno rilevate — non ancora confermate' },
          { href: '/company/activity-selection', label: 'Selezione Attività', description: 'Anteprima design — Fase 2 Activation Intelligence', preview: true },
          { href: '/company/activity-signals', label: 'Segnali Attivazione', description: 'Anteprima design — segnali aggregati, Fase 2 Activation Intelligence', preview: true },
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
          { href: '/company/advisor', label: 'Il tuo Advisor', description: 'Advisor assegnato e messaggi' },
          { href: '/company/commons', label: 'KORA Space' },
          { href: '/company/kora-link', label: 'KORA Link' },
          { href: '/company/kora-link/campaigns', label: 'Campagne KORA Link', description: 'Anteprima design — nessuna campagna reale', preview: true },
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
          {
            href:    isAdminPreview ? '/admin/preview/worker' : '/worker/workspace',
            label:   'My KORA Home',
            preview: isAdminPreview ? true : undefined,
          },
          {
            href:    isAdminPreview ? '/admin/preview/worker' : '/worker/personal-impact-balance',
            label:   'Personal Impact Balance',
            preview: isAdminPreview ? true : undefined,
          },
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
            description: 'Catalogo partner — informativo, nessuna prenotazione',
            preview: isAdminPreview ? true : undefined,
          },
          // REMOVED by explicit Founder ruling, 2026-09-20 (KORA-WP-125 §1).
          // The entry '/my-kora/kora-space' — label "KORA Space (Anteprima)",
          // description "Dati sintetici — non il tuo spazio reale" — was an
          // automatic synthetic indication in normal Worker navigation.
          // The Founder ruled that "One Product / No Demo Runtime"
          // (Governance Patch 03, 2026-08-31) and the 2026-09-06 Architecture
          // Registry correction supersede KORA-WP-073's older protection of
          // this demo-era duplicate. Nothing is lost: the route is a redirect
          // stub (app/my-kora/kora-space/page.tsx -> '/worker/commons') and
          // the canonical real destination '/worker/commons' is the next item
          // below, unchanged. Worker navigation now exposes ONE real KORA
          // Space destination instead of a real one plus a synthetic double.
          { href: '/worker/commons',   label: 'KORA Space', description: 'Iniziative e contenuti reali della tua azienda' },
          { href: '/worker/activity-discovery', label: 'Attività disponibili', description: 'Anteprima design — attività partner standard, Fase 2', preview: true },
          {
            href:    isAdminPreview ? '/admin/preview/worker' : '/worker/kora-link/activate',
            label:   'My KORA Link',
            description: 'Anteprima design — nessuna attivazione reale',
            preview: true,
          },
          {
            href:    isAdminPreview ? '/admin/preview/worker' : '/worker/bookings',
            label:   'Prenotazioni',
            description: 'Le tue richieste di partecipazione — private',
            preview: isAdminPreview ? true : undefined,
          },
          { href: '/my-kora/collective', label: 'Collettivo', description: 'Non ancora disponibile in Foundation Light', comingSoon: true },
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
          { href: '/partner/kora-link/initiatives', label: 'Iniziative KORA Link', description: 'Capability definita, non ancora attiva', preview: true },
          // 'Demo Guide' -> /demo/guide removed (KORA-WP-125): the route was
          // DELETED by the CC-00 demo retirement (2026-09-05), so this was a
          // broken link, and a demo destination is not permitted in
          // authenticated Product navigation (Governance Patch 03).
        ],
      },
      {
        heading: 'Iniziative & Community',
        items: [
          { href: '/partner/initiatives', label: 'Proposte Partner', description: 'Capability definita, non ancora attiva', preview: true },
          { href: '/partner/relationships', label: 'Relazioni con i lavoratori', description: 'Capability definita, non ancora attiva', preview: true },
          { href: '/partner/aggregate-signals', label: 'Segnali aggregati', description: 'Capability definita, non ancora attiva', preview: true },
          { href: '/partner/privacy-boundary', label: 'Confine privacy', description: 'Anteprima design', preview: true },
        ],
      },
      {
        heading: 'Catalogo Attività',
        items: [
          { href: '/partner/activity-catalog', label: 'Catalogo Attività', description: 'Capability definita, non ancora attiva', preview: true },
          { href: '/partner/activity-bookings', label: 'Richieste attività', description: 'Capability definita, non ancora attiva', preview: true },
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
  // KORA-WP-125 (2026-09-20) — DEFECT REPAIR, not an IA redesign.
  // Every destination in this branch used to be a demo route, and two of them
  // pointed at routes that NO LONGER EXIST (`app/demo/advisor` and
  // `app/demo/guide` were deleted by the CC-00 demo retirement, 2026-09-05).
  // Report `.kora-audit/output/18_UI_REACHABILITY.md` names this exact branch
  // as "the one confirmed, concrete broken-navigation defect found in this
  // entire audit". It also breaches "One Product / No Demo Runtime"
  // (Governance Patch 03), which forbids demo destinations in authenticated
  // Product navigation.
  // The branch now points at the Advisor routes that actually ship:
  // `/advisor` (KORA-WP-030 self-view) and `/advisor/companies` (KORA-WP-033).
  // No destination is invented — both routes exist and are already guarded by
  // app/advisor/layout.tsx's requireAdvisorUser().
  if (role === 'ADVISOR') {
    return [
      {
        heading: 'Workspace Advisor',
        items: [
          { href: '/advisor',           label: 'Il tuo profilo', description: 'Identità e qualifiche di ruolo' },
          { href: '/advisor/companies', label: 'Le tue Company', description: 'Company su cui hai un\'assegnazione attiva' },
        ],
      },
    ];
  }

  // ── Fallback ─────────────────────────────────────────────────────────────────
  return [
    {
      heading: 'KORA',
      items: [
        // 'Demo Guide' -> /demo/guide removed (KORA-WP-125): deleted route.
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
      // KORA-WP-125 (§5): Admin groups open by default. Collapsed-by-default
      // left a 248px column showing seven labels and no destinations — a
      // navigation surface that navigates nowhere. The groups remain
      // collapsible and the operator's choices are still honoured; only the
      // initial state changed. No route, label, grouping or role visibility is
      // affected, so KORA-WP-073's IA semantics are untouched.
      const init: Record<string, boolean> = {};
      for (const group of ADMIN_NAV_GROUPS) init[group.id] = true;
      return init;
    });
  }, [isAdmin]);

  // KORA-WP-125 (D-A): in the rail the group header — which is also the only
  // expand control for Admin — is not rendered, so a collapsed Admin group
  // would leave the rail with no reachable destinations at all. In the rail
  // every group is therefore presented expanded. This changes PRESENTATION
  // only: the same groups, the same items, the same hrefs, the same role
  // visibility. The operator's own expand/collapse choices are kept in state
  // and restored verbatim as soon as the sidebar returns to its full width.
  const shellState = usePxShellState();
  const railFlattened = shellState === 'rail';

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ── WP-088 responsive drawer (presentation only) ──────────────────────────
  // Below `md` the sidebar is an off-canvas drawer: the 264px column would
  // otherwise consume ~70% of a 375px viewport, leaving every authenticated
  // screen unusable. At `md`+ the original static column is unchanged.
  // Navigation structure, ordering, labels and route architecture are
  // untouched (frozen by KORA-WP-073).
  const drawer = useSidebarDrawer();
  const closeDrawer = drawer.close;
  const drawerOpen = drawer.open;

  // Close the drawer on navigation — otherwise it stays over the new page.
  useEffect(() => { closeDrawer(); }, [pathname, closeDrawer]);

  // Escape closes the drawer (standard dismissal for an overlay surface).
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeDrawer(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  return (
    <>
    {/* Backdrop — mobile only, dismisses the drawer on tap. Decorative: the
        drawer itself is reachable and dismissable via keyboard (Escape). */}
    {drawer.open && (
      <div
        aria-hidden="true"
        onClick={drawer.close}
        className="fixed inset-0 z-40 bg-black/40 md:hidden"
      />
    )}
    <aside
      id={SIDEBAR_DRAWER_ID}
      className={[
        // WP-125: width is owned by .px-nav so one rule drives all three shell
        // states (248 / 68 / drawer). The md: and translate classes below are
        // unchanged — they are the KORA-WP-088 mobile-drawer contract.
        'px-nav flex flex-col shrink-0 min-h-0',
        // mobile: fixed off-canvas drawer
        'fixed inset-y-0 left-0 z-50 overflow-y-auto transition-transform duration-200',
        drawer.open ? 'translate-x-0' : '-translate-x-full',
        // md+: original static column, always visible
        'md:static md:z-auto md:translate-x-0 md:overflow-visible md:transition-none',
      ].join(' ')}
    >
      {/* The aside stretches to the full page height so the dark column is
          continuous; this inner block is what actually pins. Keeping the
          pinned part to one viewport is what stops a long navigation from
          setting the document height (see globals.css, .px-nav-inner). */}
      <div className="px-nav-inner flex flex-col">
        {/* Logo — KoraLogo asset reale, variante on-dark */}
        <div
          className="px-nav-brand flex items-center"
          style={{
            paddingTop:    24,
            paddingBottom: 20,
            paddingLeft:   20,
            paddingRight:  18,
            borderBottom:  '1px solid var(--px-nav-line)',
            minHeight:     64,
          }}
        >
          <span className="px-nav-wordmark flex items-center">
            <KoraLogo variant="on-dark" className="h-[24px] w-auto" />
          </span>
          {/* Rail: the wordmark is hidden by CSS and this compact mark stands in,
              so the collapsed shell is still identifiably KORA. Brand geometry,
              not an icon — it appears once, in the shell (HANDOFF §19). */}
          <span
            className="px-nav-mark"
            aria-hidden="true"
            style={{
              display: 'none', width: 30, height: 30, borderRadius: 9,
              background: 'rgba(97,86,245,0.18)', border: '1px solid rgba(97,86,245,0.42)',
              color: PX.onViolet, fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em',
              alignItems: 'center', justifyContent: 'center', fontFamily: PX.sans,
            }}
          >
            K
          </span>
        </div>

        {/* Nav — skeleton while session is unresolved (zero hrefs in DOM) */}
        {isPending ? (
          <nav
            className="flex-1 min-h-0 overflow-y-auto py-4 px-2"
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
          className="flex-1 min-h-0 overflow-y-auto py-4 px-2"
          aria-label="Navigazione principale"
        >
          {groups.map((group, groupIdx) => {
            // For admin: use group id from ADMIN_NAV_GROUPS for collapse state.
            const adminGroup = isAdmin ? ADMIN_NAV_GROUPS[groupIdx] : null;
            const groupId    = adminGroup?.id ?? group.heading;
            const isExpanded = isAdmin ? (railFlattened || (expandedGroups[groupId] ?? false)) : true;

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
                    className="px-nav-group-label text-[10px] font-extrabold uppercase tracking-[0.12em] flex-1"
                    style={{ color: 'var(--px-nav-group-label)', fontFamily: PX.sans }}
                  >
                    {group.heading}
                  </p>
                  {group.groupBadge && group.badgeKey && (
                    <span
                      className="px-nav-badge"
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
                  <span className="px-nav-caret" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '8px', marginLeft: 2 }}>
                    {isExpanded ? '▾' : '▸'}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 pb-1.5">
                  <p
                    className="px-nav-group-label text-[10px] font-extrabold uppercase tracking-[0.12em]"
                    style={{ color: 'var(--px-nav-group-label)', fontFamily: PX.sans }}
                  >
                    {group.heading}
                  </p>
                  {group.groupBadge && group.badgeKey && (
                    <span
                      className="px-nav-badge"
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

                // WP-125 / HANDOFF §2 + §7: navigation is Product register, so
                // selection is Violet with an inset ring and a left edge marker —
                // never a plain filled block, and never an earth tone (HANDOFF §7
                // names an earth tone on a nav item a defect). Geometry only; the
                // route, label, role visibility and grouping are untouched.
                const sharedStyle: React.CSSProperties = {
                  position:      'relative',
                  fontFamily:    PX.sans,
                  margin:        '1px 8px',
                  display:       'flex',
                  alignItems:    'center',
                  justifyContent: 'space-between',
                  gap:           10,
                  borderRadius:  PX.rCtl,
                  padding:       '8px 10px',
                  fontSize:      '13px',
                  fontWeight:    600,
                  letterSpacing: '-0.005em',
                  transition:    `background ${PX.t1} ${PX.ease}, color ${PX.t1} ${PX.ease}`,
                  opacity:       isDisabled ? 0.40 : 1,
                  cursor:        isDisabled ? 'not-allowed' : 'pointer',
                  pointerEvents: isDisabled ? 'none' : undefined,
                  color:         isActive ? PX.onViolet : 'var(--px-nav-item)',
                  ...(isActive && !isDisabled
                    ? {
                        background: 'rgba(97,86,245,0.22)',
                        boxShadow:  `inset 0 0 0 1px ${PX.violetEdge}, inset 3px 0 0 ${PX.violet}`,
                      }
                    : {}),
                };

                // Rail glyph — presentation only. In the rail the label is
                // hidden visually but the item keeps its accessible name, so the
                // navigation MEANING is identical in all three shell states.
                const NavIcon = navIconFor(item.href);

                const innerContent = (
                  <>
                    <NavIcon
                      size={16}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="px-nav-icon"
                      style={{ flex: 'none', opacity: isActive ? 1 : 0.8 }}
                    />
                    <div className="px-nav-label" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      {/* KORA-WP-125 §3: canonical Product labels are never
                          shortened to fit the component. At the full 248px state
                          a long label wraps to at most two lines — no ellipsis —
                          so "KORA Link — Governance (Anteprima)" and
                          "Partner Ecosystem Model" read in full. The clamp keeps
                          row rhythm coherent; the accessible name is the whole
                          label regardless (aria-label on the link). */}
                      <span className="px-nav-text" style={{ display: 'block', lineHeight: 1.3 }}>
                        {item.label}
                      </span>
                      {item.description && (
                        <span className="px-nav-desc" style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.52)', fontWeight: 500, marginTop: 1, whiteSpace: 'normal', lineHeight: 1.25, fontFamily: PX.sans }}>
                          {item.description}
                        </span>
                      )}
                    </div>
                    <div className="px-nav-badge" style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 4 }}>
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
                      className="px-nav-item"
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
                    // The accessible name is stated explicitly so the collapsed
                    // rail, where the label is visually hidden, is identical to
                    // the full sidebar for assistive technology (HANDOFF §19).
                    aria-label={item.label}
                    title={item.label}
                    className="px-nav-item"
                    style={sharedStyle}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'var(--px-nav-item-hover)';
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
          className="px-nav-foot px-4 pt-3 pb-4 mt-auto"
          style={{ borderTop: '1px solid var(--px-nav-line)' }}
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
                border:      `1.5px solid ${TOKENS.accent}`,
                color:       TOKENS.accent,
                fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              }}
            >
              {roleLabel.charAt(0)}
            </div>
            <div className="px-nav-label flex-1 min-w-0">
              <p
                className="text-[10.5px] font-semibold leading-tight truncate"
                style={{ color: 'rgba(255,255,255,0.88)', fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}
              >
                {roleLabel}
              </p>
              {/* KORA-WP-125 / One Product / No Demo Runtime (Governance Patch 03,
                  2026-08-31): the automatic DEMO / LIVE / ROADMAP environment
                  badge is removed. It was an architecture-driven environment
                  indication in the authenticated Product, which the ruling
                  forbids; `tenant_kind` and data origin may never alter
                  customer-facing copy. The role label above is real session
                  context and stays. */}
            </div>
          </div>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
