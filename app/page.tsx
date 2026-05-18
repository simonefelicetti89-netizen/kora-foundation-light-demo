import Link from 'next/link';

const WORKSPACE_CARDS = [
  {
    number: '01',
    title: 'Company Activation Intelligence',
    shows: [
      'KORA Index — organizational activation score',
      'Confidence Score — evidence reliability',
      'Activation Safeguard — CLEAR / WARNING / FLAGGED',
      'Recommended actions derived from weak components',
    ],
    cta: 'Open Company Cockpit',
    href: '/company',
    accent: 'border-slate-300 bg-white',
    ctaClass: 'bg-slate-900 text-white hover:bg-slate-700',
  },
  {
    number: '02',
    title: 'Evidence & Explainability',
    shows: [
      'Data sources and mapping confidence',
      'Evidence completeness per pillar',
      'Verification rate and audit trail',
      'Methodology version and limitations',
    ],
    cta: 'Review Data & Evidence',
    href: '/company/data',
    accent: 'border-slate-200 bg-slate-50',
    ctaClass: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  },
  {
    number: '03',
    title: 'Worker-Owned Layer',
    shows: [
      'My KORA — personal pillar timeline',
      'PIB Light — personal impact balance preview',
      'Privacy & Sharing — consent controls',
      'Dynamic Impact CV — portable impact portfolio',
    ],
    cta: 'Open My KORA Preview',
    href: '/my-kora',
    accent: 'border-indigo-200 bg-indigo-50',
    ctaClass: 'border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50',
    note: 'Switch to Worker role to access',
  },
  {
    number: '04',
    title: 'Future Ecosystem',
    shows: [
      'Partner services and collective initiatives',
      'Advisor review and evidence certification',
      'KORA Link — NFC/QR attendance verification',
      'Post-pilot platform vision',
    ],
    cta: 'View Future Vision',
    href: '/future-vision',
    accent: 'border-orange-200 bg-orange-50',
    ctaClass: 'border border-orange-300 bg-white text-orange-700 hover:bg-orange-50',
    note: 'Conceptual mockups — not active in Foundation Light',
  },
];

const REVIEW_STEPS = [
  { step: 1, label: 'Executive Cockpit', href: '/company',           desc: 'KORA Index, Safeguard, Confidence Score, insight tiles' },
  { step: 2, label: 'KORA Index Detail', href: '/company/kora-index', desc: 'Full component breakdown, methodology trace, explainability' },
  { step: 3, label: 'Activation & Participation', href: '/company/activation', desc: 'AR, MAR, CO, VR with pillar distribution and department breakdown' },
  { step: 4, label: 'Data & Evidence',    href: '/company/data',      desc: 'Source coverage, mapping confidence, evidence completeness' },
  { step: 5, label: 'My KORA',           href: '/my-kora',            desc: 'Worker-private space — switch to Worker role first' },
  { step: 6, label: 'Future Vision',     href: '/future-vision',      desc: 'Conceptual post-pilot capabilities — all labeled inactive' },
];

export default function DemoLanding() {
  return (
    <div className="space-y-10 max-w-3xl">

      {/* Hero */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Foundation Light v0.1
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
            Synthetic data · Pre-empirical calibration · Not a production system
          </span>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 leading-tight">
          See whether your organization is truly activating its human impact.
        </h1>
        <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-2xl">
          KORA turns fragmented initiatives, participation signals and evidence into
          explainable organizational activation intelligence — a company-level output
          with a Confidence Score, Activation Safeguard, and methodology-versioned
          explainability.
        </p>

        {/* Positioning strip */}
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 tracking-wide">
            Not welfare management &nbsp;·&nbsp; Not HR surveillance &nbsp;·&nbsp; Not a wellbeing tracker &nbsp;·&nbsp; Not a generic ESG dashboard
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
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

      {/* What you are about to see — 4 workspace cards */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
          What you are about to see
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {WORKSPACE_CARDS.map((card) => (
            <div
              key={card.number}
              className={`rounded-lg border p-5 flex flex-col gap-4 ${card.accent}`}
            >
              <div>
                <p className="text-[10px] font-semibold text-slate-400 tracking-widest mb-1">
                  {card.number}
                </p>
                <p className="text-base font-bold text-slate-900 leading-snug">{card.title}</p>
                {card.note && (
                  <p className="text-xs text-slate-400 mt-0.5 italic">{card.note}</p>
                )}
              </div>
              <ul className="space-y-1.5 flex-1">
                {card.shows.map((item) => (
                  <li key={item} className="flex gap-2 text-xs text-slate-600">
                    <span className="mt-0.5 shrink-0 text-slate-300">·</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={card.href}
                className={`self-start rounded-md px-4 py-2 text-xs font-semibold transition-colors ${card.ctaClass}`}
              >
                {card.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario story — before/after */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
          One company, two points in time
        </h2>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Meridiana Group S.r.l. — a synthetic company. Two scenarios show how KORA reads
          organizational state before and after acting on its recommendations.
          Use the <span className="font-semibold">Demo Scenario</span> toggle in the top bar
          to switch between them at any point in the demo.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* S1 */}
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg font-bold text-slate-900">S1 — Baseline</span>
              <span className="rounded border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">
                WARNING
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 text-xs">
              <div><span className="text-slate-500">KORA Index</span> <span className="font-bold text-slate-800 ml-1">47</span></div>
              <div><span className="text-slate-500">Confidence</span> <span className="font-bold text-slate-800 ml-1">60%</span></div>
              <div><span className="text-slate-500">Activation</span> <span className="font-bold text-slate-800 ml-1">38%</span></div>
              <div><span className="text-slate-500">Meaningful</span> <span className="font-bold text-slate-800 ml-1">22%</span></div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed border-t border-yellow-200 pt-3 italic">
              &ldquo;Fragmented initiatives, weak continuity, uneven participation.
              12% of workers generate 64% of measured impact.&rdquo;
            </p>
          </div>

          {/* S2 */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg font-bold text-slate-900">S2 — Improved</span>
              <span className="rounded border border-green-300 bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                CLEAR
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 text-xs">
              <div><span className="text-slate-500">KORA Index</span> <span className="font-bold text-slate-800 ml-1">64</span></div>
              <div><span className="text-slate-500">Confidence</span> <span className="font-bold text-slate-800 ml-1">72%</span></div>
              <div><span className="text-slate-500">Activation</span> <span className="font-bold text-slate-800 ml-1">52%</span></div>
              <div><span className="text-slate-500">Meaningful</span> <span className="font-bold text-slate-800 ml-1">38%</span></div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed border-t border-green-200 pt-3 italic">
              &ldquo;Better balance, stronger evidence, higher continuity and broader activation.
              Activation Safeguard crossed to CLEAR.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* How to review */}
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
              <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-500 flex items-center justify-center">
                {step.step}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{step.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.desc}</p>
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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            ['Data', 'Synthetic only — no real company data'],
            ['Calibration', 'Pre-empirical — methodology v0.1, provisional weights'],
            ['Worker data', 'No real worker accounts or live participation records'],
            ['Backend', 'No production database, no authentication, no live APIs'],
            ['Payments / marketplace', 'None — excluded from Foundation Light scope'],
            ['Employer access', 'Employer roles never see individual worker data'],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-3 items-start">
              <span className="text-xs font-semibold text-slate-500 shrink-0 w-36">{label}</span>
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
