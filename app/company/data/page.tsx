'use client';

import Link from 'next/link';
import { useRole, useScenario } from '@/lib/demo-state';
import { isAdminRole } from '@/lib/permissions';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { ingestionSimulatorService } from '@/services/ingestion-simulator/IngestionSimulatorService';
import { cn } from '@/lib/utils';

// ─── Helpers ───────────────────────────────────────────────────────────────

function pct(val: number) {
  return `${(val * 100).toFixed(0)}%`;
}

const STATUS_STYLES: Record<string, string> = {
  approved:           'bg-green-50 text-green-700 border-green-200',
  mostly_reviewed:    'bg-blue-50 text-blue-700 border-blue-200',
  partially_reviewed: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  under_review:       'bg-orange-50 text-orange-700 border-orange-200',
  rejected:           'bg-red-50 text-red-700 border-red-200',
};

function completenessColor(val: number) {
  return val >= 0.80 ? 'bg-green-500' : val >= 0.60 ? 'bg-yellow-400' : 'bg-red-400';
}

// ─── Static readiness data ─────────────────────────────────────────────────

interface DataSourceRow {
  name: string;
  example: string;
  status: string;
  statusColor: string;
  owner: string;
  format: string;
  pillars: string;
  sensitivity: string;
  sensitivityColor: string;
  mappingConfidence: string;
  mappingColor: string;
  nextAction: string;
}

const DATA_SOURCES: DataSourceRow[] = [
  {
    name: 'Welfare provider',
    example: 'Mindwork, Jointly, Eudaimon',
    status: 'Attivo',
    statusColor: 'bg-green-50 text-green-700 border-green-200',
    owner: 'HR',
    format: 'CSV / API',
    pillars: 'LIFE · CONNECTION',
    sensitivity: 'Media',
    sensitivityColor: 'text-yellow-600',
    mappingConfidence: '84%',
    mappingColor: 'text-green-600',
    nextAction: 'Verifica mapping Q2',
  },
  {
    name: 'LMS / Piattaforma formazione',
    example: 'Docebo, Cornerstone, Moodle',
    status: 'Attivo',
    statusColor: 'bg-green-50 text-green-700 border-green-200',
    owner: 'L&D',
    format: 'CSV / SCORM',
    pillars: 'GROWTH · LEGACY',
    sensitivity: 'Bassa',
    sensitivityColor: 'text-green-600',
    mappingConfidence: '91%',
    mappingColor: 'text-green-600',
    nextAction: '—',
  },
  {
    name: 'Registro HR (anagrafica workforce)',
    example: 'SAP HCM, Zucchetti, ADP',
    status: 'Attivo',
    statusColor: 'bg-green-50 text-green-700 border-green-200',
    owner: 'HR',
    format: 'CSV',
    pillars: 'Base anagrafica (privacy layer)',
    sensitivity: 'Alta',
    sensitivityColor: 'text-red-600',
    mappingConfidence: '95%',
    mappingColor: 'text-green-600',
    nextAction: 'Pseudonymization batch',
  },
  {
    name: 'Presenze / Timbrature',
    example: 'Badge, Zucchetti Presenze',
    status: 'In valutazione',
    statusColor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    owner: 'Operations',
    format: 'CSV',
    pillars: 'LIFE (in valutazione)',
    sensitivity: 'Media',
    sensitivityColor: 'text-yellow-600',
    mappingConfidence: '62%',
    mappingColor: 'text-yellow-600',
    nextAction: 'Definire perimetro eventi',
  },
  {
    name: 'Evidenze ESG / CSR',
    example: 'Report sostenibilità, iniziative territoriali',
    status: 'Parziale',
    statusColor: 'bg-orange-50 text-orange-700 border-orange-200',
    owner: 'Sustainability',
    format: 'PDF / Excel',
    pillars: 'IMPACT',
    sensitivity: 'Bassa',
    sensitivityColor: 'text-green-600',
    mappingConfidence: '71%',
    mappingColor: 'text-yellow-600',
    nextAction: 'Integrazione manuale Q3',
  },
  {
    name: 'Evidenze partner (KORA network)',
    example: 'Event log partner KORA',
    status: 'Attivo',
    statusColor: 'bg-green-50 text-green-700 border-green-200',
    owner: 'KORA Admin',
    format: 'JSON / API',
    pillars: 'CONNECTION · IMPACT',
    sensitivity: 'Bassa',
    sensitivityColor: 'text-green-600',
    mappingConfidence: '88%',
    mappingColor: 'text-green-600',
    nextAction: '—',
  },
  {
    name: 'Budget welfare / voucher / wallet futuri',
    example: 'Piano welfare, voucher fiscali',
    status: 'Escluso — Gate 5',
    statusColor: 'bg-slate-100 text-slate-500 border-slate-200',
    owner: 'Finance',
    format: 'Excel',
    pillars: 'N/A (escluso Foundation Light)',
    sensitivity: 'Alta',
    sensitivityColor: 'text-red-600',
    mappingConfidence: 'N/A',
    mappingColor: 'text-slate-400',
    nextAction: 'Gate 5 required (advisor)',
  },
  {
    name: 'Layer lavoratore (My KORA)',
    example: 'Self-report opzionale worker',
    status: 'Worker-only',
    statusColor: 'bg-purple-50 text-purple-700 border-purple-200',
    owner: 'Worker (self)',
    format: 'Dichiarazione worker',
    pillars: 'Worker-private — non employer-visible',
    sensitivity: 'Molto alta',
    sensitivityColor: 'text-red-700',
    mappingConfidence: 'N/A (privacy boundary)',
    mappingColor: 'text-slate-400',
    nextAction: 'Privacy boundary attiva',
  },
];

const EXCLUDED_DATA = [
  'Dati sanitari individuali (diagnosi, terapie, storia medica)',
  'Valutazioni psicologiche o terapeutiche nominali',
  'Dati biometrici individuali (misurazione corporea, DNA)',
  'Cronologia browser o attività digitale personale',
  'Performance individuale o rating manageriale',
  'Stipendi o dati retributivi individuali',
  'Dati di geolocalizzazione individuale continua',
  'Conversazioni o messaggi privati',
  'Dati voucher / wallet / strumenti transazionali futuri (Gate 5 — esclusi in Foundation Light)',
  'Record gov.kip_records (escluso architetturalmente)',
  'My KORA in workspace employer (layer worker-only)',
  'PIB individuale in workspace employer (solo aggregazione company)',
];

interface PipelineSource {
  name: string;
  pillars: string[];
  note?: string;
}

const PIPELINE_SOURCES: PipelineSource[] = [
  { name: 'Welfare provider',         pillars: ['LIFE', 'CONNECTION'] },
  { name: 'LMS / Formazione',         pillars: ['GROWTH', 'LEGACY'] },
  { name: 'HR anagrafica',            pillars: ['—'],                  note: 'privacy layer' },
  { name: 'ESG / CSR',               pillars: ['IMPACT'] },
  { name: 'Partner KORA',            pillars: ['CONNECTION', 'IMPACT'] },
  { name: 'Presenze',                pillars: ['LIFE'],                note: 'in valutazione' },
];

const PILLAR_COLORS: Record<string, string> = {
  LIFE:       'bg-emerald-100 text-emerald-700',
  GROWTH:     'bg-blue-100 text-blue-700',
  CONNECTION: 'bg-violet-100 text-violet-700',
  IMPACT:     'bg-amber-100 text-amber-700',
  LEGACY:     'bg-orange-100 text-orange-700',
  '—':        'bg-slate-100 text-slate-500',
};

const GOVERNANCE_CHECKLIST = [
  { ok: true,  item: 'Pseudonymization attiva per tutti i record HR (Stage 3)' },
  { ok: true,  item: 'Privacy Layer applicato prima di Stage 5 (UEF)' },
  { ok: true,  item: 'Nessun dato individuale visibile in workspace employer' },
  { ok: true,  item: 'PIB non esposto in nessuna vista employer' },
  { ok: true,  item: 'Soglia aggregazione sicura applicata (≥ 10 worker per segmento)' },
  { ok: true,  item: 'Sensibilità dei dati taggata per ogni fonte (bassa / media / alta)' },
  { ok: true,  item: 'Evidence quality verificata (EV correction factor applicato)' },
  { ok: true,  item: 'Audit trail attivo per ogni batch di ingestione' },
  { ok: false, item: 'Consenso worker verificato per dati My KORA — da completare pre-pilot' },
];

interface NextAction {
  action: string;
  owner: string;
  priority: 'Alta' | 'Media' | 'Bassa';
}

const NEXT_ACTIONS: NextAction[] = [
  { action: 'Completare mapping welfare provider',           owner: 'HR + KORA Admin',       priority: 'Alta' },
  { action: 'Definire perimetro eventi presenze/timbrature', owner: 'Operations + HR',        priority: 'Alta' },
  { action: 'Verificare soglia worker per aggregazione',     owner: 'KORA Admin',             priority: 'Alta' },
  { action: 'Integrare evidenze ESG/CSR manualmente',        owner: 'Sustainability + Admin', priority: 'Media' },
  { action: 'Revisione Privacy & Governance Checklist',      owner: 'Legal + HR',             priority: 'Media' },
];

const PRIORITY_STYLES: Record<string, string> = {
  Alta:  'bg-red-50 text-red-700 border-red-200',
  Media: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Bassa: 'bg-slate-50 text-slate-500 border-slate-200',
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', color ?? 'text-slate-800')}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── C-06: KORA Readiness & Data Inventory ──────────────────────────────────
export default function DataEvidence() {
  const { activeRole }     = useRole();
  const { activeScenario } = useScenario();
  const isAdmin            = isAdminRole(activeRole);

  const companyId    = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';
  const tenant       = tenantService.getTenant(companyId);
  const companyName  = tenant?.company_name ?? companyId;
  const batches      = ingestionSimulatorService.getSourceBatches(companyId, activeScenario);
  const completeness = ingestionSimulatorService.getSourceCompletenessSummary(companyId, activeScenario);
  const mapping      = ingestionSimulatorService.getMappingConfidenceSummary(companyId, activeScenario);
  const pending      = ingestionSimulatorService.getPendingReviewSummary(companyId, activeScenario);
  const evidence     = ingestionSimulatorService.getEvidenceCoverageSummary(companyId, activeScenario);

  return (
    <div className="space-y-8">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-slate-900">Stato Dati &amp; Evidenze</h1>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-400 font-mono">
            synthetic_demo_data: true
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {companyName} — {activeScenario} — KORA Methodology v0.1 — pre_empirical_calibration
        </p>
      </div>

      {/* ── Service-Assisted Boundary Notice ─────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-xs font-semibold text-slate-600 mb-1">Elaborazione gestita da KORA Operator</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          KORA opera la pipeline sui dati ricevuti dal cliente. L&apos;azienda visualizza output aggregati e Decision Pack,
          senza operare intake, review o scoring.
          Il Data Intake Studio è uno strumento dell&apos;Operatore KORA — accessibile dalla Console Operativa.
        </p>
        {isAdmin && (
          <Link
            href="/admin/companies/data-intake"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            KORA Operator: Data Intake Studio →
          </Link>
        )}
      </div>

      {/* ── Readiness Hero — 4 cards ─────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Readiness Overview
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-xs text-yellow-700">Readiness Score</p>
            <p className="text-3xl font-bold text-yellow-700 mt-1">76<span className="text-base font-normal">/100</span></p>
            <p className="text-xs text-yellow-600 mt-0.5">Ready with caveats</p>
          </div>
          <SummaryCard
            label="Fonti dati attive"
            value="6/8"
            sub="2 escluse o in valutazione"
            color="text-slate-800"
          />
          <SummaryCard
            label="Mapping Confidence Fonti"
            value="82%"
            sub="Media per fonte attiva (statica)"
            color="text-green-600"
          />
          <SummaryCard
            label="Campi esclusi (privacy)"
            value="14"
            sub="Non entrano nel pipeline KORA"
            color="text-slate-500"
          />
        </div>
        <p className="mt-2 text-xs text-slate-400 italic">
          Il Readiness Score non è il KORA Index. Misura la preparazione del dato per l&apos;elaborazione KORA — non l&apos;attivazione organizzativa.
        </p>
      </section>

      {/* ── Data Source Inventory ────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Inventario Fonti Dati
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Fonte</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Stato</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Owner</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Formato</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Pillar target</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Sensibilità</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Mapping</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Prossima azione</th>
              </tr>
            </thead>
            <tbody>
              {DATA_SOURCES.map((src) => (
                <tr key={src.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 text-xs">{src.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{src.example}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded border px-1.5 py-0.5 text-xs whitespace-nowrap', src.statusColor)}>
                      {src.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{src.owner}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">{src.format}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{src.pillars}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-semibold', src.sensitivityColor)}>
                      {src.sensitivity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-mono font-semibold', src.mappingColor)}>
                      {src.mappingConfidence}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{src.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Dati esclusi ────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Dati Esclusi dal Pipeline KORA
        </h2>
        <div className="rounded-lg border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-800 mb-3">
            Le seguenti categorie di dati non entrano mai nel processo KORA — per architettura, non per configurazione.
          </p>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {EXCLUDED_DATA.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-red-700">
                <span className="mt-0.5 shrink-0 text-red-400">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Pipeline Mapping Preview ─────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Pipeline Mapping Preview
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-3 items-start">
            {PIPELINE_SOURCES.map((src, i) => (
              <div key={src.name} className="flex items-center gap-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                  <p className="text-xs font-semibold text-slate-700">{src.name}</p>
                  {src.note && (
                    <p className="text-xs text-slate-400 mt-0.5 italic">{src.note}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1.5 justify-center">
                    {src.pillars.map((p) => (
                      <span key={p} className={cn('rounded px-1.5 py-0.5 text-xs font-semibold', PILLAR_COLORS[p] ?? 'bg-slate-100 text-slate-500')}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                {i < PIPELINE_SOURCES.length - 1 && (
                  <span className="text-slate-300 text-sm">→</span>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="text-slate-300 text-sm">→</span>
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-center">
                <p className="text-xs font-bold text-indigo-700">UEF</p>
                <p className="text-xs text-indigo-500 mt-0.5">→ IU → PIB → KORA Index</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400 italic">
            Non tutte le fonti alimentano il KORA Index direttamente. HR anagrafica passa per il Privacy Layer (Stage 3) senza generare IU diretti. Wallet, voucher e My KORA sono esclusi o worker-private.
          </p>
        </div>
      </section>

      {/* ── Privacy & Governance Checklist ──────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Privacy &amp; Governance Checklist
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
          {GOVERNANCE_CHECKLIST.map((row) => (
            <div key={row.item} className="flex items-start gap-3 px-4 py-3">
              <span className={cn('mt-0.5 shrink-0 text-sm font-bold', row.ok ? 'text-green-500' : 'text-orange-500')}>
                {row.ok ? '✓' : '○'}
              </span>
              <p className={cn('text-xs', row.ok ? 'text-slate-700' : 'text-orange-700 font-medium')}>
                {row.item}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pilot Readiness Next Actions ─────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Pilot Readiness — Prossime Azioni
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
          {NEXT_ACTIONS.map((a, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800">{a.action}</p>
                <p className="text-xs text-slate-400 mt-0.5">Owner: {a.owner}</p>
              </div>
              <span className={cn('rounded border px-2 py-0.5 text-xs font-semibold shrink-0', PRIORITY_STYLES[a.priority])}>
                {a.priority}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Readiness Verdict ───────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Verdetto Readiness
        </h2>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-bold text-yellow-700">76/100</span>
            <span className="rounded border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">
              Pilot Readiness: Ready with caveats
            </span>
          </div>
          <p className="text-xs text-yellow-800 leading-relaxed mb-2">
            Fonti principali attive e mapping confidence sopra soglia. Due gap documentati: evidenze ESG/CSR parziali (integrazione manuale Q3), perimetro presenze da definire con Operations. Dati wallet/voucher esclusi (Gate 5 — non attivi in Foundation Light). Consenso worker My KORA da completare. Pilot avviabile con caveats documentati.
          </p>
          <p className="text-xs text-yellow-600 italic font-medium">
            Valutazione demo. Non rappresenta assessment contrattuale. synthetic_demo_data: true — KORA Methodology v0.1 — pre_empirical_calibration.
          </p>
        </div>
      </section>

      {/* ── Admin GTM cross-link (role-safe) ────────────────────────── */}
      {isAdmin ? (
        <section>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-indigo-800">GTM Console — Pilot Package</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Script demo, success criteria, pilot package e privacy story per il presenter.
              </p>
            </div>
            <Link
              href="/admin/gtm"
              className="shrink-0 rounded border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              Apri GTM Console →
            </Link>
          </div>
        </section>
      ) : (
        <section>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">
              Script demo e Pilot Package disponibili nella GTM Console KORA (accesso: ruoli admin KORA).
            </p>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          DIVIDER — Stato Elaborazione KORA
      ══════════════════════════════════════════════════════════════════ */}
      <div className="border-t border-slate-200 pt-6">
        <h2 className="mb-1 text-sm font-bold text-slate-700">Stato Elaborazione KORA</h2>
        <p className="text-xs text-slate-400 mb-4">
          Riepilogo delle fonti dati ricevute — metadati a livello batch, senza record UEF individuali.
        </p>

        {/* Batch-level only notice */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 mb-4">
          <p className="text-xs font-semibold text-blue-800">Solo metadati a livello batch</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Questa sezione mostra i riepiloghi delle fonti dati ricevute da KORA. Non espone record UEF individuali,
            identificatori lavoratori o contenuto grezzo dei file.
          </p>
        </div>

        {/* Quality summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
          <SummaryCard
            label="Completezza Complessiva"
            value={pct(completeness.overall_completeness_pct)}
            sub={`${completeness.total_mapped} / ${completeness.total_rows} record`}
            color={completeness.overall_completeness_pct >= 0.75 ? 'text-green-600' : 'text-yellow-600'}
          />
          <SummaryCard
            label="Confidenza Mapping Batch"
            value={pct(mapping.average_confidence)}
            sub={`${mapping.high_confidence_sources} alta / ${mapping.low_confidence_sources} bassa`}
            color={mapping.average_confidence >= 0.70 ? 'text-green-600' : 'text-yellow-600'}
          />
          <SummaryCard
            label="In Attesa di Revisione"
            value={String(pending.total_pending)}
            sub={`su ${pending.sources_with_pending} fonti`}
            color={pending.total_pending > 50 ? 'text-orange-500' : 'text-slate-800'}
          />
          <SummaryCard
            label="Allegati Evidenza Medi"
            value={pct(evidence.average_evidence_pct)}
            sub={`${evidence.sources_above_50pct} fonti ≥ 50%`}
            color={evidence.average_evidence_pct >= 0.50 ? 'text-green-600' : 'text-orange-500'}
          />
        </div>

        {/* Source batch table */}
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Inventario Batch (simulato)
          </h3>
          {batches.length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Fonte</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Record</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Mappati</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Rifiutati</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Completezza</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Confidenza Mapping Batch</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Evidenza</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">In Attesa</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => {
                    const statusStyle = STATUS_STYLES[batch.batch_status] ?? STATUS_STYLES.under_review;
                    return (
                      <tr key={batch.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{batch.source_name}</p>
                          <p className="text-xs font-mono text-slate-400 mt-0.5">
                            {batch.source_type.replace(/_/g, ' ')}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-slate-700">
                          {batch.row_count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-green-600">
                          {batch.mapped_count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-red-500">
                          {batch.rejected_count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-slate-100">
                              <div
                                className={cn('h-1.5 rounded-full', completenessColor(batch.completeness_pct))}
                                style={{ width: `${batch.completeness_pct * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-slate-600">
                              {pct(batch.completeness_pct)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'text-xs font-mono',
                            batch.mapping_confidence_avg >= 0.70 ? 'text-green-600' :
                            batch.mapping_confidence_avg >= 0.60 ? 'text-yellow-600' : 'text-red-500',
                          )}>
                            {pct(batch.mapping_confidence_avg)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'text-xs font-mono',
                            batch.evidence_attached_pct >= 0.50 ? 'text-green-600' : 'text-orange-500',
                          )}>
                            {pct(batch.evidence_attached_pct)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {batch.pending_review_count > 0 ? (
                            <span className="text-xs font-semibold text-orange-500">
                              {batch.pending_review_count}
                            </span>
                          ) : (
                            <span className="text-xs text-green-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'rounded border px-1.5 py-0.5 text-xs capitalize whitespace-nowrap',
                            statusStyle,
                          )}>
                            {batch.batch_status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
              Nessun batch disponibile per questo scenario.
            </div>
          )}
        </div>

        {/* Source notes */}
        {batches.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Note Fonti
            </h3>
            <div className="space-y-2">
              {batches.map((batch) => (
                batch.source_notes ? (
                  <div key={batch.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-1">
                      {batch.source_type.replace(/_/g, ' ')}
                      <span className="ml-2 font-normal text-slate-400">{batch.ingestion_date}</span>
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">{batch.source_notes}</p>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
