// Feature discovery configuration — cockpit cards, discovery strip, admin quickstart.
// Pure data — no services, no Supabase, no scoring imports.
// Imported by UI components and by tests.

export interface FeatureCard {
  id:       string;
  headline: string;
  sentence: string;
  cta:      string;
  href:     string;
}

export interface DiscoveryItem {
  id:    string;
  label: string;
  href:  string;
}

export interface QuickStartStep {
  step:   number;
  label:  string;
  href:   string;
}

// 4 feature cards shown in the "Cosa ha trovato KORA" section of the cockpit.
export const COCKPIT_FEATURE_CARDS: FeatureCard[] = [
  {
    id:       'executive-intelligence',
    headline: 'Executive Intelligence™',
    sentence: 'KORA Index, Activation Safeguard, Confidence Score e 10 componenti spiegati in chiaro.',
    cta:      'Vedi dettaglio',
    href:     '/company/kora-index',
  },
  {
    id:       'activation-opportunities',
    headline: 'Opportunità di attivazione',
    sentence: '20 regole deterministiche identificano le azioni prioritarie per migliorare il KORA Index.',
    cta:      'Vedi opportunità',
    href:     '/company/opportunities',
  },
  {
    id:       'worker-space',
    headline: 'Worker Space',
    sentence: "Adozione lavoratori, My KORA Preview e layer privato. Solo aggregati visibili all'azienda.",
    cta:      'Apri Worker Space',
    href:     '/company/workspace',
  },
  {
    id:       'evidence-intelligence',
    headline: 'Evidence Intelligence™',
    sentence: 'Confidence Score, Verification Rate e qualità evidenza su ogni Impact Unit.',
    cta:      'Decision Pack',
    href:     '/company/reports',
  },
];

// Compact feature chips — "KORA ora include" strip at top of cockpit.
export const DISCOVERY_STRIP_ITEMS: DiscoveryItem[] = [
  { id: 'exec-intel',    label: 'Executive Intelligence™',   href: '/company/kora-index' },
  { id: 'opportunities', label: 'Opportunità di attivazione', href: '/company/opportunities' },
  { id: 'worker-space',  label: 'Worker Space',               href: '/company/workspace' },
  { id: 'evidence',      label: 'Evidence Intelligence™',     href: '/company/reports' },
  { id: 'board-pack',    label: 'Decision Pack',              href: '/company/reports' },
];

// 7-step live onboarding workflow for KORA Admin quick-start panel.
export const ADMIN_QUICKSTART_STEPS: QuickStartStep[] = [
  { step: 1, label: 'Crea Azienda Live',    href: '/admin/companies/new' },
  { step: 2, label: 'Aggiungi Utente',      href: '/admin/company-users' },
  { step: 3, label: 'Carica Dati',          href: '/admin/data-intake' },
  { step: 4, label: 'Rivedi UEF',           href: '/admin/uef-review' },
  { step: 5, label: 'Avvia Scoring',        href: '/admin/uef-review' },
  { step: 6, label: 'Apri Decision Pack',   href: '/admin/company-live-preview' },
  { step: 7, label: 'Workspace Azienda',    href: '/admin/company-workspace' },
];
