// lib/decision-pack/pdf-data.ts
// Server-side data contract for Decision Pack PDF.
// Reads persisted OP-001 data from Supabase — NO scoring recalculation.
// Uses service_role server-side only (never exposed to client).

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export interface PdfData {
  meta: {
    tenantCode: string;
    companyName: string;
    companyLogoBase64?: string;
    reportingPeriod: string;
    generatedAt: string;
    decisionPackVersionId: string;
    decisionPackId: string;
    decisionPackStatus: string;
    syntheticData: true;
    notCertification: true;
  };
  koraIndex: {
    value: number;
    safeguardStatus: string;
    confidenceScore: number;           // 0–1
    activationRate: number;            // 0–1
    meaningfulActivationRate: number;  // 0–1
    calibrationStatus: string;
    methodologyVersionId: string;
    isCurrent: boolean;
    createdAt: string;
    componentCount: number;
  };
  auditSummary: Array<{
    action: string;
    resourceType: string | null;
    createdAt: string;
  }>;
}

export async function fetchPdfData(
  tenantCode: string,
  reportingPeriod: string,
): Promise<PdfData | null> {
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: tenant } = await db.schema('analytics').from('tenant')
    .select('id,company_name').eq('tenant_code', tenantCode).maybeSingle();
  if (!tenant) return null;

  const { data: ki } = await db.schema('analytics').from('kora_index_result')
    .select('*, confidence_result:confidence_result_id(*), activation_result:activation_result_id(*)')
    .eq('tenant_id', (tenant as { id: string }).id)
    .eq('reporting_period', reportingPeriod)
    .eq('is_current', true)
    .maybeSingle();
  if (!ki) return null;

  const { data: dp } = await db.schema('analytics').from('decision_pack_version')
    .select('id,version_id,status')
    .eq('tenant_id', (tenant as { id: string }).id)
    .eq('reporting_period', reportingPeriod)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: auditEvents } = await db.schema('audit').from('audit_log')
    .select('action,resource_type,created_at')
    .eq('tenant_id', (tenant as { id: string }).id)
    .order('created_at', { ascending: false })
    .limit(10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actRow = (ki as any).activation_result as {
    activation_rate?: number;
    meaningful_activation_rate?: number;
  } | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confRow = (ki as any).confidence_result as {
    confidence_score?: number;
  } | null;

  // Normalize confidence: DB may store 0–1 or 0–100 depending on pipeline version.
  const rawConf = confRow?.confidence_score ?? 0;
  const confidence01 = rawConf > 1 ? rawConf / 100 : rawConf;

  return {
    meta: {
      tenantCode,
      companyName: (tenant as { id: string; company_name?: string | null }).company_name
        ?? `${tenantCode} Synthetic Organization`,
      reportingPeriod,
      generatedAt: new Date().toISOString(),
      decisionPackVersionId: (dp as { version_id?: string } | null)?.version_id ?? 'N/A',
      decisionPackId: (dp as { id?: string } | null)?.id ?? 'N/A',
      decisionPackStatus: (dp as { status?: string } | null)?.status ?? 'draft',
      syntheticData: true,
      notCertification: true,
    },
    koraIndex: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: (ki as any).kora_index_value ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      safeguardStatus: (ki as any).safeguard_status ?? 'UNKNOWN',
      confidenceScore: confidence01,
      activationRate: actRow?.activation_rate ?? 0,
      meaningfulActivationRate: actRow?.meaningful_activation_rate ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      calibrationStatus: (ki as any).calibration_status ?? 'pre_empirical_calibration',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      methodologyVersionId: (ki as any).methodology_version_id ?? 'KORA Index v3',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      isCurrent: (ki as any).is_current ?? true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt: (ki as any).created_at ?? '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      componentCount: ((ki as any).components ?? []).length,
    },
    auditSummary: (auditEvents ?? []).map(e => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      action: (e as any).action as string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resourceType: (e as any).resource_type as string | null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt: (e as any).created_at as string,
    })),
  };
}
