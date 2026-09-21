'use client';

// components/layout/nav-icons.tsx
// KORA-WP-125 — presentation-only glyph map for the collapsed navigation rail.
//
// The rail (HANDOFF §2) shows glyphs instead of labels, so every navigation
// item needs one. This map is PRESENTATION ONLY: it is keyed by href and
// changes no route, no label, no grouping, no role visibility and no
// information architecture — all of which remain governed by KORA-WP-073.
// Removing this file would degrade the rail's legibility and nothing else.
//
// Canonical icon family: lucide-react (HANDOFF §17 decision 2, §19).
// Sizing/stroke follow §19: 16px in navigation, 2px stroke, round caps/joins,
// no hard-coded colour — every glyph inherits currentColor from its item.

import {
  Activity, Award, BadgeCheck, BarChart3, Book, Briefcase, Building2, CalendarDays,
  ChartPie, CircleHelp, ClipboardCheck, Compass, Database, FileText, Gauge,
  Handshake, Heart, Layers, LifeBuoy, Link2, Lock, Send, Settings,
  ShieldCheck, Sparkles, Target, UploadCloud, UserRound, Users, Wallet,
  type LucideIcon,
} from 'lucide-react';

/** Longest-prefix wins, so a specific sub-route beats its parent. */
const ICON_BY_HREF: ReadonlyArray<readonly [string, LucideIcon]> = [
  // Company
  ['/company/kora-index', ChartPie],
  ['/company/ingestion', UploadCloud],
  ['/company/uef-review', ClipboardCheck],
  ['/company/scoring', Gauge],
  ['/company/reports', FileText],
  ['/company/activation', Activity],
  ['/company/financial', Wallet],
  ['/company/data', Database],
  ['/company/workspace', Building2],
  ['/company/commons', Users],
  ['/company/initiatives', Target],
  ['/company/living-koral', Sparkles],
  ['/company/privacy', Lock],
  ['/company/advisor', Handshake],
  ['/company', Building2],
  // Worker / My KORA
  ['/worker/dynamic-cv', Award],
  ['/worker/opportunities', Compass],
  ['/worker/bookings', CalendarDays],
  ['/worker/commons', Users],
  ['/worker/personal-impact-balance', Heart],
  ['/worker/privacy', Lock],
  ['/worker/workspace', UserRound],
  ['/worker', UserRound],
  ['/my-kora/privacy', Lock],
  ['/my-kora', UserRound],
  // Partner
  ['/partner/initiatives', Target],
  ['/partner/relationships', Handshake],
  ['/partner/kora-link', Link2],
  ['/partner/privacy-boundary', Lock],
  ['/partner/workspace', Briefcase],
  ['/partner', Briefcase],
  // Advisor
  ['/advisor', LifeBuoy],
  // Admin — one glyph per real ADMIN_NAV_GROUPS destination, so the rail is
  // navigable by shape and not a column of identical fallbacks.
  ['/admin/activation-signal-pipeline', Activity],
  ['/admin/advisor-governance', ShieldCheck],
  ['/admin/cases', ClipboardCheck],
  ['/admin/commons', Users],
  ['/admin/companies', Building2],
  ['/admin/data-intake', UploadCloud],
  ['/admin/data-lifecycle', Database],
  ['/admin/demo', Book],
  ['/admin/founder-validation', BadgeCheck],
  ['/admin/future-vision', Send],
  ['/admin/governance', ShieldCheck],
  ['/admin/impact-units', Gauge],
  ['/admin/kora-activation-layer', Sparkles],
  ['/admin/kora-link', Link2],
  ['/admin/kora-link/governance', ShieldCheck],
  ['/admin/kora-link/pilot-readiness', ClipboardCheck],
  ['/admin/operator', Settings],
  ['/admin/partner-ecosystem-model', Handshake],
  ['/admin/partners', Handshake],
  ['/admin/pipeline', Layers],
  ['/admin/platform/diagnostics', Activity],
  ['/admin/platform', Settings],
  ['/admin/privacy', Lock],
  ['/admin/reports', FileText],
  ['/admin/analytics', BarChart3],
  ['/admin/tenants', Building2],
  ['/admin/trial-control-center', Target],
  ['/admin/uef-review', ClipboardCheck],
  ['/admin/worker-initiatives', Target],
  ['/admin/workers', Users],
  ['/admin', Layers],
  // Shared
  ['/commons', Users],
  ['/account', UserRound],
  ['/demo', Book],
  ['/future-vision', Send],
];

export function navIconFor(href: string): LucideIcon {
  let best: LucideIcon = CircleHelp;
  let bestLen = -1;
  for (const [prefix, Icon] of ICON_BY_HREF) {
    if ((href === prefix || href.startsWith(prefix)) && prefix.length > bestLen) {
      best = Icon;
      bestLen = prefix.length;
    }
  }
  return best;
}
