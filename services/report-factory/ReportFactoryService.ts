import type {
  DecisionPackVersion,
  DecisionPackFactoryStatus,
  DecisionPackChangeSummary,
  DecisionPackExportAction,
  DecisionPackStatus,
  CalibrationStatus,
  ScenarioId,
  DecisionPackPeriodComparison,
  DecisionPackMetricDelta,
  DecisionPackMetricTrend,
  DecisionPackComparisonMode,
} from '@/lib/types';
import { tenantService } from '@/services/tenant/TenantService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';
import { getMethodologyVersion } from '@/lib/methodology-config/v0.1';
import versionsRaw from '@/data/synthetic/decision-pack-versions.json';

interface SeedVersion {
  version_id: string;
  company_id: string;
  tenant_id: string;
  company_name: string;
  title?: string;
  period: string;
  created_at: string;
  generated_by_role?: string;
  generation_mode?: string;
  status: string;
  methodology_version_id?: string;
  methodology_version?: string;
  calibration_status: string;
  kora_index_value?: number | null;
  confidence_score?: number | null;
  activation_safeguard_status?: string | null;
  data_readiness_status?: string;
  data_readiness?: string;
  decision_pack_status?: string;
  advisor_review_status?: string;
  export_status?: string;
  source_snapshot_ids?: string[];
  sections_included?: string[];
  blocking_reasons?: string[];
  limitations?: string[];
  change_summary?: string;
  production_ready?: false;
  synthetic_demo_data?: true;
  // Block 5 — period comparison fields
  reporting_period_label?: string;
  previous_version_id?: string | null;
  previous_period_label?: string | null;
  comparison_mode?: string;
}

const seedVersions = (versionsRaw as { data: SeedVersion[] }).data;

function mapSeedToVersion(s: SeedVersion): DecisionPackVersion {
  return {
    version_id:             s.version_id,
    company_id:             s.company_id,
    company_name:           s.company_name,
    period:                 s.period,
    created_at:             s.created_at,
    status:                 s.status as DecisionPackStatus,
    methodology_version:    s.methodology_version ?? s.methodology_version_id ?? getMethodologyVersion(),
    calibration_status:     s.calibration_status as CalibrationStatus,
    confidence_score:       s.confidence_score ?? 0,
    advisor_review_status:  s.advisor_review_status ?? 'not_required',
    data_readiness:         s.data_readiness ?? s.data_readiness_status ?? 'medium',
    export_status:          s.export_status ?? 'demo_only',
    // V2 factory fields
    tenant_id:              s.tenant_id,
    title:                  s.title,
    generated_by_role:      s.generated_by_role,
    generation_mode:        s.generation_mode as DecisionPackVersion['generation_mode'],
    kora_index_value:       s.kora_index_value ?? null,
    activation_safeguard_status: s.activation_safeguard_status ?? null,
    decision_pack_status:   s.decision_pack_status,
    source_snapshot_ids:    s.source_snapshot_ids ?? [],
    sections_included:      s.sections_included ?? [],
    limitations:            s.limitations ?? [],
    blocking_reasons:       s.blocking_reasons ?? [],
    change_summary:         s.change_summary,
    production_ready:       false,
    synthetic_demo_data:    true,
  };
}

export interface IReportFactoryService {
  getDecisionPackFactoryStatus(companyId: string): DecisionPackFactoryStatus;
  getLatestDecisionPackVersion(companyId: string): DecisionPackVersion | null;
  getDecisionPackVersionHistory(companyId: string): DecisionPackVersion[];
  generateDecisionPackVersion(companyId: string): DecisionPackVersion | null;
  getDecisionPackReadiness(companyId: string): DecisionPackStatus;
  getDecisionPackSections(companyId: string, versionId: string): string[];
  getDecisionPackExportActions(companyId: string): DecisionPackExportAction[];
  getDecisionPackChangeSummary(companyId: string, fromVersionId: string, toVersionId: string): DecisionPackChangeSummary | null;
  getPreviousComparableVersion(companyId: string, versionId: string): DecisionPackVersion | null;
  getDecisionPackMetricDeltas(companyId: string, versionId: string): DecisionPackMetricDelta[];
  getDecisionPackPeriodComparison(companyId: string, versionId: string): DecisionPackPeriodComparison | null;
  getDecisionPackLimitations(companyId: string): string[];
}

export class ReportFactoryService implements IReportFactoryService {

  // ── Readiness checks ───────────────────────────────────────────────────────

  private hasKoraIndex(companyId: string): boolean {
    for (const scenario of ['S1', 'S2'] as ScenarioId[]) {
      if (scoringSimulatorService.getKoraIndexOutput(companyId, scenario) !== null) return true;
    }
    return false;
  }

  private isTenantActive(companyId: string): boolean {
    const tenant = tenantService.getTenant(companyId);
    return tenant?.tenant_status === 'active';
  }

  private getIntakeStatus(companyId: string): string {
    return companyDataIntakeService.getDataReadinessSummary(companyId).intake_status;
  }

  private computeBlockingReasons(companyId: string): string[] {
    const reasons: string[] = [];
    const tenant = tenantService.getTenant(companyId);

    if (!tenant) {
      reasons.push('Tenant non trovato nel portfolio KORA.');
      return reasons;
    }
    if (tenant.tenant_status !== 'active') {
      reasons.push(`Tenant non attivo (stato: ${tenant.tenant_status}) — attivare il tenant per sbloccare il Decision Pack.`);
    }
    if (!this.hasKoraIndex(companyId)) {
      reasons.push('KORA Index non disponibile — completare il pipeline di scoring prima di generare il Decision Pack.');
    }
    const intakeStatus = this.getIntakeStatus(companyId);
    if (intakeStatus === 'not_started') {
      reasons.push('Data intake non avviato — caricare almeno un batch di dati programma.');
    } else if (intakeStatus === 'blocked_missing_required_fields') {
      reasons.push('Data intake bloccato — completare i campi obbligatori del piano fiscale.');
    } else if (intakeStatus === 'validation_required') {
      reasons.push('Dati in attesa di validazione — risolvere le righe segnalate prima di procedere.');
    }
    const intake = companyDataIntakeService.getDataReadinessSummary(companyId);
    if (intake.review_required_rows > 0) {
      reasons.push(`${intake.review_required_rows} righe richiedono review advisor prima dell'ingestion.`);
    }

    return reasons;
  }

  // ── Public methods ─────────────────────────────────────────────────────────

  getDecisionPackFactoryStatus(companyId: string): DecisionPackFactoryStatus {
    const tenant = tenantService.getTenant(companyId);
    const tenantId = tenant?.tenant_id ?? '';
    const blockingReasons = this.computeBlockingReasons(companyId);
    const canGenerate = blockingReasons.length === 0;

    const latestVersion = this.getLatestDecisionPackVersion(companyId);
    const latestStatus = latestVersion?.status ?? 'blocked';

    const warnings: string[] = [];
    if (latestVersion?.confidence_score && latestVersion.confidence_score < 0.65) {
      warnings.push('Confidence Score < 65% — revisione advisor consigliata prima dell\'uso direzionale.');
    }
    if (latestVersion?.activation_safeguard_status === 'WARNING') {
      warnings.push('Activation Safeguard WARNING — base di partecipazione parziale.');
    }
    if (latestVersion?.activation_safeguard_status === 'FLAGGED') {
      warnings.push('Activation Safeguard FLAGGED — interpretazione KORA Index non affidabile.');
    }

    const nextAction = canGenerate
      ? (latestVersion ? 'Decision Pack disponibile. Revisionare le sezioni e preparare per advisor.' : 'Avvia la generazione del Decision Pack.')
      : (blockingReasons[0] ?? 'Risolvere i problemi bloccanti per procedere.');

    return {
      company_id:       companyId,
      tenant_id:        tenantId,
      latest_version_id: latestVersion?.version_id,
      latest_status:    latestStatus as DecisionPackStatus,
      can_generate:     canGenerate,
      can_export_pdf:   false,
      can_share:        false,
      blocking_reasons: blockingReasons,
      warnings,
      next_action:      nextAction,
    };
  }

  getLatestDecisionPackVersion(companyId: string): DecisionPackVersion | null {
    const companyVersions = seedVersions
      .filter((v) => v.company_id === companyId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (!companyVersions.length) return null;
    return mapSeedToVersion(companyVersions[0]);
  }

  getDecisionPackVersionHistory(companyId: string): DecisionPackVersion[] {
    return seedVersions
      .filter((v) => v.company_id === companyId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(mapSeedToVersion);
  }

  generateDecisionPackVersion(companyId: string): DecisionPackVersion | null {
    if (!this.hasKoraIndex(companyId)) return null;
    // In Foundation Light demo, generation returns the latest seed version (deterministic)
    return this.getLatestDecisionPackVersion(companyId);
  }

  getDecisionPackReadiness(companyId: string): DecisionPackStatus {
    const blocking = this.computeBlockingReasons(companyId);
    if (blocking.length > 0) return 'blocked';
    const latest = this.getLatestDecisionPackVersion(companyId);
    return (latest?.status as DecisionPackStatus) ?? 'draft';
  }

  getDecisionPackSections(companyId: string, versionId: string): string[] {
    const version = seedVersions.find(
      (v) => v.company_id === companyId && v.version_id === versionId,
    );
    return version?.sections_included ?? [];
  }

  getDecisionPackExportActions(companyId: string): DecisionPackExportAction[] {
    const canGenerate = this.computeBlockingReasons(companyId).length === 0;
    return [
      {
        action_id:        'export_pdf',
        label:            'Esporta PDF',
        icon:             'file-text',
        type:             'pdf',
        demo_only:        true,
        disabled:         true,
        enabled:          false,
        note:             'PDF export non implementato in Foundation Light preview.',
        reason_disabled:  'Sarà abilitato nel blocco successivo — PDF Report Engine.',
        future_capability: true,
      },
      {
        action_id:        'share_link',
        label:            'Share Link',
        icon:             'share-2',
        type:             'share_link',
        demo_only:        true,
        disabled:         true,
        enabled:          false,
        note:             'Public sharing governance non ancora implementata.',
        reason_disabled:  'Richiede governance di condivisione — implementato in blocco futuro.',
        future_capability: true,
      },
      {
        action_id:        'board_summary',
        label:            'Board Summary',
        icon:             'briefcase',
        type:             'board_summary',
        demo_only:        true,
        disabled:         true,
        enabled:          false,
        note:             'Board Summary disponibile dopo Delphi Study calibration.',
        reason_disabled:  'Richiede calibrazione empirica completata.',
        future_capability: true,
      },
      {
        action_id:        'advisor_review',
        label:            'Invia ad Advisor',
        icon:             'user-check',
        type:             'advisor_review',
        demo_only:        true,
        disabled:         true,
        enabled:          false,
        note:             'Workflow advisor non attivo in Foundation Light.',
        reason_disabled:  'Richiede autenticazione advisor (Gate 3).',
        future_capability: false,
      },
      {
        action_id:        'archive',
        label:            'Archivia Versione',
        icon:             'archive',
        type:             'archive',
        demo_only:        true,
        disabled:         !canGenerate,
        enabled:          canGenerate,
        note:             canGenerate ? 'Archivia la versione corrente.' : 'Non disponibile — Decision Pack non ancora generato.',
        reason_disabled:  canGenerate ? undefined : 'Decision Pack non ancora generato.',
        future_capability: false,
      },
    ];
  }

  getDecisionPackChangeSummary(
    companyId: string,
    fromVersionId: string,
    toVersionId: string,
  ): DecisionPackChangeSummary | null {
    const from = seedVersions.find((v) => v.company_id === companyId && v.version_id === fromVersionId);
    const to   = seedVersions.find((v) => v.company_id === companyId && v.version_id === toVersionId);
    if (!from || !to) return null;

    const koraFrom = from.kora_index_value ?? null;
    const koraTo   = to.kora_index_value   ?? null;
    const csFrom   = from.confidence_score ?? null;
    const csTo     = to.confidence_score   ?? null;

    const mainChanges: string[] = [];
    if (to.change_summary) mainChanges.push(to.change_summary);
    if (koraFrom !== null && koraTo !== null) {
      const delta = koraTo - koraFrom;
      mainChanges.push(`KORA Index: ${koraFrom} → ${koraTo} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pt).`);
    }
    if (csFrom !== null && csTo !== null && Math.abs(csTo - csFrom) > 0.02) {
      mainChanges.push(`Confidence Score: ${(csFrom * 100).toFixed(0)}% → ${(csTo * 100).toFixed(0)}%.`);
    }
    const safeguardChanged = from.activation_safeguard_status !== to.activation_safeguard_status;
    if (safeguardChanged) {
      mainChanges.push(`Activation Safeguard: ${from.activation_safeguard_status} → ${to.activation_safeguard_status}.`);
    }

    return {
      from_version_id:       fromVersionId,
      to_version_id:         toVersionId,
      kora_index_delta:      koraFrom !== null && koraTo !== null ? koraTo - koraFrom : undefined,
      confidence_delta:      csFrom !== null && csTo !== null ? csTo - csFrom : undefined,
      main_changes:          mainChanges,
      methodology_changed:   from.methodology_version_id !== to.methodology_version_id,
      data_sources_changed:  (from.source_snapshot_ids ?? []).join(',') !== (to.source_snapshot_ids ?? []).join(','),
      limitations_changed:   JSON.stringify(from.limitations) !== JSON.stringify(to.limitations),
    };
  }

  getDecisionPackLimitations(companyId: string): string[] {
    const latest = this.getLatestDecisionPackVersion(companyId);
    const specificLimitations = latest?.limitations ?? [];
    const baseline = [
      'Decision Pack misura l\'organizzazione, non gli individui.',
      'Il PIB individuale resta privato al lavoratore.',
      `KORA Foundation Light è in pre-empirical calibration: output direzionale, non certificazione pubblica o attestazione regolatoria.`,
      'Dati sintetici demo — non rappresentano la situazione reale dell\'azienda.',
      'KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.',
      'correlazione ≠ causalità. Nessuna analisi causale inclusa.',
    ];
    return [...new Set([...specificLimitations, ...baseline])];
  }

  // ── Semester comparison methods ────────────────────────────────────────────

  getPreviousComparableVersion(companyId: string, versionId: string): DecisionPackVersion | null {
    const current = seedVersions.find((v) => v.company_id === companyId && v.version_id === versionId);
    if (!current?.previous_version_id) return null;
    const prev = seedVersions.find((v) => v.company_id === companyId && v.version_id === current.previous_version_id);
    return prev ? mapSeedToVersion(prev) : null;
  }

  getDecisionPackMetricDeltas(companyId: string, versionId: string): DecisionPackMetricDelta[] {
    const current = seedVersions.find((v) => v.company_id === companyId && v.version_id === versionId);
    if (!current) return [];
    if (!current.previous_version_id) return [];
    const prev = seedVersions.find((v) => v.company_id === companyId && v.version_id === current.previous_version_id);
    if (!prev) return [];

    const methodologyMatch = current.methodology_version_id === prev.methodology_version_id;

    function trendNum(cur: number | null | undefined, pre: number | null | undefined, higherIsBetter: boolean): DecisionPackMetricTrend {
      if (cur == null || pre == null) return 'not_available';
      if (!methodologyMatch) return 'not_comparable';
      const delta = cur - pre;
      if (Math.abs(delta) < 0.001) return 'stable';
      return (delta > 0) === higherIsBetter ? 'improved' : 'declined';
    }

    function trendStr(cur: string | null | undefined, pre: string | null | undefined): DecisionPackMetricTrend {
      if (!cur || !pre) return 'not_available';
      if (!methodologyMatch) return 'not_comparable';
      const ORDER: Record<string, number> = { FLAGGED: 0, WARNING: 1, CLEAR: 2 };
      const cOrd = ORDER[cur] ?? -1;
      const pOrd = ORDER[pre] ?? -1;
      if (cOrd === pOrd) return 'stable';
      return cOrd > pOrd ? 'improved' : 'declined';
    }

    const deltas: DecisionPackMetricDelta[] = [];

    // KORA Index
    const kiCur = current.kora_index_value ?? null;
    const kiPrev = prev.kora_index_value ?? null;
    const kiDelta = kiCur !== null && kiPrev !== null ? kiCur - kiPrev : undefined;
    deltas.push({
      metric_id: 'kora_index',
      label: 'KORA Index',
      current_value: kiCur,
      previous_value: kiPrev,
      delta_abs: kiDelta,
      delta_pct: kiDelta !== undefined && kiPrev ? (kiDelta / kiPrev) * 100 : undefined,
      trend: trendNum(kiCur, kiPrev, true),
      interpretation: kiDelta !== undefined
        ? `Variazione rispetto al semestre precedente: ${kiDelta >= 0 ? '+' : ''}${kiDelta.toFixed(1)} pt. Il confronto misura evoluzione direzionale, non causalità statistica.`
        : 'Dato non disponibile per il periodo precedente.',
      comparable: methodologyMatch && kiCur !== null && kiPrev !== null,
    });

    // Confidence Score
    const csCur = current.confidence_score ?? null;
    const csPrev = prev.confidence_score ?? null;
    const csDelta = csCur !== null && csPrev !== null ? csCur - csPrev : undefined;
    deltas.push({
      metric_id: 'confidence_score',
      label: 'Confidence Score',
      current_value: csCur !== null ? Math.round(csCur * 100) : null,
      previous_value: csPrev !== null ? Math.round(csPrev * 100) : null,
      delta_abs: csDelta !== undefined ? Math.round(csDelta * 100) : undefined,
      trend: trendNum(csCur, csPrev, true),
      interpretation: csDelta !== undefined
        ? `Variazione rispetto al semestre precedente: ${csDelta >= 0 ? '+' : ''}${Math.round(csDelta * 100)} pt. Indica miglioramento nella copertura e qualità dei dati.`
        : 'Dato non disponibile per il periodo precedente.',
      comparable: methodologyMatch && csCur !== null && csPrev !== null,
    });

    // Activation Safeguard
    deltas.push({
      metric_id: 'activation_safeguard',
      label: 'Activation Safeguard',
      current_value: null,
      previous_value: null,
      trend: trendStr(current.activation_safeguard_status, prev.activation_safeguard_status),
      interpretation: current.activation_safeguard_status && prev.activation_safeguard_status
        ? `${prev.activation_safeguard_status} → ${current.activation_safeguard_status}. Variazione rispetto al semestre precedente.`
        : 'Dato non disponibile per il periodo precedente.',
      comparable: methodologyMatch && !!current.activation_safeguard_status && !!prev.activation_safeguard_status,
    });

    // Sections included (as readiness proxy)
    const sectCur = (current.sections_included ?? []).length;
    const sectPrev = (prev.sections_included ?? []).length;
    deltas.push({
      metric_id: 'sections_included',
      label: 'Sezioni Decision Pack incluse',
      current_value: sectCur,
      previous_value: sectPrev,
      delta_abs: sectCur - sectPrev,
      trend: trendNum(sectCur, sectPrev, true),
      interpretation: `Copertura sezioni: ${sectPrev} → ${sectCur}. Indica maturità del pack rispetto al semestre precedente.`,
      comparable: methodologyMatch,
    });

    return deltas;
  }

  getDecisionPackPeriodComparison(companyId: string, versionId: string): DecisionPackPeriodComparison | null {
    const current = seedVersions.find((v) => v.company_id === companyId && v.version_id === versionId);
    if (!current) return null;

    const comparisonMode = (current.comparison_mode ?? 'not_available') as DecisionPackComparisonMode;
    const hasPrevious = !!current.previous_version_id;
    const prev = hasPrevious
      ? seedVersions.find((v) => v.company_id === companyId && v.version_id === current.previous_version_id)
      : undefined;

    const methodologyMatch = prev ? current.methodology_version_id === prev.methodology_version_id : false;

    const comparabilityNotes = !hasPrevious
      ? 'Prima versione disponibile — nessun periodo precedente per il confronto.'
      : !prev
        ? 'Versione precedente non trovata nel registro.'
        : !methodologyMatch
          ? 'Il confronto è indicativo perché la metodologia è cambiata tra i due periodi.'
          : 'Stessa metodologia — confronto diretto valido. Il confronto misura evoluzione direzionale aggregata, non causalità statistica.';

    return {
      comparison_mode:              comparisonMode,
      reporting_period:             current.period ?? '',
      reporting_period_label:       current.reporting_period_label ?? current.period ?? '',
      previous_version_id:          current.previous_version_id ?? undefined,
      previous_period_label:        current.previous_period_label ?? undefined,
      comparable_with_previous:     hasPrevious && !!prev,
      methodology_version_id_current:  current.methodology_version_id ?? '',
      methodology_version_id_previous: prev?.methodology_version_id ?? undefined,
      methodology_comparable:       methodologyMatch,
      comparability_notes:          comparabilityNotes,
      metric_deltas:                hasPrevious ? this.getDecisionPackMetricDeltas(companyId, versionId) : [],
    };
  }
}

export const reportFactoryService = new ReportFactoryService();
