import Link from 'next/link';
import { PipelineConnectorBanner } from '@/components/demo/PipelineConnectorBanner';

const REVIEW_STEPS = [
  { step: 1, label: 'Executive Cockpit',          href: '/company',              desc: 'KORA Index · Confidence Score · Activation Safeguard · Schede insight' },
  { step: 2, label: 'KORA Index Detail',          href: '/company/kora-index',   desc: 'Breakdown completo dei 10 componenti · Pannello di spiegabilità · Traccia metodologica' },
  { step: 3, label: 'Attivazione & Partecipazione', href: '/company/activation', desc: 'AR · MAR · Continuità · Verifica · Distribuzione per pillar e dipartimento' },
  { step: 4, label: 'KORA Contribution',          href: '/company/contribution', desc: 'Indicatore companion · Iniziative collettive · Attività ecosistema e partner' },
  { step: 5, label: 'Pilastri & Iniziative',      href: '/company/pillars',      desc: 'Portfolio programmi · Distribuzione pillar · Tabella iniziative collettive' },
  { step: 6, label: 'Dati & Evidenze',            href: '/company/data',         desc: 'Copertura delle fonti · Confidenza del mapping · Completezza evidenze · Solo a livello batch' },
  { step: 7, label: 'KORA Operating Console',     href: '/admin',                desc: 'Passa al ruolo KORA Admin — AI Onboarding, Registro Index, portfolio e salute piattaforma' },
  { step: 8, label: 'My KORA',                    href: '/my-kora',              desc: 'Spazio privato del lavoratore · Bilancio impatto personale · Dynamic CV · Controlli privacy — passa prima al ruolo Worker' },
  { step: 9, label: 'Visione Futura',             href: '/future-vision',        desc: 'Moduli strategici post-pilota — tutti inattivi in Foundation Light' },
];

export function DemoGuideContent() {
  return (
    <div className="space-y-10 max-w-3xl">

      {/* Hero */}
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Foundation Light v0.1
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
            Solo dati sintetici
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
            Pre-calibrazione empirica
          </span>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 leading-tight">
          KORA mostra se le iniziative organizzative attivano davvero le persone.
        </h1>
        <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-2xl">
          KORA trasforma azioni frammentate, segnali di partecipazione ed evidenze
          in intelligence organizzativa sull&apos;attivazione verificata — un output a livello aziendale
          con Confidence Score, Activation Safeguard e spiegabilità versioned.
        </p>

        {/* Positioning strip */}
        <div className="mt-4 rounded border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 tracking-wide leading-relaxed">
            Non è gestione del welfare&nbsp;&nbsp;·&nbsp;&nbsp;
            Non è sorveglianza HR&nbsp;&nbsp;·&nbsp;&nbsp;
            Non è un tracker del benessere&nbsp;&nbsp;·&nbsp;&nbsp;
            Non è una dashboard ESG generica&nbsp;&nbsp;·&nbsp;&nbsp;
            Non è un marketplace
          </p>
        </div>

        {/* Thesis */}
        <div className="mt-4 rounded border border-indigo-100 bg-indigo-50 px-4 py-3">
          <p className="text-sm font-semibold text-indigo-800">
            Le aziende vedono intelligence organizzativa aggregata.
            I lavoratori mantengono la proprietà del proprio layer personale.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/company"
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Apri il Cockpit Aziendale
          </Link>
          <Link
            href="/my-kora"
            className="rounded-md border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Apri il Preview My KORA
          </Link>
        </div>
      </div>

      {/* Action-to-Index pipeline */}
      <PipelineConnectorBanner />

      {/* What KORA measures and does not */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
          Cosa viene misurato
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-slate-700 mb-3">KORA misura</p>
            <ul className="space-y-2">
              {[
                'Tasso di attivazione organizzativa e distribuzione',
                'Bilanciamento della partecipazione tra dipartimenti e pillar',
                'Copertura pillar su LIFE, GROWTH, CONNECTION, IMPACT, LEGACY',
                "Qualità del contributo verificata vs. autodichiarata",
                "Continuità dell'engagement tra periodi",
                "Confidence Score che riflette l'affidabilità delle evidenze",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 shrink-0 text-slate-300">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-rose-100 bg-rose-50 p-5">
            <p className="text-xs font-semibold text-rose-700 mb-3">KORA non misura</p>
            <ul className="space-y-2">
              {[
                'Prestazioni o produttività individuale del lavoratore',
                'Benessere, stato di salute o sorveglianza del lavoratore',
                'Punteggi PIB individuali visibili ai datori di lavoro',
                'Classifiche, leaderboard o idoneità ai premi',
                'Utilizzo del marketplace o attività di prenotazione benefit',
                'Qualsiasi metrica che valuta o sorveglia i lavoratori individualmente',
              ].map((item) => (
                <li key={item} className="flex gap-2 text-sm text-rose-800">
                  <span className="mt-0.5 shrink-0 text-rose-300">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Why this matters */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
          Perché questo è importante
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Per l'azienda",
              body: "Smettila di indovinare se il tuo budget per il welfare e le iniziative raggiunge le persone. KORA ti dice cosa viene attivato, con quale distribuzione e con quale qualità delle evidenze.",
            },
            {
              title: 'Per il lavoratore',
              body: "Nessuna sorveglianza. Il tuo bilancio impatto personale, le impostazioni di consenso e il Dynamic CV sono tuoi. Il tuo datore di lavoro vede solo intelligence aggregata — mai i tuoi dati individuali.",
            },
            {
              title: "Per l'ecosistema",
              body: "Partner, advisor e iniziative collettive si connettono a un layer di intelligence verificabile. L'attivazione viene misurata, non presupposta.",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800 mb-2">{card.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario story */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
          Una società, due momenti nel tempo
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Meridiana Group S.r.l. è la principale società demo sintetica.
          Due scenari mostrano KORA prima e dopo aver agito sulle sue raccomandazioni.
          Passa tra di essi con i pulsanti <span className="font-semibold text-slate-700">Demo Scenario</span> nella barra superiore.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-bold text-slate-900">S1 — Baseline</span>
              <span className="rounded border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">
                WARNING
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
              {[['KORA Index', '47'], ['Confidence', '60%'], ['Attivazione', '38%'], ['Significativa', '22%']].map(([l, v]) => (
                <div key={l} className="text-xs">
                  <span className="text-slate-500">{l}</span>
                  <span className="font-bold text-slate-800 ml-1.5">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic border-t border-yellow-200 pt-3">
              &ldquo;Iniziative frammentate, continuità debole, partecipazione disomogenea.
              Il 12% dei lavoratori genera il 64% dell&apos;impatto misurato.&rdquo;
            </p>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-bold text-slate-900">S2 — Migliorato</span>
              <span className="rounded border border-green-300 bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                CLEAR
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
              {[['KORA Index', '64'], ['Confidence', '72%'], ['Attivazione', '52%'], ['Significativa', '38%']].map(([l, v]) => (
                <div key={l} className="text-xs">
                  <span className="text-slate-500">{l}</span>
                  <span className="font-bold text-slate-800 ml-1.5">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic border-t border-green-200 pt-3">
              &ldquo;Miglior bilanciamento, evidenze più solide, continuità maggiore e attivazione più ampia.
              L&apos;Activation Safeguard è passato a CLEAR.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Review path */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
          Come esplorare questa demo
        </h2>
        <div className="space-y-2">
          {REVIEW_STEPS.map((step) => (
            <Link
              key={step.step}
              href={step.href}
              className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-500 flex items-center justify-center mt-0.5">
                {step.step}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{step.label}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Demo status */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">
          Stato della demo
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['Dati',                   'Solo sintetici — nessun dato aziendale reale'],
            ['Calibrazione',           'Pre-empirica — metodologia v0.1, pesi provvisori'],
            ['Account lavoratori',     'Nessuno — nessun record di partecipazione reale'],
            ['Backend',                'Nessun DB in produzione, nessuna auth, nessuna API live'],
            ['Pagamenti / marketplace','Nessuno — esclusi da Foundation Light'],
            ['Accesso datore lavoro',  'Il datore di lavoro non vede mai i dati individuali dei lavoratori'],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <span className="text-xs font-semibold text-slate-500 shrink-0 w-40">{label}</span>
              <span className="text-xs text-slate-400 leading-relaxed">{value}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-slate-400 border-t border-slate-200 pt-3">
          KORA Foundation Light v0.1 · Metodologia v0.1 · Società demo: Meridiana Group S.r.l. (sintetica)
        </p>
      </div>

    </div>
  );
}
