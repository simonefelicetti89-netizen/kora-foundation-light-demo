// app/privacy/page.tsx — PUBLIC-PRIVACY-FOUNDATION-05
// Public privacy page. No authentication required, publicly indexable.
// Content is data-driven from lib/legal/privacy-content.ts — every statement
// there is either code/doc-verified or an explicit, always-visible
// placeholder. This page is not a substitute for legal/DPO review — see
// docs/PUBLIC_PRIVACY_FOUNDATION_05.md.

import { MarketingNav } from '@/components/landing/MarketingNav';
import { MarketingFooter } from '@/components/landing/MarketingFooter';
import { LegalSection } from '@/components/legal/LegalSection';
import {
  PRIVACY_SECTIONS,
  PRIVACY_DOCUMENT_VERSION,
  PRIVACY_LAST_UPDATED,
} from '@/lib/legal/privacy-content';

export const metadata = {
  title: 'Privacy · KORA',
  description:
    'Informativa privacy pubblica di KORA: categorie di dati trattati, finalità, fornitori tecnici, cookie e diritti degli interessati.',
};

const NAV_LINKS = [
  { label: '← Home', href: '/' },
  { label: 'Pilot', href: '/pilot' },
];

export default function PrivacyPage() {
  return (
    <div style={{ background: '#FAF9F6', minHeight: '100vh' }}>
      <MarketingNav links={NAV_LINKS} loginHref="/login" ctaHref="/pilot" ctaLabel="Scopri il pilot" />

      <main
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '64px 24px 80px',
          fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: 'rgba(6,3,43,0.40)',
            margin: '0 0 8px',
          }}
        >
          Privacy
        </p>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#06032B', margin: '0 0 20px', letterSpacing: '-0.02em' }}>
          Informativa privacy
        </h1>

        <p
          data-testid="privacy-legal-disclaimer"
          style={{
            fontSize: 13,
            lineHeight: 1.7,
            color: 'rgba(6,3,43,0.65)',
            background: 'rgba(6,3,43,0.04)',
            border: '1px solid rgba(6,3,43,0.10)',
            borderRadius: 10,
            padding: '14px 18px',
            margin: '0 0 32px',
          }}
        >
          Questa pagina descrive, sulla base del codice e della documentazione tecnica
          effettivamente esistenti in KORA, come vengono trattati i dati. <strong>Non è un
          parere legale, non costituisce certificazione di conformità GDPR e non sostituisce
          la revisione di un legale o di un Data Protection Officer.</strong> È distinta dai
          confini di privacy interni di KORA (le regole tecniche che impediscono all&apos;azienda
          di vedere i dati individuali del lavoratore, descritte in dettaglio nella
          documentazione tecnica del progetto) — questa pagina è l&apos;informativa
          rivolta all&apos;esterno, non la loro descrizione tecnica interna.
        </p>

        {PRIVACY_SECTIONS.map((section) => (
          <LegalSection key={section.id} section={section} />
        ))}

        <p
          data-testid="privacy-doc-version"
          style={{
            fontSize: 11,
            color: 'rgba(6,3,43,0.40)',
            borderTop: '1px solid rgba(6,3,43,0.08)',
            paddingTop: 16,
            marginTop: 24,
          }}
        >
          Versione documento {PRIVACY_DOCUMENT_VERSION} · Ultimo aggiornamento {PRIVACY_LAST_UPDATED}
        </p>
      </main>

      <MarketingFooter meth="synthetic_demo_data: true · KORA-METHOD-v0.1.0 · pre_empirical_calibration" />
    </div>
  );
}
