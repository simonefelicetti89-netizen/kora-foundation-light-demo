import Link from 'next/link';

const REVIEW_STEPS = [
  { step: 1, label: 'Executive Cockpit',         href: '/company',              desc: 'KORA Index · Confidence Score · Activation Safeguard · Insight tiles' },
  { step: 2, label: 'KORA Index Detail',         href: '/company/kora-index',   desc: 'Full 10-component breakdown · Explainability panel · Methodology trace' },
  { step: 3, label: 'Activation & Participation', href: '/company/activation',  desc: 'AR · MAR · Continuity · Verification · Pillar distribution' },
  { step: 4, label: 'Data & Evidence',           href: '/company/data',          desc: 'Source coverage · Mapping confidence · Evidence completeness' },
  { step: 5, label: 'My KORA',                   href: '/my-kora',               desc: 'Worker-private space — switch to Worker role first' },
  { step: 6, label: 'Future Vision',             href: '/future-vision',         desc: 'Conceptual post-pilot capabilities — all inactive in Foundation Light' },
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
            Synthetic data only
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
            Pre-empirical calibration
          </span>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 leading-tight">
          KORA shows whether organizational initiatives actually activate people.
        </h1>
        <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-2xl">
          KORA translates fragmented actions, participation signals and evidence
          into explainable organizational activation intelligence — a company-level output
          with a Confidence Score, Activation Safeguard and methodology-versioned explainability.
        </p>

        {/* Positioning strip */}
        <div className="mt-4 rounded border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 tracking-wide leading-relaxed">
            Not welfare management&nbsp;&nbsp;·&nbsp;&nbsp;
            Not HR surveillance&nbsp;&nbsp;·&nbsp;&nbsp;
            Not a wellbeing tracker&nbsp;&nbsp;·&nbsp;&nbsp;
            Not a generic ESG dashboard&nbsp;&nbsp;·&nbsp;&nbsp;
            Not a marketplace
          </p>
        </div>

        {/* Thesis */}
        <div className="mt-4 rounded border border-indigo-100 bg-indigo-50 px-4 py-3">
          <p className="text-sm font-semibold text-indigo-800">
            Companies see aggregate organizational intelligence.
            Workers keep ownership of their personal layer.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/company"
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Open Company Cockpit
          </Link>
          <Link
            href="/my-kora"
            className="rounded-md border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Open My KORA Preview
          </Link>
        </div>
      </div>

      {/* What KORA measures and does not */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
          What is being measured
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-slate-700 mb-3">KORA measures</p>
            <ul className="space-y-2">
              {[
                'Organizational activation rate and distribution',
                'Participation balance across departments and pillars',
                'Pillar coverage across LIFE, GROWTH, CONNECTION, IMPACT, LEGACY',
                'Verified vs. self-declared contribution quality',
                'Continuity of engagement across periods',
                'Confidence Score reflecting evidence reliability',
              ].map((item) => (
                <li key={item} className="flex gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 shrink-0 text-slate-300">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-rose-100 bg-rose-50 p-5">
            <p className="text-xs font-semibold text-rose-700 mb-3">KORA does not measure</p>
            <ul className="space-y-2">
              {[
                'Individual worker performance or productivity',
                'Worker wellbeing, health status or surveillance',
                'Individual PIB scores visible to employers',
                'Rankings, leaderboards or reward eligibility',
                'Marketplace usage or benefits booking activity',
                'Any metric that rates or surveils individual workers',
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
          Why this matters
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              title: 'For the company',
              body: 'Stop guessing whether your welfare and initiative budget is reaching people. KORA tells you what is being activated, how evenly, and with what evidence quality.',
            },
            {
              title: 'For the worker',
              body: 'No surveillance. Your personal impact balance, consent settings and Dynamic CV are yours alone. Your employer sees only aggregate intelligence — never your individual data.',
            },
            {
              title: 'For the ecosystem',
              body: 'Partners, advisors and collective initiatives connect to a verifiable intelligence layer. Activation is measured, not assumed.',
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
          One company, two points in time
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Meridiana Group S.r.l. is the primary synthetic demo company.
          Two scenarios show KORA before and after acting on its recommendations.
          Toggle between them using the <span className="font-semibold text-slate-700">Demo Scenario</span> buttons in the top bar.
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
              {[['KORA Index', '47'], ['Confidence', '60%'], ['Activation', '38%'], ['Meaningful', '22%']].map(([l, v]) => (
                <div key={l} className="text-xs">
                  <span className="text-slate-500">{l}</span>
                  <span className="font-bold text-slate-800 ml-1.5">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic border-t border-yellow-200 pt-3">
              &ldquo;Fragmented initiatives, weak continuity, uneven participation.
              12% of workers generate 64% of measured impact.&rdquo;
            </p>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-bold text-slate-900">S2 — Improved</span>
              <span className="rounded border border-green-300 bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                CLEAR
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
              {[['KORA Index', '64'], ['Confidence', '72%'], ['Activation', '52%'], ['Meaningful', '38%']].map(([l, v]) => (
                <div key={l} className="text-xs">
                  <span className="text-slate-500">{l}</span>
                  <span className="font-bold text-slate-800 ml-1.5">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic border-t border-green-200 pt-3">
              &ldquo;Better balance, stronger evidence, higher continuity and broader activation.
              Activation Safeguard crossed to CLEAR.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Review path */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
          How to review this demo
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
          Demo status
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['Data',                  'Synthetic only — no real company data'],
            ['Calibration',           'Pre-empirical — methodology v0.1, provisional weights'],
            ['Worker accounts',       'None — no real participation records'],
            ['Backend',               'No production DB, no auth, no live APIs'],
            ['Payments / marketplace','None — excluded from Foundation Light'],
            ['Employer access',       'Employer never sees individual worker data'],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <span className="text-xs font-semibold text-slate-500 shrink-0 w-40">{label}</span>
              <span className="text-xs text-slate-400 leading-relaxed">{value}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-slate-400 border-t border-slate-200 pt-3">
          KORA Foundation Light v0.1 · Methodology v0.1 · Demo company: Meridiana Group S.r.l. (synthetic)
        </p>
      </div>

    </div>
  );
}
