'use client';

import Link from 'next/link';
import { tenantService } from '@/services/tenant/TenantService';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';

// Routing landing — data intake is per-company; select a company to proceed.
export default function AdminDataIntakeLanding() {
  const tenants = tenantService.getTenants();

  return (
    <div className="space-y-6 max-w-3xl">

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          KORA Operator Console — Data Intake
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">KORA Operator Data Intake Studio</h1>
        <p className="text-sm text-slate-500 mt-1">
          Seleziona un&apos;azienda per caricare i file ricevuti, verificarne qualità e privacy, eseguire la preview metodologica e preparare il Decision Pack.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <span className="font-semibold">Strumento operativo KORA — non area self-service cliente.</span>{' '}
        L&apos;azienda invia i file a KORA; KORA Operator li carica, normalizza, classifica e produce il Decision Pack.
      </div>

      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
        {tenants.map((tenant) => {
          const summary = companyDataIntakeService.getDataReadinessSummary(tenant.company_id);
          return (
            <div key={tenant.company_id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
              <div>
                <p className="text-sm font-semibold text-slate-800">{tenant.company_name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] font-mono text-slate-400">{tenant.company_id}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    summary.intake_status === 'ready_for_ingestion'             ? 'bg-green-100 text-green-700' :
                    summary.intake_status === 'validation_required'             ? 'bg-amber-100 text-amber-700' :
                    summary.intake_status === 'blocked_missing_required_fields' ? 'bg-rose-100 text-rose-700' :
                    summary.intake_status === 'partial'                         ? 'bg-blue-100 text-blue-700' :
                    summary.intake_status === 'draft'                           ? 'bg-indigo-100 text-indigo-600' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {summary.intake_status.replace(/_/g, ' ')}
                  </span>
                  {summary.total_rows > 0 && (
                    <span className="text-[10px] text-slate-500">
                      {summary.total_rows} righe · {summary.ready_for_ingestion_rows} pronte
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/admin/companies/${tenant.company_id}/data-intake`}
                className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors whitespace-nowrap"
              >
                Apri →
              </Link>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <Link href="/admin/companies" className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
          ← Company Registry
        </Link>
      </div>

      <p className="text-[10px] font-mono text-slate-300">
        KORA Admin · Data Intake · synthetic_demo_data: true
      </p>
    </div>
  );
}
