'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { parseUploadedFile } from '@/lib/upload/file-parser';
import type { ParsedUploadResult } from '@/lib/upload/file-parser';
import { detectColumnMappings } from '@/lib/upload/column-detection';
import { detectSensitiveColumns } from '@/lib/upload/sensitive-column-detection';
import { ALL_TEMPLATES } from '@/lib/upload/sample-templates';
import type { SampleTemplate } from '@/lib/upload/sample-templates';
import type {
  ColumnMapping,
  SensitiveColumnFlag,
  KoraComputationResult,
  RawUploadedRecord,
  ExplainabilityTraceItem,
} from '@/lib/kora-engine/types';
import { runKoraPipeline } from '@/lib/kora-engine/run-kora-pipeline';

// ── Constants ──────────────────────────────────────────────────────────────────

const CRITICAL_BTI_FIELDS = ['budget_amount', 'budget_source', 'budget_evidence_type'];
const CRITICAL_BTI_LABELS: Record<string, string> = {
  budget_amount: 'Importo Budget',
  budget_source: 'Fonte Budget',
  budget_evidence_type: 'Tipo Evidenza Budget',
};

const ACCEPTED_TYPES = '.csv,.xlsx,.xls';
const MAX_FILE_MB = 10;

// ── Existing helpers ───────────────────────────────────────────────────────────

function confidenceBadge(confidence: number): { label: string; cls: string } {
  if (confidence >= 0.90) return { label: `${Math.round(confidence * 100)}%`, cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };
  if (confidence >= 0.70) return { label: `${Math.round(confidence * 100)}%`, cls: 'bg-amber-100 text-amber-700 border border-amber-200' };
  return { label: `${Math.round(confidence * 100)}% — revisione`, cls: 'bg-red-100 text-red-700 border border-red-200' };
}

function severityBadgeCls(severity: string): string {
  if (severity === 'high') return 'bg-red-100 text-red-700 border border-red-200';
  if (severity === 'medium') return 'bg-amber-100 text-amber-700 border border-amber-200';
  return 'bg-slate-100 text-slate-600 border border-slate-200';
}

function recordTypeLabel(type: string): string {
  const map: Record<string, string> = {
    welfare_program: 'Programmi Welfare',
    budget: 'Registrazioni Budget',
    hr_aggregate: 'Aggregati HR',
    structural_policy: 'Policy Strutturali',
    unknown: 'Tipo non rilevato',
  };
  return map[type] ?? type;
}

function btiStatusConfig(criticalMapped: number): { label: string; sublabel: string; cls: string; barCls: string } {
  if (criticalMapped === 3) return {
    label: 'Forte',
    sublabel: 'Le colonne necessarie per la valutazione BTI sono presenti. Il livello di evidenza (L0–L4) verrà determinato in revisione e influenzerà il peso nel macroblocco Budget-to-Human-Impact (20%).',
    cls: 'border-emerald-200 bg-emerald-50',
    barCls: 'bg-emerald-500',
  };
  if (criticalMapped >= 1) return {
    label: 'Parziale',
    sublabel: `${criticalMapped}/3 colonne critiche per BTI presenti. Il peso BTI sarà ridotto in base all'evidenza disponibile.`,
    cls: 'border-amber-200 bg-amber-50',
    barCls: 'bg-amber-400',
  };
  return {
    label: 'Assente',
    sublabel: 'Nessuna colonna budget rilevata. Il macroblocco BTI (20%) non può essere calcolato. Budget = dato non valido senza fonte.',
    cls: 'border-slate-200 bg-slate-50',
    barCls: 'bg-slate-300',
  };
}

// ── KORA Preview helpers ───────────────────────────────────────────────────────

function formatEur(n: number): string {
  if (n === 0) return '€ 0';
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function inferWorkforcePopulation(rows: RawUploadedRecord[], mappings: ColumnMapping[]): number | undefined {
  const wfMapping = mappings.find((m) => m.targetField === 'workforce_population');
  if (!wfMapping) return undefined;
  const col = wfMapping.sourceColumn;
  const values = rows
    .map((r) => r.raw[col])
    .filter((v): v is number => typeof v === 'number' && v > 0 && v < 1_000_000);
  if (values.length === 0) return undefined;
  return Math.max(...values);
}

function safeguardCls(status: string): { bg: string; text: string; border: string } {
  if (status === 'CLEAR')   return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
  if (status === 'FLAGGED') return { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200'     };
  return                           { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200'   };
}

function koraIndexTextCls(value: number): string {
  if (value >= 60) return 'text-emerald-600';
  if (value >= 35) return 'text-amber-600';
  return 'text-slate-600';
}

function barCls(value: number, max: number = 100): string {
  const pct = max > 0 ? value / max : 0;
  if (pct >= 0.6) return 'bg-emerald-500';
  if (pct >= 0.35) return 'bg-amber-400';
  return 'bg-red-400';
}

function barW(value: number, max: number = 100): string {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return `${Math.round(pct)}%`;
}

const PILLAR_CONFIG: Record<string, { label: string; color: string; barColor: string }> = {
  LIFE:       { label: 'LIFE',       color: 'text-blue-700',   barColor: 'bg-blue-500' },
  GROWTH:     { label: 'GROWTH',     color: 'text-emerald-700', barColor: 'bg-emerald-500' },
  CONNECTION: { label: 'CONNECTION', color: 'text-purple-700', barColor: 'bg-purple-500' },
  IMPACT:     { label: 'IMPACT',     color: 'text-orange-700', barColor: 'bg-orange-500' },
  LEGACY:     { label: 'LEGACY',     color: 'text-slate-600',  barColor: 'bg-slate-400' },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [status, setStatus] = useState<'idle' | 'parsing' | 'parsed' | 'error'>('idle');
  const [parseResult, setParseResult] = useState<ParsedUploadResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string>(ALL_TEMPLATES[0].id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [koraStatus, setKoraStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [koraResult, setKoraResult] = useState<KoraComputationResult | null>(null);
  const [koraError, setKoraError] = useState<string | null>(null);

  // ── Derived state ────────────────────────────────────────────────────────────

  const columnMappings: ColumnMapping[] = parseResult
    ? detectColumnMappings(parseResult.headers)
    : [];

  const sensitiveFlags: SensitiveColumnFlag[] = parseResult
    ? detectSensitiveColumns(parseResult.headers)
    : [];

  const sensitiveColNames = new Set(sensitiveFlags.map((f) => f.columnName));

  const mappedCount = columnMappings.length;
  const reviewCount = columnMappings.filter((m) => m.requiresReview).length;
  const unmappedCount = parseResult ? parseResult.headers.length - mappedCount : 0;
  const highSensitiveCount = sensitiveFlags.filter((f) => f.severity === 'high').length;

  const mappedTargetFields = new Set(columnMappings.map((m) => m.targetField));
  const criticalMapped = CRITICAL_BTI_FIELDS.filter((f) => mappedTargetFields.has(f)).length;
  const btiStatus = btiStatusConfig(criticalMapped);

  const canRunKora = status === 'parsed' && parseResult !== null && parseResult.rows.length > 0;

  // ── File handling ────────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setParseError(`File troppo grande: ${(file.size / 1024 / 1024).toFixed(1)} MB (max ${MAX_FILE_MB} MB).`);
      setStatus('error');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setParseError(`Formato non supportato: .${ext}. Accettati: CSV, XLSX, XLS.`);
      setStatus('error');
      return;
    }
    setStatus('parsing');
    setParseError(null);
    setKoraStatus('idle');
    setKoraResult(null);
    setKoraError(null);
    try {
      const result = await parseUploadedFile(file);
      setParseResult(result);
      setStatus('parsed');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Errore di parsing sconosciuto.');
      setStatus('error');
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setParseResult(null);
    setParseError(null);
    setKoraStatus('idle');
    setKoraResult(null);
    setKoraError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleRunKoraPreview = useCallback(() => {
    if (!parseResult || parseResult.rows.length === 0) return;
    setKoraStatus('running');
    setKoraError(null);
    setKoraResult(null);
    // Defer to allow the 'running' state to paint before synchronous computation.
    setTimeout(() => {
      try {
        const workforcePopulation = inferWorkforcePopulation(parseResult.rows, columnMappings);
        const result = runKoraPipeline({
          tenantId: 'preview-tenant',
          batchId: parseResult.fileName.replace(/[^a-z0-9]/gi, '_').slice(0, 60),
          records: parseResult.rows,
          workforcePopulation,
        });
        setKoraResult(result);
        setKoraStatus('done');
      } catch (err) {
        setKoraError(err instanceof Error ? err.message : 'Errore interno pipeline.');
        setKoraStatus('error');
      }
    }, 0);
  }, [parseResult, columnMappings]);

  const selectedTemplate = ALL_TEMPLATES.find((t) => t.id === activeTemplate) ?? ALL_TEMPLATES[0];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Section 1: Header ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/company/data" className="hover:text-slate-700 transition-colors">
              Dati
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">Data Intake Studio</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                KORA Data Intake Studio
              </h1>
              <p className="mt-1 text-slate-500 text-sm leading-relaxed max-w-xl">
                Carica i file HR, welfare e budget dell&apos;azienda. Il sistema analizza le colonne,
                segnala i dati sensibili e valuta la qualità dell&apos;evidenza per il calcolo BTI.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                Upload V0
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Client-side
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                Foundation Light
              </span>
            </div>
          </div>

          {/* Privacy boundary notice */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-blue-200 bg-blue-50 text-sm">
            <svg className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <div className="text-blue-800">
              <span className="font-semibold">Perimetro company-enabled —</span>{' '}
              KORA misura come fondi, iniziative e benefit aziendali vengono attivati dai lavoratori.
              Upload attesi: file aziendali (Workers aggregati, Initiatives, Participation) e opzionalmente export provider welfare/LMS.
              Nessun upload individuale lavoratore. Nessun dato inviato a server in questa versione.
            </div>
          </div>

          {/* Data Pack Guidance */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Foundation Light Data Pack — input minimo</p>
            </div>
            <div className="grid grid-cols-2 gap-0 sm:grid-cols-4">
              {[
                { label: 'Workers (aggregato)', note: 'Headcount per dipartimento e sede. Nessun nominativo. N ≥ 10.', required: true },
                { label: 'Initiatives', note: 'Lista iniziative/programmi aziendali con tipologia e pillar indicativo.', required: true },
                { label: 'Participation', note: 'Utilizzo aggregato per iniziativa, dipartimento, sede. N ≥ 10.', required: true },
                { label: 'Budget / Evidenze', note: 'Budget allocato per categoria. Anche dichiarato — classificato nella Budget Evidence review.', required: true },
              ].map((item, i) => (
                <div key={item.label} className={`px-3.5 py-3 space-y-0.5 ${i < 3 ? 'border-b sm:border-b-0 sm:border-r border-slate-100' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide whitespace-nowrap border-slate-800 bg-slate-900 text-white">
                      Richiesto
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{item.note}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 text-[10px] text-slate-500">
              Opzionali: HR KPI aggregati (turnover, engagement) · export provider welfare/LMS come supplemento.
              I lavoratori non caricano file: upload individuale fuori perimetro in Foundation Light Pilot.
            </div>
          </div>
        </div>

        {/* ── Section 2: Upload zone ─────────────────────────────────────────── */}
        <div className="rounded-xl border-2 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              1 — Carica file
            </h2>
          </div>

          {status === 'idle' || status === 'error' ? (
            <div className="p-6 space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center gap-3 py-14 px-8
                  rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150
                  ${isDragging
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
                  }
                `}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDragging ? 'bg-indigo-100' : 'bg-white border border-slate-200'}`}>
                  <svg className={`w-6 h-6 ${isDragging ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">
                    {isDragging ? 'Rilascia il file qui' : 'Trascina il file qui o clicca per selezionare'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">CSV, XLSX, XLS — max {MAX_FILE_MB} MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={handleFileInput}
                  className="sr-only"
                />
              </div>

              {status === 'error' && parseError && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          ) : status === 'parsing' ? (
            <div className="p-12 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Analisi del file in corso…</p>
            </div>
          ) : parseResult && (
            <div className="p-6 space-y-4">
              {/* File info bar */}
              <div className="flex items-center gap-3 p-4 rounded-lg border border-emerald-200 bg-emerald-50">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{parseResult.fileName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {parseResult.fileType.toUpperCase()} · {parseResult.rowCount} righe · {parseResult.columnCount} colonne
                    {parseResult.detectedRecordTypes.length > 0 && (
                      <> · <span className="text-indigo-600 font-medium">{parseResult.detectedRecordTypes.map(recordTypeLabel).join(', ')}</span></>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 shrink-0"
                >
                  Cambia file
                </button>
              </div>

              {/* Multi-sheet notice */}
              {parseResult.availableSheets && parseResult.availableSheets.length > 1 && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
                  <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>
                    Excel multi-foglio rilevato. Analizzato: <strong>{parseResult.availableSheets[0]}</strong>.
                    Fogli disponibili: {parseResult.availableSheets.join(', ')}.
                  </span>
                </div>
              )}

              {/* Parsing warnings */}
              {parseResult.parsingWarnings.length > 0 && (
                <div className="space-y-2">
                  {parseResult.parsingWarnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Validation issues */}
              {parseResult.validationIssues.length > 0 && (
                <div className="space-y-1.5">
                  {parseResult.validationIssues.map((issue, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
                        issue.severity === 'error'
                          ? 'border-red-200 bg-red-50 text-red-800'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Colonne mappate', value: mappedCount, total: parseResult.columnCount, cls: 'text-emerald-600' },
                  { label: 'Richiedono revisione', value: reviewCount, total: null, cls: reviewCount > 0 ? 'text-amber-600' : 'text-slate-400' },
                  { label: 'Non mappate', value: unmappedCount, total: null, cls: unmappedCount > 0 ? 'text-slate-500' : 'text-slate-400' },
                  { label: 'Colonne sensibili', value: sensitiveFlags.length, total: null, cls: sensitiveFlags.length > 0 ? 'text-red-600' : 'text-slate-400' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                    <p className={`text-xl font-bold ${stat.cls}`}>
                      {stat.value}{stat.total !== null && <span className="text-slate-400 font-normal text-sm">/{stat.total}</span>}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-tight">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Section 3: Template guidance ──────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Template di riferimento
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Struttura attesa per ogni tipo di file. Usa come guida per la preparazione dei dati.
            </p>
          </div>

          {/* Template tabs */}
          <div className="border-b border-slate-100 overflow-x-auto">
            <div className="flex gap-0 px-4">
              {ALL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTemplate(t.id)}
                  className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTemplate === t.id
                      ? 'border-indigo-500 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <TemplatePanel template={selectedTemplate} />
        </div>

        {/* ── Sections 4-10: Only shown after parsing ───────────────────────── */}
        {status === 'parsed' && parseResult && (
          <>
            {/* ── Section 4: Data preview ──────────────────────────────────── */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    2 — Anteprima dati
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Prime {parseResult.previewRows.length} righe non vuote.
                    {sensitiveFlags.length > 0 && (
                      <span className="text-red-500 ml-1">
                        Colonne sensibili evidenziate in rosso.
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {parseResult.rowCount} righe totali
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {parseResult.headers.map((h) => (
                        <th
                          key={h}
                          className={`px-3 py-2.5 text-left font-medium whitespace-nowrap ${
                            sensitiveColNames.has(h)
                              ? 'bg-red-50 text-red-700'
                              : 'text-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {sensitiveColNames.has(h) && (
                              <svg className="w-3 h-3 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                              </svg>
                            )}
                            {h}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.previewRows.map((row, ri) => (
                      <tr key={ri} className="border-b border-slate-50 hover:bg-slate-50/50">
                        {parseResult.headers.map((h) => (
                          <td
                            key={h}
                            className={`px-3 py-2 whitespace-nowrap max-w-[180px] truncate ${
                              sensitiveColNames.has(h)
                                ? 'bg-red-50/60 text-red-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {String(row.raw[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Section 5: Column mapping ─────────────────────────────────── */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  3 — Mappatura colonne
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Il sistema ha mappato automaticamente le intestazioni verso i campi UEF canonici di KORA.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600">Colonna nel file</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600">Campo UEF</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600">Confidenza</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.headers.map((h) => {
                      const mapping = columnMappings.find((m) => m.sourceColumn === h);
                      const isSensitive = sensitiveColNames.has(h);
                      if (!mapping) {
                        return (
                          <tr key={h} className="border-b border-slate-50">
                            <td className={`px-4 py-2.5 font-mono ${isSensitive ? 'text-red-600' : 'text-slate-500'}`}>
                              {isSensitive && <span className="mr-1">⚠</span>}{h}
                            </td>
                            <td className="px-4 py-2.5 text-slate-400 italic">— non mappata</td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-400 border border-slate-200">—</span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-400 text-xs">
                              Rinomina la colonna usando un alias dal template per il mapping automatico.
                            </td>
                          </tr>
                        );
                      }
                      const badge = confidenceBadge(mapping.confidence);
                      return (
                        <tr key={h} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className={`px-4 py-2.5 font-mono ${isSensitive ? 'text-red-600' : 'text-slate-700'}`}>
                            {isSensitive && <span className="mr-1">⚠</span>}{h}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-indigo-700">{mapping.targetField}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 max-w-[260px] truncate">{mapping.mappingReason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {reviewCount > 0 && (
                <div className="px-6 py-3 border-t border-slate-100 bg-amber-50 text-xs text-amber-700">
                  <strong>{reviewCount} colonne</strong> con confidenza &lt;70% richiedono revisione manuale prima del caricamento definitivo.
                </div>
              )}
            </div>

            {/* ── Section 6: Sensitive columns ─────────────────────────────── */}
            {sensitiveFlags.length > 0 && (
              <div className="rounded-xl border-2 border-red-200 bg-red-50 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-red-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-red-800">
                      4 — Colonne sensibili rilevate ({sensitiveFlags.length})
                    </h2>
                    <p className="text-xs text-red-600 mt-0.5">
                      {highSensitiveCount > 0
                        ? `${highSensitiveCount} colonne ad alto rischio da escludere · campi identità non ammessi in output employer.`
                        : 'Campi identità rilevati — non ammessi in output employer.'}
                    </p>
                  </div>
                </div>

                {sensitiveFlags.some((f) => f.recommendedAction === 'pseudonymize') && (
                  <div className="px-6 pt-5 pb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 mb-2">Campi identità — non esporre in output employer</p>
                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      I campi nome, cognome, email, matricola sono ammessi nel Data Pack per la <strong>deduplicazione dei record</strong>.
                      Non devono apparire in nessun output employer.
                      La pseudonimizzazione tecnica è un requisito di implementazione futura — non ancora attiva in Foundation Light v0.
                    </p>
                    <div className="space-y-2">
                      {sensitiveFlags.filter((f) => f.recommendedAction === 'pseudonymize').map((flag) => (
                        <div key={flag.columnName} className="rounded-lg border border-amber-200 bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-slate-800">{flag.columnName}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityBadgeCls(flag.severity)}`}>
                                  Campo identità
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">{flag.reason}</p>
                            </div>
                            <span className="text-xs text-amber-700 shrink-0 font-medium">Non in output employer</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sensitiveFlags.some((f) => f.excludedByDefault) && (
                  <div className="px-6 pt-3 pb-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-red-600 mb-2">Dati ad alto rischio — da escludere</p>
                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      Le colonne seguenti non sono necessarie in Foundation Light Pilot e rappresentano rischio GDPR elevato.
                      Rimuoverle dal file originale prima del caricamento.
                    </p>
                    <div className="space-y-2">
                      {sensitiveFlags.filter((f) => f.excludedByDefault).map((flag) => (
                        <div key={flag.columnName} className="rounded-lg border border-red-300 bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-slate-800">{flag.columnName}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityBadgeCls(flag.severity)}`}>
                                  Alto rischio
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                  Escludi
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">{flag.reason}</p>
                            </div>
                            <span className="text-xs text-red-700 shrink-0 font-medium">Rimuovi dal file</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-3.5 rounded-lg border border-red-200 bg-red-100/60 text-xs text-red-800">
                      <strong>Azione richiesta:</strong> Rimuovi le colonne ad alto rischio dal file originale
                      e ricarica. KORA misura le organizzazioni, non gli individui — nessun dato
                      identificativo ad alto rischio deve entrare nella pipeline.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Section 7: BTI readiness ──────────────────────────────────── */}
            <div className={`rounded-xl border-2 bg-white shadow-sm overflow-hidden ${btiStatus.cls}`}>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    5 — Budget Evidence Readiness
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Qualità dell&apos;evidenza economica per il macroblocco BTI (20% del KORA Index).
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                  criticalMapped === 3
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                    : criticalMapped >= 1
                    ? 'border-amber-300 bg-amber-100 text-amber-700'
                    : 'border-slate-200 bg-slate-100 text-slate-500'
                }`}>
                  {btiStatus.label}
                </span>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-sm text-slate-600">{btiStatus.sublabel}</p>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Colonne critiche BTI</span>
                    <span>{criticalMapped}/3</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${btiStatus.barCls}`}
                      style={{ width: `${(criticalMapped / 3) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {CRITICAL_BTI_FIELDS.map((field) => {
                    const found = mappedTargetFields.has(field);
                    return (
                      <div key={field} className={`flex items-center gap-3 p-3 rounded-lg border ${found ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${found ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                          {found ? (
                            <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <span className={`text-xs font-medium ${found ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {CRITICAL_BTI_LABELS[field]}
                          </span>
                          {!found && (
                            <span className="text-xs text-slate-400 ml-2 italic">non rilevata nel file</span>
                          )}
                        </div>
                        <span className="font-mono text-xs text-slate-400">{field}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <strong className="text-slate-700">Dottrina §4:</strong>{' '}
                  Il budget non è un dato valido se non ha una fonte documentabile.
                  Senza <code className="font-mono">budget_source</code> e <code className="font-mono">budget_evidence_type</code>,
                  l&apos;importo viene escluso dal calcolo BTI.
                </div>
              </div>
            </div>

            {/* ── Section 8: Run KORA Preview ───────────────────────────────── */}
            <div className="rounded-xl border-2 border-indigo-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-900">
                    6 — KORA Computation Preview
                  </h2>
                  <p className="text-xs text-slate-500">
                    Elaborazione locale nel browser · nessun dato salvato · output azienda aggregato
                  </p>
                  {koraStatus === 'done' && koraResult && (
                    <p className="text-xs text-emerald-600 font-medium">
                      Preview completata · {koraResult.bti.totalBudget > 0 ? `${parseResult.rowCount} record elaborati` : `${parseResult.rowCount} record — nessun importo budget rilevato`}
                    </p>
                  )}
                  {koraStatus === 'error' && koraError && (
                    <p className="text-xs text-red-600">{koraError}</p>
                  )}
                </div>
                <div className="shrink-0">
                  <button
                    onClick={handleRunKoraPreview}
                    disabled={!canRunKora || koraStatus === 'running'}
                    className={`
                      px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150
                      ${!canRunKora || koraStatus === 'running'
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : koraStatus === 'done'
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                      }
                    `}
                  >
                    {koraStatus === 'running' ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                        Elaborazione…
                      </span>
                    ) : koraStatus === 'done' ? (
                      'Riesegui KORA Preview'
                    ) : (
                      'Run KORA Preview'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Section 9: KORA Computation Preview ──────────────────────── */}
            {koraStatus === 'done' && koraResult && (
              <KoraPreviewSection result={koraResult} />
            )}

            {/* ── Section 10: Next steps ────────────────────────────────────── */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
              <div className="space-y-1 mb-5">
                <h2 className="text-sm font-semibold text-slate-700">Prossimi passi</h2>
                <p className="text-xs text-slate-400 max-w-lg">
                  Questa preview dimostra il motore. Salvataggio dataset, report history e Board Pack generato da upload richiedono la fase SaaS/pilot operativo.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  disabled
                  className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-left cursor-not-allowed"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-400">Apri Eligibility Preview</p>
                    <p className="text-xs text-slate-400 mt-0.5">Revisione record per record con classificazione eligibility</p>
                  </div>
                  <span className="text-xs text-slate-400 border border-slate-200 rounded px-2 py-0.5 shrink-0 ml-3">Prossimo sprint</span>
                </button>
                <button
                  disabled
                  className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-left cursor-not-allowed"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-400">Prepara Board Pack da dataset caricato</p>
                    <p className="text-xs text-slate-400 mt-0.5">Report esecutivo aggregato basato sui dati caricati</p>
                  </div>
                  <span className="text-xs text-slate-400 border border-slate-200 rounded px-2 py-0.5 shrink-0 ml-3">Prossimo sprint</span>
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <span>
                  Foundation Light · Modalità pilot · Nessun dato viene trasmesso a server.
                  Il parsing e il calcolo avvengono interamente nel browser.
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── Idle state: quick guidance ────────────────────────────────────── */}
        {status === 'idle' && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Come funziona</h3>
            <ol className="space-y-2">
              {[
                'Carica un file CSV o Excel con dati welfare, budget o HR aggregati',
                'Il sistema rileva le intestazioni e le mappa ai campi UEF di KORA',
                'Le colonne sensibili vengono segnalate prima di qualsiasi elaborazione',
                'La qualità dell\'evidenza budget determina il peso nel macroblocco BTI (20%)',
                'Esegui il KORA Preview nel browser — KORA Index, Confidence, BTI, Attivazione e Pillar calcolati localmente',
                'Salvataggio, report history e Board Pack: disponibili dalla fase SaaS/pilot operativo',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

      </div>
    </div>
  );
}

// ── TemplatePanel ──────────────────────────────────────────────────────────────

function TemplatePanel({ template }: { template: SampleTemplate }) {
  return (
    <div className="p-6 space-y-5">
      <div>
        <p className="text-sm text-slate-600">{template.description}</p>
        <p className="text-xs text-slate-400 mt-1">
          <span className="font-medium text-indigo-600">Supporta:</span> {template.helpsWith}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Colonne obbligatorie</h4>
          <ul className="space-y-1">
            {template.requiredColumns.map((col) => (
              <li key={col} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-mono text-slate-700">{col}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Colonne opzionali</h4>
          <ul className="space-y-1">
            {template.optionalColumns.map((col) => (
              <li key={col} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                <span className="font-mono text-slate-500">{col}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-3 rounded-lg border border-blue-100 bg-blue-50 text-xs text-blue-800">
        <span className="font-semibold">Nota privacy: </span>
        {template.privacyNotes}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Intestazioni del template</h4>
        <div className="overflow-x-auto">
          <div className="inline-flex gap-1.5 pb-1">
            {template.headers.map((h) => (
              <span
                key={h}
                className={`px-2.5 py-1 rounded text-xs whitespace-nowrap border ${
                  template.requiredColumns.includes(h)
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KoraPreviewSection ─────────────────────────────────────────────────────────

function KoraPreviewSection({ result }: { result: KoraComputationResult }) {
  const isInsufficient = result.scoringMode === 'insufficient_data';

  // Extract care signal count from explainability trace
  const careStage = result.explainabilityTrace.find((t) => t.id === 'stage_03_care_economy');
  const careSignalCount = careStage
    ? parseInt(careStage.output.replace('careSignals=', '').trim(), 10) || 0
    : 0;

  return (
    <div className="space-y-6">
      {/* Boundary note */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-indigo-200 bg-indigo-50 text-sm">
        <svg className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <div className="text-indigo-800 space-y-1">
          <p className="font-semibold">KORA Computation Preview — output aggregato aziendale</p>
          <p className="text-xs text-indigo-700">
            Preview calcolata localmente su dati caricati in sessione. Non è un report certificato e non salva dati.
            Metodologia: <span className="font-mono">{result.koraIndex.methodologyVersion}</span> ·{' '}
            <span className="font-medium">{result.koraIndex.calibrationStatus}</span> · produzione_ready=false
          </p>
        </div>
      </div>

      {isInsufficient ? (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6 text-center space-y-2">
          <p className="text-lg font-semibold text-amber-800">Dataset insufficiente</p>
          <p className="text-sm text-amber-700">
            I dati caricati non sono sufficienti per calcolare il KORA Index.
            Assicurarsi che il file contenga iniziative aziendali con nome, categoria e possibilmente importo.
          </p>
          {result.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-amber-700 text-left max-w-lg mx-auto">
              {result.warnings.map((w, i) => <li key={i} className="flex gap-2"><span>·</span><span>{w}</span></li>)}
            </ul>
          )}
        </div>
      ) : (
        <>
          <KoraSummaryCards result={result} />
          <KoraEligibilityPanel result={result} />
          <KoraPillarPanel result={result} />
          <KoraBTIPanel result={result} />
          <KoraActivationPanel result={result} />
          <KoraCarePanel careSignalCount={careSignalCount} />
          <KoraWarningsPanel result={result} />
          <KoraExplainPanel trace={result.explainabilityTrace} />
        </>
      )}
    </div>
  );
}

// ── KoraSummaryCards ───────────────────────────────────────────────────────────

function KoraSummaryCards({ result }: { result: KoraComputationResult }) {
  const sg = safeguardCls(result.activation.safeguardStatus);
  const cards = [
    {
      label: 'KORA Index Preview',
      value: `${result.koraIndex.value}`,
      unit: '/100',
      sublabel: result.koraIndex.calibrationStatus,
      cls: koraIndexTextCls(result.koraIndex.value),
      note: 'pre_empirical_calibration',
    },
    {
      label: 'Confidence Score',
      value: `${result.confidence.score}`,
      unit: '/100',
      sublabel: 'Esterno al KORA Index · peso=0',
      cls: koraIndexTextCls(result.confidence.score),
      note: 'externalToIndex=true',
    },
    {
      label: 'BTI Score',
      value: `${result.bti.btiScore}`,
      unit: '/100',
      sublabel: 'Budget-to-Human-Impact',
      cls: koraIndexTextCls(result.bti.btiScore),
      note: '20% macroblocco',
    },
    {
      label: 'Activation Reach',
      value: formatPct(result.activation.activationReach),
      unit: '',
      sublabel: `${result.activation.activeWorkers} lavoratori attivi`,
      cls: result.activation.activationReach >= 0.40 ? 'text-emerald-600' : result.activation.activationReach >= 0.20 ? 'text-amber-600' : 'text-red-600',
      note: 'AR · soglia CLEAR ≥ 40%',
    },
    {
      label: 'Meaningful AR',
      value: formatPct(result.activation.meaningfulActivationReach),
      unit: '',
      sublabel: `${result.activation.meaningfullyActiveWorkers} lavoratori`,
      cls: result.activation.meaningfulActivationReach >= 0.30 ? 'text-emerald-600' : result.activation.meaningfulActivationReach >= 0.15 ? 'text-amber-600' : 'text-red-600',
      note: 'MAR · soglia CLEAR ≥ 30%',
    },
    {
      label: 'Activation Debt',
      value: formatEur(result.bti.activationDebt),
      unit: '',
      sublabel: 'Budget non convertito in attivazione',
      cls: result.bti.activationDebt > 0 ? 'text-amber-700 text-base' : 'text-slate-500 text-base',
      note: result.bti.activationDebt > 0 ? 'Ottimizzazione consigliata' : 'Nessun debito rilevato',
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Sintesi risultati</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${sg.bg} ${sg.text} ${sg.border}`}>
          Safeguard: {result.activation.safeguardStatus}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 divide-y divide-x divide-slate-100">
        {cards.map((card) => (
          <div key={card.label} className="p-4 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{card.label}</p>
            <p className={`text-2xl font-bold leading-none ${card.cls}`}>
              {card.value}
              {card.unit && <span className="text-sm font-normal text-slate-400 ml-0.5">{card.unit}</span>}
            </p>
            <p className="text-xs text-slate-500">{card.sublabel}</p>
            <p className="text-[10px] text-slate-400 font-mono">{card.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KoraEligibilityPanel ───────────────────────────────────────────────────────

function KoraEligibilityPanel({ result }: { result: KoraComputationResult }) {
  const { eligibilitySummary: es } = result;
  const total = es.totalCount || 1;
  const buckets = [
    {
      label: 'Eligible',
      count: es.eligibleCount,
      desc: 'Può contribuire al KORA Index se l\'evidenza lo supporta',
      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      barCls: 'bg-emerald-500',
    },
    {
      label: 'Limited',
      count: es.limitedCount,
      desc: 'Sollievo economico — tracciato in BTI, 0 Impact Unit',
      cls: 'bg-amber-100 text-amber-700 border-amber-200',
      barCls: 'bg-amber-400',
    },
    {
      label: 'Blocked',
      count: es.blockedCount,
      desc: 'Baseline normativa obbligatoria — escluso per design',
      cls: 'bg-red-100 text-red-700 border-red-200',
      barCls: 'bg-red-400',
    },
    {
      label: 'Review Required',
      count: es.reviewRequiredCount,
      desc: 'Classificazione ambigua — validazione umana necessaria',
      cls: 'bg-slate-100 text-slate-600 border-slate-200',
      barCls: 'bg-slate-400',
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Eligibility Gate</h3>
        <span className="text-xs text-slate-400">{es.totalCount} record totali</span>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buckets.map((b) => (
          <div key={b.label} className={`rounded-lg border p-3 space-y-2 ${b.cls}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{b.label}</span>
              <span className="text-lg font-bold">{b.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/50 overflow-hidden">
              <div className={`h-full rounded-full ${b.barCls}`} style={{ width: barW(b.count, total) }} />
            </div>
            <p className="text-[10px] leading-relaxed opacity-80">{b.desc}</p>
          </div>
        ))}
      </div>
      {es.reviewRequiredCount > es.totalCount * 0.25 && (
        <div className="px-6 py-3 border-t border-slate-100 bg-amber-50 text-xs text-amber-700">
          <strong>{Math.round((es.reviewRequiredCount / es.totalCount) * 100)}% di record in review_required</strong> — la classificazione è incompleta.
          Il KORA Index sottostima il potenziale reale fino alla revisione umana.
        </div>
      )}
    </div>
  );
}

// ── KoraPillarPanel ────────────────────────────────────────────────────────────

function KoraPillarPanel({ result }: { result: KoraComputationResult }) {
  const dist = result.pillarDistribution;
  const total = Object.values(dist).reduce((s, v) => s + v, 0) || 1;
  const pillars = Object.entries(dist) as [string, number][];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Distribuzione Pillar</h3>
        <span className="text-xs text-slate-400">{total} record classificati</span>
      </div>
      <div className="p-4 space-y-3">
        {pillars.map(([pillar, count]) => {
          const cfg = PILLAR_CONFIG[pillar] ?? { label: pillar, color: 'text-slate-600', barColor: 'bg-slate-400' };
          return (
            <div key={pillar} className="flex items-center gap-3">
              <span className={`text-xs font-bold w-24 shrink-0 ${cfg.color}`}>{cfg.label}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${cfg.barColor}`} style={{ width: barW(count, total) }} />
              </div>
              <span className="text-xs text-slate-500 w-8 text-right shrink-0">{count}</span>
              <span className="text-xs text-slate-400 w-8 text-right shrink-0">{formatPct(count / total)}</span>
            </div>
          );
        })}
        {total === 0 && (
          <p className="text-xs text-slate-400 text-center py-2">Nessun segnale pillar rilevato nel dataset.</p>
        )}
      </div>
    </div>
  );
}

// ── KoraBTIPanel ───────────────────────────────────────────────────────────────

function KoraBTIPanel({ result }: { result: KoraComputationResult }) {
  const { bti } = result;
  const rows = [
    { label: 'Budget totale', value: formatEur(bti.totalBudget), note: '' },
    { label: 'Deep Activation Spend', value: formatEur(bti.deepActivationSpend), note: 'Attivazione profonda' },
    { label: 'Economic Relief Spend', value: formatEur(bti.economicReliefSpend), note: 'Sollievo economico — 0 IU' },
    { label: 'Blocked Compliance Spend', value: formatEur(bti.blockedComplianceSpend), note: 'Obbligatorio legale — 0 IU' },
    { label: 'Activation Debt', value: formatEur(bti.activationDebt), note: 'Budget non convertito in attivazione', highlight: bti.activationDebt > 0 },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Budget-to-Human-Impact (BTI)</h3>
          <p className="text-xs text-slate-400 mt-0.5">Macroblocco 4 · peso 20% nel KORA Index v3</p>
        </div>
        <span className={`text-2xl font-bold ${koraIndexTextCls(bti.btiScore)}`}>
          {bti.btiScore}<span className="text-sm font-normal text-slate-400">/100</span>
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${row.highlight ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
              <div>
                <span className={`font-medium ${row.highlight ? 'text-amber-800' : 'text-slate-700'}`}>{row.label}</span>
                {row.note && <span className="text-xs text-slate-400 ml-2">{row.note}</span>}
              </div>
              <span className={`font-mono text-sm ${row.highlight && row.label === 'Activation Debt' && bti.activationDebt > 0 ? 'text-amber-700 font-semibold' : 'text-slate-600'}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Budget Evidence Quality</span>
            <span>{Math.round(bti.budgetEvidenceQuality * 100)}/100</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full ${barCls(bti.budgetEvidenceQuality * 100)}`} style={{ width: barW(bti.budgetEvidenceQuality * 100) }} />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500">
          <strong className="text-slate-600">Dottrina:</strong>{' '}
          Il budget non è trattato come impatto. Entra nel BTI solo in base a evidenza, eleggibilità e attivazione.
        </div>
      </div>
    </div>
  );
}

// ── KoraActivationPanel ────────────────────────────────────────────────────────

function KoraActivationPanel({ result }: { result: KoraComputationResult }) {
  const { activation } = result;
  const sg = safeguardCls(activation.safeguardStatus);
  const hasBoundedWarning = activation.warnings.some((w) =>
    w.includes('bounded') || w.includes('overlap') || w.includes('deduplicat') || w.includes('stima'),
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Activation & Reach Quality</h3>
          <p className="text-xs text-slate-400 mt-0.5">Output aggregato — nessun valore identità restituito</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${sg.bg} ${sg.text} ${sg.border}`}>
          {activation.safeguardStatus}
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Lavoratori attivi', value: activation.activeWorkers },
            { label: 'Attivazione significativa', value: activation.meaningfullyActiveWorkers },
            { label: 'Mai attivati', value: activation.neverActivatedWorkers },
            { label: 'Concentrazione top', value: `${formatPct(activation.concentrationTopShare)}`, raw: true },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-lg font-bold text-slate-700">{m.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {[
            { label: 'Activation Reach (AR)', value: activation.activationReach, threshold: 0.40, thresholdLabel: 'CLEAR ≥ 40%' },
            { label: 'Meaningful AR (MAR)', value: activation.meaningfulActivationReach, threshold: 0.30, thresholdLabel: 'CLEAR ≥ 30%' },
          ].map((metric) => (
            <div key={metric.label} className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{metric.label}</span>
                <span className="font-medium">{formatPct(metric.value)} <span className="font-normal opacity-60">({metric.thresholdLabel})</span></span>
              </div>
              <div className="relative h-2 rounded-full bg-slate-100 overflow-visible">
                <div className={`h-full rounded-full ${barCls(metric.value * 100)}`} style={{ width: barW(metric.value * 100) }} />
                {/* Threshold marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-400 opacity-60"
                  style={{ left: `${metric.threshold * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {hasBoundedWarning && (
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-800">
            KORA distingue partecipazioni lorde, reach deduplicata e stima conservativa quando l&apos;identità non è sufficiente
            o i conteggi unici si sovrappongono.
          </div>
        )}

        {activation.safeguardStatus !== 'CLEAR' && (
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500">
            <strong className="text-slate-600">D-21 Activation Safeguard:</strong>{' '}
            CLEAR = AR ≥ 40% AND MAR ≥ 30% · WARNING = sotto soglia · FLAGGED = AR &lt; 20% OR MAR &lt; 15%.
            CLEAR è bloccato anche se review_required &gt; 25% o concentrazione top &gt; 60%.
          </div>
        )}
      </div>
    </div>
  );
}

// ── KoraCarePanel ──────────────────────────────────────────────────────────────

function KoraCarePanel({ careSignalCount }: { careSignalCount: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Care Economy</h3>
          <p className="text-xs text-slate-400 mt-0.5">Modulo premium — segnali informativi, non nel KORA Index v3</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          careSignalCount > 0
            ? 'bg-blue-100 text-blue-700 border-blue-200'
            : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {careSignalCount} segnali
        </span>
      </div>
      <div className="p-4">
        {careSignalCount > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              <strong>{careSignalCount} segnali care economy</strong> rilevati nel dataset.
              Childcare, eldercare, caregiver, family support, flessibilità, accesso equo.
            </p>
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-800">
              Care Economy misura solo segnali aggregati nel perimetro aziendale/KORA-enabled.
              Non inferisce stato familiare o carichi di cura individuali.
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-2">
            Nessun segnale Care Economy rilevato in questo dataset.
          </p>
        )}
      </div>
    </div>
  );
}

// ── KoraWarningsPanel ──────────────────────────────────────────────────────────

function KoraWarningsPanel({ result }: { result: KoraComputationResult }) {
  const allWarnings = [
    ...result.warnings,
    ...result.bti.warnings,
    ...result.activation.warnings,
    ...result.koraIndex.warnings,
    ...result.confidence.warnings,
  ].filter((w) =>
    !w.startsWith('Fonte:') &&
    !w.includes('KORA-METHOD-v0.1.0') &&
    !w.includes('calibration_status=') &&
    !w.includes('CS è ESTERNO') &&
    !w.includes('production_ready=false'),
  );

  const { confidence: cs } = result;
  const subscores = [
    { label: 'Budget Evidence', value: cs.budgetEvidenceConfidence },
    { label: 'Data Completeness', value: cs.dataCompleteness },
    { label: 'Mapping Quality', value: cs.mappingConfidence },
    { label: 'Verification', value: cs.verificationConfidence },
    { label: 'Review (Advisor)', value: cs.reviewConfidence },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Confidence & Avvertenze</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            KORA espone i limiti del dataset invece di nasconderli.
          </p>
        </div>
        <span className={`text-xl font-bold ${koraIndexTextCls(cs.score)}`}>
          CS {cs.score}<span className="text-sm font-normal text-slate-400">/100</span>
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Confidence sub-scores */}
        <div className="space-y-2">
          {subscores.map((s) => (
            <div key={s.label} className="space-y-0.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{s.label}</span>
                <span className="font-medium">{Math.round(s.value * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${barCls(s.value * 100)}`} style={{ width: barW(s.value * 100) }} />
              </div>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {allWarnings.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Avvertenze diagnostiche</p>
            <ul className="space-y-1.5">
              {allWarnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500">
          Confidence Score è <strong>esterno al KORA Index</strong> — peso=0 nel calcolo.
          Indica l&apos;affidabilità del dato, non il livello di attivazione.
          CS basso non annulla il KORA Index ma segnala che i risultati devono essere interpretati con cautela.
        </div>
      </div>
    </div>
  );
}

// ── KoraExplainPanel ───────────────────────────────────────────────────────────

function KoraExplainPanel({ trace }: { trace: ExplainabilityTraceItem[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Explainability Trace</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          9 stage — solo valori aggregati. Nessun dato identità. Per revisione Advisor / Data Room.
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {trace.map((item) => (
          <div key={item.id} className="group">
            <button
              onClick={() => setOpen(open === item.id ? null : item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.warning ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{item.stage}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{item.output}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                  item.confidence >= 0.7
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : item.confidence >= 0.4
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {Math.round(item.confidence * 100)}%
                </span>
                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open === item.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {open === item.id && (
              <div className="px-4 pb-4 space-y-2">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-600">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 block mb-0.5">Input</span>
                    <span className="font-mono">{item.input}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 block mb-0.5">Output</span>
                    <span className="font-mono">{item.output}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 block mb-0.5">Regola applicata</span>
                    <span>{item.ruleApplied}</span>
                  </div>
                  {item.warning && (
                    <div className="flex items-start gap-2 p-2 rounded border border-amber-200 bg-amber-50 text-amber-700">
                      <span className="shrink-0">⚠</span>
                      <span>{item.warning}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
