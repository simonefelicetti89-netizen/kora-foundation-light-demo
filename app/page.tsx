// KORA Landing — Server Component
// Porting fedele dell'HTML di riferimento con le 6 modifiche previste:
//   1) Logo reale (KoraLogo component + PNG assets)
//   2) Token TOKENS / PILLAR_COLORS da kora-design-tokens
//   3) Solo Plus Jakarta Sans (var(--font-jakarta)) — zero serif/mono
//   4) Animazioni in LandingMotion (client component)
//   5) CTA su route esistenti (/demo-guide, /company, /admin/company-live-preview)
//   6) Numeri canonici in un unico blocco CANONICAL (sotto)

import Link from 'next/link';
import { LandingMotion } from '@/components/landing/LandingMotion';
import { MarketingNav } from '@/components/landing/MarketingNav';
import { MarketingFooter } from '@/components/landing/MarketingFooter';
import { RecoveryHashHandler } from '@/components/auth/RecoveryHashHandler';
import { PILLAR_COLORS } from '@/lib/design/kora-design-tokens';
import { PACKAGES } from '@/lib/landing/packages';
import styles from './landing.module.css';
import koraOutputsRaw   from '@/data/synthetic/kora-index-outputs.json';
import koraAggregatesRaw from '@/data/synthetic/company-aggregates.json';

const LANDING_NAV_LINKS = [
  { label: 'Il problema',       href: '#problema' },
  { label: 'Come funziona',     href: '#metodo'   },
  { label: 'KORA Index',        href: '#indice'   },
  { label: 'Foundation Light',  href: '#pilot'    },
];

// ── Numeri canonici — letti dai seed sintetici (fonte canonica unica) ──────
// Scenario S1 · Meridiana Group — Foundation Light v2.0.
// Per aggiornare i numeri: rigenera data/synthetic/kora-index-outputs.json
// e data/synthetic/company-aggregates.json. NON modificare qui.

const _s1Idx = (koraOutputsRaw  as { data: Array<Record<string, unknown>> }).data[0]!;
const _s1Agg = (koraAggregatesRaw as { data: Array<Record<string, unknown>> }).data[0]!;

function _mbScore(code: string): number {
  const mbs = _s1Idx['macroblocks'] as Array<{ code: string; score: number; weight: number }> | undefined;
  return mbs?.find(m => m.code === code)?.score ?? 0;
}
function _mbWeight(code: string): number {
  const mbs = _s1Idx['macroblocks'] as Array<{ code: string; score: number; weight: number }> | undefined;
  return Math.round((mbs?.find(m => m.code === code)?.weight ?? 0) * 100);
}
function _pillarShare(code: string): number {
  const pd = _s1Agg['pillar_distribution'] as Record<string, number> | undefined;
  return Math.round((pd?.[code] ?? 0) * 100);
}

const CANONICAL = {
  koraIndex:  _s1Idx['kora_index_value'] as number,
  confidence: Math.round((_s1Idx['confidence_score'] as number) * 100),
  safeguard:  _s1Idx['safeguard_status'] as string,
  regime:     'Foundation Light',
  macroblocks: {
    reach:   { label: 'Activation Reach',       weight: _mbWeight('REACH'),   score: _mbScore('REACH')   },
    quality: { label: 'Activation Quality',     weight: _mbWeight('QUALITY'), score: _mbScore('QUALITY') },
    equity:  { label: 'Distribution & Equity',  weight: _mbWeight('EQUITY'),  score: _mbScore('EQUITY')  },
    bti:     { label: 'Budget-to-Human-Impact', weight: _mbWeight('BTI'),     score: _mbScore('BTI')     },
  },
  pillars: [
    { code: 'LIFE',       share: _pillarShare('LIFE'),       desc: 'Salute, prevenzione, supporto psicologico, benessere, nutrizione.' },
    { code: 'GROWTH',     share: _pillarShare('GROWTH'),     desc: 'Formazione, competenze, sviluppo professionale, upskilling digitale.' },
    { code: 'CONNECTION', share: _pillarShare('CONNECTION'), desc: 'Mentoring, peer support, community interne, coesione di team.' },
    { code: 'IMPACT',     share: _pillarShare('IMPACT'),     desc: 'Volontariato, progetti sociali, iniziative ambientali, territorio.' },
    { code: 'LEGACY',     share: _pillarShare('LEGACY'),     desc: 'Trasferimento di conoscenza, mentoring senior-junior, futuro, pensione.' },
  ],
};

// ── NOTA PILLAR COLOR DISCREPANCY ────────────────────────────────────────────
// L'HTML di riferimento usa: LIFE=#4A7FE0 (blu), GROWTH=#C76F3D (terra),
// CONNECTION=#6156F5 (viola), IMPACT=#D99A2B (gold), LEGACY=#8A7562.
// PILLAR_COLORS nei token usa: LIFE=#C76F3D, GROWTH=#2F7D55, CONNECTION=#D99767,
// IMPACT=#D99A2B, LEGACY=#8A7562.
// → Si usa PILLAR_COLORS dai token come single source of truth (regola 6).
//   La discrepanza va discussa con il founder prima di sincronizzare.

const f = (s: TemplateStringsArray, ...v: unknown[]) => String.raw({ raw: s }, ...v);
void f; // silence unused

export default function LandingPage() {
  const mbs = Object.values(CANONICAL.macroblocks);

  return (
    <div
      style={{
        fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontFeatureSettings: '"tnum"',
        WebkitFontSmoothing: 'antialiased',
        textRendering:       'optimizeLegibility',
        background:          '#EFEBE2',
        color:               '#06032B',
        overflowX:           'hidden',
      }}
    >

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <MarketingNav
        brandHref="#top"
        links={LANDING_NAV_LINKS}
        loginHref="/login"
        ctaHref="/pilot"
        ctaLabel="Avvia un pilot →"
      />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <header className={styles.hero} id="top">
        <div className={styles.heroBg} aria-hidden="true" />
        <div className={styles.heroNoise} aria-hidden="true" />
        <div className={`${styles.wrap} ${styles.heroInner}`}>
          <div className={styles.heroGrid}>

            {/* Left: copy */}
            <div>
              <div className={`${styles.heroEyebrow} ${styles.reveal} ${styles.revealIn}`}>
                <span className={styles.pulse} aria-hidden="true" />
                Human Impact Intelligence Platform
              </div>
              <h1 className={`${styles.heroTitle} ${styles.reveal} ${styles.revealIn} ${styles.d1}`}>
                Misura ciò che accade{' '}
                <em className={styles.heroTitleEm}>dopo</em> la spesa.
              </h1>
              <p className={`${styles.heroSub} ${styles.reveal} ${styles.revealIn} ${styles.d2}`}>
                Le organizzazioni investono milioni in welfare, formazione e persone. KORA rende leggibile ciò che quella spesa{' '}
                <strong style={{ color: '#EFEBE2' }}>attiva davvero</strong>{' '}
                — con evidenze verificate, confini espliciti e Decision Pack di cui rispondere al board.
              </p>
              <div className={`${styles.heroCtas} ${styles.reveal} ${styles.revealIn} ${styles.d3}`}>
                <Link className={styles.btnPrimary} href="/demo/guide">Esplora la demo →</Link>
                <a className={styles.btnGhost} href="#metodo">Come funziona</a>
              </div>
              <p className={`${styles.heroBoundary} ${styles.reveal} ${styles.revealIn} ${styles.d4}`}>
                <strong className={styles.heroBoundaryB}>KORA misura organizzazioni, non individui.</strong>
                <br />
                <span className={styles.tag}>pre_empirical_calibration · privacy-first · evidence-based</span>
              </p>
            </div>

            {/* Right: Impact Field SVG — nodes/lines built by LandingMotion */}
            <div className={`${styles.fieldWrap} ${styles.reveal} ${styles.revealIn} ${styles.d2}`}>
              <svg
                id="field"
                viewBox="0 0 440 440"
                width="100%"
                style={{ maxWidth: 430, display: 'block' }}
                role="img"
                aria-label="KORA Impact Field — visualizzazione attivazione 5 pillar, dati dimostrativi"
              >
                <text x="220" y="18" textAnchor="middle"
                  style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fontSize: 9, fill: 'rgba(247,245,239,.3)', letterSpacing: '.14em' }}>
                  KORA INDEX · FOUNDATION LIGHT · SYNTHETIC DEMO
                </text>
                <circle cx="220" cy="218" r="146" fill="none" stroke="rgba(247,245,239,.06)" strokeWidth="1" strokeDasharray="5 9" />
                <circle cx="220" cy="218" r="100" fill="none" stroke="rgba(247,245,239,.03)" strokeWidth="1" />
                <circle cx="220" cy="218" r="56"  fill="none" stroke="rgba(247,245,239,.03)" strokeWidth="1" />
                {/* Lines and nodes injected by LandingMotion */}
                <g id="field-lines" />
                {/* Ring gauge */}
                <circle cx="220" cy="218" r="48" fill="none" stroke="rgba(247,245,239,.07)" strokeWidth="9" />
                <circle
                  id="gauge"
                  cx="220" cy="218" r="48"
                  fill="none" stroke="#C76F3D" strokeWidth="9" strokeLinecap="round"
                  transform="rotate(-90 220 218)"
                />
                <text id="gauge-num" x="220" y="214" textAnchor="middle"
                  style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 36, fontWeight: 800, fill: '#EFEBE2' }}>
                  0
                </text>
                <text x="220" y="234" textAnchor="middle"
                  style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fontSize: 11, fill: 'rgba(247,245,239,.36)' }}>
                  /100
                </text>
                <g id="field-nodes" />
                {/* CS badge */}
                <text x="418" y="402" textAnchor="end"
                  style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 9, fill: 'rgba(247,245,239,.3)', letterSpacing: '.12em' }}>
                  CONFIDENCE SCORE
                </text>
                <text x="418" y="425" textAnchor="end"
                  style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 21, fontWeight: 800, fill: '#C76F3D' }}>
                  {CANONICAL.confidence}%
                </text>
                <text x="418" y="438" textAnchor="end"
                  style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 500, fontSize: 8.5, fill: 'rgba(247,245,239,.26)', letterSpacing: '.08em' }}>
                  ESTERNO · PESO = 0
                </text>
                {/* Safeguard badge */}
                <circle cx="22" cy="416" r="4.5" fill="#D99A2B" />
                <text x="33" y="412" textAnchor="start"
                  style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: 800, fill: '#E9B95C', letterSpacing: '.04em' }}>
                  {CANONICAL.safeguard}
                </text>
                <text x="33" y="426" textAnchor="start"
                  style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 500, fontSize: 8.5, fill: 'rgba(247,245,239,.3)', letterSpacing: '.06em' }}>
                  ACTIVATION SAFEGUARD
                </text>
              </svg>
            </div>

          </div>
        </div>
      </header>

      {/* ── PROBLEM ──────────────────────────────────────────────────────── */}
      <section className={`${styles.block} ${styles.secCanvas}`} id="problema">
        <div className={styles.wrap}>
          <p className={`${styles.kicker} ${styles.eyebrow} ${styles.reveal}`}>Il problema</p>
          <h2 className={`${styles.head} ${styles.reveal} ${styles.d1}`}>
            Le organizzazioni spendono. Ma non sanno cosa accade dopo.
          </h2>
          <p className={`${styles.lead} ${styles.reveal} ${styles.d2}`}>
            Welfare, formazione, iniziative people: investimenti significativi ogni anno. La distanza tra la spesa e ciò che viene davvero attivato resta invisibile, non misurata. KORA nasce per rendere leggibile quella distanza — non la spesa, ma la sua attivazione umana.
          </p>
          <div className={styles.cmp}>
            <div className={`${styles.reveal} ${styles.d2}`}>
              <h4 className={`${styles.cmpH4} ${styles.cmpTodayH4}`}>Cosa le aziende vedono oggi</h4>
              <ul className={styles.cmpUl}>
                {[
                  'Spesa welfare: totale annuo allocato',
                  'Training completions: conteggio registrato',
                  'Partecipazione: percentuale aggregata',
                  'Engagement survey: punteggio medio',
                  'ESG reporting: dati rendicontati',
                ].map((t) => (
                  <li key={t} className={`${styles.cmpLi} ${styles.cmpTodayLi}`}>
                    <span className={`${styles.mk} ${styles.mkToday}`}>—</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${styles.reveal} ${styles.d3}`}>
              <h4 className={`${styles.cmpH4} ${styles.cmpKoraH4}`}>Cosa KORA rivela</h4>
              <ul className={styles.cmpUl}>
                {[
                  ['Activation Rate', '— quota di workforce con attivazione verificata'],
                  ['Impact Units', '— intensità reale per pillar, aggregata'],
                  ['Activation Debt', '— budget non convertito in attivazione'],
                  ['Confidence Score', '— qualità delle evidenze raccolte'],
                  ['Decision Pack', '— raccomandazioni board-ready, spiegabili'],
                ].map(([b, rest]) => (
                  <li key={b} className={`${styles.cmpLi} ${styles.cmpKoraLi}`}>
                    <span className={`${styles.mk} ${styles.mkKora}`}>✓</span>
                    <span><strong>{b}</strong>{rest}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORY ─────────────────────────────────────────────────────── */}
      <section className={`${styles.block} ${styles.secPaper}`}>
        <div className={styles.wrap}>
          <p className={`${styles.kicker} ${styles.eyebrow} ${styles.reveal}`}>Una nuova categoria</p>
          <h2 className={`${styles.head} ${styles.reveal} ${styles.d1}`}>Non welfare. Non HR. Non sorveglianza.</h2>
          <p className={`${styles.lead} ${styles.reveal} ${styles.d2}`}>
            KORA non eroga benefit, non valuta lavoratori, non garantisce conformità. È un livello di intelligence che collega budget, attivazione verificata, evidenza e decisione — al livello dell&apos;organizzazione, mai dell&apos;individuo.
          </p>
          <div className={styles.catGrid}>
            <div className={`${styles.reveal} ${styles.d2}`}>
              <h4 className={`${styles.catColH4} ${styles.catNoH4}`}>KORA non è — mai</h4>
              <ul className={styles.catUl}>
                {[
                  'Welfare platform o benefits marketplace',
                  'HR dashboard o strumento di valutazione dei lavoratori',
                  'Sistema di sorveglianza, ranking o gamification',
                  'Certificazione ESG automatica o compliance garantita',
                  'ROI garantito o previsione causale di outcome',
                ].map((t) => (
                  <li key={t} className={`${styles.catLi} ${styles.catNoLi}`}>
                    <span className={styles.xMark}>✕</span><span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${styles.reveal} ${styles.d3}`}>
              <h4 className={`${styles.catColH4} ${styles.catYesH4}`}>KORA è</h4>
              <ul className={styles.catUl}>
                {[
                  'Human Impact Intelligence Platform',
                  'Misura organizzazioni — mai individui',
                  'Collega budget, attivazione verificata, evidenza e decisione',
                  'KORA Index · Confidence Score · Activation Safeguard',
                  'Metodologia versionata, spiegabile, privacy-first',
                ].map((t) => (
                  <li key={t} className={`${styles.catLi} ${styles.catYesLi}`}>
                    <span className={styles.checkMark}>✓</span><span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── METHOD / LINEAGE ─────────────────────────────────────────────── */}
      <section className={`${styles.block} ${styles.secDark}`} id="metodo">
        <div className={`${styles.wrap} ${styles.secDarkInner}`}>
          <p className={`${styles.kicker} ${styles.eyebrow} ${styles.reveal}`} style={{ color: '#C76F3D' }}>
            Come funziona · il filo del dato
          </p>
          <h2 className={`${styles.head} ${styles.secDarkHead} ${styles.reveal} ${styles.d1}`}>
            Da scatola nera a sistema tracciabile.
          </h2>
          <p className={`${styles.lead} ${styles.secDarkLead} ${styles.reveal} ${styles.d2}`}>
            Ogni singolo record percorre la pipeline KORA e resta tracciabile in entrambe le direzioni — dal file caricato fino al numero che il board legge. Nessun output è un atto di fede: ogni contributo all&apos;indice porta con sé la sua traccia di calcolo.
          </p>
          <div className={styles.lineage}>
            <div className={styles.linTrack} id="lin-track">
              {[
                ['01','Caricato',   'Data Intake · fonte hr.xlsx'],
                ['02','Classificato','Eligible · pillar LIFE'],
                ['03','Revisionato','UEF Review · approvato'],
                ['04','Computato',  'IU Engine · 0.84 IU · trace'],
                ['05','Aggregato',  'privacy N ≥ 10'],
                ['06','Contribuito','Index · REACH +0.3'],
                ['07','Visibile',   `Cockpit · parte del ${CANONICAL.koraIndex}/100`],
              ].map(([num, stage, detail], i) => (
                <div
                  key={num}
                  className={`${styles.linStep} lin-step-js ${styles.reveal} ${i < 2 ? styles.d1 : i < 4 ? styles.d2 : i < 6 ? styles.d3 : styles.d4}`}
                >
                  <span className={`${styles.linNum} lin-num-js`}>{num}</span>
                  <span className={styles.linStage}>{stage}</span>
                  <span className={styles.linDetail}>{detail}</span>
                  {i < 6 && <span className={styles.linArrow} aria-hidden="true">→</span>}
                </div>
              ))}
            </div>
            <p className={`${styles.linCaption} ${styles.reveal} ${styles.d2}`}>
              «Rimborso asilo nido 2025» entra come riga di un file e diventa{' '}
              <span className={styles.linCaptionB}>0.3 punti di Activation Reach</span>{' '}
              nel KORA Index — ogni passaggio è ispezionabile. È l&apos;argomento più forte verso un CFO:{' '}
              <span className={styles.linCaptionB}>il budget non è un dato valido se non ha una fonte.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── INDEX ANATOMY ────────────────────────────────────────────────── */}
      <section className={`${styles.block} ${styles.secCanvas}`} id="indice">
        <div className={styles.wrap}>
          <p className={`${styles.kicker} ${styles.eyebrow} ${styles.reveal}`}>Anatomia del KORA Index</p>
          <h2 className={`${styles.head} ${styles.reveal} ${styles.d1}`}>
            Un numero. Quattro macroblocchi. Zero black box.
          </h2>
          <div className={styles.anat}>
            {/* Index card */}
            <div className={`${styles.indexCard} ${styles.reveal} ${styles.d2}`}>
              <div className={styles.icLabel}>KORA Index v1.0 · Meridiana Group · S1</div>
              <div className={`${styles.icScore} ${styles.num}`}>
                {CANONICAL.koraIndex}<span className={styles.icScoreSpan}>/100</span>
              </div>
              <div className={styles.icRow}>
                <span className={`${styles.chip} ${styles.chipWarn}`}>
                  <span className={`${styles.chipDot} ${styles.chipWarnDot}`} />
                  WARNING
                </span>
                <span className={`${styles.chip} ${styles.chipCs}`}>
                  CS {CANONICAL.confidence}%
                </span>
              </div>
              <div className={styles.icMeth}>pre_empirical_calibration</div>
              <p className={styles.icDesc}>
                Efficacia nel convertire iniziative people in attivazione verificata, distribuita e significativa. Output aziendale aggregato — nessun individuo misurabile.
              </p>
            </div>

            {/* Macroblock bars */}
            <div>
              <div className={styles.blocks}>
                {mbs.map((mb, i) => (
                  <div
                    key={mb.label}
                    className={`${styles.blk} ${styles.reveal} ${
                      i === 0 ? styles.d2 : i === 1 ? styles.d3 : i === 2 ? styles.d4 : styles.d5
                    }`}
                  >
                    <div className={styles.blkName}>
                      <span className={styles.blkNameN}>{mb.label}</span>
                      <span className={styles.blkNameW}>PESO {mb.weight}%</span>
                    </div>
                    <div className={styles.blkBar}>
                      <div className={styles.blkFill} data-w={String(mb.score)} />
                    </div>
                    <div className={`${styles.blkVal} ${styles.num}`}>{mb.score}</div>
                  </div>
                ))}
              </div>
              <p className={`${styles.anatNote} ${styles.reveal} ${styles.d3}`}>
                Il <strong className={styles.anatNoteB}>Confidence Score</strong> resta esterno all&apos;indice (peso 0): segnala l&apos;affidabilità delle fonti, non l&apos;impatto. L&apos;<strong className={styles.anatNoteB}>Activation Safeguard</strong> è un cancello interpretativo, non una componente di punteggio. Il budget grezzo non entra mai direttamente: contribuisce solo come output metodologico del BTI Engine.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PILLARS ──────────────────────────────────────────────────────── */}
      <section className={`${styles.block} ${styles.secPaper}`}>
        <div className={styles.wrap}>
          <p className={`${styles.kicker} ${styles.eyebrow} ${styles.reveal}`}>I cinque pillar</p>
          <h2 className={`${styles.head} ${styles.reveal} ${styles.d1}`}>
            L&apos;impatto umano, letto su cinque dimensioni.
          </h2>
          <p className={`${styles.lead} ${styles.reveal} ${styles.d2}`}>
            Ogni iniziativa abilitata dall&apos;azienda viene mappata su uno dei cinque pillar. La loro distribuzione racconta dove l&apos;organizzazione attiva valore — e dove resta concentrata.
          </p>
          <div className={styles.pillars}>
            {CANONICAL.pillars.map((p, i) => {
              // Modifica 2+nota: PILLAR_COLORS dai token (discrepanza segnalata in testa al file)
              const color = PILLAR_COLORS[p.code as keyof typeof PILLAR_COLORS] ?? '#C76F3D';
              return (
                <div
                  key={p.code}
                  className={`${styles.pillar} ${styles.reveal} ${
                    i === 0 ? styles.d1 : i === 1 ? styles.d2 : i === 2 ? styles.d3 : i === 3 ? styles.d4 : styles.d5
                  }`}
                  style={{ borderTopColor: color } as React.CSSProperties}
                >
                  <span className={styles.pdot} style={{ background: color }} />
                  <span className={styles.pname}>{p.code}</span>
                  <span className={styles.pdesc}>{p.desc}</span>
                  <span className={styles.pshare}>
                    <span className={`${styles.pshareV} ${styles.num}`} style={{ color }}>{p.share}%</span>
                    <span className={styles.pshareL}>share IU · S1</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TRUST ────────────────────────────────────────────────────────── */}
      <section className={`${styles.block} ${styles.secCanvas}`}>
        <div className={styles.wrap}>
          <p className={`${styles.kicker} ${styles.eyebrow} ${styles.reveal}`}>Privacy &amp; confini metodologici</p>
          <h2 className={`${styles.head} ${styles.reveal} ${styles.d1}`}>
            La fiducia è un&apos;architettura, non una promessa.
          </h2>
          <p className={`${styles.lead} ${styles.reveal} ${styles.d2}`}>
            KORA è costruita perché certe cose siano impossibili by design — non scoraggiate, ma strutturalmente escluse.
          </p>
          <div className={styles.trustGrid}>
            {[
              ['Organization-level only',     'Il KORA Index è un output aziendale aggregato. Nessun ranking, rating o profilo individuale è prodotto o esposto.'],
              ['Soglia privacy N ≥ 10',        'Nessun segmento sotto i 10 lavoratori è visibile al datore di lavoro. I gruppi piccoli vengono soppressi, non mostrati.'],
              ['PIB privato al lavoratore',    'Il Personal Impact Balance esiste solo per produrre l\'aggregato. Non è mai visibile né interrogabile dall\'azienda.'],
              ['Nessuna auto-dichiarazione',   'Solo evidenze verificabili entrano nel calcolo, classificate su tiers L0–L4. Il valore senza fonte non riceve peso pieno.'],
            ].map(([title, desc], i) => (
              <div
                key={title}
                className={`${styles.trustCard} ${styles.reveal} ${
                  i === 0 ? styles.d1 : i === 1 ? styles.d2 : i === 2 ? styles.d3 : styles.d4
                }`}
              >
                <div className={styles.trustCardTitle}>
                  <span className={styles.trustCardIcon}>▸</span>
                  {title}
                </div>
                <div className={styles.trustCardDesc}>{desc}</div>
              </div>
            ))}
          </div>
          <p className={`${styles.trustFoot} ${styles.reveal} ${styles.d2}`}>
            KORA supporta la rendicontazione CSR/ESG con evidenze people strutturate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale o assurance. La compliance obbligatoria (D.Lgs 81/08, DVR, DPI, GDPR mandatory) è{' '}
            <span className={styles.trustFootB}>esclusa per design</span> — non penalizzata.
          </p>
        </div>
      </section>

      {/* ── OFFER ────────────────────────────────────────────────────────── */}
      <section className={`${styles.block} ${styles.secPaper}`} id="pilot">
        <div className={styles.wrap}>
          <p className={`${styles.kicker} ${styles.eyebrow} ${styles.reveal}`}>L&apos;offerta · Foundation Light</p>
          <h2 className={`${styles.head} ${styles.reveal} ${styles.d1}`}>Un percorso diagnostico, non un SaaS.</h2>
          <p className={`${styles.offerIntro} ${styles.reveal} ${styles.d2}`}>
            Foundation Light è un percorso guidato da 4 a 10 settimane, operato dal team KORA. L&apos;azienda invia i propri file; KORA carica i dati e opera l&apos;intera pipeline — intake, classificazione, scoring, Decision Pack. L&apos;azienda consuma solo l&apos;output, con deliverable verificati e confini metodologici espliciti.
          </p>
          <p className={`${styles.offerModel} ${styles.reveal} ${styles.d2}`}>
            Modello operativo: <span className={styles.offerModelB}>service-assisted</span> · nessun dato individuale richiesto · si parte da export standard Excel/CSV · nessuna integrazione API necessaria.
          </p>
          {/* Packages from single-source lib/landing/packages.ts */}
          <div className={styles.pkgs}>
            {PACKAGES.map((pkg, i) => (
              <div
                key={pkg.id}
                className={`${styles.pkg} ${pkg.recommended ? styles.pkgHi : ''} ${styles.reveal} ${i === 0 ? styles.d2 : i === 1 ? styles.d3 : styles.d4}`}
              >
                {pkg.recommended && <span className={styles.pkgTag}>Raccomandato</span>}
                <span className={`${styles.pkgDur} ${pkg.recommended ? styles.pkgDurHi : ''}`}>{pkg.duration}</span>
                <span className={styles.pkgTitle}>{pkg.nameLanding}</span>
                <ul className={styles.pkgUl}>
                  {pkg.items.map((t) => (
                    <li key={t} className={styles.pkgLi}><span className={styles.pkgLiDot}>·</span>{t}</li>
                  ))}
                </ul>
                <div className={`${styles.pkgFoot} ${pkg.recommended ? styles.pkgHiFoot : ''}`}>
                  <div className={`${styles.pkgPrice} ${styles.num}`}>{pkg.price}</div>
                  <div className={styles.pkgPnote}>{pkg.priceNote}</div>
                  <div className={styles.pkgDeliv}>Deliverable: {pkg.deliverable}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Link to dedicated pilot page for full costs & contact */}
          <p className={`${styles.reveal} ${styles.d3}`} style={{ marginTop: '2rem', fontSize: 14, fontWeight: 600 }}>
            <Link href="/pilot" style={{ color: '#C76F3D', textDecoration: 'none' }}>
              Costi dettagliati, modalità, FAQ e richiesta informazioni →
            </Link>
          </p>
        </div>
      </section>

      {/* ── VISION ───────────────────────────────────────────────────────── */}
      <section className={`${styles.block} ${styles.secCanvas}`}>
        <div className={`${styles.wrap} ${styles.visionWrap}`}>
          <p className={`${styles.kicker} ${styles.eyebrow} ${styles.reveal}`}>Dove stiamo andando</p>
          <h2 className={`${styles.head} ${styles.reveal} ${styles.d1}`}>
            La human layer dell&apos;organizzazione, finalmente leggibile.
          </h2>
          <p className={`${styles.lead} ${styles.reveal} ${styles.d2}`}>
            Foundation Light è il punto di ingresso. L&apos;obiettivo è un&apos;infrastruttura di intelligence che renda ogni euro investito in persone tracciabile, spiegabile e ottimizzabile — rispettando la privacy di ogni lavoratore e producendo output di cui le organizzazioni possono rispondere al board. Calibrazione empirica, ecosistema di partner e advisor, e infine un livello worker-owned in cui l&apos;impatto torna alla persona che lo ha generato.
          </p>
        </div>
      </section>

      {/* ── CLOSE / CTA ──────────────────────────────────────────────────── */}
      <section className={`${styles.block} ${styles.secPaper} ${styles.closeSec}`}>
        <div className={`${styles.wrap} ${styles.closeWrap}`}>
          <h2 className={`${styles.head} ${styles.closeHead} ${styles.reveal} ${styles.d1}`}>
            Inizia a misurare ciò che accade dopo la spesa.
          </h2>
          <p className={`${styles.lead} ${styles.reveal} ${styles.d2}`} style={{ margin: '1.3rem auto 0' }}>
            Ogni pilot inizia con una valutazione preliminare, senza impegno automatico. Il costo dipende da perimetro, qualità dei dati e siti coinvolti.
          </p>
          <div className={`${styles.closeCtas} ${styles.reveal} ${styles.d3}`}>
            <Link className={styles.btnInk} href="/pilot">Avvia un pilot →</Link>
            <Link className={styles.btnOut} href="/demo/guide">Esplora la demo</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <MarketingFooter meth="synthetic_demo_data: true · KORA-METHOD-v0.1.0 · pre_empirical_calibration · organization-level only · KORA misura organizzazioni, non individui." />

      {/* Modifica 4: animazioni in client component isolato */}
      <LandingMotion />

      {/* B117-F: intercetta hash recovery token da Supabase Dashboard implicit flow */}
      <RecoveryHashHandler />

    </div>
  );
}
