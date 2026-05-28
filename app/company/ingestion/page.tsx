'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ingestionPipelineService,
} from '@/services/ingestion-pipeline/IngestionPipelineService';
import type { PipelineAnalyzedRow } from '@/services/ingestion-pipeline/IngestionPipelineService';
import type { IngestionDestination } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ACTION_FAMILY_LABELS } from '@/lib/constants/kora';
import type { PillarCode } from '@/lib/types';

// ── Styling maps ───────────────────────────────────────────────────────────────

const ELIGIBILITY_STYLE: Record<string, { badge: string; dot: string; label: string }> = {
  eligible: {
    badge: 'bg-green-50 text-green-700 border-green-200',
    dot:   'bg-green-500',
    label: 'Eligible',
  },
  limited: {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot:   'bg-indigo-400',
    label: 'Limited',
  },
  blocked: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot:   'bg-rose-500',
    label: 'Blocked',
  },
};

const REVIEW_STATUS_STYLE: Record<string, { badge: string; label: string }> = {
  ready:          { badge: 'bg-green-50 text-green-700 border-green-200',   label: 'Pronto KORA' },
  pending_review: { badge: 'bg-amber-50 text-amber-700 border-amber-200',   label: 'In revisione' },
  limited_gate:   { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Instradato (BTI)' },
  blocked_gate:   { badge: 'bg-rose-50 text-rose-700 border-rose-200',      label: 'Bloccato' },
};

const DESTINATION_STYLE: Record<IngestionDestination, { badge: string }> = {
  'KORA Activation Core':                    { badge: 'bg-green-50 text-green-700 border-green-200' },
  'Economic Relief & Activation Opportunity': { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'Blocked by Design':                       { badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  'Human Review Required':                   { badge: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high:   'text-green-600 font-semibold',
  medium: 'text-amber-600 font-semibold',
  low:    'text-slate-500',
};

const PILLAR_BADGE: Record<PillarCode, string> = {
  LIFE:       'bg-green-50 text-green-700 border-green-200',
  GROWTH:     'bg-blue-50 text-blue-700 border-blue-200',
  CONNECTION: 'bg-purple-50 text-purple-700 border-purple-200',
  IMPACT:     'bg-orange-50 text-orange-700 border-orange-200',
  LEGACY:     'bg-amber-50 text-amber-700 border-amber-200',
};

// ── Pipeline flow ──────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { label: 'Dati Raw',         sub: 'Excel, CSV, HR export' },
  { label: 'Normalizzazione',  sub: 'Struttura + inference' },
  { label: 'Eligibility Gate', sub: 'Eligible / Limited / Blocked' },
  { label: 'UEF Review',       sub: 'Revisione umana' },
  { label: 'KORA Index v3',    sub: 'Scoring + CS' },
  { label: 'Decision Pack',    sub: 'Report e Board Pack' },
];

// ── Source cards ────────────────────────────────────────────────────────────────

const SOURCE_CARDS = [
  { label: 'Welfare Provider Export',     icon: '🧾', file: 'welfare-export-Q4-2025.xlsx',      status: 'analizzato' },
  { label: 'LMS / Training Export',       icon: '📚', file: 'lms-digital-skills-2025.xlsx',      status: 'analizzato' },
  { label: 'HR People-Program List',      icon: '👥', file: 'hr-mentoring-2025.xlsx',            status: 'analizzato' },
  { label: 'Finance / Welfare Budget',    icon: '💶', file: 'welfare-rimborsi-Q1-Q3-2025.xlsx', status: 'analizzato' },
  { label: 'ESG / Community Initiatives', icon: '🌿', file: 'esg-volontariato-2025.xlsx',        status: 'analizzato' },
  { label: 'Manual HR Upload',            icon: '📋', file: 'compliance-hse-BG-2025.xlsx',       status: 'analizzato' },
];

// ── Doctrine copy ──────────────────────────────────────────────────────────────

function getDoctrineCopy(row: PipelineAnalyzedRow): { header: string; body: string; style: string } {
  if (row.classification.kora_eligibility === 'blocked') {
    return {
      header: 'Blocked by Design — 0 Impact Units',
      body:   'KORA non trasforma la compliance in impatto. La conformità legale è una baseline, non impatto. 0 IU · 0 KORA Index · 0 PIB · 0 Contribution · 0 Value Chain. I record sono tracciati per governance ma non generano attivazione.',
      style:  'border-rose-100 bg-rose-50 text-rose-700',
    };
  }
  if (row.classification.kora_eligibility === 'limited') {
    return {
      header: 'Economic Relief — Nessun Impact Unit',
      body:   'Questi benefit offrono sostegno economico ma generano profondità di attivazione limitata. Non è spesa sbagliata. È spesa che può diventare più intelligente. Instradato al Budget-to-Human-Impact engine come economic_relief_spend.',
      style:  'border-indigo-100 bg-indigo-50 text-indigo-700',
    };
  }
  if (row.classification.review_required) {
    return {
      header: 'Revisione Umana Richiesta',
      body:   "Classificazione in attesa di revisione. Non è possibile assegnare Impact Units senza chiarire natura obbligatoria o volontaria e profondità di attivazione. Attendere validazione prima dell'invio al KORA Index.",
      style:  'border-amber-100 bg-amber-50 text-amber-700',
    };
  }
  return {
    header: 'Idoneo — Può Generare Attivazione',
    body:   "Questa azione può generare attivazione umana verificata se validata, distribuita e tracciata correttamente. L'approvazione del revisore consente l'ingresso nel KORA Activation Core.",
    style:  'border-green-100 bg-green-50 text-green-700',
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

// C-03: AI Ingestion Assistant
export default function AIIngestionAssistant() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows    = useMemo(() => ingestionPipelineService.analyzeBatch(), []);
  const summary = useMemo(() => ingestionPipelineService.getIngestionSummary(), []);

  const selectedRow = selectedId ? (rows.find((r) => r.raw.id === selectedId) ?? null) : null;

  return (
    <div className="space-y-6">

      {/* ── Operator boundary banner ─────────────────────────────────────── */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div>
          <p className="text-xs font-semibold text-amber-800">Strumento operativo KORA — non area self-service cliente</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            Nel modello Foundation Light, i file sono inviati a KORA. L&apos;operatore KORA carica, revisiona e genera il Decision Pack.
            L&apos;azienda vede solo output aggregati.
          </p>
        </div>
      </div>

      {/* ── A: Header ── */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-slate-900">KORA AI Ingestion Assistant</h1>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
            Foundation Light Preview
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-400">
            synthetic_demo_data: true
          </span>
        </div>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          Trasforma dati welfare, people e formazione in input KORA strutturati, revisionabili e metodologicamente coerenti.
        </p>
        <p className="mt-1.5 text-xs font-semibold text-slate-500 italic">
          &ldquo;L&apos;AI propone. La metodologia governa. La revisione umana valida.&rdquo;
        </p>
        <p className="mt-1 text-xs text-slate-400 max-w-xl">
          Foundation Light usa una pipeline rule-based su dati demo. La struttura è pronta per upload CSV/Excel e revisione umana.
          Nessuna chiamata LLM esterna — classificazione guidata dalla tassonomia BCM KORA e dall&apos;Eligibility Gate.
        </p>
        <div className="mt-3">
          <Link
            href="/admin/companies/data-intake"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            KORA Operator: Data Intake Studio →
          </Link>
        </div>
      </div>

      {/* ── B: Pipeline flow ── */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Flusso pipeline — Raw → Normalizzazione → Eligibility Gate → KORA Index v3
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              <div className={cn(
                'rounded border px-2.5 py-1.5 text-center',
                i === 0 ? 'border-slate-200 bg-slate-50' :
                i === 1 ? 'border-violet-200 bg-violet-50' :
                i <= 2  ? 'border-blue-200 bg-blue-50' :
                i === 3 ? 'border-amber-200 bg-amber-50' :
                          'border-green-200 bg-green-50',
              )}>
                <p className={cn(
                  'text-xs font-semibold',
                  i === 0 ? 'text-slate-600' :
                  i === 1 ? 'text-violet-700' :
                  i <= 2  ? 'text-blue-700' :
                  i === 3 ? 'text-amber-700' :
                             'text-green-700',
                )}>{step.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{step.sub}</p>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <span className="text-slate-300 text-xs font-bold shrink-0">→</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[11px] text-slate-400">
          La pipeline esegue: inferenza source_type · rilevamento campi mancanti · normalizzazione · classificazione Eligibility Gate · costruzione KoraReadyRecord con flag di governance.
          La confidence di ingestion misura la qualità della classificazione AI — è distinta dal Confidence Score esterno al KORA Index v3.
        </p>
      </div>

      {/* ── C: Source Upload Panel ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Fonti Analizzate — Demo Batch
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SOURCE_CARDS.map((src) => (
            <div key={src.label} className="rounded-lg border border-slate-200 bg-white p-3 flex items-start gap-2">
              <span className="text-lg shrink-0">{src.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{src.label}</p>
                <p className="text-[10px] text-slate-400 truncate">{src.file}</p>
                <span className="mt-1 inline-block rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                  {src.status}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Dati demo oggi. Upload CSV/Excel reale può collegarsi a questa pipeline in fase pilot. Nessun file reale è caricato.
        </p>
      </div>

      {/* ── D: Summary Cards ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Riepilogo Classificazione — {summary.total} record analizzati
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-xs text-green-600">Eligible</p>
            <p className="text-2xl font-bold text-green-700 mt-0.5">{summary.eligible_count}</p>
            <p className="text-[10px] text-green-500 mt-0.5">pronti per KORA Index</p>
          </div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-xs text-indigo-600">Limited</p>
            <p className="text-2xl font-bold text-indigo-700 mt-0.5">{summary.limited_count}</p>
            <p className="text-[10px] text-indigo-500 mt-0.5">Economic Relief — 0 IU</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs text-rose-600">Blocked</p>
            <p className="text-2xl font-bold text-rose-700 mt-0.5">{summary.blocked_count}</p>
            <p className="text-[10px] text-rose-500 mt-0.5">Blocked by Design — 0 IU</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-600">Review Richiesta</p>
            <p className="text-2xl font-bold text-amber-700 mt-0.5">{summary.review_required_count}</p>
            <p className="text-[10px] text-amber-500 mt-0.5">in attesa di validazione</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded border border-slate-200 bg-slate-50 p-2 text-center">
            <p className="text-[10px] text-slate-400">Alta Confidenza</p>
            <p className="text-sm font-bold text-slate-700">{summary.high_confidence_count}/{summary.total}</p>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-2 text-center">
            <p className="text-[10px] text-slate-400">Campi Mancanti</p>
            <p className="text-sm font-bold text-slate-700">{summary.missing_data_total}</p>
          </div>
          <div className="rounded border border-green-200 bg-green-50 p-2 text-center">
            <p className="text-[10px] text-green-500">Pronti per KORA Index</p>
            <p className="text-sm font-bold text-green-700">{summary.ready_for_index_count}</p>
          </div>
        </div>
      </div>

      {/* ── E: Classification Queue ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Coda di Classificazione
          </h2>
          {selectedId && (
            <button
              onClick={() => setSelectedId(null)}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Chiudi dettaglio
            </button>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Record raw</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Fonte</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Classificazione</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Pillar</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-slate-500">Confidenza</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Destinazione</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-slate-500">Stato</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-slate-500">Azione</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const elig = ELIGIBILITY_STYLE[row.classification.kora_eligibility] ?? ELIGIBILITY_STYLE.eligible;
                  const rev  = REVIEW_STATUS_STYLE[row.review_status] ?? REVIEW_STATUS_STYLE.pending_review;
                  const dest = DESTINATION_STYLE[row.destination];
                  const isSelected = row.raw.id === selectedId;
                  return (
                    <tr
                      key={row.raw.id}
                      className={cn(
                        'border-b border-slate-50 last:border-0 cursor-pointer transition-colors',
                        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50',
                      )}
                      onClick={() => setSelectedId(isSelected ? null : row.raw.id)}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', elig.dot)} />
                          <div>
                            <p className="font-medium text-slate-800 max-w-[200px] truncate">{row.raw.raw_name}</p>
                            <p className="text-[10px] text-slate-400 max-w-[200px] truncate">{row.normalized.raw_description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                        {row.normalized.source_type.replace(/_/g, ' ')}
                        {row.normalized.inferred_source_type && (
                          <span className="ml-1 text-[9px] text-slate-300 italic">inf</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold', elig.badge)}>
                          {elig.label}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5 max-w-[120px] truncate">
                          {ACTION_FAMILY_LABELS[row.classification.action_family] ?? row.classification.action_family}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        {row.classification.primary_pillar ? (
                          <span className={cn(
                            'rounded border px-1 py-0.5 text-[10px] font-mono',
                            PILLAR_BADGE[row.classification.primary_pillar as PillarCode] ?? 'bg-slate-50 text-slate-500 border-slate-200',
                          )}>
                            {row.classification.primary_pillar}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn('text-[10px]', CONFIDENCE_STYLE[row.classification.confidence])}>
                          {row.classification.confidence}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap', dest.badge)}>
                          {row.destination}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', rev.badge)}>
                          {rev.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          className="text-[10px] text-blue-500 hover:text-blue-700 underline"
                          onClick={(e) => { e.stopPropagation(); setSelectedId(isSelected ? null : row.raw.id); }}
                        >
                          {isSelected ? 'Chiudi' : 'Dettaglio'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Clicca una riga per aprire il dettaglio di classificazione. Dati sintetici demo — nessun record reale.
        </p>
      </div>

      {/* ── F: Detail Panel (conditional) ── */}
      {selectedRow && <DetailPanel row={selectedRow} />}

      {/* ── G: Missing Data Assistant ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Missing Data Assistant
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            KORA identifica automaticamente i campi mancanti che limitano la qualità della classificazione o impediscono la generazione di Impact Units.
            {selectedRow && selectedRow.missing_data_questions.length > 0 && (
              <> Domande specifiche per <span className="font-semibold">{selectedRow.raw.raw_name}</span>:</>
            )}
          </p>
          <div className="space-y-2">
            {selectedRow ? (
              selectedRow.missing_data_questions.length > 0 ? (
                selectedRow.missing_data_questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 rounded border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <span className="shrink-0 mt-0.5 font-bold">?</span>
                    <span>{q}</span>
                  </div>
                ))
              ) : (
                <div className="rounded border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-600">
                  Nessun campo mancante rilevato per questo record.
                </div>
              )
            ) : (
              <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Seleziona una riga dalla coda per vedere le domande di completamento dati specifiche per quel record.
              </div>
            )}
          </div>
          {!selectedRow && (
            <p className="mt-3 text-[11px] text-slate-400">
              Le domande sono generate dalla pipeline in base ai campi mancanti rilevati durante la normalizzazione.
            </p>
          )}
        </div>
      </div>

      {/* ── H: Output Routing Panel ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Routing Output — Come fluiscono i record
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RoutingCard
            count={summary.routing.kora_activation_core}
            title="KORA Activation Core"
            badge="bg-green-50 text-green-700 border-green-200"
            description="Eligible → KORA Index v3 → Decision Pack"
            detail="Record verificati e approvati dal revisore. Generano Impact Units e contribuiscono al KORA Index v3."
          />
          <RoutingCard
            count={summary.routing.economic_relief_opportunity}
            title="Economic Relief & Activation Opportunity"
            badge="bg-indigo-50 text-indigo-700 border-indigo-200"
            description="Limited → BTI Engine only"
            detail="Non generano IU. Tracciati nel Budget-to-Human-Impact engine come economic_relief_spend. Opportunità di conversione in attivazione reale."
          />
          <RoutingCard
            count={summary.routing.blocked_by_design}
            title="Blocked by Design"
            badge="bg-rose-50 text-rose-700 border-rose-200"
            description="Blocked → 0 IU — solo governance"
            detail="KORA non trasforma la compliance in impatto. Tracciati per governance. 0 IU · 0 KORA Index · 0 PIB."
          />
          <RoutingCard
            count={summary.routing.human_review_required}
            title="Human Review Required"
            badge="bg-amber-50 text-amber-700 border-amber-200"
            description="Review → coda advisor"
            detail="Classificazione ambigua o incompleta. Richiedono validazione advisor prima di poter entrare nel KORA Activation Core."
          />
        </div>
      </div>

      {/* ── I: Privacy & Governance Boundaries ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Privacy & Governance — Limiti dell&apos;AI Ingestion
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          KORA AI Ingestion lavora su dati aziendali e record di iniziativa. Non espone Worker PIB individuali,
          dati sensibili individuali o ranking dei lavoratori.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          <div>
            <p className="text-[10px] font-semibold text-green-600 mb-1">L&apos;AI Ingestion può:</p>
            <ul className="space-y-0.5">
              {[
                'Classificare tipo di azione/programma/evento',
                'Rilevare campi mancanti per scoring futuro',
                'Rilevare item compliance/legal obbligatori (Blocked)',
                'Rilevare benefit cash-like (Limited)',
                'Generare domande di revisione da pipeline',
                'Instradare verso categorie KORA con flag di governance',
              ].map((t) => (
                <li key={t} className="flex gap-1.5 text-[10px] text-slate-500">
                  <span className="shrink-0 text-green-500">✓</span>{t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-rose-600 mb-1">L&apos;AI Ingestion NON può:</p>
            <ul className="space-y-0.5">
              {[
                'Inferire stato di salute individuale',
                'Inferire stato familiare personale',
                'Esporre scelte individuali dei lavoratori',
                'Rankare o classificare i lavoratori',
                'Monitorare i singoli individui',
                'Elaborare dati personali sensibili reali',
                'Bypassare la revisione umana per dati ambigui',
              ].map((t) => (
                <li key={t} className="flex gap-1.5 text-[10px] text-slate-500">
                  <span className="shrink-0 text-rose-500">✗</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 pt-1">
          Foundation Light usa una pipeline rule-based su dati demo: nessuna chiamata LLM esterna. Nessun dato reale lavoratore.
          synthetic_demo_data: true · KORA Methodology v0.1 · pre_empirical_calibration
        </p>
      </div>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DetailPanel({ row }: { row: PipelineAnalyzedRow }) {
  const doctrine = getDoctrineCopy(row);
  const c = row.classification;
  const n = row.normalized;
  const kr = row.kora_ready;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold text-slate-800">Dettaglio: {row.raw.raw_name}</h2>
        <span className={cn(
          'rounded border px-2 py-0.5 text-xs font-bold',
          ELIGIBILITY_STYLE[c.kora_eligibility]?.badge,
        )}>
          {ELIGIBILITY_STYLE[c.kora_eligibility]?.label ?? c.kora_eligibility}
        </span>
      </div>

      {/* Doctrine copy */}
      <div className={cn('rounded border px-3 py-2.5 text-xs leading-relaxed', doctrine.style)}>
        <p className="font-semibold mb-0.5">{doctrine.header}</p>
        <p>{doctrine.body}</p>
      </div>

      {/* Raw → Normalized transformation */}
      <div>
        <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">Raw → Normalizzato</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded border border-slate-100 bg-white p-2.5 space-y-1 text-xs">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Raw input</p>
            <p className="text-slate-700"><span className="text-slate-400">Nome: </span>{row.raw.raw_name}</p>
            <p className="text-slate-500 text-[10px] leading-relaxed">{n.raw_description}</p>
            <p className="text-slate-400 text-[10px]">Fonte: {row.raw.source_file ?? '—'}</p>
          </div>
          <div className="rounded border border-violet-100 bg-violet-50/50 p-2.5 space-y-1 text-xs">
            <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide">Normalizzato</p>
            <p className="text-slate-700 font-mono text-[10px]">{n.normalized_name}</p>
            <p className="text-slate-600">
              <span className="text-slate-400">Tipo fonte: </span>
              {n.source_type.replace(/_/g, ' ')}
              {n.inferred_source_type && <span className="ml-1 text-[9px] text-violet-400 italic">(inferito)</span>}
            </p>
            {n.mandatory_status && (
              <p className="text-slate-600">
                <span className="text-slate-400">Stato obbligatorio: </span>
                {n.mandatory_status}
                {n.inferred_mandatory_status && <span className="ml-1 text-[9px] text-violet-400 italic">(inferito)</span>}
              </p>
            )}
            <p className="text-slate-600">
              <span className="text-slate-400">Completezza dati: </span>
              <span className={n.data_completeness_score >= 0.8 ? 'text-green-600 font-semibold' : n.data_completeness_score >= 0.5 ? 'text-amber-600' : 'text-rose-600'}>
                {Math.round(n.data_completeness_score * 100)}%
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Classification fields grid */}
      <div>
        <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">Classificazione Eligibility Gate</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Action family"      value={ACTION_FAMILY_LABELS[c.action_family] ?? c.action_family} />
          <Field label="Event nature"       value={c.event_nature.replace(/_/g, ' ')} />
          <Field label="Eligibility"        value={c.kora_eligibility} highlight={c.kora_eligibility} />
          <Field label="Primary pillar"     value={c.primary_pillar ?? '—'} />
          <Field label="Secondary pillars"  value={c.secondary_pillars.length > 0 ? c.secondary_pillars.join(', ') : '—'} />
          <Field label="Confidence"         value={c.confidence} />
          <Field label="Privacy sensitivity" value={c.privacy_sensitivity} />
          <Field label="Depth level"        value={c.depth_level} />
          <Field label="Additionality"      value={c.additionality_level} />
          <Field label="Taxonomy match"     value={c.matched_taxonomy_id ?? '— nessuna corrispondenza'} />
        </div>
      </div>

      {/* Reason + Explanation */}
      <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <p className="font-semibold text-slate-400 mb-0.5">Ragione della classificazione</p>
        <p className="leading-relaxed">{c.reason}</p>
      </div>
      <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <p className="font-semibold text-slate-400 mb-0.5">Spiegazione KORA</p>
        <p className="leading-relaxed">{c.explanation_text}</p>
      </div>

      {/* KoraReadyRecord governance flags */}
      <div>
        <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">KoraReadyRecord — Flag di governance</p>
        <div className="flex flex-wrap gap-2">
          <FlagBadge label="Scoring approvato"        value={kr.approved_for_scoring} />
          <FlagBadge label="BTI governance approvato" value={kr.approved_for_bti_governance} />
          <FlagBadge label="Impact Units approvati"   value={kr.approved_for_impact_units} />
          <FlagBadge label="Review richiesta"         value={c.review_required} invert />
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">
          Blocked → tutti false. Limited → solo BTI. Eligible + review_required → tutti false. Eligible + approvato → scoring e IU abilitati.
        </p>
      </div>

      {/* Mock review controls */}
      <div>
        <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">Controlli di revisione (demo)</p>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={!kr.approved_for_scoring}
            className={cn(
              'rounded border px-3 py-1.5 text-xs font-medium',
              kr.approved_for_scoring
                ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
                : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed',
            )}
          >
            Invia a KORA Index ✓
          </button>
          <button disabled className="rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600 cursor-not-allowed opacity-70">
            Invia a revisione
          </button>
          <button disabled className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 cursor-not-allowed">
            Escludi da scoring
          </button>
          <button disabled className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 cursor-not-allowed">
            Modifica mapping
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">
          Controlli di revisione disponibili in fase pilot. &ldquo;Invia a KORA Index&rdquo; è abilitato solo per record Eligible con approved_for_scoring: true.
        </p>
      </div>

      {/* Missing fields */}
      {n.missing_fields.length > 0 && (
        <div className="rounded border border-amber-100 bg-amber-50 px-3 py-2">
          <p className="text-xs font-semibold text-amber-700 mb-1">Dati mancanti per questo record</p>
          <ul className="space-y-0.5">
            {n.missing_fields.map((f) => (
              <li key={f} className="text-xs text-amber-600">· {f.replace(/_/g, ' ')}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  const style =
    highlight === 'eligible' ? 'text-green-600 font-semibold' :
    highlight === 'limited'  ? 'text-indigo-600 font-semibold' :
    highlight === 'blocked'  ? 'text-rose-600 font-semibold' :
    'text-slate-700';
  return (
    <div className="rounded border border-slate-100 bg-white px-2 py-1.5">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className={cn('mt-0.5 text-xs', style)}>{value}</p>
    </div>
  );
}

function FlagBadge({ label, value, invert }: { label: string; value: boolean; invert?: boolean }) {
  const positive = invert ? !value : value;
  return (
    <span className={cn(
      'rounded border px-2 py-0.5 text-[10px] font-medium',
      positive
        ? 'border-green-200 bg-green-50 text-green-600'
        : 'border-rose-100 bg-rose-50 text-rose-500',
    )}>
      {positive ? '✓' : '✗'} {label}
    </span>
  );
}

function RoutingCard({
  count, title, badge, description, detail,
}: {
  count: number;
  title: string;
  badge: string;
  description: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700 leading-snug">{title}</p>
        <span className={cn(
          'text-lg font-bold shrink-0',
          badge.includes('green')  ? 'text-green-700'  :
          badge.includes('indigo') ? 'text-indigo-700' :
          badge.includes('rose')   ? 'text-rose-700'   :
          'text-amber-700',
        )}>
          {count}
        </span>
      </div>
      <span className={cn('inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium', badge)}>
        {description}
      </span>
      <p className="text-[10px] text-slate-500 leading-relaxed">{detail}</p>
    </div>
  );
}
