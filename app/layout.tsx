import type { Metadata } from 'next';
import { Geist, Geist_Mono, Space_Grotesk, DM_Sans } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const geistSans    = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono    = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

// KORA font substitutes — proprietary Register 2 / Register 3 not present in repo.
// Space Grotesk: editorial/institutional display (Register 2 substitute)
// DM Sans: interface/dashboard text (Register 3 substitute)
const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});
const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KORA Foundation Light — Demo',
  description: 'KORA Foundation Light v0.1 — Synthetic Demo Data — Pre-Empirical Calibration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
