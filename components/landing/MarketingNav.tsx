'use client';
// MarketingNav — shared navigation for KORA marketing pages (/ and /pilot).
// Accepts configurable links so each page keeps its own anchor/route structure.

import Link from 'next/link';
import { KoraLogo } from '@/components/brand/KoraLogo';
import styles from './marketing.module.css';

interface NavLink { label: string; href: string; }

interface MarketingNavProps {
  brandHref?: string;
  links?: NavLink[];
  loginHref?: string;
  ctaHref: string;
  ctaLabel: string;
}

export function MarketingNav({
  brandHref = '/',
  links = [],
  loginHref,
  ctaHref,
  ctaLabel,
}: MarketingNavProps) {
  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        <Link href={brandHref} className={styles.brand}>
          <KoraLogo variant="on-dark" className="h-[26px] w-auto" />
        </Link>
        <div className={styles.navLinks}>
          {links.map((l) => (
            <a key={l.label} className={styles.link} href={l.href}>{l.label}</a>
          ))}
          {loginHref && (
            <Link className={styles.navLogin} href={loginHref}>Accedi</Link>
          )}
          <a className={styles.navCta} href={ctaHref}>{ctaLabel}</a>
        </div>
      </div>
    </nav>
  );
}
