import Link from 'next/link';

const WHAT_KORA_MEASURES = [
  'Organizational activation rate and distribution',
  'Participation balance across departments and pillars',
  'Pillar coverage: LIFE, GROWTH, CONNECTION, IMPACT, LEGACY',
  'Verified versus self-declared contribution quality',
  'Continuity of engagement across periods',
  'Confidence Score and evidence quality',
];

const WHAT_KORA_DOES_NOT_MEASURE = [
  'Individual worker performance or productivity',
  'Worker wellbeing, health, or surveillance',
  'Individual PIB scores visible to employers',
  'Rankings, leaderboards, or reward eligibility',
  'Marketplace usage or benefits booking activity',
  'Any metric that rates or surveils individual workers',
];

const DEMO_SECTIONS = [
  {
    label: 'Company Intelligence',
    href: '/company',
    role: 'Any company role',
    desc: 'Executive Cockpit: KORA Index, Activation Safeguard, Confidence Score, 10-component breakdown.',
  },
  {
    label: 'KORA Index Detail',
    href: '/company/kora-index',
    role: 'Company role',
    desc: 'Full explainability panel, methodology version, component weights, and Confidence Score breakdown.',
  },
  {
    label: 'Activation & Participation',
    href: '/company/activation',
    role: 'Company role',
    desc: 'AR, MAR, Continuity, Verification — aggregate only. Groups under 10 workers are suppressed.',
  },
  {
    label: 'KORA Contribution',
    href: '/company/contribution',
    role: 'Company role',
    desc: 'Companion indicator for collective and ecosystem engagement. Separate from KORA Index — never merged.',
  },
  {
    label: 'My KORA Preview',
    href: '/my-kora',
    role: 'Switch to Worker role',
    desc: 'Worker-private space. Dynamic Impact CV, Privacy & Sharing, personal pillar timeline. Employer roles are blocked.',
  },
  {
    label: 'Future Vision',
    href: '/future-vision',
    role: 'Any role',
    desc: 'Conceptual mockups of post-pilot capabilities. Not active in Foundation Light — no backend logic.',
  },
];

export default function DemoLanding() {
  return (
    <div className="space-y-8 max-w-3xl">

      {/* Hero */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Foundation Light v0.1
          </span>
          <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
            Synthetic data · Pre-empirical calibration
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 leading-tight">
          KORA shows whether your organization is truly activating its human impact.
        </h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Not a welfare platform. Not an HR tracker. Not worker surveillance.
          KORA translates organizational actions into explainable activation intelligence —
          a company-level output that tells you whether your workforce is genuinely engaged,
          how evenly that engagement is distributed, and how much of it is verifiable.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/company"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Start Company Demo
          </Link>
          <Link
            href="/my-kora"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            View My KORA Preview
          </Link>
          <Link
            href="/future-vision"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Future Vision
          </Link>
        </div>
      </div>

      {/* What KORA measures vs. does not */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-green-200 bg-green-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-3">
            What KORA measures
          </p>
          <ul className="space-y-1.5">
            {WHAT_KORA_MEASURES.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-green-800">
                <span className="mt-0.5 shrink-0 text-green-400">·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 mb-3">
            What KORA does not measure
          </p>
          <ul className="space-y-1.5">
            {WHAT_KORA_DOES_NOT_MEASURE.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-rose-800">
                <span className="mt-0.5 shrink-0 text-rose-400">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Scenario explainer */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Two demo scenarios — one company, two points in time
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-bold text-slate-800">S1 — Baseline</span>
              <span className="rounded border border-yellow-300 bg-yellow-100 px-1.5 py-0.5 text-xs font-semibold text-yellow-700">
                WARNING
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Q1–Q3 2025. 38% activation · 22% meaningful activation.
              Participation concentrated in 12% of the workforce.
              KORA Index: 47 · Confidence Score: 0.60.
            </p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-bold text-slate-800">S2 — Improved</span>
              <span className="rounded border border-green-300 bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
                CLEAR
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Q1–Q4 2025. 52% activation · 38% meaningful activation.
              Broader participation, improved continuity.
              KORA Index: 64 · Confidence Score: 0.72.
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Use the Scenario switcher in the top bar to toggle between S1 and S2 at any point.
        </p>
      </div>

      {/* What to review */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          What to review in this demo
        </p>
        <div className="space-y-2">
          {DEMO_SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{section.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{section.desc}</p>
              </div>
              <span className="shrink-0 text-xs font-mono text-slate-400 mt-0.5 text-right max-w-[120px]">
                {section.role}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Demo status */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Demo status
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
          {[
            ['Data', 'Synthetic only'],
            ['Calibration', 'Pre-empirical'],
            ['Live company data', 'None'],
            ['Production backend', 'None'],
            ['Real worker accounts', 'None'],
            ['Payments / marketplace', 'None'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">{label}</span>
              <span className="text-xs font-mono text-slate-400">{value}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-400 border-t border-slate-200 pt-3">
          KORA Foundation Light v0.1 · Methodology v0.1 · Meridiana Group S.r.l. (synthetic demo company)
        </p>
      </div>

    </div>
  );
}
