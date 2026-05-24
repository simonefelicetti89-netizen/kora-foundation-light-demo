import type {
  KoraTenant,
  KoraTenantStatus,
  TenantReadiness,
  ReadinessItemStatus,
} from '@/lib/types';
import tenantsData from '@/data/synthetic/tenants.json';

const records = (tenantsData as { data: KoraTenant[] }).data;

const READINESS_LABELS: Record<string, ReadinessItemStatus> = {
  decision_pack_ready: 'ready_for_company_portal',
  pipeline_active:     'ready_for_pipeline',
  readiness_check_passed: 'ready_for_pipeline',
  hr_kpi_added:        'data_required',
  program_data_loaded: 'data_required',
  workforce_baseline_complete: 'data_required',
  profile_complete:    'data_required',
  not_started:         'draft',
  blocked_insufficient_workforce: 'blocked',
};

class TenantService {
  getTenants(): KoraTenant[] {
    return records;
  }

  getTenant(companyId: string): KoraTenant | null {
    return records.find((t) => t.company_id === companyId) ?? null;
  }

  getTenantByTenantId(tenantId: string): KoraTenant | null {
    return records.find((t) => t.tenant_id === tenantId) ?? null;
  }

  getActiveTenants(): KoraTenant[] {
    return records.filter((t) => t.tenant_status === 'active');
  }

  getDraftTenants(): KoraTenant[] {
    return records.filter((t) => t.tenant_status === 'draft');
  }

  createTenantDraft(input: Partial<KoraTenant>): KoraTenant {
    return {
      tenant_id: `tenant-${Date.now()}`,
      company_id: input.company_id ?? `company-${Date.now()}`,
      company_name: input.company_name ?? '',
      legal_name: input.legal_name ?? '',
      sector: input.sector ?? '',
      territory: input.territory ?? '',
      headquarters_location: input.headquarters_location ?? '',
      employee_count: input.employee_count ?? 0,
      size_band: input.size_band ?? 'mid_50_249',
      kora_plan: input.kora_plan ?? 'Foundation Light',
      analysis_period: input.analysis_period ?? new Date().getFullYear().toString(),
      tenant_status: 'draft',
      onboarding_status: 'not_started',
      data_readiness_status: 'not_started',
      decision_pack_status: 'not_started',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      production_ready: false,
      synthetic_demo_data: true,
      ...input,
    };
  }

  getTenantReadiness(companyId: string): TenantReadiness {
    const tenant = this.getTenant(companyId);
    if (!tenant) {
      const blocked = 'blocked';
      return {
        company_identity: blocked,
        operating_scope: blocked,
        budget_fiscal_perimeter: blocked,
        data_sources: blocked,
        structural_policies: blocked,
        first_company_admin: blocked,
        worker_roster: blocked,
        privacy_boundary: blocked,
        portal_activation: blocked,
        pipeline_readiness: blocked,
      };
    }

    const onb = tenant.onboarding_status;
    const baseStatus = READINESS_LABELS[onb] ?? 'draft';

    const isActive = tenant.tenant_status === 'active';
    const dataHighOrMed = ['high', 'medium'].includes(tenant.data_readiness_status);

    return {
      company_identity: isActive ? 'ready_for_pipeline' : 'draft',
      operating_scope: isActive ? 'ready_for_pipeline' : 'draft',
      budget_fiscal_perimeter: dataHighOrMed ? 'ready_for_pipeline' : 'data_required',
      data_sources: dataHighOrMed ? 'ready_for_pipeline' : 'data_required',
      structural_policies: isActive ? 'ready_for_pipeline' : 'draft',
      first_company_admin: isActive ? 'ready_for_company_portal' : 'access_required',
      worker_roster: isActive ? 'data_required' : 'draft',
      privacy_boundary: isActive ? 'ready_for_pipeline' : 'privacy_review_required',
      portal_activation: isActive ? 'ready_for_company_portal' : 'draft',
      pipeline_readiness: baseStatus,
    };
  }

  getTenantVisibleCompanyProfile(companyId: string): KoraTenant | null {
    const tenant = this.getTenant(companyId);
    if (!tenant) return null;
    return {
      ...tenant,
      vat_number: undefined,
      fiscal_code: undefined,
    };
  }

  activateTenant(companyId: string): { success: boolean; note: string } {
    return { success: true, note: `Demo: tenant ${companyId} attivato (simulato — nessuna persistenza reale).` };
  }

  suspendTenant(companyId: string): { success: boolean; note: string } {
    return { success: true, note: `Demo: tenant ${companyId} sospeso (simulato).` };
  }

  archiveTenant(companyId: string): { success: boolean; note: string } {
    return { success: true, note: `Demo: tenant ${companyId} archiviato (simulato).` };
  }

  restoreTenant(companyId: string): { success: boolean; note: string } {
    return { success: true, note: `Demo: tenant ${companyId} ripristinato (simulato).` };
  }

  deleteDemoTenant(companyId: string): { success: boolean; note: string } {
    const tenant = this.getTenant(companyId);
    if (!tenant) return { success: false, note: 'Tenant non trovato.' };
    if (tenant.tenant_status !== 'draft') {
      return { success: false, note: 'Solo le bozze demo possono essere eliminate. Usa Archivio per tenant attivi.' };
    }
    return { success: true, note: `Demo: bozza ${companyId} eliminata (simulato — nessuna persistenza reale).` };
  }

  getNextAction(tenant: KoraTenant): string {
    if (tenant.tenant_status === 'draft') return 'Completa il wizard Enterprise Onboarding e attiva il tenant.';
    if (tenant.tenant_status === 'suspended') return 'Riattiva il tenant per sbloccare il portale aziendale.';
    if (tenant.tenant_status === 'archived') return 'Il tenant è archiviato. Ripristinalo se necessario.';
    switch (tenant.onboarding_status) {
      case 'not_started': return 'Completa il profilo aziendale e carica la baseline workforce.';
      case 'profile_complete': return 'Carica la baseline workforce.';
      case 'workforce_baseline_complete': return 'Carica i dati programmi welfare via AI Ingestion.';
      case 'program_data_loaded': return 'Avvia la pipeline: UEF Review → Scoring Run.';
      case 'pipeline_active': return 'Attendi il completamento della pipeline.';
      case 'decision_pack_ready': return 'Il Decision Pack è pronto. Condividi con il cliente.';
      default: return 'Procedi con l\'onboarding.';
    }
  }

  getTenantStatusBadge(status: KoraTenantStatus): { label: string; classes: string } {
    const map: Record<KoraTenantStatus, { label: string; classes: string }> = {
      draft:        { label: 'Bozza',     classes: 'border-slate-200 bg-slate-50 text-slate-500' },
      active:       { label: 'Attivo',    classes: 'border-green-200 bg-green-50 text-green-700' },
      suspended:    { label: 'Sospeso',   classes: 'border-amber-200 bg-amber-50 text-amber-700' },
      archived:     { label: 'Archiviato',classes: 'border-slate-300 bg-slate-100 text-slate-500' },
      deleted_demo: { label: 'Eliminato', classes: 'border-rose-200 bg-rose-50 text-rose-500' },
    };
    return map[status] ?? { label: status, classes: 'border-slate-200 bg-slate-50 text-slate-500' };
  }
}

export const tenantService = new TenantService();
