// KORA Foundation Light — Guida Demo
// Static — no backend, no demo state, no client logic.

import Link from 'next/link';
import { PageMasthead } from '@/components/ui/PageMasthead';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const EVALUATE_ITEMS = [
  { label: 'Executive Cockpit',      href: '/company',               shows: 'KORA Index, Confidence Score, Activation Safeguard e priorità direzionali in una vista C-suite.',                         why: 'Punto di ingresso board-ready — mostra come l\'intelligence si traduce in decisione.' },
  { label: 'KORA Index',             href: '/company/kora-index',    shows: '10 componenti, 4 macroblocks, pipeline 14-stage, explainability e Confidence Score.',                                    why: 'Cuore metodologico — ogni numero è tracciabile, spiegabile e versionato.' },
  { label: 'Activation Debt',        href: '/company/activation',    shows: 'Maggioranza silenziosa, concentrazione IU, distribuzione per sito e dipartimento, next actions.',                        why: 'Traduce la sotto-attivazione in segnale quantificato — senza esporre individui.' },
  { label: 'Budget-to-Human-Impact', href: '/company/financial',     shows: 'Governance finanziaria, budget per pillar, costo per IU, BTI macroblock.',                                               why: 'Connette la spesa people al segnale di attivazione — non promette ROI garantito.' },
  { label: 'Stato Dati & Evidenze',  href: '/company/data',          shows: 'Stato dati & evidenze — elaborazione gestita da KORA Operator. Lettura aggregata post-intake.',                          why: 'Mostra lo stato delle fonti ricevute — non un\'area self-service cliente.' },
  { label: 'Decision Pack',          href: '/company/reports',       shows: 'Report board-ready con KORA Index, pillar analysis, raccomandazioni e disclaimer espliciti.',                            why: 'Output finale per CEO, HR, ESG e Finance — con limiti metodologici integrati.' },
  { label: 'KORA Contribution',      href: '/company/contribution',  shows: 'Indicatore companion per il contributo collettivo e territoriale oltre il perimetro aziendale.',                          why: 'Segnala l\'estensione ecosistemica — distinto dal KORA Index e mai aggregato ad esso.' },
  { label: 'Future Vision',          href: '/future-vision',         shows: 'Roadmap architetturale in 4 fasi: Foundation Light → Pilot → Ecosystem → Worker-Owned.',                                 why: 'Mostra dove KORA va, non solo dove è ora — infrastruttura, non feature dump.' },
];

const KORA_IS_NOT = [
  'Welfare platform o benefits marketplace',
  'HR dashboard o strumento di monitoraggio lavoratori',
  'Sistema di sorveglianza o ranking individuale',
  'Marketplace transazionale con prezzi e disponibilità',
  'Sistema di gamification con XP, badge o leaderboard',
  'Strumento di governance della spesa o compliance fiscale',
  'Garanzia di compliance ESG, normativa o certificazione legale',
];

const PRINCIPLES = [
  'KORA misura organizzazioni, non individui. L\'output è sempre aggregato a livello aziendale.',
  'Il Worker PIB (Personal Impact Balance) è privato al lavoratore. Mai visibile a ruoli employer.',
  'Il datore di lavoro vede solo aggregati anonimi sopra soglia privacy (N ≥ 10 lavoratori per segmento).',
  'Confidence Score è esterno al KORA Index — peso = 0. Segnala affidabilità dei dati, non impatto.',
  'Activation Safeguard è un gate interpretativo (CLEAR / WARNING / FLAGGED) — non entra nel calcolo del KORA Index.',
  'La compliance obbligatoria è Blocked by design — D.Lgs. 81/08, DVR, DPI = 0 IU, 0 KORA Index.',
  'I benefit economici generici (buoni pasto, fringe, voucher) sono Limited — tracciati nel BTI, 0 IU.',
  'I programmi Eligible sono volontari, aggiuntivi rispetto al minimo legale e verificabili con evidenza.',
];

const NEXT_ROUTE = [
  { step: 1, label: 'Executive Cockpit',       href: '/company',               note: 'Vista C-suite — KORA Index, Safeguard, priorità' },
  { step: 2, label: 'KORA Index Detail',        href: '/company/kora-index',    note: '10 componenti, macroblocks, explainability' },
  { step: 3, label: 'Activation Debt',          href: '/company/activation',    note: 'Maggioranza silenziosa, concentrazione, siti' },
  { step: 4, label: 'Budget-to-Human-Impact',   href: '/company/financial',     note: 'BTI, costo per IU, governance finanziaria' },
  { step: 5, label: 'Stato Dati & Evidenze',    href: '/company/data',          note: 'Stato dati & evidenze — elaborazione KORA' },
  { step: 6, label: 'Decision Pack',            href: '/company/reports',       note: 'Report board-ready, pillar, raccomandazioni' },
  { step: 7, label: 'KORA Contribution',        href: '/company/contribution',  note: 'Companion indicator — ecosistema e territorio' },
  { step: 8, label: 'Future Vision',            href: '/future-vision',         note: 'Roadmap architetturale in 4 fasi' },
];

const NEXT_PRIORITIES = [
  'Usare il prototipo per capire la logica KORA — non copiare la UI letteralmente.',
  'Aiutare a convertire la logica in design di prodotto professionale e coerente.',
  'Preservare la dottrina: no welfare, no gamification, no marketplace, no surveillance.',
  'Rimuovere qualsiasi interpretazione HR dashboard, benefit booking o social network.',
  'Definire un design system con gerarchia executive, densità informativa e identità KORA.',
  'Migliorare la navigazione mantenendo separazione employer / worker layer visivamente ovvia.',
  'Non aggiungere funzionalità — capire quelle esistenti prima di proporne di nuove.',
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DemoGuidePage() {
  return (
    <div className="space-y-5">

      {/* 1. PageMasthead */}
      <PageMasthead
        eyebrow="Guida alla lettura · Foundation Light v0.1"
        title="Guida demo"
        subline="Una mappa navigabile della logica KORA: indice, dati, activation debt, eligibility, BTI, privacy boundary e Decision Pack."
        meta="Product Vision Prototype · demo data sintetici · Foundation Light v0.1"
      />

      {/* Badge chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Product Vision Prototype', bg: `${TOKENS.accent}14`,       text: TOKENS.accent               },
          { label: 'Demo data sintetici',       bg: TOKENS.inkBorder,           text: TOKENS.inkSecondary         },
          { label: 'Non UI finale',             bg: TOKENS.safeguard.watch.bg,  text: TOKENS.safeguard.watch.text },
          { label: 'Non production-ready',      bg: TOKENS.safeguard.cap.bg,    text: TOKENS.safeguard.cap.text   },
          { label: 'Foundation Light v0.1',     bg: TOKENS.inkBorder,           text: TOKENS.inkSecondary         },
        ].map(({ label, bg, text }) => (
          <span key={label} style={{ fontSize: '10px', fontWeight: 600, background: bg, color: text, borderRadius: 4, padding: '3px 8px' }}>
            {label}
          </span>
        ))}
      </div>

      {/* 2. Come leggere questo prototipo */}
      <SectionLabel>Come leggere questa demo</SectionLabel>
      <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.accent}33`, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '✓', text: 'Mostra la logica di prodotto e la direzione della piattaforma.',             ok: true },
            { icon: '✓', text: 'Riferimento per allineare prodotto, metodologia e direzione visiva.',         ok: true },
            { icon: '✓', text: 'Permette di navigare tutti i pannelli e capire il flusso informativo KORA.', ok: true },
            { icon: '✕', text: 'Non è UX/UI finale — il design visivo è un placeholder funzionale.',          ok: false },
            { icon: '✕', text: 'Non è un SaaS in produzione — nessun DB, nessuna auth, nessuna API live.',    ok: false },
            { icon: '✕', text: 'Non è una demo commerciale di feature — è la logica del sistema.',            ok: false },
          ].map(({ icon, text, ok }) => (
            <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ marginTop: 2, fontSize: '12px', fontWeight: 700, flexShrink: 0, color: ok ? TOKENS.safeguard.pass.dot : TOKENS.safeguard.cap.text }}>
                {icon}
              </span>
              <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Cosa valutare */}
      <SectionLabel>Aree chiave da esplorare</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, overflow: 'hidden' }}>
        {EVALUATE_ITEMS.map((item, i) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: i < EVALUATE_ITEMS.length - 1 ? TOKENS.cardBorder : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <p style={{ fontSize: '12.5px', fontWeight: 600, color: TOKENS.ink }}>{item.label}</p>
                <span style={{ fontSize: '11px', color: TOKENS.inkHint }}>·</span>
                <p style={{ fontSize: '11.5px', color: TOKENS.inkSecondary }}>{item.shows}</p>
              </div>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 3, lineHeight: 1.55, fontStyle: 'italic' }}>{item.why}</p>
            </div>
            <Link
              href={item.href}
              style={{ flexShrink: 0, borderRadius: 4, border: TOKENS.cardBorder, background: TOKENS.inkBorder, padding: '4px 10px', fontSize: '10px', fontWeight: 600, color: TOKENS.inkSecondary, textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              Vai →
            </Link>
          </div>
        ))}
      </div>

      {/* 4. Cosa KORA non è / è */}
      <SectionLabel>Confini dottrinali — cosa KORA non è</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-4">
        {/* KORA non è */}
        <div style={{ background: TOKENS.safeguard.cap.bg, border: `1px solid ${TOKENS.safeguard.cap.dot}33`, borderRadius: TOKENS.cardRadius, padding: '1.125rem' }}>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.safeguard.cap.text, marginBottom: 12 }}>
            KORA non è — mai
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {KORA_IS_NOT.map((item) => (
              <li key={item} style={{ display: 'flex', gap: 8, fontSize: '12px', color: TOKENS.safeguard.cap.text }}>
                <span style={{ flexShrink: 0, fontWeight: 700 }}>✕</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        {/* KORA è */}
        <div style={{ background: TOKENS.safeguard.pass.bg, border: `1px solid ${TOKENS.safeguard.pass.dot}33`, borderRadius: TOKENS.cardRadius, padding: '1.125rem' }}>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.safeguard.pass.text, marginBottom: 12 }}>
            KORA è
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              'Human Impact Intelligence Platform',
              'Activation Orchestration Layer',
              'Evidence & Trust Layer',
              'Privacy-first, worker-owned layer',
              'Board-ready decision system',
              'Metodologia versionata e spiegabile',
              'Infrastruttura di impatto umano condiviso',
            ].map((item) => (
              <li key={item} style={{ display: 'flex', gap: 8, fontSize: '12px', color: TOKENS.safeguard.pass.text }}>
                <span style={{ flexShrink: 0, fontWeight: 700 }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 5. Principi non negoziabili */}
      <SectionLabel>Principi non negoziabili</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, overflow: 'hidden' }}>
        {PRINCIPLES.map((p, i) => (
          <div key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 16px', borderBottom: i < PRINCIPLES.length - 1 ? TOKENS.cardBorder : 'none' }}>
            <span style={{ flexShrink: 0, fontFamily: 'monospace', fontSize: '10px', fontWeight: 700, color: TOKENS.inkHint, width: 20, textAlign: 'center', marginTop: 2 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>{p}</p>
          </div>
        ))}
      </div>

      {/* 6. Demo vs Prodotto Reale */}
      <SectionLabel>Demo vs prodotto reale</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Demo Mode */}
        <div style={{ background: TOKENS.safeguard.watch.bg, border: `1px solid ${TOKENS.safeguard.watch.dot}33`, borderRadius: TOKENS.cardRadius, padding: '1.125rem' }}>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.safeguard.watch.text, marginBottom: 12 }}>
            Demo Mode — Foundation Light
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'Dataset sintetico: Meridiana Group S.r.l.',
              'Scenari S1 / S2 pre-seeded',
              'Usato per spiegare la logica di prodotto',
              'Nessun DB, nessuna auth, nessuna API live',
              'I seed sintetici non devono mai alimentare tenant reali',
            ].map((item) => (
              <li key={item} style={{ display: 'flex', gap: 8, fontSize: '11.5px', color: TOKENS.safeguard.watch.text }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        {/* Direzione prodotto reale */}
        <div style={{ background: `${TOKENS.accent}07`, border: `1px solid ${TOKENS.accent}22`, borderRadius: TOKENS.cardRadius, padding: '1.125rem' }}>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.accent, marginBottom: 12 }}>
            Direzione Prodotto Reale
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'Tenant reali con dati propri (uploaded / integration)',
              'Eligibility engine su eventi reali',
              'UEF / IU engine computato in tempo reale',
              'BTI engine su budget aziendali reali',
              'Confidence / Safeguard da qualità dati reali',
              'Privacy-safe aggregation su workforce reale',
              'Decision Pack da output computati, non da seed',
            ].map((item) => (
              <li key={item} style={{ display: 'flex', gap: 8, fontSize: '11.5px', color: TOKENS.ink }}>
                <span style={{ flexShrink: 0, color: TOKENS.accent, marginTop: 1 }}>·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{ background: TOKENS.safeguard.cap.bg, border: `1px solid ${TOKENS.safeguard.cap.dot}33`, borderRadius: 6, padding: '8px 12px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.safeguard.cap.text }}>
          I dati demo sintetici non devono mai essere usati per tenant reali. Dati reali richiedono onboarding, privacy architecture e consenso esplicito.
        </p>
      </div>

      {/* 7. Percorso consigliato */}
      <SectionLabel>Percorso consigliato</SectionLabel>
      <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65, marginBottom: 12 }}>
        Leggere nell&apos;ordine. Ogni schermata costruisce sulla precedente.
      </p>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, overflow: 'hidden' }}>
        {NEXT_ROUTE.map((item, i) => (
          <Link
            key={item.step}
            href={item.href}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '11px 16px', borderBottom: i < NEXT_ROUTE.length - 1 ? TOKENS.cardBorder : 'none', textDecoration: 'none' }}
          >
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: TOKENS.inkBorder, fontSize: '10px', fontWeight: 700, color: TOKENS.inkSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {item.step}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '12.5px', fontWeight: 600, color: TOKENS.ink }}>{item.label}</p>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 2 }}>{item.note}</p>
            </div>
            <span style={{ fontSize: '11px', color: TOKENS.inkHint, flexShrink: 0 }}>→</span>
          </Link>
        ))}
      </div>

      {/* 8. Prossimi passi consigliati */}
      <SectionLabel>Prossimi passi consigliati</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {NEXT_PRIORITIES.map((p) => (
            <div key={p} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: TOKENS.accent, fontWeight: 700, fontSize: '12px', flexShrink: 0, marginTop: 1 }}>→</span>
              <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>{p}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 9. Boundary box */}
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.125rem' }}>
        <p style={{ fontSize: '12.5px', fontWeight: 600, color: TOKENS.ink, marginBottom: 10 }}>Confini del prototipo</p>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            'Dati demo sintetici — nessun dato aziendale reale.',
            'Foundation Light v0.1 — pre-calibrazione empirica.',
            'calibration_status: pre_empirical_calibration · Confidence Score esterno.',
            'Nessun production claim, assurance, compliance guarantee o ROI certificato.',
            'Foundation Light è il punto di ingresso attuale — non la versione finale del prodotto.',
          ].map((note) => (
            <li key={note} style={{ display: 'flex', gap: 8, fontSize: '12px', color: TOKENS.inkSecondary }}>
              <span style={{ flexShrink: 0, color: TOKENS.inkHint, marginTop: 2 }}>·</span>
              {note}
            </li>
          ))}
        </ul>
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/company" style={{ borderRadius: 6, background: TOKENS.ink, padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'none' }}>
          Executive Cockpit →
        </Link>
        <Link href="/pilot" style={{ borderRadius: 6, border: TOKENS.cardBorder, background: TOKENS.surface, padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: TOKENS.inkSecondary, textDecoration: 'none' }}>
          Foundation Light Pilot
        </Link>
        <Link href="/future-vision" style={{ fontSize: '12px', color: TOKENS.inkHint, textDecoration: 'underline' }}>
          Future Vision →
        </Link>
      </div>

      {/* Footer mono */}
      <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint }}>
        KORA Foundation Light · Product Vision Prototype · synthetic_demo_data: true · v0.1
      </p>

    </div>
  );
}
