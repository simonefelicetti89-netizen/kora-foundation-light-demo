// app/api/admin/data-intake/preview/route.ts
// Data Intake Preview — KORA_ADMIN only. Read-only. No DB writes. No scoring recalculation.
//
// Returns a comprehensive preview of the OP-001 synthetic batch:
//   batch records (safe fields) · PII Guard status · Eligibility Gate results · UEF preview
//   + result snapshot if OP-001 has already been run (read from DB via fetchPdfData)
//
// Reuses:
//   lib/live/op001-synthetic-records  → deterministic synthetic records (no DB)
//   lib/kora-engine/eligibility-gate  → classifyEligibilityBatch (no duplication)
//   lib/privacy/pii-guard             → detectPiiInPayload / summarizePiiFindings (no duplication)
//   lib/decision-pack/pdf-data        → fetchPdfData for result snapshot (read-only DB)

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getOp001SyntheticRecords, getOp001UploadedPayloads } from '@/lib/live/op001-synthetic-records';
import { classifyEligibilityBatch } from '@/lib/kora-engine/eligibility-gate';
import { detectPiiInPayload, summarizePiiFindings } from '@/lib/privacy/pii-guard';
import { fetchPdfData } from '@/lib/decision-pack/pdf-data';

export async function GET(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const tenantCode      = searchParams.get('tenantCode')      ?? 'OP-001';
  const reportingPeriod = searchParams.get('reportingPeriod') ?? '2026-Q1';

  // ── Batch preview — deterministic, no DB ──────────────────────────────────
  const syntheticRecords = getOp001SyntheticRecords('preview');

  // ── PII Guard — reuses lib/privacy/pii-guard, zero new logic ─────────────
  const uploadedPayloads = getOp001UploadedPayloads(tenantCode);
  const piiResults       = uploadedPayloads.map(p => detectPiiInPayload(p.rawPayload));
  const allFindings      = piiResults.flatMap(r => r.findings);
  const anyPii           = allFindings.length > 0;
  const piiSummary       = anyPii ? summarizePiiFindings(allFindings) : null;

  // ── Eligibility Gate — reuses lib/kora-engine/eligibility-gate ────────────
  const eligibilityResults = classifyEligibilityBatch(syntheticRecords);
  const eligCounts = {
    eligible:       eligibilityResults.filter(e => e.status === 'eligible').length,
    limited:        eligibilityResults.filter(e => e.status === 'limited').length,
    blocked:        eligibilityResults.filter(e => e.status === 'blocked').length,
    reviewRequired: eligibilityResults.filter(e => e.status === 'review_required').length,
    total:          eligibilityResults.length,
  };

  // ── UEF preview — built from eligibility results, same logic as operator-flow ─
  const uefRecords = syntheticRecords.map((rec, i) => {
    const elig = eligibilityResults[i];
    return {
      recordId:           rec.recordId,
      rawName:            String(rec.raw['nome_iniziativa'] ?? rec.recordId),
      eligibility:        elig.status === 'review_required' ? 'limited' : elig.status,
      actionFamily:       String(rec.raw['categoria'] ?? ''),
      eventNature:        String(rec.raw['tipo'] ?? ''),
      approvedForScoring: elig.status === 'eligible',
      approvedForBTI:     elig.status === 'eligible' || elig.status === 'limited',
      confidence:         elig.confidence,
      impactTreatment:    elig.impactTreatment,
      budgetTreatment:    elig.budgetTreatmentSuggestion,
    };
  });

  const pillarDistribution = eligibilityResults.reduce<Record<string, number>>((acc, _, i) => {
    const cat = String(syntheticRecords[i].raw['categoria'] ?? 'altro');
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  // ── Result snapshot — read-only DB read (null if not yet run) ─────────────
  const snapshot = await fetchPdfData(tenantCode, reportingPeriod);

  return NextResponse.json({
    meta: {
      tenantCode,
      reportingPeriod,
      syntheticData:  true,
      notRealPeople:  true,
      generatedAt:    new Date().toISOString(),
    },
    batch: {
      totalCount: syntheticRecords.length,
      batchLabel: '[SYNTHETIC] Operator batch OP-001',
      records: syntheticRecords.map((rec, i) => ({
        recordId:           rec.recordId,
        rowIndex:           rec.rowIndex,
        nomeInitiativa:     String(rec.raw['nome_iniziativa'] ?? ''),
        categoria:          String(rec.raw['categoria'] ?? ''),
        tipo:               String(rec.raw['tipo'] ?? ''),
        partecipanti:       rec.raw['partecipanti'] ?? null,
        detectedRecordType: rec.detectedRecordType,
        eligibilityStatus:  eligibilityResults[i].status,
      })),
    },
    piiGuard: {
      checked:       true,
      piiFound:      anyPii,
      recordCount:   uploadedPayloads.length,
      policy:        'review_required_plus_redaction',
      totalFindings: allFindings.length,
      // Safe summary — field paths only, never PII values
      summary: piiSummary ?? { total: 0, highSeverityCount: 0, byRiskType: {}, fieldPaths: [] },
      status:  anyPii ? 'review_required' : 'passed',
    },
    eligibility: {
      ...eligCounts,
      records: eligibilityResults.map((elig, i) => ({
        recordId:        syntheticRecords[i].recordId,
        nomeInitiativa:  String(syntheticRecords[i].raw['nome_iniziativa'] ?? ''),
        status:          elig.status,
        confidence:      elig.confidence,
        impactTreatment: elig.impactTreatment,
        budgetTreatment: elig.budgetTreatmentSuggestion,
        reason:          elig.reason,
      })),
    },
    uefPreview: {
      total:              uefRecords.length,
      approvedForScoring: uefRecords.filter(r => r.approvedForScoring).length,
      approvedForBTI:     uefRecords.filter(r => r.approvedForBTI).length,
      categoryDistribution: pillarDistribution,
      records:            uefRecords,
    },
    resultSnapshot: snapshot ? {
      koraIndex:                snapshot.koraIndex.value,
      safeguardStatus:          snapshot.koraIndex.safeguardStatus,
      confidenceScore:          snapshot.koraIndex.confidenceScore,
      activationRate:           snapshot.koraIndex.activationRate,
      meaningfulActivationRate: snapshot.koraIndex.meaningfulActivationRate,
      calibrationStatus:        snapshot.koraIndex.calibrationStatus,
      methodologyVersionId:     snapshot.koraIndex.methodologyVersionId,
      decisionPack: {
        id:        snapshot.meta.decisionPackId,
        versionId: snapshot.meta.decisionPackVersionId,
        status:    snapshot.meta.decisionPackStatus,
      },
    } : null,
    synthetic_test: true,
  });
}
