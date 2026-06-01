// PL-01: Foundation Light Pilot — commercial packaging page
// Static. No backend. No forms. No live data.

import Link from 'next/link';
import { PageMasthead } from '@/components/ui/PageMasthead';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { TOKENS } from '@/lib/design/kora-design-tokens';

// ── Data ─────────────────────────────────────────────────────────────────────

const PACKAGES = [
  {
    id: 'diagnostic',
    title: 'Foundation Light Diagnostic',
    duration: '4–6 settimane',
    price: '€7.500–12.000',
    priceNote: 'indicativo · dipende da perimetro e qualità dati disponibili',
    highlight: false,
    items: [
      'Un perimetro aziendale',
      'Inventario e classificazione dati esistenti',
      'Eligibility Gate (Eligible / Limited / Blocked)',
      'KORA Index preliminare — 10 componenti',
      'Confidence Score e Activation Safeguard',
      'Activation Debt per pillar',
      'Board Pack Preview',
    ],
    deliverable: 'Board Pack Preview',
  },
  {
    id: 'pilot',
    title: 'Foundation Light Pilot',
    duration: '6–8 settimane',
    price: '€12.000–18.000',
    priceNote: 'indicativo · include sessione advisor KORA e workshop esecutivo',
    highlight: true,
    items: [
      'Tutto il pacchetto Diagnostic',
      'Mapping approfondito Budget Evidence',
      'Budget-to-Human-Impact — lettura direzionale',
      'HR KPI preview (correlazione aggregata)',
      'Decision Pack completo — board-ready',
      'Revisione advisor KORA',
      'Workshop esecutivo (2 ore)',
    ],
    deliverable: 'Decision Pack + Workshop',
  },
  {
    id: 'strategic',
    title: 'Strategic Pilot',
    duration: '8–10 settimane',
    price: '€18.000–25.000',
    priceNote: 'indicativo · multi-sito o multi-reparto · advisor incluso',
    highlight: false,
    items: [
      'Tutto il pacchetto Pilot',
      'Multi-sito o multi-reparto',
      'Inventario dati approfondito per cluster',
      'Analisi gap per sede (privacy-safe, N ≥ 10)',
      'Roadmap di riallocazione budget dettagliata',
      'Board workshop C-suite',
      'Preparazione per fase Pilot Calibration',
    ],
    deliverable: 'Decision Pack + Board Workshop + Roadmap',
  },
] as const;

const WHAT_YOU_GET = [
  { title: 'Inventario dati',         desc: 'Classificazione di ogni fonte dati disponibile: welfare, formazione, HR, ESG, eventi aziendali. Base documentale per tutto il pilot.' },
  { title: 'Eligibility Gate',        desc: 'Ogni tipologia di evento classificata: Eligible (genera Impact Units), Limited (Economic Relief, 0 IU) o Blocked (compliance obbligatoria, 0 IU). Con motivazione metodologica per ogni categoria.' },
  { title: 'Budget Evidence Review',  desc: 'Valutazione della qualità delle fonti budget: Documentato, Dichiarato, Stimato, Non valorizzato. La qualità determina il peso nel BTI engine e influenza il Confidence Score.' },
  { title: 'Budget-to-Human-Impact',  desc: 'Prima lettura direzionale di quanto il budget people e welfare si converte in attivazione verificata. Composizione: attivazione profonda vs benefit monetari.' },
  { title: 'Activation Debt',         desc: 'Stima del budget non convertito in Impact Units, distribuito per pillar (LIFE, GROWTH, CONNECTION, IMPACT, LEGACY) e sede — aggregato, nessun dato individuale.' },
  { title: 'KORA Index preliminare',  desc: 'Indice organizzativo a 10 componenti con macroblocchi (Reach, Quality, Equity, BTI). Accompagnato da Confidence Score esterno e Activation Safeguard (CLEAR / WARNING / FLAGGED).' },
  { title: 'Confidence Score',        desc: 'Indicatore esterno di affidabilità dati, separato dal KORA Index (peso = 0 nel punteggio). Segnala quanto le conclusioni sono basate su fonti verificate vs dichiarate o stimate.' },
  { title: 'HR KPI preview',          desc: 'Lettura direzionale aggregata di segnali HR (turnover, engagement, assenteismo) correlati all\'attivazione. Associativo — correlazione ≠ causalità. Solo pacchetto Pilot e Strategic.' },
  { title: 'Decision Pack / Board Pack', desc: 'Report strutturato e board-ready: KORA Index, distribuzione pillar, BTI, Activation Debt, next actions, note metodologiche. Esportabile come PDF dal browser.' },
  { title: 'Workshop esecutivo',      desc: 'Sessione di lettura e interpretazione del Decision Pack con il team direzionale. Identificazione delle priorità di riallocazione. Solo pacchetto Pilot e Strategic.' },
] as const;

const DATA_REQUIRED = [
  { label: 'Workers aggregati',              desc: 'Headcount per dipartimento e sede — organigramma sintetico. Nessun nominativo individuale. N ≥ 10 per segmento. Necessario per AR/MAR e segmentazione privacy-safe.', required: true },
  { label: 'Initiatives',                   desc: 'Lista iniziative/programmi aziendali con tipologia, pillar indicativo e budget (anche dichiarato). Anche in forma di policy o accordo sindacale.', required: true },
  { label: 'Participation',                 desc: 'Utilizzo aggregato per iniziativa, dipartimento e sede. Nessun nominativo. N ≥ 10 per segmento. Base per la stima AR/MAR e Activation Debt.', required: true },
  { label: 'Registri budget welfare / people', desc: 'Budget allocato e utilizzato per categoria di iniziativa. Anche dichiarato se non documentato — verrà classificato nella Budget Evidence review.', required: true },
  { label: 'Export provider welfare / LMS', desc: 'File dal provider welfare (es. Easy Welfare, Jointly) o LMS. Supplemento opzionale — integra il Data Pack aziendale ma non è richiesto per avviare il pilot.', required: false },
  { label: 'HR KPI aggregati',             desc: 'Turnover, assenteismo, engagement survey (se disponibili). Opzionale — arricchisce l\'HR KPI preview. Aggregati di dipartimento, non individuali.', required: false },
] as const;

const PHASES = [
  { n: '01', title: 'Kickoff & Inventario Dati',           desc: 'Definizione del perimetro aziendale. Raccolta e verifica dei dataset disponibili. Prima valutazione della qualità e completezza.',                                                            output: 'Data inventory checklist' },
  { n: '02', title: 'Invio File & Mapping / Budget Evidence', desc: 'L\'azienda invia i file a KORA. KORA normalizza e classifica la Budget Evidence (Documentato / Dichiarato / Stimato). Preparazione per l\'Eligibility Gate.',                         output: 'Budget Evidence classification' },
  { n: '03', title: 'Eligibility Gate & Classificazione',  desc: 'Ogni record classificato: Eligible → genera IU, Limited → solo BTI, Blocked → governance. Output: tassonomia KORA completa dei programmi aziendali.',                                      output: 'Eligibility Gate report' },
  { n: '04', title: 'KORA Index / BTI / Activation Debt',  desc: 'Calcolo KORA Index (10 componenti, 4 macroblocchi), Confidence Score, Activation Safeguard. Budget-to-Human-Impact. Activation Debt per pillar e sede.',                                output: 'KORA Index + BTI + Debt' },
  { n: '05', title: 'Decision Pack & Workshop Esecutivo',  desc: 'Consolidamento in Decision Pack board-ready. Revisione advisor (pacchetti Pilot e Strategic). Workshop di lettura con C-suite. Roadmap di intervento.',                                  output: 'Decision Pack + Workshop' },
] as const;

const FAQS = [
  { q: 'È una piattaforma welfare o un marketplace di servizi?',       a: 'No. KORA non eroga benefit, non gestisce voucher, non ha un catalogo servizi. È uno strumento di misurazione e intelligence — misura l\'attivazione organizzativa prodotta dalla spesa welfare e people, non la spesa stessa.' },
  { q: 'È un sistema di monitoraggio HR o di valutazione dei lavoratori?', a: 'No. KORA misura l\'organizzazione, non gli individui. Il KORA Index è un output company-level. Nessun nominativo, nessun ranking, nessun PIB individuale è visibile al datore di lavoro. Privacy N ≥ 10 per segmento.' },
  { q: 'Avete bisogno di dati individuali dei lavoratori?',           a: 'No. Il pilot lavora su dati aggregati per tipologia di iniziativa, dipartimento e sede. Nessun file con nomi, codici fiscali o dati personali individuali è richiesto o accettato in Foundation Light.' },
  { q: 'È una certificazione ESG o una conformità normativa?',        a: 'No. KORA Foundation Light è in pre_empirical_calibration — output direzionale, non certificato. Supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate e spiegabili, ma non garantisce conformità normativa e non sostituisce consulenza ESG, legale o assurance.' },
  { q: 'Si può partire da file Excel o CSV?',                         a: 'Sì. Foundation Light è progettato per partire da export standard: welfare provider, LMS, gestionale HR, file budget. Non richiede integrazioni API o database aziendali. Un file Excel ben strutturato è sufficiente per avviare il pilot.' },
  { q: 'Quanto sono affidabili gli output?',                          a: 'Dipende dalla qualità e completezza delle evidenze fornite — ed è esattamente quello che misura il Confidence Score (CS). Un CS alto (es. 70%+) indica evidenze verificate e documentate. Un CS basso segnala dati parziali o dichiarati. Ogni output è accompagnato dal CS e dall\'etichetta pre_empirical_calibration.' },
  { q: 'Cosa succede se le evidenze budget sono incomplete o mancanti?', a: 'I record vengono comunque classificati nell\'Eligibility Gate, ma la loro qualità viene marcata come "Stimato" o "Non valorizzato" nella Budget Evidence review. Il contributo al BTI engine è ridotto o marcato low-confidence. Il Confidence Score scende di conseguenza — segnalando dove il dato è debole.' },
] as const;

const OUTPUT_LINKS = [
  { label: 'Board Pack Preview',     href: '/company/reports/board-pack', desc: 'Visualizza il Board Pack del pilot demo — Meridiana Group S1' },
  { label: 'Executive Cockpit',      href: '/company',                    desc: 'KORA Index, CS, Safeguard, priorità operative' },
  { label: 'Stato Dati & Evidenze',  href: '/company/data',               desc: 'Stato dati ricevuti da KORA — elaborazione Operator' },
  { label: 'KORA Index — Dettaglio', href: '/company/kora-index',         desc: '10 componenti, macroblocchi, Eligibility Gate' },
  { label: 'Activation & Debt',      href: '/company/activation',         desc: 'Distribuzione per pillar e sede, Activation Debt' },
  { label: 'Budget-to-Human-Impact', href: '/company/financial',          desc: 'Budget-to-activation, attivazione profonda, HR KPI' },
  { label: 'Roadmap Architetturale', href: '/future-vision',              desc: 'Dove va KORA dopo Foundation Light' },
] as const;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PilotPage() {
  return (
    <div className="space-y-5">

      {/* 1. PageMasthead */}
      <PageMasthead
        eyebrow="Offerta commerciale · Foundation Light v0.1"
        title="KORA Foundation Light Pilot"
        subline="Un percorso guidato per trasformare dati welfare, people, formazione e iniziative aziendali in una prima lettura di attivazione umana, Budget-to-Human-Impact e decisioni operative."
        meta="Non è un SaaS self-service. È un prodotto diagnostico guidato — ogni pilot è supportato dal team KORA."
      />

      {/* Badge chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Guided Pilot',              bg: TOKENS.ink,                 text: '#FFFFFF' },
          { label: '4–10 settimane',            bg: TOKENS.inkBorder,           text: TOKENS.inkSecondary },
          { label: 'Excel / CSV ready',         bg: TOKENS.inkBorder,           text: TOKENS.inkSecondary },
          { label: 'Board Pack Preview',        bg: TOKENS.safeguard.pass.bg,   text: TOKENS.safeguard.pass.text },
          { label: 'No worker surveillance',    bg: TOKENS.inkBorder,           text: TOKENS.inkSecondary },
          { label: 'pre_empirical_calibration', bg: TOKENS.safeguard.watch.bg,  text: TOKENS.safeguard.watch.text },
        ].map(({ label, bg, text }) => (
          <span key={label} style={{ fontSize: '10px', fontWeight: 600, background: bg, color: text, borderRadius: 4, padding: '3px 8px', fontFamily: label === 'pre_empirical_calibration' ? 'monospace' : undefined }}>
            {label}
          </span>
        ))}
      </div>

      {/* Quick metric strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Durata',       value: '4–10 sett.' },
          { label: 'Investimento', value: '€7.500–25k' },
          { label: 'Deliverable',  value: 'Decision Pack' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '1.5rem', color: TOKENS.ink, marginTop: 6, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: TOKENS.cardBorder }} />

      {/* 2. Cosa ottiene l'azienda */}
      <SectionLabel>Cosa ottiene l&apos;azienda</SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        {WHAT_YOU_GET.map((item) => (
          <div key={item.title} style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '0.875rem' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink, marginBottom: 4 }}>{item.title}</p>
            <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ borderTop: TOKENS.cardBorder }} />

      {/* 3. Dati richiesti */}
      <SectionLabel>Dati richiesti all&apos;azienda</SectionLabel>
      <div style={{ background: TOKENS.safeguard.pass.bg, border: `1px solid ${TOKENS.safeguard.pass.dot}44`, borderRadius: TOKENS.cardRadius, padding: '1rem 1.25rem', marginBottom: 12 }}>
        <p style={{ fontSize: '12.5px', fontWeight: 600, color: TOKENS.safeguard.pass.text, marginBottom: 4 }}>
          Perimetro company-enabled — nessun dato individuale richiesto.
        </p>
        <p style={{ fontSize: '11px', color: TOKENS.safeguard.pass.text, lineHeight: 1.65 }}>
          Foundation Light misura come fondi e iniziative aziendali vengono attivati dai lavoratori — non cosa fanno nella loro vita privata.
          Input attesi: Workers aggregati, Initiatives, Participation (+ Registri budget). Export provider welfare/LMS opzionali.
          Nessun upload individuale lavoratore: i lavoratori non inviano file alla pipeline KORA in Foundation Light Pilot.
        </p>
      </div>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, overflow: 'hidden' }}>
        {DATA_REQUIRED.map((row, i) => (
          <div key={row.label} style={{ display: 'flex', gap: 16, padding: '12px 16px', borderBottom: i < DATA_REQUIRED.length - 1 ? TOKENS.cardBorder : 'none' }}>
            <div style={{ flexShrink: 0, paddingTop: 2 }}>
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: 4, padding: '2px 7px', background: row.required ? TOKENS.ink : TOKENS.inkBorder, color: row.required ? '#FFFFFF' : TOKENS.inkHint }}>
                {row.required ? 'Richiesto' : 'Opzionale'}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink, marginBottom: 3 }}>{row.label}</p>
              <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>{row.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 8 }}>
        I file vengono inviati a KORA in formato Excel o CSV. Nessuna integrazione API richiesta in Foundation Light.
        KORA Operator analizza, classifica ed elabora i file prima di produrre il KORA Index.
      </p>
      <div style={{ marginTop: 8 }}>
        <Link
          href="/admin/companies/data-intake"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 6, border: TOKENS.cardBorder, background: TOKENS.inkBorder, padding: '8px 14px', fontSize: '12px', fontWeight: 500, color: TOKENS.inkSecondary, textDecoration: 'none' }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Demo: Data Intake Studio (strumento KORA Operator) →
        </Link>
      </div>

      <div style={{ borderTop: TOKENS.cardBorder }} />

      {/* 4. Il percorso pilot */}
      <SectionLabel>Il percorso pilot — 5 fasi</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, overflow: 'hidden' }}>
        {PHASES.map((phase, i) => (
          <div key={phase.n} style={{ display: 'flex', gap: 20, padding: '14px 20px', borderBottom: i < PHASES.length - 1 ? TOKENS.cardBorder : 'none' }}>
            <div style={{ flexShrink: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: TOKENS.ink, color: '#FFFFFF', fontSize: '11px', fontWeight: 700 }}>
                {phase.n}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <p style={{ fontSize: '12.5px', fontWeight: 600, color: TOKENS.ink }}>{phase.title}</p>
                <span style={{ flexShrink: 0, fontSize: '9px', fontWeight: 600, background: TOKENS.inkBorder, color: TOKENS.inkSecondary, borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                  {phase.output}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6, marginTop: 3 }}>{phase.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: TOKENS.cardBorder }} />

      {/* 5. Pacchetti pilot */}
      <SectionLabel>Pacchetti pilot — prezzi indicativi</SectionLabel>
      <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 16, lineHeight: 1.6 }}>
        Il costo finale dipende da perimetro aziendale, qualità e completezza dei dati, numero di siti coinvolti e coinvolgimento advisor.
        Ogni pilot inizia con una valutazione preliminare di fattibilità dati — senza impegno automatico.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            style={{
              background:   pkg.highlight ? `rgba(97,86,245,0.04)` : TOKENS.surface,
              border:       pkg.highlight ? `2px solid ${TOKENS.accent}` : TOKENS.cardBorder,
              borderRadius: TOKENS.cardRadius,
              padding:      '1.25rem',
              display:      'flex', flexDirection: 'column', gap: 16,
              position:     'relative',
            }}
          >
            {pkg.highlight && (
              <span style={{ position: 'absolute', top: -12, left: 16, fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: TOKENS.accent, color: '#FFFFFF', borderRadius: 4, padding: '2px 8px' }}>
                Raccomandato
              </span>
            )}
            <div>
              <span style={{ fontSize: '9px', fontWeight: 600, background: pkg.highlight ? `${TOKENS.accent}14` : TOKENS.inkBorder, color: pkg.highlight ? TOKENS.accent : TOKENS.inkSecondary, borderRadius: 4, padding: '2px 7px' }}>
                {pkg.duration}
              </span>
              <p style={{ fontSize: '13px', fontWeight: 700, color: TOKENS.ink, marginTop: 8, lineHeight: 1.3 }}>{pkg.title}</p>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              {pkg.items.map((item) => (
                <li key={item} style={{ display: 'flex', gap: 8, fontSize: '11px', color: TOKENS.inkSecondary }}>
                  <span style={{ flexShrink: 0, color: TOKENS.inkHint, marginTop: 1 }}>·</span>
                  {item}
                </li>
              ))}
            </ul>
            <div style={{ borderTop: pkg.highlight ? `1px solid ${TOKENS.accent}33` : TOKENS.cardBorder, paddingTop: 12 }}>
              <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '2rem', color: TOKENS.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em', lineHeight: 1 }}>{pkg.price}</p>
              <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 3, lineHeight: 1.5 }}>{pkg.priceNote}</p>
              <p style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.inkSecondary, marginTop: 6 }}>Deliverable: {pkg.deliverable}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, background: TOKENS.inkBorder, borderRadius: TOKENS.cardRadius, padding: '0.875rem 1rem', fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
        Prezzi indicativi senza IVA. Il costo esatto viene definito dopo la valutazione preliminare di fattibilità dati.
        Advisory opzionale aggiuntiva disponibile a sessione (€1.500–3.000/sessione).
        Nessun abbonamento SaaS automatico — Foundation Light è un prodotto diagnostico guidato.
      </div>

      <div style={{ borderTop: TOKENS.cardBorder }} />

      {/* 6. FAQ */}
      <SectionLabel>Domande frequenti</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, overflow: 'hidden' }}>
        {FAQS.map((faq, i) => (
          <div key={i} style={{ padding: '14px 20px', borderBottom: i < FAQS.length - 1 ? TOKENS.cardBorder : 'none' }}>
            <p style={{ fontSize: '12.5px', fontWeight: 600, color: TOKENS.ink, marginBottom: 5 }}>{faq.q}</p>
            <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>{faq.a}</p>
          </div>
        ))}
      </div>

      <div style={{ borderTop: TOKENS.cardBorder }} />

      {/* 7. Cosa NON è */}
      <SectionLabel>Cosa NON è il Foundation Light Pilot</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, overflow: 'hidden' }}>
        {[
          'Non è un SaaS self-service: ogni pilot è guidato e supportato dal team KORA.',
          'Non è una piattaforma welfare, HR software o marketplace di servizi.',
          'Non è un sistema di sorveglianza, valutazione individuale o gamification dei lavoratori.',
          'Non produce certificazione ESG, conformità normativa obbligatoria o assurance contabile.',
          'Non garantisce ROI o dimostra causalità tra spesa e outcome organizzativi — correlazione ≠ causalità.',
          'Non sostituisce consulenza legale, fiscale, assurance o reporting normativo obbligatorio.',
          'Non richiede integrazioni API, database aziendali o accesso a sistemi HR interni.',
        ].map((item, i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: i < arr.length - 1 ? TOKENS.cardBorder : 'none', fontSize: '12px', color: TOKENS.inkSecondary }}>
            <span style={{ flexShrink: 0, fontWeight: 700, color: TOKENS.inkHint, marginTop: 1 }}>—</span>
            {item}
          </div>
        ))}
      </div>

      <div style={{ borderTop: TOKENS.cardBorder }} />

      {/* 8. Confini metodologici */}
      <SectionLabel>Confini metodologici</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-4">
          {[
            ['Metodologia',       'KORA-METHOD-v0.1.0 · pre_empirical_calibration'],
            ['Calibrazione',      'Delphi Study post-pilot — non ancora eseguita'],
            ['Output',            'Direzionale · non certificazione · non attestazione'],
            ['Confidence Score',  'Esterno al KORA Index v3 · peso = 0 · affidabilità dati'],
            ['Privacy',           'N ≥ 10 per segmento · PIB worker-private · no nominativi'],
            ['Sorveglianza',      'Nessun dato individuale lavoratore esposto al datore'],
            ['ESG / CSR',         'Evidenze strutturate — non conformità normativa garantita'],
            ['SaaS',              'Foundation Light è diagnostico guidato · non self-service'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', gap: 10, fontSize: '11px' }}>
              <span style={{ flexShrink: 0, fontWeight: 600, color: TOKENS.inkHint, width: 120 }}>{label}</span>
              <span style={{ color: TOKENS.inkSecondary, lineHeight: 1.55 }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: TOKENS.cardBorder, paddingTop: 12, fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>
          KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
          Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
        </div>
      </div>

      <div style={{ borderTop: TOKENS.cardBorder }} />

      {/* 9. Output dimostrativi */}
      <SectionLabel>Output dimostrativi — Foundation Light demo</SectionLabel>
      <p style={{ fontSize: '11px', color: TOKENS.inkHint, lineHeight: 1.6, marginBottom: 12 }}>
        Questi link mostrano gli output del pilot su dati sintetici demo (Meridiana Group S.r.l.).
        Il pilot reale produce gli stessi output su dati aziendali reali.
        synthetic_demo_data: true · pre_empirical_calibration
      </p>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, overflow: 'hidden', marginBottom: 16 }}>
        {OUTPUT_LINKS.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: i < OUTPUT_LINKS.length - 1 ? TOKENS.cardBorder : 'none', textDecoration: 'none' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '12.5px', fontWeight: 600, color: TOKENS.ink }}>{link.label}</p>
              <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 2 }}>{link.desc}</p>
            </div>
            <span style={{ flexShrink: 0, fontSize: '11px', color: TOKENS.inkHint, marginTop: 2 }}>→</span>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/company/reports/board-pack" style={{ borderRadius: 6, background: TOKENS.ink, padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'none' }}>
          Board Pack Preview →
        </Link>
        <Link href="/demo-guide" style={{ borderRadius: 6, border: TOKENS.cardBorder, background: TOKENS.surface, padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: TOKENS.inkSecondary, textDecoration: 'none' }}>
          Guida demo
        </Link>
        <Link href="/future-vision" style={{ fontSize: '12px', color: TOKENS.inkHint, textDecoration: 'underline' }}>
          Future Vision
        </Link>
      </div>

      {/* Footer */}
      <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint, paddingTop: 8 }}>
        Foundation Light Pilot · offerta indicativa senza IVA · KORA-METHOD-v0.1.0 · pre_empirical_calibration · synthetic_demo_data: true
      </p>

    </div>
  );
}
