import Link from 'next/link';
import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';

const SAFEGUARD_PILL: Record<string, string> = {
  CLEAR:   'bg-green-100 text-green-800 border border-green-200',
  WARNING: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  FLAGGED: 'bg-red-100 text-red-800 border border-red-200',
};

// A-01: KORA Operating Console
export default function KoraOperatingConsole() {
  const analytics  = adminPreviewService.getPlatformAnalyticsPreview();
  const portfolio  = adminPreviewService.getCompanyPortfolioPreview();
  const gates      = adminPreviewService.getGateStatusPreview();
  const billing    = adminPreviewService.getBillingRevenuePreview();
  const gtm        = adminPreviewService.getFounderValidationPreview();
  const advisors   = adminPreviewService.getAdvisorNetworkPreview();
  const partners   = adminPreviewService.getPartnerNetworkPreview();
  const benchmarks = adminPreviewService.getBenchmarkPreview();

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-slate-900">KORA Operating Console</h1>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Anteprima Interna
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-400">
            Solo dati sintetici
          </span>
        </div>
        <p className="text-sm text-slate-500 max-w-2xl">
          Vista operativa interna per gli operatori KORA Admin.
          Non è il workspace aziendale — mostra lo stato dell&apos;ecosistema cross-azienda,
          la salute della piattaforma, la governance metodologica e la pipeline commerciale.
        </p>
      </div>

      {/* Platform Analytics — top strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Aziende', value: String(analytics.companies_in_portfolio) },
          { label: 'Scenari Attivi', value: String(analytics.active_scenarios) },
          { label: 'Batch Fonti', value: `${analytics.source_batches_approved}/${analytics.source_batches_total} approvati` },
          { label: 'KORA Index Medio', value: String(analytics.avg_kora_index) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Module grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {/* 00: AI Onboarding Engine — featured */}
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5 flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">00 — Flusso Principale</p>
              <p className="text-sm font-bold text-indigo-900 mt-0.5">AI Onboarding Engine</p>
              <p className="text-xs text-indigo-700 mt-1 max-w-xl">
                Acquisizione fonti · Mapping tassonomia BCM · Filtro privacy · Coda bozze UEF · Revisione umana · Idoneità al calcolo.
                Il percorso dal dato aziendale grezzo a un dataset pronto per lo scoring.
              </p>
            </div>
            <div className="shrink-0 space-y-1 text-right">
              {(() => {
                const onb = adminPreviewService.getAIOnboardingPreview();
                return (
                  <>
                    <p className="text-[10px] text-indigo-500">{onb.source_batch_count} batch fonti</p>
                    <p className="text-[10px] text-indigo-500">{onb.approved_batches} approvati · {onb.pending_review_batches} in attesa</p>
                    <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${
                      onb.scoring_readiness === 'ready'   ? 'bg-green-100 text-green-800 border-green-200' :
                      onb.scoring_readiness === 'partial' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      'bg-red-100 text-red-800 border-red-200'
                    }`}>
                      {onb.scoring_readiness.toUpperCase()} per scoring
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-indigo-600 border-t border-indigo-100 pt-3">
            <span>L&apos;AI assiste il mapping e la revisione. Non calcola punteggi sui lavoratori.</span>
            <span>·</span>
            <span>Tassonomia BCM rule-based — nessun LLM esterno su dati HR.</span>
            <span>·</span>
            <span>Solo i record UEF approvati entrano nel calcolo.</span>
          </div>
          <Link href="/admin/ai-onboarding" className="text-xs font-semibold text-indigo-600 hover:underline self-start">
            Apri AI Onboarding Engine →
          </Link>
        </div>

        {/* 01: Activation Orchestration Engine */}
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-5 flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-500">ORCH — Livello di Orchestrazione</p>
              <p className="text-sm font-bold text-teal-900 mt-0.5">Activation Orchestration Engine</p>
              <p className="text-xs text-teal-700 mt-1 max-w-xl">
                Modulo interno KORA per la revisione, approvazione e misurazione delle iniziative aziendali e collettive.
                KORA valida l&apos;idoneità, classifica il pillar di riferimento, instrada verso advisor e partner, approva o rifiuta,
                monitora le soglie di partecipazione e misura i risultati.
              </p>
            </div>
            {/* Inline lifecycle counts */}
            <div className="shrink-0 space-y-1 text-right">
              {[
                ['Proposte',                '2'],
                ['In Revisione KORA',       '1'],
                ['Revisione Advisor Richiesta', '1'],
                ['Approvate / Attive',      '3'],
                ['Misurate',                '1'],
              ].map(([label, count]) => (
                <p key={label} className="text-[10px] text-teal-600">
                  <span className="font-bold text-teal-800 mr-1">{count}</span>{label}
                </p>
              ))}
            </div>
          </div>

          {/* Lifecycle stages */}
          <div className="flex flex-wrap gap-1 items-center text-[10px] font-mono text-teal-600 border-t border-teal-100 pt-3">
            {['draft', 'proposed', 'under_kora_review', 'advisor_review_required', 'partner_validation_required',
              'approved', 'active', 'completed', 'measured', 'rejected'].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-1">
                <span className="rounded border border-teal-200 bg-white px-1.5 py-0.5">{s}</span>
                {i < arr.length - 1 && <span className="text-teal-300">→</span>}
              </span>
            ))}
          </div>

          {/* Canonical sentence + disclaimer */}
          <div className="rounded border border-teal-100 bg-white px-3 py-2 text-xs text-teal-700 border-t border-teal-100 pt-3">
            KORA è il livello di orchestrazione tra l&apos;intenzione aziendale, la partecipazione dei lavoratori, le evidenze dei partner, la validazione degli advisor e l&apos;impatto misurabile.
          </div>
          <div className="flex items-center gap-3 text-[10px] text-teal-600">
            <span>Il denaro da solo non è impatto — la spesa senza attivazione non viene premiata.</span>
            <span>·</span>
            <span>KORA premia l&apos;addizionalità, non la semplice compliance.</span>
            <span>·</span>
            <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-blue-700 font-semibold">Foundation Light Preview</span>
          </div>
        </div>

        {/* 1: Company Portfolio */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">01</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">Company Portfolio</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {portfolio.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-slate-700 font-medium">{c.company_name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {c.kora_index_value !== null && (
                    <span className="font-mono text-slate-500">{c.kora_index_value}</span>
                  )}
                  {c.safeguard_status && (
                    <span className={`rounded px-1 py-0.5 text-[10px] font-semibold ${SAFEGUARD_PILL[c.safeguard_status] ?? ''}`}>
                      {c.safeguard_status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Link href="/admin/portfolio" className="text-xs font-medium text-indigo-600 hover:underline">
            Visualizza portfolio →
          </Link>
        </div>

        {/* 2: KORA Index Registry */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">02</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">KORA Index Registry</p>
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide pb-1 border-b border-slate-100">
              <span>Azienda</span><span>S</span><span className="text-right">Index</span>
            </div>
            {adminPreviewService.getIndexRegistryPreview().slice(0, 5).map((e) => (
              <div key={`${e.company_id}-${e.scenario_id}`} className="grid grid-cols-3 gap-1 text-xs items-center">
                <span className="truncate text-slate-600 text-[11px]">{e.company_name.split(' ')[0]}</span>
                <span className="font-mono text-slate-400">{e.scenario_id}{e.is_synthetic && <span className="text-[9px] text-slate-300 ml-0.5">~</span>}</span>
                <span className={`text-right font-bold ${e.safeguard_status === 'FLAGGED' ? 'text-red-600' : e.safeguard_status === 'WARNING' ? 'text-yellow-700' : 'text-green-700'}`}>
                  {e.kora_index_value}
                </span>
              </div>
            ))}
          </div>
          <Link href="/admin/index-registry" className="text-xs font-medium text-indigo-600 hover:underline">
            Visualizza registro →
          </Link>
        </div>

        {/* 3: Benchmarks */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">03</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">Benchmarks</p>
          </div>
          <div className="flex-1 space-y-2">
            {benchmarks.map((b) => (
              <div key={b.dimension} className="text-xs">
                <p className="text-slate-400 text-[10px]">{b.dimension}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-indigo-400" style={{ width: `${b.meridiana_index}%` }} />
                  </div>
                  <span className="font-mono text-slate-600 shrink-0">{b.meridiana_index} vs avg {b.cluster_avg}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 italic">Solo dati benchmark sintetici</p>
          <Link href="/admin/benchmarks" className="text-xs font-medium text-indigo-600 hover:underline">
            Visualizza benchmark →
          </Link>
        </div>

        {/* 4: Advisor Network */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">04</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">Advisor Network</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {advisors.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-slate-700">{a.name.split(' ').slice(-1)[0]}, {a.name.split(' ')[0]}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-400 font-mono">{a.pending_reviews} in attesa</span>
                  <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${a.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link href="/admin/network" className="text-xs font-medium text-indigo-600 hover:underline">
            Visualizza rete →
          </Link>
        </div>

        {/* 5: Partner Network */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">05</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">Partner Network</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {partners.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-slate-700">{p.name}</span>
                <span className="text-slate-400 shrink-0">{p.pillars[0]}</span>
              </div>
            ))}
            {partners.length > 4 && (
              <p className="text-xs text-slate-400">+{partners.length - 4} altri</p>
            )}
          </div>
          <Link href="/admin/network" className="text-xs font-medium text-indigo-600 hover:underline">
            Visualizza rete →
          </Link>
        </div>

        {/* 6: Platform Analytics */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">06</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">Platform Analytics</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[
              ['Confidence Score Medio', `${(analytics.avg_confidence_score * 100).toFixed(0)}%`],
              ['Completezza Dati Media', `${(analytics.avg_data_completeness * 100).toFixed(0)}%`],
              ['CLEAR / WARNING / FLAGGED', `${analytics.safeguard_distribution.CLEAR} / ${analytics.safeguard_distribution.WARNING} / ${analytics.safeguard_distribution.FLAGGED}`],
            ].map(([l, v]) => (
              <div key={l as string} className="flex justify-between text-xs">
                <span className="text-slate-500">{l}</span>
                <span className="font-mono text-slate-700">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 7: Billing & Revenue */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">07</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">Billing & Revenue</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Anteprima mock — nessuna esecuzione pagamento</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {billing.slice(0, 3).map((b) => (
              <div key={b.company_name} className="flex justify-between text-xs gap-2">
                <span className="truncate text-slate-600">{b.company_name.split(' ')[0]}</span>
                <span className="font-mono text-slate-500 shrink-0">€{(b.setup_fee_eur + b.monthly_fee_eur * 12 + b.advisory_fee_eur).toLocaleString('it-IT')}/yr</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-300 italic">Nessun Stripe · Nessun wallet · Nessuna custodia fondi · Solo demo</p>
        </div>

        {/* 8: Go-to-Market / Founder Validation */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">08</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">Go-to-Market Pipeline</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {gtm.slice(0, 4).map((e) => (
              <div key={e.company_name} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-slate-700">{e.company_name.split(' ')[0]}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                  e.stage === 'pilot_active' ? 'bg-green-50 text-green-700 border-green-200' :
                  e.stage === 'pilot_proposed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  e.stage === 'demo_shown' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  {e.stage.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
          <Link href="/admin/gtm" className="text-xs font-medium text-indigo-600 hover:underline">
            Visualizza pipeline →
          </Link>
        </div>

        {/* 9: Gate & Methodology Status */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">09</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">Methodology & Gate Status</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {gates.gates.map((g) => (
              <div key={g.id} className="flex items-center gap-2 text-xs">
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                  g.status === 'CLOSED'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>
                  {g.status}
                </span>
                <span className="truncate text-slate-600">{g.label.split(' — ')[0]}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400">
            {gates.methodology_version_id} · {gates.calibration_status}
          </p>
        </div>

      </div>
    </div>
  );
}
