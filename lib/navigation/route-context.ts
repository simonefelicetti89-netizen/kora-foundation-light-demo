// lib/navigation/route-context.ts
// KORA-WP-125 — route context for the shared top chrome.
//
// Derived ENTIRELY from canonical navigation metadata that already exists:
// buildNavGroups() (the same function the Sidebar renders from) and
// ADMIN_NAV_GROUPS. Nothing here invents a destination, a label, a grouping or
// a capability — it reads the navigation model and reports where the operator
// currently is. If a route is not in the navigation model, the context is
// simply absent and the chrome shows less, never something made up.

import { buildNavGroups } from '@/components/layout/Sidebar';
import { ADMIN_NAV_GROUPS } from '@/lib/navigation/admin-nav-groups';

export interface RouteContext {
  /** The navigation group the current route belongs to, when it has one. */
  section: string | null;
  /** The navigation item's own canonical label, when the route is a nav item. */
  page: string | null;
}

/** Canonical identity for legitimate Product routes that are deliberately not
 *  navigation destinations. Each pair is transcribed from the route's own
 *  canonical naming — see the binding rule inside resolveRouteContext(). */
const CANONICAL_ROUTE_IDENTITY: ReadonlyArray<readonly [string, RouteContext]> = [
  // KORA-WP-032 "Advisor Governance: Qualification Grant, Manual First-Pilot".
  // Section = the WP's own domain name; page = the heading the route renders.
  ['/admin/advisor-governance', { section: 'Advisor Governance', page: 'Concessione Qualifiche Advisor' }],
  // KORA-WP-003 account surface, reached from the account menu, not the nav.
  ['/account', { section: 'Account', page: 'Il tuo account' }],
];

/** Longest-matching nav item wins, so a sub-route resolves to itself and not
 *  to its parent. A canonical-identity entry wins over a shorter nav prefix by
 *  the same longest-match rule. Returns nulls rather than a guess when nothing
 *  matches — the chrome shows less, never something invented. */
export function resolveRouteContext(
  pathname: string,
  role: string,
  activeCompanyId?: string,
  isAdminPreview = false,
): RouteContext {
  const groups = role === 'KORA_ADMIN'
    ? ADMIN_NAV_GROUPS.map((g) => ({ heading: g.label, items: g.items }))
    : buildNavGroups(role, activeCompanyId, isAdminPreview).map((g) => ({ heading: g.heading, items: g.items }));

  let best: RouteContext = { section: null, page: null };
  let bestLen = -1;

  // Legitimate Product routes that are not navigation destinations still need
  // context — a route is not "less real" because it is reached from inside
  // another surface rather than from the sidebar. KORA-WP-125 §4 is explicit
  // that a navigation entry must NOT be invented merely to produce a
  // breadcrumb, so these are resolved separately, below the nav lookup.
  //
  // RULE FOR ADDING AN ENTRY (binding): both strings must be copied from the
  // page's own canonical identity — its established WP name and its rendered
  // heading — never composed, prettified or guessed from the URL. If a route
  // has no canonical identity to copy, it gets no context and the chrome
  // simply shows less.
  for (const [prefix, ctx] of CANONICAL_ROUTE_IDENTITY) {
    const matches = pathname === prefix || pathname.startsWith(`${prefix}/`);
    if (matches && prefix.length > bestLen) {
      best = ctx;
      bestLen = prefix.length;
    }
  }

  for (const group of groups) {
    for (const item of group.items) {
      const href = item.href.split('#')[0];
      if (!href) continue;
      const matches = pathname === href || pathname.startsWith(href.endsWith('/') ? href : `${href}/`);
      if (matches && href.length > bestLen) {
        best = { section: group.heading, page: item.label };
        bestLen = href.length;
      }
    }
  }
  return best;
}
