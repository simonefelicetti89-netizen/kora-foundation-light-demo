'use client';

// components/company/living-koral/LivingKoralNav.tsx
// KORA-WP-115 — minimal two-item tab nav, the first real tab-switcher
// this Hub gets (WP-114 deliberately shipped zero tabs — doc 132 Part 11's
// own "no empty tabs" instruction; WP-115 is the first WP with genuine
// content for a second tab, pre-check 174 §16). Exactly two items —
// Overview, Editions — no History/Create/Review/Publish/Settings tab of
// any kind (this WP's own explicit boundary).

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const TABS = [
  { href: '/company/living-koral', label: 'Overview' },
  { href: '/company/living-koral/editions', label: 'Edizioni' },
] as const;

export function LivingKoralNav() {
  const pathname = usePathname();

  return (
    <nav style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: `1px solid ${TOKENS.inkBorder}` }}>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize: 13.5,
              fontWeight: active ? 700 : 600,
              color: active ? TOKENS.ink : TOKENS.inkSecondary,
              padding: '10px 4px',
              marginRight: 20,
              borderBottom: active ? `2px solid ${TOKENS.accent}` : '2px solid transparent',
              textDecoration: 'none',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
