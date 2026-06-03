/**
 * KORA Experience Doctrine
 *
 * Every page in KORA must answer seven questions:
 *   1. Why am I here?
 *   2. What is the most important thing to understand?
 *   3. What changed?
 *   4. Why did it change?
 *   5. What should I do next?
 *   6. What can I trust?
 *   7. What is outside the confidence/privacy/methodology boundary?
 *
 * If a page does not answer these, it must be redesigned or removed.
 *
 * Page types in KORA:
 *
 *   COMMAND     — flagship decision pages (Executive Cockpit, KORA Index™)
 *   INTELLIGENCE — analytical deep-dives (Financial, Activation, Contribution, Pillars)
 *   EVIDENCE    — data intake, reporting (Data, Reports)
 *   NETWORK     — ecosystem/shared spaces
 *   GOVERNANCE  — methodology, privacy, settings
 *   CONTROL     — admin/operator pages
 *   PERSONAL    — worker-owned private spaces
 *
 * Copy rules:
 *   - Precise, executive, methodological, human, non-marketing, decision-oriented.
 *   - No filler. No vague labels. No unexplained acronyms.
 *   - Every proprietary term uses ™ on first appearance in page/card title.
 *
 * Navigation rules:
 *   - Sidebar communicates the logic of KORA, not a list of routes.
 *   - Groups are named for what they DO (Command, Intelligence, Evidence),
 *     not what they ARE (Settings, Reports, Data).
 *
 * Chart rules:
 *   - Every chart must support a specific decision.
 *   - Tooltips must include: metric, value, period, interpretation.
 *   - No decorative charts.
 *   - Colors: terracotta primary, cosmic blue structure, green=positive, amber=warning, red=critical.
 *
 * Card rules:
 *   - Every card has a reason to exist.
 *   - KPI cards show: value + label + period + status.
 *   - Insight cards show: signal + finding + implication.
 *   - Methodology cards show: scope + boundary + confidence.
 */

export const KORA_PAGE_TYPES = {
  COMMAND:      'command',
  INTELLIGENCE: 'intelligence',
  EVIDENCE:     'evidence',
  NETWORK:      'network',
  GOVERNANCE:   'governance',
  CONTROL:      'control',
  PERSONAL:     'personal',
} as const;

export type KoraPageType = typeof KORA_PAGE_TYPES[keyof typeof KORA_PAGE_TYPES];

// Canonical decision questions per page
export const PAGE_DECISION_CONTEXT: Record<string, string> = {
  '/company':              'Qual è lo stato dell\'attivazione umana e dove devo agire?',
  '/company/kora-index':   'Come si costruisce il punteggio e cosa lo vincola?',
  '/company/financial':    'Come si converte il budget welfare in attivazione profonda?',
  '/company/activation':   'Chi non viene raggiunto e dove si accumula l\'Activation Debt™?',
  '/company/reports':      'Quali output posso portare al board e agli advisor ESG?',
  '/company/contribution': 'Come contribuisce l\'organizzazione oltre il perimetro interno?',
  '/company/pillars':      'Quale distribuzione hanno le iniziative tra i 5 pilastri?',
  '/company/shared':       'Quali informazioni aggregate posso condividere internamente?',
  '/company/data':         'Quale è la qualità e completezza dei dati attualmente caricati?',
  '/company/profile':      'Qual è lo stato dell\'onboarding e della readiness dati?',
  '/my-kora':              'Come sta crescendo la tua attivazione e cosa puoi fare oggi?',
  '/partner':              'Quali richieste sono attive e cosa richiede il protocollo KORA?',
  '/advisor':              'Cosa richiede revisione e quale evidenza è ancora incerta?',
  '/admin':                'Qual è lo stato operativo della piattaforma KORA?',
  '/future-vision':        'Dove sta andando KORA e quali fasi si sbloccano progressivamente?',
} as const;
