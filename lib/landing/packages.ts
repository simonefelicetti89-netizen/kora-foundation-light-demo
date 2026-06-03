// lib/landing/packages.ts — single source of truth for Foundation Light packages & prices.
// Imported by both app/page.tsx (landing) and app/pilot/page.tsx.
// Edit here to keep prices in sync across all pages.

// Contact — used by pilot page form
export const PILOT_EMAIL = 'simonefelicetti89@gmail.com';

// Packages — prices must be identical between landing and pilot pages
export const PACKAGES = [
  {
    id:           'diagnostic',
    duration:     '4–6 settimane',
    nameLanding:  'Foundation Light Diagnostic',
    namePilot:    'Diagnostic',
    price:        '€7.500–12.000',
    priceNote:    'indicativo · dipende da perimetro e qualità dati',
    recommended:  false,
    items: [
      'Inventario e classificazione dati esistenti',
      'Eligibility Gate (Eligible / Limited / Blocked)',
      'KORA Index preliminare — 10 componenti',
      'Confidence Score e Activation Safeguard',
      'Activation Debt per pillar',
    ],
    deliverable: 'Board Pack Preview',
  },
  {
    id:           'pilot',
    duration:     '6–8 settimane',
    nameLanding:  'Foundation Light Pilot',
    namePilot:    'Pilot',
    price:        '€12.000–18.000',
    priceNote:    'include sessione advisor KORA e workshop esecutivo',
    recommended:  true,
    items: [
      'Tutto il pacchetto Diagnostic',
      'Budget-to-Human-Impact — lettura direzionale',
      'HR KPI preview (correlazione aggregata)',
      'Decision Pack completo — board-ready',
      'Workshop esecutivo (2 ore)',
    ],
    deliverable: 'Decision Pack + Workshop',
  },
  {
    id:           'strategic',
    duration:     '8–10 settimane',
    nameLanding:  'Strategic Pilot',
    namePilot:    'Strategic',
    price:        '€18.000–25.000',
    priceNote:    'multi-sito o multi-reparto · advisor incluso',
    recommended:  false,
    items: [
      'Tutto il pacchetto Pilot',
      'Multi-sito o multi-reparto',
      'Roadmap di riallocazione budget dettagliata',
      'Board workshop C-suite',
      'Preparazione per fase Pilot Calibration',
    ],
    deliverable: 'Decision Pack + Board Workshop + Roadmap',
  },
] as const;

export type Package = (typeof PACKAGES)[number];
