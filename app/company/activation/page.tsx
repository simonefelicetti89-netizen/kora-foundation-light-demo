'use client';

import { useRole, useScenario } from '@/lib/demo-state';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { PILLAR_CODES } from '@/lib/constants/kora';
import { activationSafeguardService } from '@/services/activation-safeguard/ActivationSafeguardService';
import { PrivacyBoundaryNotice } from '@/components/privacy/PrivacyBoundaryNotice';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import type { PillarCode } from '@/lib/types';

const SAFE_AGGREGATION_THRESHOLD = 10;

const PILLAR_BAR_COLORS: Record<string, string> = {
  LIFE:       'bg-green-400',
  GROWTH:     'bg-blue-400',
  CONNECTION: 'bg-purple-400',
  IMPACT:     'bg-orange-400',
  LEGACY:     'bg-amber-400',
};

const DEPT_LABELS: Record<string, string> = {
  'dept-operations': 'Operations',
  'dept-sales': 'Sales',
  'dept-hr-people': 'HR & People',
  'dept-product-engineering': 'Product & Engineering',
  'dept-admin-finance': 'Admin & Finance',
};

const DEBT_CONCENTRATION = {
  bottom_50_iu_pct: 0.12,
  next_40_iu_pct:   0.27,
  top_12_iu_pct:    0.64,
};

const SAFEGUARD_STYLE: Record<string, { container: string; label: string; badge: string }> = {
  CLEAR:   { container: 'border-green-200 bg-green-50',  label: 'text-green-800', badge: 'bg-green-100 text-green-700 border-green-300' },
  WARNING: { container: 'border-amber-200 bg-amber-50',  label: 'text-amber-800', badge: 'bg-amber-100 text-amber-700 border-amber-300' },
  FLAGGED: { container: 'border-red-200 bg-red-50',      label: 'text-red-800',   badge: 'bg-red-100 text-red-700 border-red-300' },
};

type DebtLevel = 'alto' | 'medio' | 'basso';

const PILLAR_DEBT: { pillar: string; coverage: number; level: DebtLevel }[] = [
  { pillar: 'LIFE',       coverage: 0.22, level: 'alto' },
  { pillar: 'GROWTH',     coverage: 0.31, level: 'medio' },
  { pillar: 'CONNECTION', coverage: 0.18, level: 'alto' },
  { pillar: 'IMPACT',     coverage: 0.44, level: 'medio' },
  { pillar: 'LEGACY',     coverage: 0.12, level: 'alto' },
];

const DEBT_LEVEL_BADGE: Record<DebtLevel, { style: string; label: string }> = {
  alto:  { style: 'bg-red-50 text-red-700 border-red-200',     label: 'Debt alto' },
  medio: { style: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Debt medio' },
  basso: { style: 'bg-green-50 text-green-700 border-green-200', label: 'Debt basso' },
};

type SiteStatus = 'ok' | 'warning' | 'flagged' | 'suppressed';

const SITE_ACTIVATION: { name: string; workers: number; ar: number; status: SiteStatus }[] = [
  { name: 'Sede Milano (HQ)',      workers: 100, ar: 0.60, status: 'ok' },
  { name: 'Plant Bergamo',         workers:  90, ar: 0.11, status: 'flagged' },
  { name: 'Sede Torino',           workers:  35, ar: 0.38, status: 'warning' },
  { name: 'Remoto / distribuito',  workers:  25, ar: 0.55, status: 'ok' },
];

const SITE_STATUS_BADGE: Record<SiteStatus, { style: string; label: string }> = {
  ok:         { style: 'bg-green-50 text-green-700 border-green-200',   label: 'CLEAR' },
  warning:    { style: 'bg-amber-50 text-amber-700 border-amber-200',   label: 'WARNING' },
  flagged:    { style: 'bg-red-50 text-red-700 border-red-200',         label: 'FLAGGED' },
  suppressed: { style: 'bg-slate-50 text-slate-400 border-slate-200',   label: 'Soppressa' },
};

const NEXT_ACTIONS: { priority: number; action: string; impact: string }[] = [
  { priority: 1, action: 'Attivare programma LIFE / Plant Bergamo — sito con AR 11%', impact: '+8–12 pp AR stimato' },
  { priority: 2, action: 'Estendere programma LEGACY — copertura attuale 12%', impact: '+4–6 pp AR stimato' },
  { priority: 3, action: 'Revisione offerta CONNECTION — pillar sotto soglia materialità', impact: 'Qualità attivazione' },
  { priority: 4, action: 'Aumentare VR su evidenze auto-dichiarate — partner verificati', impact: 'Confidence Score' },
];

const PARTNER_SUGGESTIONS: { pillar: string; type: string; note: string }[] = [
  { pillar: 'LIFE',       type: 'Prevenzione e benessere',     note: 'Copertura prod. insufficiente' },
  { pillar: 'LEGACY',     type: 'Trasferimento knowledge',     note: 'Nessun partner attivo' },
  { pillar: 'CONNECTION', type: 'Programma community interna', note: 'Bassa copertura cross-reparto' },
];

const PILLAR_TEXT_BADGE: Record<string, string> = {
  LIFE:       'text-green-700',
  GROWTH:     'text-blue-700',
  CONNECTION: 'text-purple-700',
  IMPACT:     'text-orange-700',
  LEGACY:     'text-amber-700',
};

function pct(val: number): string {
  return `${(val * 100).toFixed(0)}%`;
}

function MetricCard({ label, value, sub, description }: { label: string; value: string; sub: string; description?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      <p className="text-xs font-mono text-slate-400 mt-0.5">{sub}</p>
      {description && (
        <p className="text-xs text-slate-400 mt-1.5 leading-snug border-t border-slate-100 pt-1.5">
          {description}
        </p>
      )}
    </div>
  );
}

// C-08: Activation & Participation
export default function Activation() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();
  const companyId = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';
  const aggregate  = scoringSimulatorService.getCompanyAggregate(companyId, activeScenario);
  const safeguard  = activationSafeguardService.evaluateFromSeed(companyId, activeScenario);
  const debtEur    = activeScenario === 'S2' ? 35_000 : 45_000;
  const safeguardStyle = safeguard ? (SAFEGUARD_STYLE[safeguard.status] ?? SAFEGUARD_STYLE.WARNING) : SAFEGUARD_STYLE.WARNING;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Attivazione & Partecipazione</h1>
        <p className="text-sm text-slate-500">
          Vista solo aggregata. I gruppi con meno di {SAFE_AGGREGATION_THRESHOLD} lavoratori sono soppressi.
        </p>
      </div>

      {aggregate ? (
        <>
          {/* ── Activation Debt Hero ── */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Activation Debt — Maggioranza Silenziosa</h2>
              <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                Dati sintetici demo
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md border border-red-100 bg-red-50 p-3">
                <p className="text-xs text-red-500">Lavoratori mai attivati</p>
                <p className="text-2xl font-bold text-red-700 mt-1">
                  {Math.round((1 - aggregate.activation_rate) * aggregate.total_workers)}
                </p>
                <p className="text-xs font-mono text-red-400 mt-0.5">
                  {pct(1 - aggregate.activation_rate)} forza lavoro
                </p>
              </div>
              <div className="rounded-md border border-amber-100 bg-amber-50 p-3">
                <p className="text-xs text-amber-600">Bottom 50% lavoratori</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{pct(DEBT_CONCENTRATION.bottom_50_iu_pct)}</p>
                <p className="text-xs font-mono text-amber-500 mt-0.5">degli IU totali</p>
              </div>
              <div className="rounded-md border border-amber-100 bg-amber-50 p-3">
                <p className="text-xs text-amber-600">Top 12% lavoratori</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{pct(DEBT_CONCENTRATION.top_12_iu_pct)}</p>
                <p className="text-xs font-mono text-amber-500 mt-0.5">degli IU totali</p>
              </div>
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Activation Debt stimato</p>
                <p className="text-2xl font-bold text-slate-700 mt-1">
                  €{debtEur.toLocaleString('it-IT')}
                </p>
                <p className="text-xs font-mono text-slate-400 mt-0.5">budget non convertito in IU</p>
              </div>
            </div>
          </div>

          {/* ── Activation Safeguard ── */}
          {safeguard && (
            <div className={`rounded-lg border p-4 ${safeguardStyle.container}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold uppercase tracking-wide ${safeguardStyle.label}`}>
                  Activation Safeguard
                </p>
                <span className={`rounded border px-2 py-0.5 text-xs font-bold ${safeguardStyle.badge}`}>
                  {safeguard.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <span className={safeguardStyle.label}>
                  AR: <span className="font-mono font-semibold">{pct(safeguard.ar_value)}</span>
                  {' '}(soglia CLEAR ≥ 40%)
                </span>
                <span className={safeguardStyle.label}>
                  MAR: <span className="font-mono font-semibold">{pct(safeguard.mar_value)}</span>
                  {' '}(soglia CLEAR ≥ 30%)
                </span>
              </div>
              {safeguard.status !== 'CLEAR' && (
                <p className={`text-xs mt-2 leading-snug ${safeguardStyle.label}`}>
                  Soglia non raggiunta — attivazione insufficiente per almeno un indicatore primario.
                  Il Board Pack includerà questo alert.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Activation Rate"       value={pct(aggregate.activation_rate)}             sub="AR"  description="Quota della forza lavoro idonea con almeno un'Impact Unit approvata nel periodo." />
            <MetricCard label="Meaningful Activation" value={pct(aggregate.meaningful_activation_rate)}  sub="MAR" description="Quota di lavoratori la cui partecipazione supera la soglia di materialità — non solo nominale." />
            <MetricCard label="Continuity Rate"       value={pct(aggregate.continuity_rate)}             sub="CO"  description="Quota di lavoratori con engagement sostenuto in più periodi di rendicontazione." />
            <MetricCard label="Verification Rate"     value={pct(aggregate.verification_rate)}           sub="VR"  description="Quota di attività registrata supportata da evidenze verificate o parzialmente verificate." />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Popolazione Lavoratori</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">Lavoratori Totali</p>
                <p className="font-mono font-semibold text-slate-800">{aggregate.total_workers}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Lavoratori Attivi</p>
                <p className="font-mono font-semibold text-slate-800">{aggregate.active_worker_count}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Attivi Significativi</p>
                <p className="font-mono font-semibold text-slate-800">{aggregate.meaningful_active_worker_count}</p>
              </div>
            </div>
          </div>

          {/* ── Concentration Distribution ── */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Concentrazione IU — Distribuzione Interna</h2>
            <p className="text-xs text-slate-400 mb-3">
              Distribuzione aggregata degli Impact Unit tra fasce di lavoratori. Nessun nominativo. Nessun PIB individuale.
            </p>
            <div className="space-y-3">
              {[
                { label: 'Top 12% lavoratori', pct: DEBT_CONCENTRATION.top_12_iu_pct, color: 'bg-red-400' },
                { label: 'Fascia 38–88%',       pct: DEBT_CONCENTRATION.next_40_iu_pct, color: 'bg-amber-300' },
                { label: 'Bottom 50%',           pct: DEBT_CONCENTRATION.bottom_50_iu_pct, color: 'bg-slate-300' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-36 text-xs text-slate-600">{row.label}</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-100">
                    <div
                      className={`h-3 rounded-full ${row.color}`}
                      style={{ width: `${row.pct * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-500 w-10 text-right">{pct(row.pct)}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              Concentrazione IU: il top 12% genera {pct(DEBT_CONCENTRATION.top_12_iu_pct)} degli IU totali.
              Activation Debt elevato — espansione della base di attivazione prioritaria.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Distribuzione Pillar</h2>
            <div className="space-y-2">
              {PILLAR_CODES.map((pillar) => {
                const share = aggregate.pillar_distribution[pillar as PillarCode] ?? 0;
                return (
                  <div key={pillar} className="flex items-center gap-3">
                    <span className="w-24 text-xs font-mono text-slate-600">{pillar}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${PILLAR_BAR_COLORS[pillar] ?? 'bg-slate-400'}`}
                        style={{ width: `${share * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-10 text-right">{pct(share)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Pillar Debt Table ── */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Activation Debt per Pillar</h2>
            <p className="text-xs text-slate-400 mb-3">
              Copertura lavoratori attivi per pillar. Pillar con copertura bassa indicano aree di espansione prioritaria.
            </p>
            <div className="divide-y divide-slate-50">
              {PILLAR_DEBT.map((row) => {
                const badge = DEBT_LEVEL_BADGE[row.level];
                return (
                  <div key={row.pillar} className="flex items-center gap-3 py-2">
                    <span className={`w-24 text-xs font-mono font-semibold ${PILLAR_TEXT_BADGE[row.pillar] ?? 'text-slate-600'}`}>
                      {row.pillar}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${PILLAR_BAR_COLORS[row.pillar] ?? 'bg-slate-400'}`}
                        style={{ width: `${row.coverage * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-500 w-10 text-right">{pct(row.coverage)}</span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${badge.style}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Tasso di Attivazione per Dipartimento</h2>
            <p className="text-xs text-slate-400 mb-3">
              Visualizzati solo i dipartimenti con ≥{SAFE_AGGREGATION_THRESHOLD} lavoratori.
            </p>
            <div className="space-y-2">
              {Object.entries(aggregate.department_activation).map(([deptId, rate]) => (
                <div key={deptId} className="flex items-center gap-3">
                  <span className="w-44 text-xs text-slate-600 truncate">
                    {DEPT_LABELS[deptId] ?? deptId}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-teal-400"
                      style={{ width: `${rate * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-10 text-right">{pct(rate)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Site / Location Gap ── */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Gap per Sede / Sito</h2>
            <p className="text-xs text-slate-400 mb-3">
              Visualizzate solo sedi con ≥{SAFE_AGGREGATION_THRESHOLD} lavoratori. I gruppi inferiori sono soppressi per privacy.
            </p>
            <div className="space-y-2">
              {SITE_ACTIVATION.map((site) => {
                if (site.status === 'suppressed') {
                  return (
                    <div key={site.name}>
                      <PrivacyBoundaryNotice
                        reason="group_too_small"
                        dataType={site.name}
                        groupSize={site.workers}
                        className="py-2"
                      />
                    </div>
                  );
                }
                const sb = SITE_STATUS_BADGE[site.status];
                return (
                  <div key={site.name} className="flex items-center gap-3">
                    <span className="w-36 text-xs text-slate-600 truncate">{site.name}</span>
                    <span className="text-xs font-mono text-slate-400 w-16">{site.workers} lav.</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-teal-400"
                        style={{ width: `${site.ar * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-500 w-10 text-right">{pct(site.ar)}</span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${sb.style}`}>
                      {sb.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Next Actions ── */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Azioni Prioritarie — Riduzione Activation Debt</h2>
            <div className="space-y-2">
              {NEXT_ACTIONS.map((na) => (
                <div key={na.priority} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {na.priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700">{na.action}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono text-slate-400 whitespace-nowrap">{na.impact}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Partner Suggestions ── */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <h2 className="text-sm font-semibold text-blue-800 mb-2">Partner suggeriti — Copertura Pillar mancante</h2>
            <p className="text-xs text-blue-600 mb-3">
              Suggerimenti basati sui pillar con Debt alto. Nessun marketplace, nessun prezzo, nessuna prenotazione.
            </p>
            <div className="space-y-2">
              {PARTNER_SUGGESTIONS.map((ps) => (
                <div key={ps.pillar} className="flex items-center gap-3 text-xs">
                  <span className={`w-20 font-mono font-semibold ${PILLAR_TEXT_BADGE[ps.pillar] ?? 'text-slate-600'}`}>
                    {ps.pillar}
                  </span>
                  <span className="text-blue-800">{ps.type}</span>
                  <span className="text-blue-500 italic">{ps.note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Board Pack Link ── */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-700">Board Pack — Activation Debt Report</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Esporta la vista Activation Debt in formato Board Pack. Solo dati aggregati. Nessun dato individuale.
              </p>
            </div>
            <button
              disabled
              className="shrink-0 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-400 cursor-not-allowed"
              title="Demo — export non attivo in Foundation Light."
            >
              Esporta Board Pack
            </button>
          </div>

          {/* ── Disclaimer ── */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 space-y-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Note metodologiche
            </p>
            <ul className="space-y-0.5">
              {[
                'Nessun PIB individuale visualizzato — vista esclusivamente aggregata.',
                'Gruppi < 10 lavoratori soppressi per soglia privacy (safe_aggregation_threshold = 10).',
                'Activation Debt è un indicatore diagnostico aggregato — non una valutazione individuale.',
                'Stima valore Debt: modello sintetico demo — non un output economico certificato.',
                'EQ (Equity) misura equità distributiva dell\'attivazione tra segmenti — non qualità evidenza.',
              ].map((note) => (
                <li key={note} className="flex gap-1.5 text-[11px] text-slate-400">
                  <span className="shrink-0 mt-0.5">·</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-400">
            {aggregate.methodology_version_id} · {aggregate.calibration_status} · Dati demo sintetici · synthetic_demo_data: true
          </p>
        </>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
          Nessun dato aggregato disponibile per questo scenario.
        </div>
      )}
    </div>
  );
}
