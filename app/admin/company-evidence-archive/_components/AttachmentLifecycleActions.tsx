'use client';

// app/admin/company-evidence-archive/_components/AttachmentLifecycleActions.tsx
// B35.1: Attachment lifecycle action buttons — archive, restore, remove, remove_storage.
//
// Shows available actions based on current lifecycleStatus + storageStatus.
// Destructive actions (archive, remove, remove_storage) require typed confirmation.
// Restore is non-destructive: simple button confirmation.
// Optional reason (max 200 chars, PII-scanned server-side).
//
// Never renders: storagePath, signedUrl, raw content, worker data.

import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AttachmentLifecycleActionsProps {
  tenantCode: string;
  batchId: string;
  attachmentId: string;
  fileNameSafe: string;
  lifecycleStatus: string;
  storageStatus: string;
  onActionCompleted: () => void;
}

type LifecycleAction = 'archive' | 'restore' | 'remove_metadata' | 'remove_storage';

type ActionConfig = {
  action:            LifecycleAction;
  label:             string;
  confirmToken:      string | null;  // null = no typed confirmation (restore)
  destructive:       boolean;
  warning?:          string;
  confirmButtonCls:  string;
};

// ── Action definitions ────────────────────────────────────────────────────────

const ACTION_CONFIGS: Record<LifecycleAction, ActionConfig> = {
  archive: {
    action:           'archive',
    label:            'Archivia',
    confirmToken:     'ARCHIVE_ATTACHMENT',
    destructive:      false,
    confirmButtonCls: 'bg-amber-600 text-white hover:bg-amber-700',
  },
  restore: {
    action:           'restore',
    label:            'Ripristina',
    confirmToken:     null,
    destructive:      false,
    confirmButtonCls: 'bg-green-600 text-white hover:bg-green-700',
  },
  remove_metadata: {
    action:           'remove_metadata',
    label:            'Rimuovi da archivio attivo',
    confirmToken:     'REMOVE_ATTACHMENT',
    destructive:      true,
    warning:          'I metadati sono conservati per audit. Il file storage (se presente) non viene eliminato.',
    confirmButtonCls: 'bg-red-600 text-white hover:bg-red-700',
  },
  remove_storage: {
    action:           'remove_storage',
    label:            'Elimina file storage',
    confirmToken:     'REMOVE_STORAGE',
    destructive:      true,
    warning:          'Questa azione elimina fisicamente il file dal bucket privato. Impossibile recuperarlo. I metadati sono conservati per audit.',
    confirmButtonCls: 'bg-red-700 text-white hover:bg-red-800',
  },
};

// ── Which actions are available for a given status? ───────────────────────────

function getAvailableActions(lifecycleStatus: string, storageStatus: string): LifecycleAction[] {
  const hasStorage = storageStatus === 'stored_private';
  switch (lifecycleStatus) {
    case 'active':
      return hasStorage
        ? ['archive', 'remove_metadata', 'remove_storage']
        : ['archive', 'remove_metadata'];
    case 'archived':
      return hasStorage
        ? ['restore', 'remove_metadata', 'remove_storage']
        : ['restore', 'remove_metadata'];
    case 'removed':
      return hasStorage ? ['remove_storage'] : [];
    case 'storage_removed':
      return []; // terminal — no further actions
    case 'metadata_only':
      return []; // no binary, no archive/remove meaningful
    default:
      return [];
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AttachmentLifecycleActions({
  tenantCode, batchId, attachmentId, fileNameSafe,
  lifecycleStatus, storageStatus, onActionCompleted,
}: AttachmentLifecycleActionsProps) {

  const available = getAvailableActions(lifecycleStatus, storageStatus);
  const [confirmingAction, setConfirmingAction] = useState<LifecycleAction | null>(null);
  const [typedConfirm, setTypedConfirm]         = useState('');
  const [reason, setReason]                     = useState('');
  const [loading, setLoading]                   = useState(false);
  const [result, setResult]                     = useState<{ ok: boolean; message: string } | null>(null);

  function startAction(action: LifecycleAction) {
    setConfirmingAction(action);
    setTypedConfirm('');
    setReason('');
    setResult(null);
  }

  function cancelAction() {
    setConfirmingAction(null);
    setTypedConfirm('');
    setReason('');
    setResult(null);
  }

  async function executeAction() {
    if (!confirmingAction) return;
    const cfg = ACTION_CONFIGS[confirmingAction];

    // For typed actions, check confirmation before calling API
    if (cfg.confirmToken && typedConfirm !== cfg.confirmToken) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/evidence-attachments/lifecycle', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantCode, batchId, attachmentId,
          action:  confirmingAction,
          reason:  reason.trim() || undefined,
          // NEVER include: storagePath, signedUrl, raw content
        }),
      });
      const data = await res.json() as { ok: boolean; note?: string; error?: string; newLifecycle?: string };

      if (!res.ok || !data.ok) {
        setResult({ ok: false, message: data.error ?? `HTTP ${res.status}` });
      } else {
        setResult({ ok: true, message: data.note ?? `Azione "${confirmingAction}" completata.` });
        setConfirmingAction(null);
        setTypedConfirm('');
        setReason('');
        // Notify parent to refetch
        onActionCompleted();
      }
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  if (available.length === 0) return null;

  const cfg = confirmingAction ? ACTION_CONFIGS[confirmingAction] : null;
  const typedOk = !cfg?.confirmToken || typedConfirm === cfg.confirmToken;

  return (
    <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">

      {/* Result feedback (outside confirmation panel) */}
      {result && (
        <div className={`rounded border px-2.5 py-1.5 text-[9px] ${
          result.ok
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {result.ok ? '✓' : '⚠'} {result.message}
        </div>
      )}

      {/* Action buttons row (shown when not confirming) */}
      {!confirmingAction && (
        <div className="flex flex-wrap gap-1.5">
          {available.map(action => {
            const c = ACTION_CONFIGS[action];
            return (
              <button
                key={action}
                onClick={() => startAction(action)}
                className={`rounded border px-2 py-0.5 text-[9px] font-semibold transition-colors ${
                  c.destructive
                    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                    : action === 'restore'
                    ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Confirmation panel */}
      {confirmingAction && cfg && (
        <div className={`rounded border px-3 py-2.5 space-y-2 ${
          cfg.destructive ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <p className={`text-[10px] font-bold ${cfg.destructive ? 'text-red-700' : 'text-amber-700'}`}>
              {cfg.destructive ? '⚠ ' : ''}{cfg.label}
            </p>
            <button onClick={cancelAction} className="text-slate-400 hover:text-slate-600 text-[9px]">Annulla</button>
          </div>

          {/* Filename for context (safe — already sanitized) */}
          <p className="text-[9px] font-mono text-slate-500 truncate">{fileNameSafe}</p>

          {/* Warning for destructive */}
          {cfg.warning && (
            <p className="text-[9px] text-red-700 leading-snug">{cfg.warning}</p>
          )}

          {/* Optional reason */}
          {cfg.action !== 'restore' && (
            <div>
              <label className="block text-[9px] font-semibold text-slate-500 mb-0.5">
                Motivazione (opzionale, max 200 car.)
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value.slice(0, 200))}
                placeholder="es. Documento duplicato"
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          )}

          {/* Typed confirmation */}
          {cfg.confirmToken && (
            <div>
              <label className="block text-[9px] font-semibold text-slate-500 mb-0.5">
                Digita <code className="bg-white/80 px-1 rounded font-mono">{cfg.confirmToken}</code> per confermare
              </label>
              <input
                type="text"
                value={typedConfirm}
                onChange={e => setTypedConfirm(e.target.value)}
                placeholder={cfg.confirmToken}
                autoFocus
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-400"
              />
            </div>
          )}

          {/* Confirm button */}
          <div className="flex gap-2">
            <button
              onClick={executeAction}
              disabled={!typedOk || loading}
              className={`rounded px-3 py-1 text-[10px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${cfg.confirmButtonCls}`}
            >
              {loading ? '⏳ In corso…' : cfg.label}
            </button>
            <button onClick={cancelAction} className="rounded border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-600 hover:bg-slate-50 transition-colors">
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
