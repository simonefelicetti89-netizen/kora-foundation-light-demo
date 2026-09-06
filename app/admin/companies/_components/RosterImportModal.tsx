'use client';
// RosterImportModal — B91-B Workforce Bulk Import
//
// 5-step client-side import flow: Upload → Preview → Validation → Privacy → Done
// No server calls. No DB writes. No email. No auth.
// Produces WorkerRosterRecord[] merged into parent sessionWorkers state.
//
// Boundary copy (T11):
// "Import roster ≠ Data Intake."
// "Il roster definisce la popolazione aziendale. Le attività che generano IU
//  passano da Data Intake e UEF Review."
// "Importare lavoratori non crea account My KORA reali."

import { useState, useRef, useCallback } from 'react';
import type { WorkerRosterRecord } from '@/lib/types';
import type { RosterParseResult, RosterValidationReport } from '@/lib/roster-import/types';
import { parseRosterFile } from '@/lib/roster-import/roster-parser';
import { validateRoster } from '@/lib/roster-import/roster-validation';
import { buildRosterRecordsFromValidatedRows } from '@/lib/roster-import/roster-record-builder';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  companyId: string;
  tenantId: string;
  existingWorkerIds: ReadonlySet<string>;
  onImport: (records: WorkerRosterRecord[]) => void;
  onClose: () => void;
}

// ── Steps ─────────────────────────────────────────────────────────────────────

type ImportStep = 'UPLOAD' | 'PREVIEW' | 'VALIDATION' | 'PRIVACY' | 'DONE';

const STEP_LABELS: Record<ImportStep, string> = {
  UPLOAD:     '1. Upload',
  PREVIEW:    '2. Anteprima',
  VALIDATION: '3. Validazione',
  PRIVACY:    '4. Privacy',
  DONE:       '5. Fatto',
};

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
      {children}
    </p>
  );
}

function BlockingBadge() {
  return (
    <span className="rounded border border-[rgba(158,59,47,0.30)] bg-[rgba(158,59,47,0.10)] px-1.5 py-0.5 text-[9px] font-bold text-[#9E3B2F]">
      BLOCCANTE
    </span>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepBar({ current }: { current: ImportStep }) {
  const steps: ImportStep[] = ['UPLOAD', 'PREVIEW', 'VALIDATION', 'PRIVACY', 'DONE'];
  const currentIdx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((s, idx) => (
        <div key={s} className="flex items-center gap-1">
          <span
            className={`text-[9px] font-semibold ${
              idx < currentIdx  ? 'text-[#2F7D55]' :
              idx === currentIdx ? 'text-[rgba(6,3,43,0.78)]' :
              'text-[rgba(6,3,43,0.28)]'
            }`}
          >
            {STEP_LABELS[s]}
          </span>
          {idx < steps.length - 1 && (
            <span className="text-[rgba(6,3,43,0.20)] text-[9px]">›</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Column status badge ───────────────────────────────────────────────────────

function ColBadge({ status }: { status: 'required' | 'optional' | 'forbidden' | 'unknown' }) {
  const cfg = {
    required:  { label: 'RICHIESTO',  cls: 'border-[rgba(6,3,43,0.20)] bg-[rgba(6,3,43,0.06)] text-[rgba(6,3,43,0.65)]' },
    optional:  { label: 'OPZIONALE',  cls: 'border-[rgba(6,3,43,0.10)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.42)]' },
    forbidden: { label: 'VIETATO',    cls: 'border-[rgba(158,59,47,0.30)] bg-[rgba(158,59,47,0.10)] text-[#9E3B2F]' },
    unknown:   { label: 'IGNORATO',   cls: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-[#8A5A00]' },
  }[status];
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${cfg.cls}`}>{cfg.label}</span>
  );
}

// ── Step: UPLOAD ──────────────────────────────────────────────────────────────

function StepUpload({
  onFileSelected,
  parsing,
  error,
}: {
  onFileSelected: (file: File) => void;
  parsing: boolean;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* Boundary notice */}
      <div className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.07)] px-3 py-2.5 text-[10px] text-[rgba(6,3,43,0.78)] leading-relaxed space-y-1">
        <p className="font-semibold">Import roster ≠ Data Intake</p>
        <p>Il roster definisce la popolazione aziendale — chi appartiene alla forza lavoro.</p>
        <p>Le attività che generano Impact Units passano da <strong>Data Intake → UEF Review</strong>.</p>
        <p>Importare lavoratori <strong>non crea account My KORA reali</strong>.</p>
      </div>

      {/* Drop zone */}
      <div
        className="rounded-lg border-2 border-dashed border-[rgba(6,3,43,0.18)] bg-[rgba(6,3,43,0.02)] p-8 text-center cursor-pointer hover:border-[rgba(6,3,43,0.30)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
        {parsing ? (
          <p className="text-sm text-[rgba(6,3,43,0.52)]">Analisi in corso…</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-[rgba(6,3,43,0.62)] mb-1">
              Trascina un file o clicca per selezionare
            </p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)]">CSV o Excel (.xlsx) · max 5 MB</p>
          </>
        )}
      </div>

      {error && (
        <div className="rounded border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-3 py-2 text-xs text-[#9E3B2F]">
          {error}
        </div>
      )}

      {/* Accepted columns */}
      <div className="grid gap-3 sm:grid-cols-2 text-[10px]">
        <div className="rounded border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.05)] p-3 space-y-1">
          <p className="font-semibold text-[#2F7D55] mb-1.5">✓ Colonne accettate</p>
          {[
            ['employee_code / matricola',  'RICHIESTO'],
            ['department / reparto',        'RICHIESTO'],
            ['site / sede',                 'RICHIESTO'],
            ['first_name / nome',           'opzionale'],
            ['last_name / cognome',         'opzionale'],
            ['my_kora / abilita_my_kora',  'opzionale'],
            ['job_family, contract_type…',  'opzionale'],
          ].map(([col, type]) => (
            <p key={col} className="text-[rgba(6,3,43,0.62)]">
              <span className="font-mono">{col}</span>
              <span className="ml-2 text-[rgba(6,3,43,0.40)]">— {type}</span>
            </p>
          ))}
        </div>
        <div className="rounded border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.04)] p-3 space-y-1">
          <p className="font-semibold text-[#9E3B2F] mb-1.5">✕ Colonne vietate</p>
          {['email / telefono', 'stipendio / salary', 'performance / rating', 'pib / iu', 'dati sanitari', 'consenso / consent', 'sindacato / religione'].map((c) => (
            <p key={c} className="text-[rgba(6,3,43,0.55)] font-mono">{c}</p>
          ))}
        </div>
      </div>

      <p className="text-[9px] font-mono text-[rgba(6,3,43,0.28)]">
        no_db_write · no_email · no_auth · no_pib · synthetic_demo_only
      </p>
    </div>
  );
}

// ── Step: PREVIEW ─────────────────────────────────────────────────────────────

function StepPreview({
  parseResult,
  onBack,
  onProceed,
}: {
  parseResult: RosterParseResult;
  onBack: () => void;
  onProceed: () => void;
}) {
  const hasForbidden = parseResult.forbiddenHeaders.length > 0;
  const previewRows = parseResult.rawRows.slice(0, 20);

  // Get canonical columns present in rows (for preview table)
  const presentCanonical = Array.from(
    new Set(previewRows.flatMap((r) => Object.keys(r)))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">
          {parseResult.fileName}
        </p>
        <span className="text-[10px] text-[rgba(6,3,43,0.42)]">
          {parseResult.totalRawRows} righe rilevate
        </span>
      </div>

      {/* Blocking error (forbidden columns) */}
      {hasForbidden && (
        <div className="rounded border border-[rgba(158,59,47,0.25)] bg-[rgba(158,59,47,0.07)] p-3 space-y-2">
          <div className="flex items-center gap-2">
            <BlockingBadge />
            <p className="text-xs font-semibold text-[#9E3B2F]">Colonne vietate — importazione bloccata</p>
          </div>
          {parseResult.blockingErrors.map((e, i) => (
            <p key={i} className="text-[10px] text-[#9E3B2F]">{e}</p>
          ))}
        </div>
      )}

      {/* Column analysis */}
      <div className="space-y-1.5">
        <SectionLabel>Analisi colonne</SectionLabel>
        <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_100px] gap-2 px-4 py-2 bg-[rgba(6,3,43,0.03)] border-b border-[rgba(6,3,43,0.07)]">
            {['Header originale', 'Header canonico', 'Stato'].map((h) => (
              <span key={h} className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.38)]">{h}</span>
            ))}
          </div>
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {parseResult.columns.map((col, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_100px] gap-2 px-4 py-2 items-center">
                <span className="text-[10px] font-mono text-[rgba(6,3,43,0.58)]">{col.originalHeader}</span>
                <span className="text-[10px] font-mono text-[rgba(6,3,43,0.72)]">
                  {col.canonicalHeader ?? '—'}
                </span>
                <ColBadge status={col.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row preview (first 20) */}
      {previewRows.length > 0 && !hasForbidden && (
        <div className="space-y-1.5">
          <SectionLabel>Anteprima dati — prime {Math.min(20, previewRows.length)} righe</SectionLabel>
          <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-x-auto text-[10px]">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-[rgba(6,3,43,0.07)] bg-[rgba(6,3,43,0.03)]">
                  {presentCanonical.map((c) => (
                    <th key={c} className="px-3 py-2 text-left font-semibold text-[rgba(6,3,43,0.40)] text-[9px] uppercase tracking-wide whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(6,3,43,0.04)]">
                {previewRows.map((row, i) => (
                  <tr key={i} className="hover:bg-[rgba(6,3,43,0.015)]">
                    {presentCanonical.map((c) => (
                      <td key={c} className="px-3 py-1.5 text-[rgba(6,3,43,0.65)] max-w-[140px] truncate">
                        {row[c] || <span className="text-[rgba(6,3,43,0.25)] italic">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parseResult.totalRawRows > 20 && (
            <p className="text-[9px] text-[rgba(6,3,43,0.40)]">
              … e altre {parseResult.totalRawRows - 20} righe non mostrate.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack}
          className="rounded border border-[rgba(6,3,43,0.12)] px-4 py-2 text-xs font-medium text-[rgba(6,3,43,0.58)] hover:bg-[rgba(6,3,43,0.03)] transition-colors">
          ← Indietro
        </button>
        {!hasForbidden && (
          <button type="button" onClick={onProceed}
            className="flex-1 rounded-md bg-[#06032B] px-4 py-2 text-xs font-semibold text-white hover:bg-[rgba(6,3,43,0.82)] transition-colors">
            Procedi alla validazione →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step: VALIDATION ──────────────────────────────────────────────────────────

function StepValidation({
  report,
  onBack,
  onProceed,
}: {
  report: RosterValidationReport;
  onBack: () => void;
  onProceed: () => void;
}) {
  const canProceed = report.blockingErrors.length === 0 && report.validRowCount > 0;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 text-center text-[10px]">
        <div className="rounded border border-[rgba(47,125,85,0.28)] bg-[rgba(47,125,85,0.06)] p-2.5">
          <p className="text-[rgba(6,3,43,0.40)]">Righe valide</p>
          <p className="text-xl font-bold text-[#2F7D55] mt-0.5">{report.validRowCount}</p>
        </div>
        <div className={`rounded border p-2.5 ${report.blockedRowCount > 0 ? 'border-[rgba(158,59,47,0.25)] bg-[rgba(158,59,47,0.06)]' : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)]'}`}>
          <p className="text-[rgba(6,3,43,0.40)]">Righe escluse</p>
          <p className={`text-xl font-bold mt-0.5 ${report.blockedRowCount > 0 ? 'text-[#9E3B2F]' : 'text-[rgba(6,3,43,0.40)]'}`}>{report.blockedRowCount}</p>
        </div>
        <div className={`rounded border p-2.5 ${report.warnedRowCount > 0 ? 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.07)]' : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)]'}`}>
          <p className="text-[rgba(6,3,43,0.40)]">Con avvisi</p>
          <p className={`text-xl font-bold mt-0.5 ${report.warnedRowCount > 0 ? 'text-[#8A5A00]' : 'text-[rgba(6,3,43,0.40)]'}`}>{report.warnedRowCount}</p>
        </div>
      </div>

      {/* Blocking errors */}
      {report.blockingErrors.length > 0 && (
        <div className="rounded border border-[rgba(158,59,47,0.25)] bg-[rgba(158,59,47,0.06)] p-3 space-y-2">
          <div className="flex items-center gap-2">
            <BlockingBadge />
            <p className="text-xs font-semibold text-[#9E3B2F]">Errori bloccanti — correggi prima di importare</p>
          </div>
          <ul className="space-y-1">
            {report.blockingErrors.slice(0, 8).map((e, i) => (
              <li key={i} className="text-[10px] text-[#9E3B2F]">· {e}</li>
            ))}
            {report.blockingErrors.length > 8 && (
              <li className="text-[10px] text-[rgba(158,59,47,0.65)]">… e altri {report.blockingErrors.length - 8} errori.</li>
            )}
          </ul>
        </div>
      )}

      {/* Privacy segment warnings */}
      {report.segmentWarnings.length > 0 && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-700">Segmenti sotto soglia privacy (N&lt;10)</p>
          <ul className="space-y-1">
            {report.segmentWarnings.map((w, i) => (
              <li key={i} className="text-[10px] text-blue-600">
                · {w.dimension === 'department' ? 'Reparto' : 'Sede'} &quot;{w.value}&quot;: {w.count} lavorator{w.count === 1 ? 'e' : 'i'} — non visibile all&apos;azienda.
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {report.warnings.filter(w => !w.includes('sotto soglia')).length > 0 && (
        <div className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.07)] p-3 space-y-2">
          <p className="text-xs font-semibold text-[#8A5A00]">Avvisi</p>
          <ul className="space-y-1 max-h-28 overflow-y-auto">
            {report.warnings.filter(w => !w.includes('sotto soglia')).slice(0, 10).map((w, i) => (
              <li key={i} className="text-[10px] text-[#8A5A00]">· {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Auto-normalizations */}
      {report.autoNormalizations.length > 0 && (
        <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-3 space-y-2">
          <p className="text-xs font-semibold text-[rgba(6,3,43,0.52)]">Normalizzazioni automatiche</p>
          <ul className="space-y-1 max-h-20 overflow-y-auto">
            {report.autoNormalizations.slice(0, 8).map((n, i) => (
              <li key={i} className="text-[10px] text-[rgba(6,3,43,0.50)]">· {n}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack}
          className="rounded border border-[rgba(6,3,43,0.12)] px-4 py-2 text-xs font-medium text-[rgba(6,3,43,0.58)] hover:bg-[rgba(6,3,43,0.03)] transition-colors">
          ← Indietro
        </button>
        <button
          type="button"
          onClick={onProceed}
          disabled={!canProceed}
          className="flex-1 rounded-md px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#06032B] text-white hover:bg-[rgba(6,3,43,0.82)]"
        >
          {canProceed ? 'Procedi alla verifica privacy →' : 'Correggi gli errori prima di continuare'}
        </button>
      </div>
    </div>
  );
}

// ── Step: PRIVACY ─────────────────────────────────────────────────────────────

function StepPrivacy({
  report,
  privacyChecked,
  onPrivacyChange,
  onBack,
  onAccept,
}: {
  report: RosterValidationReport;
  privacyChecked: boolean;
  onPrivacyChange: (v: boolean) => void;
  onBack: () => void;
  onAccept: () => void;
}) {
  const myKoraCount = report.validRows.filter((r) => r.my_kora_enabled).length;
  const depts = new Set(report.validRows.map((r) => r.department)).size;
  const sites = new Set(report.validRows.map((r) => r.site)).size;
  const suppressed = report.segmentWarnings.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.52)] mb-3">Riepilogo importazione</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-[10px]">
          {[
            ['Lavoratori da importare', String(report.validRowCount)],
            ['My KORA abilitati',        String(myKoraCount)],
            ['Reparti',                  String(depts)],
            ['Sedi',                     String(sites)],
            ['Segmenti sotto soglia',    String(suppressed)],
            ['Account creati',           '0 — roster only'],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-[rgba(6,3,43,0.40)]">{label}</p>
              <p className="font-semibold text-[rgba(6,3,43,0.75)] mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy boundary reminder */}
      <div className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.07)] px-3 py-2.5 text-[10px] text-[rgba(6,3,43,0.72)] leading-relaxed space-y-1">
        <p className="font-semibold">Cosa accade dopo l&apos;importazione:</p>
        <p>· Il roster viene aggiornato con {report.validRowCount} nuovi record in stato <strong>draft</strong>.</p>
        <p>· Nessun account My KORA viene creato. Nessuna email inviata.</p>
        <p>· Il PIB individuale rimane privato al lavoratore — mai visibile all&apos;azienda.</p>
        <p>· L&apos;azienda vede solo aggregati sopra soglia (N≥10).</p>
        {suppressed > 0 && (
          <p>· <strong>{suppressed} segmenti sotto soglia</strong> non saranno visibili all&apos;azienda.</p>
        )}
      </div>

      {/* Privacy confirmation checkbox */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.10)] bg-[rgba(6,3,43,0.02)] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <input
            id="privacy-confirm"
            type="checkbox"
            checked={privacyChecked}
            onChange={(e) => onPrivacyChange(e.target.checked)}
            className="mt-0.5 rounded border-[rgba(6,3,43,0.20)] flex-shrink-0"
          />
          <label htmlFor="privacy-confirm" className="text-[11px] text-[rgba(6,3,43,0.78)] leading-relaxed cursor-pointer">
            Confermo che il file non contiene dati sensibili, dati sanitari, performance individuali,
            consensi o attività personali. Il roster contiene solo dati di identificazione della forza lavoro.
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack}
          className="rounded border border-[rgba(6,3,43,0.12)] px-4 py-2 text-xs font-medium text-[rgba(6,3,43,0.58)] hover:bg-[rgba(6,3,43,0.03)] transition-colors">
          ← Indietro
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={!privacyChecked}
          className="flex-1 rounded-md px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-35 disabled:cursor-not-allowed bg-[#06032B] text-white hover:bg-[rgba(6,3,43,0.82)]"
        >
          Accetta importazione — {report.validRowCount} lavoratori
        </button>
      </div>

      <p className="text-[9px] font-mono text-[rgba(6,3,43,0.28)]">
        worker_account_status: draft · no_email · no_auth · employer_can_view_individual_pib: false
      </p>
    </div>
  );
}

// ── Step: DONE ────────────────────────────────────────────────────────────────

function StepDone({
  importedCount,
  skippedCount,
  report,
  onClose,
}: {
  importedCount: number;
  skippedCount: number;
  report: RosterValidationReport;
  onClose: () => void;
}) {
  const myKoraCount = report.validRows.filter((r) => r.my_kora_enabled).length;
  const depts = new Set(report.validRows.map((r) => r.department)).size;
  const sites = new Set(report.validRows.map((r) => r.site)).size;

  return (
    <div className="space-y-4 text-center">
      <div className="rounded-lg border border-[rgba(47,125,85,0.28)] bg-[rgba(47,125,85,0.07)] p-5">
        <p className="text-2xl font-bold text-[#2F7D55]">{importedCount}</p>
        <p className="text-sm font-semibold text-[#2F7D55] mt-1">lavoratori importati nel roster</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-left text-[10px]">
        {[
          ['My KORA abilitati',   String(myKoraCount)],
          ['Reparti',             String(depts)],
          ['Sedi',                String(sites)],
          ['Duplicati esclusi',   String(skippedCount)],
          ['Account creati',      '0 — roster only'],
          ['Email inviate',       '0'],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded border border-[rgba(6,3,43,0.07)] bg-[rgba(6,3,43,0.02)] px-3 py-2">
            <p className="text-[rgba(6,3,43,0.40)]">{label}</p>
            <p className="font-semibold text-[rgba(6,3,43,0.72)] mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded border border-[rgba(199,111,61,0.20)] bg-[rgba(199,111,61,0.06)] px-3 py-2.5 text-[10px] text-[rgba(6,3,43,0.70)] text-left leading-relaxed">
        <p className="font-semibold mb-1">Cosa fare adesso</p>
        <p>· Verifica il Worker Space — lo stato viene aggiornato automaticamente.</p>
        <p>· Per attivare account My KORA reali, completa il Gate 3 (auth provider + consenso).</p>
        <p>· I lavoratori con My KORA abilitata potranno accedere allo spazio personale in modalità Preview.</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-md bg-[#06032B] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[rgba(6,3,43,0.82)] transition-colors"
      >
        Chiudi e torna al Workforce Command Center
      </button>

      <p className="text-[9px] font-mono text-[rgba(6,3,43,0.28)]">
        synthetic_demo_data: true · no_db_changes · no_auth_changes · B91-B
      </p>
    </div>
  );
}

// ── Root modal ────────────────────────────────────────────────────────────────

export function RosterImportModal({ companyId, tenantId, existingWorkerIds, onImport, onClose }: Props) {
  const [step, setStep]               = useState<ImportStep>('UPLOAD');
  const [parsing, setParsing]         = useState(false);
  const [parseError, setParseError]   = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<RosterParseResult | null>(null);
  const [report, setReport]           = useState<RosterValidationReport | null>(null);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [importedCount, setImportedCount]   = useState(0);
  const [skippedCount,  setSkippedCount]    = useState(0);

  const handleFileSelected = useCallback(async (file: File) => {
    setParsing(true);
    setParseError(null);
    try {
      const result = await parseRosterFile(file);
      setParseResult(result);
      setStep('PREVIEW');
    } catch (e) {
      setParseError(String(e));
    } finally {
      setParsing(false);
    }
  }, []);

  const handleProceedToValidation = useCallback(() => {
    if (!parseResult) return;
    const r = validateRoster(parseResult, new Set<string>());
    setReport(r);
    setStep('VALIDATION');
  }, [parseResult]);

  const handleProceedToPrivacy = useCallback(() => {
    setPrivacyChecked(false);
    setStep('PRIVACY');
  }, []);

  const handleAcceptImport = useCallback(() => {
    if (!report || !privacyChecked) return;

    // Generate records from validated rows
    const allRecords = buildRosterRecordsFromValidatedRows(companyId, tenantId, report.validRows);

    // Dedup against existing session workers by worker_id
    const newRecords = allRecords.filter((r) => !existingWorkerIds.has(r.worker_id));
    const skipped    = allRecords.length - newRecords.length;

    setImportedCount(newRecords.length);
    setSkippedCount(skipped);
    onImport(newRecords);
    setStep('DONE');
  }, [report, privacyChecked, companyId, tenantId, existingWorkerIds, onImport]);

  const title = {
    UPLOAD:     'Import Workforce',
    PREVIEW:    'Anteprima file',
    VALIDATION: 'Report di validazione',
    PRIVACY:    'Verifica privacy',
    DONE:       'Importazione completata',
  }[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(6,3,43,0.52)]"
        onClick={step !== 'DONE' ? onClose : undefined}
        role="presentation"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-2xl rounded-xl border border-[rgba(6,3,43,0.12)] bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-[rgba(6,3,43,0.06)] flex-shrink-0">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.38)]">
              KORA Admin · Import Workforce
            </p>
            <h2 className="text-base font-bold text-[#06032B]">{title}</h2>
            <StepBar current={step} />
          </div>
          {step !== 'DONE' && (
            <button
              type="button"
              onClick={onClose}
              className="text-[rgba(6,3,43,0.28)] hover:text-[rgba(6,3,43,0.58)] text-xl leading-none mt-0.5 flex-shrink-0"
              aria-label="Chiudi"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {step === 'UPLOAD' && (
            <StepUpload
              onFileSelected={handleFileSelected}
              parsing={parsing}
              error={parseError}
            />
          )}
          {step === 'PREVIEW' && parseResult && (
            <StepPreview
              parseResult={parseResult}
              onBack={() => setStep('UPLOAD')}
              onProceed={handleProceedToValidation}
            />
          )}
          {step === 'VALIDATION' && report && (
            <StepValidation
              report={report}
              onBack={() => setStep('PREVIEW')}
              onProceed={handleProceedToPrivacy}
            />
          )}
          {step === 'PRIVACY' && report && (
            <StepPrivacy
              report={report}
              privacyChecked={privacyChecked}
              onPrivacyChange={setPrivacyChecked}
              onBack={() => setStep('VALIDATION')}
              onAccept={handleAcceptImport}
            />
          )}
          {step === 'DONE' && report && (
            <StepDone
              importedCount={importedCount}
              skippedCount={skippedCount}
              report={report}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
