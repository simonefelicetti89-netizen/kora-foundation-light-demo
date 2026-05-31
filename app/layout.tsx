import type { Metadata } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
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
      className={`${inter.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
