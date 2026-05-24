'use client';

import { useState } from 'react';
import Link from 'next/link';
import { companySetupService } from '@/services/company-setup/CompanySetupService';
import type { CompanySetupInput, CompanySetupDraft } from '@/lib/types';

const EMPTY_INPUT: CompanySetupInput = {
  company_name: '',
  legal_name: '',
  sector: '',
  size_band: 'mid_50_249',
  headcount: 0,
  headquarters_city: '',
  multi_site: false,
  site_count: undefined,
  primary_contact_name: '',
  primary_contact_role: '',
  reporting_year: '2025',
  preferred_template_id: undefined,
  notes: '',
};

const SECTOR_OPTIONS = companySetupService.getSectorOptions();
const YEAR_OPTIONS = companySetupService.getReportingYearOptions();
const TEMPLATES = companySetupService.listTemplates();

const SIZE_BAND_LABELS: Record<string, string> = {
  small_30_49:          '30–49 lavoratori',
  mid_50_249:           '50–249 lavoratori',
  large_250_999:        '250–999 lavoratori',
  enterprise_1000_plus: '1000+ lavoratori',
};

// A-16: KORA Admin — Company Setup
export default function AdminCompanySetupPage() {
  const [input, setInput] = useState<CompanySetupInput>(EMPTY_INPUT);
  const [draft, setDraft] = useState<CompanySetupDraft | null>(null);
  const [showDraft, setShowDraft] = useState(false);

  function handleChange(field: keyof CompanySetupInput, value: string | number | boolean | undefined) {
    setInput((prev) => ({ ...prev, [field]: value }));
    setDraft(null);
    setShowDraft(false);
  }

  function handleGenerate() {
    const d = companySetupService.createDraft(input);
    setDraft(d);
    setShowDraft(true);
  }

  const liveValidation = input.company_name || input.headcount
    ? companySetupService.validate(input)
    : null;

  const suggestedTemplate = companySetupService.suggestTemplate(input);

  return (
    <div className="space-y-8 max-w-3xl">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          KORA Admin — Gestione Azienda Cliente
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Company Setup</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configura una nuova azienda cliente nel sistema KORA.
        </p>
      </div>

      {/* ── Admin identity note ── */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800 leading-relaxed space-y-1">
        <p>
          <span className="font-semibold">KORA Admin — gestione azienda cliente.</span>{' '}
          Questa sezione è riservata agli operatori KORA.
        </p>
        <p>
          Il portale azienda mostra solo output e stato; il setup operativo resta lato KORA Admin.
        </p>
      </div>

      {/* ── Session disclaimer ── */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
        <span className="font-semibold">Demo di sessione.</span>{' '}
        Questa è una bozza demo di sessione. La persistenza database sarà collegata nella versione production.
        Nessun dato viene salvato permanentemente.
      </div>

      {/* ── Section A: Identità aziendale ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">A — Identità Azienda Cliente</h2>
          <p className="text-xs text-slate-400 mt-0.5">Nome commerciale, ragione sociale e informazioni di base.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              Nome commerciale <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={input.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              placeholder="es. Meridiana Group"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              Ragione sociale <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={input.legal_name}
              onChange={(e) => handleChange('legal_name', e.target.value)}
              placeholder="es. Meridiana Group S.r.l."
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              Settore <span className="text-rose-500">*</span>
            </label>
            <select
              value={input.sector}
              onChange={(e) => handleChange('sector', e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">Seleziona settore</option>
              {SECTOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              Sede principale <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={input.headquarters_city}
              onChange={(e) => handleChange('headquarters_city', e.target.value)}
              placeholder="es. Milano"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>
      </section>

      {/* ── Section B: Workforce ── */}
      <section className="space-y-4 border-t border-slate-100 pt-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">B — Workforce Azienda Cliente</h2>
          <p className="text-xs text-slate-400 mt-0.5">Foundation Light richiede almeno 30 lavoratori.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              N. dipendenti <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={input.headcount || ''}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                handleChange('headcount', isNaN(n) ? 0 : n);
              }}
              placeholder="es. 120"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            {input.headcount > 0 && input.headcount < 30 && (
              <p className="text-[10px] text-rose-600 font-medium">
                Foundation Light richiede almeno 30 lavoratori.
              </p>
            )}
            {input.headcount >= 30 && (
              <p className="text-[10px] text-emerald-600 font-medium">Soglia minima soddisfatta.</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Multi-sede</label>
            <select
              value={input.multi_site ? 'yes' : 'no'}
              onChange={(e) => handleChange('multi_site', e.target.value === 'yes')}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="no">No — sede unica</option>
              <option value="yes">Sì — più sedi</option>
            </select>
          </div>
          {input.multi_site && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">N. sedi</label>
              <input
                type="number"
                min={2}
                value={input.site_count ?? ''}
                onChange={(e) => handleChange('site_count', parseInt(e.target.value, 10) || undefined)}
                placeholder="es. 3"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          )}
        </div>
        <div className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] text-blue-700 leading-relaxed">
          KORA misura l&apos;organizzazione, non gli individui. Cluster &lt; 10 lavoratori soppressi per privacy.
        </div>
      </section>

      {/* ── Section C: Template ── */}
      <section className="space-y-4 border-t border-slate-100 pt-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">C — Template di Configurazione</h2>
        </div>
        {suggestedTemplate && !input.preferred_template_id && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
            <span className="font-semibold">Template suggerito:</span>{' '}
            {suggestedTemplate.label} — {suggestedTemplate.description}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((tmpl) => {
            const isSelected = input.preferred_template_id === tmpl.template_id;
            const isSuggested = suggestedTemplate?.template_id === tmpl.template_id && !input.preferred_template_id;
            return (
              <button
                key={tmpl.template_id}
                type="button"
                onClick={() => handleChange('preferred_template_id', isSelected ? undefined : tmpl.template_id)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-slate-700 bg-slate-900'
                    : isSuggested
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                    {tmpl.label}
                  </p>
                  {isSelected && (
                    <span className="rounded border border-slate-600 bg-slate-700 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-300 shrink-0">
                      SELEZIONATO
                    </span>
                  )}
                </div>
                <p className={`text-[10px] mt-1 leading-snug ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {tmpl.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {tmpl.suggested_pillars.map((p) => (
                    <span key={p} className={`rounded px-1 py-0.5 text-[8px] font-mono font-semibold ${isSelected ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                      {p}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Section D: Referente & Anno ── */}
      <section className="space-y-4 border-t border-slate-100 pt-6">
        <h2 className="text-sm font-semibold text-slate-800">D — Referente & Anno di Riferimento</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              Referente aziendale <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={input.primary_contact_name}
              onChange={(e) => handleChange('primary_contact_name', e.target.value)}
              placeholder="es. Marco Rossi"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Ruolo</label>
            <input
              type="text"
              value={input.primary_contact_role}
              onChange={(e) => handleChange('primary_contact_role', e.target.value)}
              placeholder="es. HR Manager"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              Anno di riferimento <span className="text-rose-500">*</span>
            </label>
            <select
              value={input.reporting_year}
              onChange={(e) => handleChange('reporting_year', e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              {YEAR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ── Section E: Note ── */}
      <section className="space-y-2 border-t border-slate-100 pt-6">
        <h2 className="text-sm font-semibold text-slate-800">E — Note Operative</h2>
        <textarea
          value={input.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Note operative per l'onboarding, specificità del cliente, contesto programma welfare..."
          rows={3}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
        />
      </section>

      {/* ── Validation ── */}
      {liveValidation && (liveValidation.errors.length > 0 || liveValidation.warnings.length > 0) && (
        <section className="space-y-2 border-t border-slate-100 pt-4">
          {liveValidation.errors.map((e) => (
            <div key={e.field} className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2">
              <span className="text-rose-500 text-xs font-bold shrink-0">✕</span>
              <p className="text-xs text-rose-700">{e.message}</p>
            </div>
          ))}
          {liveValidation.warnings.map((w) => (
            <div key={w.field} className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="text-amber-500 text-xs font-bold shrink-0">!</span>
              <p className="text-xs text-amber-700">{w.message}</p>
            </div>
          ))}
        </section>
      )}

      {/* ── Generate CTA ── */}
      <section className="border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!!(liveValidation && !liveValidation.is_valid)}
          className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Genera Bozza Azienda Cliente
        </button>
      </section>

      {/* ── Draft Preview ── */}
      {showDraft && draft && (
        <section className="space-y-4 border-t border-slate-100 pt-6">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Bozza Generata</h2>
            <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
              draft.status === 'pipeline_ready'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : draft.status === 'blocked_below_threshold'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}>
              {draft.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <p className="text-sm font-bold text-slate-900">{draft.input.company_name}</p>
              <p className="text-xs text-slate-500">{draft.input.legal_name}</p>
              <p className="text-[10px] font-mono text-slate-300 mt-0.5">{draft.draft_id}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-[10px]">
              <div><p className="text-slate-400">Settore</p><p className="text-slate-700 capitalize">{draft.input.sector.replace(/_/g, ' ')}</p></div>
              <div><p className="text-slate-400">Dipendenti</p><p className="text-slate-700">{draft.input.headcount}</p></div>
              <div><p className="text-slate-400">Dimensione</p><p className="text-slate-700">{SIZE_BAND_LABELS[draft.workforce_preview.size_band] ?? draft.workforce_preview.size_band}</p></div>
              <div><p className="text-slate-400">Anno</p><p className="text-slate-700">{draft.input.reporting_year}</p></div>
            </div>
          </div>

          {/* Pipeline handoff */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Prossimi step operativi KORA Admin</p>
            <div className="space-y-2">
              {draft.pipeline_handoff.map((link, i) => (
                <div key={link.stage} className={`flex items-center gap-3 rounded p-2 ${link.available ? 'bg-slate-50' : 'opacity-50 bg-slate-50'}`}>
                  <span className="text-[10px] font-mono text-slate-300 w-4 shrink-0">{i + 1}</span>
                  {link.available ? (
                    <a href={link.href} className="text-xs font-semibold text-indigo-600 hover:underline">{link.label}</a>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">{link.label}</span>
                  )}
                  <span className="ml-auto text-[10px] text-slate-400 text-right">{link.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-mono text-slate-400">
            demo_session_only: true · production_ready: false · synthetic_demo_data: true
          </div>
        </section>
      )}

      {/* ── Navigation ── */}
      <section className="border-t border-slate-100 pt-4 flex items-center gap-4">
        <Link href="/admin/companies" className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
          ← Company Registry
        </Link>
        <Link href="/admin/companies/onboarding" className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
          Onboarding Studio →
        </Link>
      </section>

    </div>
  );
}
