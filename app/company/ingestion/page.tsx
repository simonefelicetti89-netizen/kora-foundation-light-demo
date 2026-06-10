'use client';
// C-04: Ingestion Pipeline — stato del processo di intake dati.
// Scopo: visualizzare lo stato della pipeline ingestion (fonti → classificazione → UEF → scoring).
// I dettagli operativi (match review, approvazione) avvengono su KORA Admin.

import { useState, useMemo } from 'react';
import { DemoFlowBanner } from '@/components/admin/DemoFlowBanner';
import Link from 'next/link';
import { OperatorToolBoundary } from '@/components/demo/OperatorToolBoundary';
import { useCompanySession } from '../_providers/CompanySessionProvider';
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
    badge: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
    dot:   'bg-green-500',
    label: 'Eligible',
  },
  limited: {
    badge: 'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]',
    dot:   'bg-[#C76F3D]',
    label: 'Limited',
  },
  blocked: {
    badge: 'bg-[rgba(158,59,47,0.06)] text-[#9E3B2F] border-[rgba(158,59,47,0.20)]',
    dot:   'bg-[rgba(158,59,47,0.06)]0',
    label: 'Blocked',
  },
};

const REVIEW_STATUS_STYLE: Record<string, { badge: string; label: string }> = {
  ready:          { badge: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',   label: 'Pronto KORA' },
  pending_review: { badge: 'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]',   label: 'In revisione' },
  limited_gate:   { badge: 'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]', label: 'Instradato (BTI)' },
  blocked_gate:   { badge: 'bg-[rgba(158,59,47,0.06)] text-[#9E3B2F] border-[rgba(158,59,47,0.20)]',      label: 'Bloccato' },
};

const DESTINATION_STYLE: Record<IngestionDestination, { badge: string }> = {
  'KORA Activation Core':                    { badge: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]' },
  'Economic Relief & Activation Opportunity': { badge: 'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]' },
  'Blocked by Design':                       { badge: 'bg-[rgba(158,59,47,0.06)] text-[#9E3B2F] border-[rgba(158,59,47,0.20)]' },
  'Human Review Required':                   { badge: 'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]' },
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high:   'text-green-600 font-semibold',
  medium: 'text-amber-600 font-semibold',
  low:    'text-[rgba(6,3,43,0.52)]',
};

const PILLAR_BADGE: Record<PillarCode, string> = {
  LIFE:       'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  GROWTH:     'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  CONNECTION: 'bg-purple-50 text-purple-700 border-purple-200',
  IMPACT:     'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
  LEGACY:     'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]',
};

// ── Pipeline flow ──────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { label: 'Dati Raw',         sub: 'Excel, CSV, HR export' },
  { label: 'Normalizzazione',  sub: 'Struttura + inference' },
  { label: 'Eligibility Gate', sub: 'Eligible / Limited / Blocked' },
  { label: 'UEF Review',       sub: 'Revisione umana' },
  { label: 'KORA Index v1.0',    sub: 'Scoring + CS' },
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
      style:  'border-[rgba(158,59,47,0.12)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]',
    };
  }
  if (row.classification.kora_eligibility === 'limited') {
    return {
      header: 'Economic Relief — Nessun Impact Unit',
      body:   'Questi benefit offrono sostegno economico ma generano profondità di attivazione limitata. Non è spesa sbagliata. È spesa che può diventare più intelligente. Instradato al Budget-to-Human-Impact engine come economic_relief_spend.',
      style:  'border-[rgba(6,3,43,0.06)] bg-[rgba(199,111,61,0.08)] text-[rgba(6,3,43,0.72)]',
    };
  }
  if (row.classification.review_required) {
    return {
      header: 'Revisione Umana Richiesta',
      body:   "Classificazione in attesa di revisione. Non è possibile assegnare Impact Units senza chiarire natura obbligatoria o volontaria e profondità di attivazione. Attendere validazione prima dell'invio al KORA Index.",
      style:  'border-amber-100 bg-[rgba(217,154,43,0.08)] text-amber-700',
    };
  }
  return {
    header: 'Idoneo — Può Generare Attivazione',
    body:   "Questa azione può generare attivazione umana verificata se validata, distribuita e tracciata correttamente. L'approvazione del revisore consente l'ingresso nel KORA Activation Core.",
    style:  'border-green-100 bg-[rgba(47,125,85,0.08)] text-[#2F7D55]',
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

// C-03: KORA Intake Engine™
export default function AIIngestionAssistant() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isLive, companyName: liveCompanyName, sessionLoading } = useCompanySession();

  const rows    = useMemo(() => ingestionPipelineService.analyzeBatch(), []);
  const summary = useMemo(() => ingestionPipelineService.getIngestionSummary(), []);

  const selectedRow = selectedId ? (rows.find((r) => r.raw.id === selectedId) ?? null) : null;

  if (isLive) {
    return (
      <div className="space-y-6">
        <OperatorToolBoundary />
        <div style={{ padding: '20px 0' }}>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">
            KORA Intake Engine™ · LIVE
          </p>
          <h1 className="text-xl font-bold text-[#06032B] mb-2">
            {sessionLoading ? '…' : (liveCompanyName ?? 'La tua organizzazione')}
          </h1>
          <p className="text-sm text-[rgba(6,3,43,0.55)] max-w-xl leading-relaxed">
            Il processo di intake dati per il tuo tenant è gestito da KORA Admin.
            KORA Admin carica, classifica e rivede i tuoi file prima che entrino nel calcolo del KORA Index.
          </p>
          <p className="mt-2 text-xs text-[rgba(6,3,43,0.40)]">
            Quando KORA Admin elabora nuovi dati per il tuo tenant, lo stato di attivazione verrà aggiornato nel tuo workspace.
          </p>
          <div className="mt-4">
            <Link
              href="/company/workspace"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(6,3,43,0.12)] bg-[rgba(6,3,43,0.04)] px-3.5 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.72)] hover:bg-[rgba(6,3,43,0.08)] transition-colors"
            >
              ← Torna al Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Demo flow banner — only shown in demo/KORA_ADMIN context */}
      <DemoFlowBanner
        title="Synthetic Demo Flow — Ingestion Pipeline"
        description="Questa visualizzazione usa dati sintetici Meridiana. L'ingestion reale avviene nell'admin tramite Data Intake e UEF Review."
        canonicalHref="/admin/data-intake"
        canonicalLabel="Data Intake (live)"
      />

      {/* ── Operator boundary banner ─────────────────────────────────────── */}
      <OperatorToolBoundary />

      {/* ── A: Header ── */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-[#06032B]">KORA Intake Engine™</h1>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
            Foundation Light Preview
          </span>
          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-0.5 text-xs font-mono text-[rgba(6,3,43,0.40)]">
            synthetic_demo_data: true
          </span>
        </div>
        <p className="text-sm text-[rgba(6,3,43,0.62)] max-w-2xl leading-relaxed">
          Trasforma dati welfare, people e formazione in input KORA strutturati, revisionabili e metodologicamente coerenti.
        </p>
        <p className="mt-1.5 text-xs font-semibold text-[rgba(6,3,43,0.52)] italic">
          &ldquo;L&apos;AI propone. La metodologia governa. La revisione umana valida.&rdquo;
        </p>
        <p className="mt-1 text-xs text-[rgba(6,3,43,0.40)] max-w-xl">
          Foundation Light usa una pipeline rule-based su dati demo. La struttura è pronta per upload CSV/Excel e revisione umana.
          Nessuna chiamata LLM esterna — classificazione guidata dalla tassonomia BCM KORA e dall&apos;Eligibility Gate.
        </p>
        <div className="mt-3">
          <Link
            href="/admin/companies/data-intake"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-3.5 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.72)] hover:bg-[rgba(6,3,43,0.06)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            KORA Operator: Data Intake Studio →
          </Link>
        </div>
      </div>

      {/* ── B: Pipeline flow ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-3">
          Flusso pipeline — Raw → Normalizzazione → Eligibility Gate → KORA Index v1.0
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              <div className={cn(
                'rounded border px-2.5 py-1.5 text-center',
                i === 0 ? 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)]' :
                i === 1 ? 'border-violet-200 bg-violet-50' :
                i <= 2  ? 'border-blue-200 bg-blue-50' :
                i === 3 ? 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)]' :
                          'border-[rgba(47,125,85,0.22)] bg-green-50',
              )}>
                <p className={cn(
                  'text-xs font-semibold',
                  i === 0 ? 'text-[rgba(6,3,43,0.62)]' :
                  i === 1 ? 'text-violet-700' :
                  i <= 2  ? 'text-blue-700' :
                  i === 3 ? 'text-amber-700' :
                             'text-green-700',
                )}>{step.label}</p>
                <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">{step.sub}</p>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <span className="text-[rgba(6,3,43,0.28)] text-xs font-bold shrink-0">→</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[11px] text-[rgba(6,3,43,0.40)]">
          La pipeline esegue: inferenza source_type · rilevamento campi mancanti · normalizzazione · classificazione Eligibility Gate · costruzione KoraReadyRecord con flag di governance.
          La confidence di ingestion misura la qualità della classificazione AI — è distinta dal Confidence Score esterno al KORA Index v1.0.
        </p>
      </div>

      {/* ── C: Source Upload Panel ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
          Fonti Analizzate — Demo Batch
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SOURCE_CARDS.map((src) => (
            <div key={src.label} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 flex items-start gap-2">
              <span className="text-lg shrink-0">{src.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[rgba(6,3,43,0.78)] truncate">{src.label}</p>
                <p className="text-[10px] text-[rgba(6,3,43,0.40)] truncate">{src.file}</p>
                <span className="mt-1 inline-block rounded border border-[rgba(47,125,85,0.22)] bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                  {src.status}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-[rgba(6,3,43,0.40)]">
          Dati demo oggi. Upload CSV/Excel reale può collegarsi a questa pipeline in fase pilot. Nessun file reale è caricato.
        </p>
      </div>

      {/* ── D: Summary Cards ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
          Riepilogo Classificazione — {summary.total} record analizzati
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-[rgba(47,125,85,0.22)] bg-green-50 p-3">
            <p className="text-xs text-green-600">Eligible</p>
            <p className="text-2xl font-bold text-green-700 mt-0.5">{summary.eligible_count}</p>
            <p className="text-[10px] text-[#2F7D55] mt-0.5">pronti per KORA Index</p>
          </div>
          <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] p-3">
            <p className="text-xs text-[#C76F3D]">Limited</p>
            <p className="text-2xl font-bold text-[rgba(6,3,43,0.72)] mt-0.5">{summary.limited_count}</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-0.5">Economic Relief — 0 IU</p>
          </div>
          <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] p-3">
            <p className="text-xs text-[rgba(158,59,47,0.90)]">Blocked</p>
            <p className="text-2xl font-bold text-[#9E3B2F] mt-0.5">{summary.blocked_count}</p>
            <p className="text-[10px] text-[rgba(158,59,47,0.75)] mt-0.5">Blocked by Design — 0 IU</p>
          </div>
          <div className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] p-3">
            <p className="text-xs text-amber-600">Review Richiesta</p>
            <p className="text-2xl font-bold text-amber-700 mt-0.5">{summary.review_required_count}</p>
            <p className="text-[10px] text-[#D99A2B] mt-0.5">in attesa di validazione</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-2 text-center">
            <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Alta Confidenza</p>
            <p className="text-sm font-bold text-[rgba(6,3,43,0.78)]">{summary.high_confidence_count}/{summary.total}</p>
          </div>
          <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-2 text-center">
            <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Campi Mancanti</p>
            <p className="text-sm font-bold text-[rgba(6,3,43,0.78)]">{summary.missing_data_total}</p>
          </div>
          <div className="rounded border border-[rgba(47,125,85,0.22)] bg-green-50 p-2 text-center">
            <p className="text-[10px] text-[#2F7D55]">Pronti per KORA Index</p>
            <p className="text-sm font-bold text-green-700">{summary.ready_for_index_count}</p>
          </div>
        </div>
      </div>

      {/* ── E: Classification Queue ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
            Coda di Classificazione
          </h2>
          {selectedId && (
            <button
              onClick={() => setSelectedId(null)}
              className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline"
            >
              Chiudi dettaglio
            </button>
          )}
        </div>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[rgba(6,3,43,0.03)] border-b border-[rgba(6,3,43,0.05)]">
                  <th className="px-3 py-2.5 text-left font-semibold text-[rgba(6,3,43,0.52)]">Record raw</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[rgba(6,3,43,0.52)]">Fonte</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[rgba(6,3,43,0.52)]">Classificazione</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[rgba(6,3,43,0.52)]">Pillar</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-[rgba(6,3,43,0.52)]">Confidenza</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[rgba(6,3,43,0.52)]">Destinazione</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-[rgba(6,3,43,0.52)]">Stato</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-[rgba(6,3,43,0.52)]">Azione</th>
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
                        'border-b border-[rgba(6,3,43,0.04)] last:border-0 cursor-pointer transition-colors',
                        isSelected ? 'bg-blue-50' : 'hover:bg-[rgba(6,3,43,0.03)]',
                      )}
                      onClick={() => setSelectedId(isSelected ? null : row.raw.id)}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', elig.dot)} />
                          <div>
                            <p className="font-medium text-[rgba(6,3,43,0.90)] max-w-[200px] truncate">{row.raw.raw_name}</p>
                            <p className="text-[10px] text-[rgba(6,3,43,0.40)] max-w-[200px] truncate">{row.normalized.raw_description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[rgba(6,3,43,0.52)] whitespace-nowrap">
                        {row.normalized.source_type.replace(/_/g, ' ')}
                        {row.normalized.inferred_source_type && (
                          <span className="ml-1 text-[9px] text-[rgba(6,3,43,0.28)] italic">inf</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold', elig.badge)}>
                          {elig.label}
                        </span>
                        <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5 max-w-[120px] truncate">
                          {ACTION_FAMILY_LABELS[row.classification.action_family] ?? row.classification.action_family}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        {row.classification.primary_pillar ? (
                          <span className={cn(
                            'rounded border px-1 py-0.5 text-[10px] font-mono',
                            PILLAR_BADGE[row.classification.primary_pillar as PillarCode] ?? 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',
                          )}>
                            {row.classification.primary_pillar}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[rgba(6,3,43,0.28)]">—</span>
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
        <p className="mt-1.5 text-[11px] text-[rgba(6,3,43,0.40)]">
          Clicca una riga per aprire il dettaglio di classificazione. Dati sintetici demo — nessun record reale.
        </p>
      </div>

      {/* ── F: Detail Panel (conditional) ── */}
      {selectedRow && <DetailPanel row={selectedRow} />}

      {/* ── G: Missing Data Assistant ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
          Missing Data Assistant
        </h2>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
          <p className="text-xs text-[rgba(6,3,43,0.62)] mb-3 leading-relaxed">
            KORA identifica automaticamente i campi mancanti che limitano la qualità della classificazione o impediscono la generazione di Impact Units.
            {selectedRow && selectedRow.missing_data_questions.length > 0 && (
              <> Domande specifiche per <span className="font-semibold">{selectedRow.raw.raw_name}</span>:</>
            )}
          </p>
          <div className="space-y-2">
            {selectedRow ? (
              selectedRow.missing_data_questions.length > 0 ? (
                selectedRow.missing_data_questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 rounded border border-amber-100 bg-[rgba(217,154,43,0.08)] px-3 py-2 text-xs text-amber-700">
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
              <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-xs text-[rgba(6,3,43,0.52)]">
                Seleziona una riga dalla coda per vedere le domande di completamento dati specifiche per quel record.
              </div>
            )}
          </div>
          {!selectedRow && (
            <p className="mt-3 text-[11px] text-[rgba(6,3,43,0.40)]">
              Le domande sono generate dalla pipeline in base ai campi mancanti rilevati durante la normalizzazione.
            </p>
          )}
        </div>
      </div>

      {/* ── H: Output Routing Panel ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
          Routing Output — Come fluiscono i record
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RoutingCard
            count={summary.routing.kora_activation_core}
            title="KORA Activation Core"
            badge="bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]"
            description="Eligible → KORA Index v1.0 → Decision Pack"
            detail="Record verificati e approvati dal revisore. Generano Impact Units e contribuiscono al KORA Index v1.0."
          />
          <RoutingCard
            count={summary.routing.economic_relief_opportunity}
            title="Economic Relief & Activation Opportunity"
            badge="bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]"
            description="Limited → BTI Engine only"
            detail="Non generano IU. Tracciati nel Budget-to-Human-Impact engine come economic_relief_spend. Opportunità di conversione in attivazione reale."
          />
          <RoutingCard
            count={summary.routing.blocked_by_design}
            title="Blocked by Design"
            badge="bg-[rgba(158,59,47,0.06)] text-[#9E3B2F] border-[rgba(158,59,47,0.20)]"
            description="Blocked → 0 IU — solo governance"
            detail="KORA non trasforma la compliance in impatto. Tracciati per governance. 0 IU · 0 KORA Index · 0 PIB."
          />
          <RoutingCard
            count={summary.routing.human_review_required}
            title="Human Review Required"
            badge="bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]"
            description="Review → coda advisor"
            detail="Classificazione ambigua o incompleta. Richiedono validazione advisor prima di poter entrare nel KORA Activation Core."
          />
        </div>
      </div>

      {/* ── I: Privacy & Governance Boundaries ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.52)]">
          Privacy & Governance — Limiti di KORA Intake Engine™
        </p>
        <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">
          KORA Intake Engine™ lavora su dati aziendali e record di iniziativa. Non espone Worker PIB individuali,
          dati sensibili individuali o ranking dei lavoratori.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          <div>
            <p className="text-[10px] font-semibold text-green-600 mb-1">KORA Intake Engine™ può:</p>
            <ul className="space-y-0.5">
              {[
                'Classificare tipo di azione/programma/evento',
                'Rilevare campi mancanti per scoring futuro',
                'Rilevare item compliance/legal obbligatori (Blocked)',
                'Rilevare benefit cash-like (Limited)',
                'Generare domande di revisione da pipeline',
                'Instradare verso categorie KORA con flag di governance',
              ].map((t) => (
                <li key={t} className="flex gap-1.5 text-[10px] text-[rgba(6,3,43,0.52)]">
                  <span className="shrink-0 text-[#2F7D55]">✓</span>{t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[rgba(158,59,47,0.90)] mb-1">KORA Intake Engine™ NON può:</p>
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
                <li key={t} className="flex gap-1.5 text-[10px] text-[rgba(6,3,43,0.52)]">
                  <span className="shrink-0 text-[rgba(158,59,47,0.75)]">✗</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-[10px] text-[rgba(6,3,43,0.40)] pt-1">
          Foundation Light usa una pipeline rule-based su dati demo: nessuna chiamata LLM esterna. Nessun dato reale lavoratore.
          synthetic_demo_data: true · KORA Index v1.0 · pre_empirical_calibration
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
        <h2 className="text-sm font-bold text-[rgba(6,3,43,0.90)]">Dettaglio: {row.raw.raw_name}</h2>
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
        <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] mb-2 uppercase tracking-wide">Raw → Normalizzato</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[#F8F6F1] p-2.5 space-y-1 text-xs">
            <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide">Raw input</p>
            <p className="text-[rgba(6,3,43,0.78)]"><span className="text-[rgba(6,3,43,0.40)]">Nome: </span>{row.raw.raw_name}</p>
            <p className="text-[rgba(6,3,43,0.52)] text-[10px] leading-relaxed">{n.raw_description}</p>
            <p className="text-[rgba(6,3,43,0.40)] text-[10px]">Fonte: {row.raw.source_file ?? '—'}</p>
          </div>
          <div className="rounded border border-violet-100 bg-violet-50/50 p-2.5 space-y-1 text-xs">
            <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide">Normalizzato</p>
            <p className="text-[rgba(6,3,43,0.78)] font-mono text-[10px]">{n.normalized_name}</p>
            <p className="text-[rgba(6,3,43,0.62)]">
              <span className="text-[rgba(6,3,43,0.40)]">Tipo fonte: </span>
              {n.source_type.replace(/_/g, ' ')}
              {n.inferred_source_type && <span className="ml-1 text-[9px] text-violet-400 italic">(inferito)</span>}
            </p>
            {n.mandatory_status && (
              <p className="text-[rgba(6,3,43,0.62)]">
                <span className="text-[rgba(6,3,43,0.40)]">Stato obbligatorio: </span>
                {n.mandatory_status}
                {n.inferred_mandatory_status && <span className="ml-1 text-[9px] text-violet-400 italic">(inferito)</span>}
              </p>
            )}
            <p className="text-[rgba(6,3,43,0.62)]">
              <span className="text-[rgba(6,3,43,0.40)]">Completezza dati: </span>
              <span className={n.data_completeness_score >= 0.8 ? 'text-green-600 font-semibold' : n.data_completeness_score >= 0.5 ? 'text-amber-600' : 'text-[rgba(158,59,47,0.90)]'}>
                {Math.round(n.data_completeness_score * 100)}%
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Classification fields grid */}
      <div>
        <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] mb-2 uppercase tracking-wide">Classificazione Eligibility Gate</p>
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
          {/* Task 8 B85-B — Worker PIB eligibility label in classification grid */}
          <Field
            label="Worker PIB"
            value={c.worker_pib_allowed ? 'consentito' : 'non consentito'}
            highlight={c.worker_pib_allowed ? 'eligible' : 'blocked'}
          />
        </div>
      </div>

      {/* Reason + Explanation */}
      <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-2 text-xs text-[rgba(6,3,43,0.62)]">
        <p className="font-semibold text-[rgba(6,3,43,0.40)] mb-0.5">Ragione della classificazione</p>
        <p className="leading-relaxed">{c.reason}</p>
      </div>
      <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-2 text-xs text-[rgba(6,3,43,0.62)]">
        <p className="font-semibold text-[rgba(6,3,43,0.40)] mb-0.5">Spiegazione KORA</p>
        <p className="leading-relaxed">{c.explanation_text}</p>
      </div>

      {/* KoraReadyRecord governance flags */}
      <div>
        <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] mb-2 uppercase tracking-wide">KoraReadyRecord — Flag di governance</p>
        <div className="flex flex-wrap gap-2">
          <FlagBadge label="Scoring approvato"        value={kr.approved_for_scoring} />
          <FlagBadge label="BTI governance approvato" value={kr.approved_for_bti_governance} />
          <FlagBadge label="Impact Units approvati"   value={kr.approved_for_impact_units} />
          <FlagBadge label="Review richiesta"         value={c.review_required} invert />
          {/* Task 7 B85-B — Worker PIB allowed indicator for KORA operator clarity */}
          <FlagBadge label="Worker PIB consentito"    value={c.worker_pib_allowed} />
        </div>
        <p className="mt-1.5 text-[10px] text-[rgba(6,3,43,0.40)]">
          Blocked → tutti false. Limited → solo BTI. Eligible + review_required → tutti false. Eligible + approvato → scoring e IU abilitati.
          Worker PIB consentito indica se questa tipologia di azione è consentita nella futura attribuzione individuale lavoratore (Pilot+).
        </p>
      </div>

      {/* Mock review controls */}
      <div>
        <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] mb-2 uppercase tracking-wide">Controlli di revisione (demo)</p>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={!kr.approved_for_scoring}
            className={cn(
              'rounded border px-3 py-1.5 text-xs font-medium',
              kr.approved_for_scoring
                ? 'border-green-300 bg-[rgba(47,125,85,0.08)] text-[#2F7D55] hover:bg-green-100 cursor-pointer'
                : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.28)] cursor-not-allowed',
            )}
          >
            Invia a KORA Index ✓
          </button>
          <button disabled className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-3 py-1.5 text-xs font-medium text-amber-600 cursor-not-allowed opacity-70">
            Invia a revisione
          </button>
          <button disabled className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-1.5 text-xs text-[rgba(6,3,43,0.40)] cursor-not-allowed">
            Escludi da scoring
          </button>
          <button disabled className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-1.5 text-xs text-[rgba(6,3,43,0.40)] cursor-not-allowed">
            Modifica mapping
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-[rgba(6,3,43,0.40)]">
          Controlli di revisione disponibili in fase pilot. &ldquo;Invia a KORA Index&rdquo; è abilitato solo per record Eligible con approved_for_scoring: true.
        </p>
      </div>

      {/* Missing fields */}
      {n.missing_fields.length > 0 && (
        <div className="rounded border border-amber-100 bg-[rgba(217,154,43,0.08)] px-3 py-2">
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
    highlight === 'limited'  ? 'text-[#C76F3D] font-semibold' :
    highlight === 'blocked'  ? 'text-[rgba(158,59,47,0.90)] font-semibold' :
    'text-[rgba(6,3,43,0.78)]';
  return (
    <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[#F8F6F1] px-2 py-1.5">
      <p className="text-[10px] text-[rgba(6,3,43,0.40)]">{label}</p>
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
        ? 'border-[rgba(47,125,85,0.22)] bg-green-50 text-green-600'
        : 'border-[rgba(158,59,47,0.12)] bg-[rgba(158,59,47,0.06)] text-[rgba(158,59,47,0.75)]',
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
    <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.78)] leading-snug">{title}</p>
        <span className={cn(
          'text-lg font-bold shrink-0',
          badge.includes('green')  ? 'text-green-700'  :
          badge.includes('indigo') ? 'text-[rgba(6,3,43,0.72)]' :
          badge.includes('rose')   ? 'text-[#9E3B2F]'   :
          'text-amber-700',
        )}>
          {count}
        </span>
      </div>
      <span className={cn('inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium', badge)}>
        {description}
      </span>
      <p className="text-[10px] text-[rgba(6,3,43,0.52)] leading-relaxed">{detail}</p>
    </div>
  );
}
