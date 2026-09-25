import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentKoraUser } from '@/lib/auth/kora-session';
import type { KoraRole } from '@/lib/types';

// KORA-WP-139 — Plus Jakarta Sans is the ONE Product UI family.
//
// Three families were removed here. Instrument Serif and Playfair Display were
// LOADED AND NEVER USED — their CSS variables appeared in this file and nowhere
// else in the Product, so every visitor paid for two font downloads that
// rendered no text. Hanken Grotesk had three real consumers, all migrated.
//
// '800' is new: the canonical `display` role is weight 800, and the previous
// load stopped at 700. It costs nothing on a variable Google source, and 750 —
// which the WP-124 prototype used — is deliberately NOT requested, because it
// is not a statically loadable instance.
const jakartaSans = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});




export const metadata: Metadata = {
  title: 'KORA Foundation Light — Demo',
  description: 'KORA Foundation Light — Synthetic Demo Data — Pre-Empirical Calibration',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let initialRole: KoraRole | null = null;
  try {
    const currentUser = await getCurrentKoraUser();
    initialRole = (currentUser?.koraRole as KoraRole) ?? null;
  } catch {
    initialRole = null;
  }

  return (
    <html
      lang="it"
      className={`${jakartaSans.variable} h-full antialiased`}
    >
      <body className="h-full">
        <AppShell initialRole={initialRole}>{children}</AppShell>
      </body>
    </html>
  );
}
