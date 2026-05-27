'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { parseUploadedFile } from '@/lib/upload/file-parser';
import type { ParsedUploadResult } from '@/lib/upload/file-parser';
import { detectColumnMappings } from '@/lib/upload/column-detection';
import { detectSensitiveColumns } from '@/lib/upload/sensitive-column-detection';
import { ALL_TEMPLATES } from '@/lib/upload/sample-templates';
import type { SampleTemplate } from '@/lib/upload/sample-templates';
import type { ColumnMapping, SensitiveColumnFlag } from '@/lib/kora-engine/types';

// ── Constants ──────────────────────────────────────────────────────────────────

const CRITICAL_BTI_FIELDS = ['budget_amount', 'budget_source', 'budget_evidence_type'];
const CRITICAL_BTI_LABELS: Record<string, string> = {
  budget_amount: 'Importo Budget',
  budget_source: 'Fonte Budget',
  budget_evidence_type: 'Tipo Evidenza Budget',
};

const ACCEPTED_TYPES = '.csv,.xlsx,.xls';
const MAX_FILE_MB = 10;

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [status, setStatus] = useState<'idle' | 'parsing' | 'parsed' | 'error'>('idle');
  const [parseResult, setParseResult] = useState<ParsedUploadResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string>(ALL_TEMPLATES[0].id);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

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
                { label: 'Initiatives', note: 'Lista iniziative aziendali con tipologia e budget (anche dichiarato).', required: true },
                { label: 'Participation', note: 'Utilizzo aggregato per iniziativa, dipartimento, sede.', required: true },
                { label: 'HR KPI Aggregates', note: 'Turnover, engagement, assenteismo. Opzionale — arricchisce HR KPI preview.', required: false },
              ].map((item, i) => (
                <div key={item.label} className={`px-3.5 py-3 space-y-0.5 ${i < 3 ? 'border-b sm:border-b-0 sm:border-r border-slate-100' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${item.required ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                      {item.required ? 'Richiesto' : 'Opzionale'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{item.note}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 text-[10px] text-slate-500">
              Export provider welfare o LMS sono supplementi opzionali — non sostitutiscono né aggiungono requisiti al Data Pack aziendale.
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

        {/* ── Sections 4-8: Only shown after parsing ────────────────────────── */}
        {status === 'parsed' && parseResult && (
          <>
            {/* ── Section 4: Data preview ─────────────────────────────────── */}
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

            {/* ── Section 5: Column mapping ────────────────────────────────── */}
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

            {/* ── Section 6: Sensitive columns ────────────────────────────── */}
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
                        ? `${highSensitiveCount} colonne ad alto rischio da escludere · campi identità da pseudonimizzare prima dell'ingestion.`
                        : 'Campi identità rilevati — da pseudonimizzare prima dell\'ingestion.'}
                    </p>
                  </div>
                </div>

                {/* Identity fields panel */}
                {sensitiveFlags.some((f) => f.recommendedAction === 'pseudonymize') && (
                  <div className="px-6 pt-5 pb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 mb-2">Campi identità — pseudonimizzare</p>
                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      I campi nome, cognome, email, matricola sono ammessi nel Data Pack per la <strong>deduplicazione dei record</strong>.
                      Devono essere pseudonimizzati prima di entrare nella pipeline KORA e non appaiono mai in output employer.
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
                            <span className="text-xs text-amber-700 shrink-0 font-medium">Pseudonimizza</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* High-risk excluded panel */}
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

            {/* ── Section 7: BTI readiness ─────────────────────────────────── */}
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

                {/* BTI bar */}
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

                {/* Critical fields checklist */}
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

            {/* ── Section 8: Next step ─────────────────────────────────────── */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700">Prossimo passo</h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">
                    Il caricamento definitivo al server e la pipeline UEF sono attivi dal Gate 2.
                    In questa versione il file viene analizzato localmente senza persistenza.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                  {highSensitiveCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      Risolvi colonne sensibili prima
                    </div>
                  )}
                  <button
                    disabled
                    className="px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    title="Disponibile dal Gate 2"
                  >
                    Invia alla pipeline UEF
                    <span className="ml-2 text-xs font-normal opacity-70">(Gate 2)</span>
                  </button>
                </div>
              </div>

              {/* Synthetic data reminder */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <span>
                  Foundation Light · Modalità pilot · Nessun dato viene trasmesso a server.
                  Il parsing avviene interamente nel browser.
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── Idle state: quick guidance ───────────────────────────────────── */}
        {status === 'idle' && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Come funziona</h3>
            <ol className="space-y-2">
              {[
                'Carica un file CSV o Excel con dati welfare, budget o HR aggregati',
                'Il sistema rileva le intestazioni e le mappa ai campi UEF di KORA',
                'Le colonne sensibili vengono segnalate prima di qualsiasi elaborazione',
                'La qualità dell\'evidenza budget determina il peso nel macroblocco BTI (20%)',
                'L\'invio alla pipeline UEF sarà disponibile dal Gate 2',
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
        {/* Required columns */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Colonne obbligatorie
          </h4>
          <ul className="space-y-1">
            {template.requiredColumns.map((col) => (
              <li key={col} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-mono text-slate-700">{col}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Optional columns */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Colonne opzionali
          </h4>
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

      {/* Privacy notes */}
      <div className="p-3 rounded-lg border border-blue-100 bg-blue-50 text-xs text-blue-800">
        <span className="font-semibold">Nota privacy: </span>
        {template.privacyNotes}
      </div>

      {/* Column headers preview */}
      <div>
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Intestazioni del template
        </h4>
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
