'use client';

import Link from 'next/link';
import { useRole } from '@/lib/demo-state';
import { getAccessibleRoutes, isEmployerRole, isWorkerRole, isAdminRole } from '@/lib/permissions';

interface NavItem {
  href: string;
  label: string;
}

function getNavItems(role: string): NavItem[] {
  const routes = getAccessibleRoutes(role as Parameters<typeof getAccessibleRoutes>[0]);
  const all: NavItem[] = [
    { href: '/admin', label: 'Admin' },
    { href: '/company', label: 'Executive Cockpit' },
    { href: '/company/kora-index', label: 'KORA Index' },
    { href: '/company/ingestion', label: 'AI Upload Studio' },
    { href: '/company/uef-review', label: 'UEF Review' },
    { href: '/company/scoring', label: 'Scoring Run' },
    { href: '/company/reports', label: 'Reports' },
    { href: '/company/activation', label: 'Activation' },
    { href: '/company/contribution', label: 'KORA Contribution' },
    { href: '/company/pillars', label: 'Pillars & Initiatives' },
    { href: '/company/data', label: 'Data & Evidence' },
    { href: '/company/financial', label: 'Financial Governance' },
    { href: '/my-kora', label: 'My KORA Home' },
    { href: '/my-kora/privacy', label: 'Privacy & Sharing' },
    { href: '/my-kora/dynamic-cv', label: 'Dynamic CV' },
    { href: '/my-kora/opportunities', label: 'Opportunities' },
    { href: '/my-kora/bookings', label: 'Bookings' },
    { href: '/my-kora/collective', label: 'Collective Impact' },
    { href: '/partner', label: 'Partner Workspace' },
    { href: '/advisor', label: 'Advisor Workspace' },
    { href: '/future-vision', label: 'Future Vision' },
  ];
  return all.filter((item) => routes.some((r) => r === item.href || item.href.startsWith(r + '/')));
}

export function Sidebar() {
  const { activeRole } = useRole();
  const navItems = getNavItems(activeRole);

  return (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-slate-50">
      <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
        Navigation
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-200 hover:text-slate-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-400">
        Role: {activeRole}
      </div>
    </aside>
  );
}
