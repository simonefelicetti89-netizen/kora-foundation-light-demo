'use client';

// KORA-WP-129 Wave 4b (W3A remediation) — the first-access shell.
//
// THE DEFECT THIS EXISTS FOR: /worker/onboarding and /worker/setup-password are
// authenticated routes, so AppShell gave them the full Worker chrome — the
// complete workspace sidebar (My KORA Home, Personal Impact Balance, Dynamic
// Impact CV, Opportunità, KORA Space, Prenotazioni, and several preview items),
// plus the header's own identity chip and, on a narrow viewport, the drawer
// toggle that opens all of it. The surface therefore said "you are already
// inside the whole Product" while the flow said "you are still completing first
// access", and it offered a catalogue of destinations to someone who had not
// yet set a password or acknowledged the privacy boundary.
//
// This shell is the same Product shell in a quieter mode: one KORA identity,
// no directory, no preview items, no navigation affordance at any width.
// It is presentation only — see first-access-routes.ts.

import type { ReactNode } from 'react';
import { KoraLogo } from '@/components/brand/KoraLogo';
import { PX } from '@/lib/design/kora-design-tokens';
import styles from './entry-shell.module.css';

export function EntryShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell} data-px-shell="first-access">
      <header className={styles.top}>
        {/* The single identity signal. The normal shell carries three — the
            header's workspace chip, the sidebar wordmark and the route
            breadcrumb; here they would compete with the task. */}
        <KoraLogo variant="on-light" className="h-[22px] w-auto" />
        <span aria-hidden="true" style={{ width: 1, height: 18, background: PX.line2, flex: 'none' }} />
        <span className={styles.product} style={{ fontSize: 13, color: PX.ink2, fontFamily: PX.sans }}>
          My KORA
        </span>
      </header>
      <main id="main-content" aria-label="Contenuto principale" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
