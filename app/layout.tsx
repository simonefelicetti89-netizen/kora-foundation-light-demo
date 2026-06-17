import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Instrument_Serif, Playfair_Display, Hanken_Grotesk } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

// Plus Jakarta Sans — primary UI font (closest to General Sans available via Google Fonts)
const jakartaSans = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

// Playfair Display — editorial serif fallback for wide display sizes
const playfairDisplay = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

// Hanken Grotesk — banner privilegiato KORA service team (PrivilegedAccessBanner)
const hankenGrotesk = Hanken_Grotesk({
  variable: '--font-hanken',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

// Instrument Serif — editorial voice for page mastheads and section titles
const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KORA Foundation Light — Demo',
  description: 'KORA Foundation Light — Synthetic Demo Data — Pre-Empirical Calibration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="it"
      className={`${jakartaSans.variable} ${instrumentSerif.variable} ${playfairDisplay.variable} ${hankenGrotesk.variable} h-full antialiased`}
    >
      <body className="h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
