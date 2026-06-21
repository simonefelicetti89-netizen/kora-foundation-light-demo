// services/worker-pib/WorkerPIBService.ts
//
// B157 — Worker PIB/CV: binario di consumo.
// B161 — aggiunta metodi *Live async per il path WORKER JWT reale.
//
// Metodi SINCRONI (preview KORA_ADMIN — invariati):
//   getPIB(personaId, scenarioId): WorkerPIB    — dati sintetici
//   getCVData(personaId): WorkerCVData           — dati sintetici
//
// Metodi ASYNC (WORKER JWT reale — B161):
//   getPIBLive(supabase, period?): Promise<WorkerPIB>    — da personal.worker_pib
//   getCVDataLive(supabase): Promise<WorkerCVData>        — solo is_exportable=true
//
// Privacy invariants (non-negotiable):
//   - not_employer_visible: true — never called from employer-facing code paths.
//   - not_performance_score: true — PIB is activation measurement, not evaluation.
//   - export_available: false while isSynthetic (sincroni); true nei live (verified only).

import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import type { ScenarioId } from '@/lib/types';
import type {
  WorkerPIB,
  WorkerCVData,
  WorkerPillarData,
  WorkerTimelineEvent,
  WorkerCVItem,
} from '@/lib/types/domains/worker-pib';
import { PILLAR_LABELS } from '@/lib/constants/kora';

// personal.worker_pib non è nel tipo Database generato (mig 016-019 non ancora applicate).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// ── PIB overall_index scaling — Foundation Light provisional formula ───────────
//
// METODOLOGIA PROVVISORIA — pre_empirical_calibration.
//
// Il PIB overall_index è un indice personale di riepilogo su scala 0–100 che
// sintetizza gli Impact Unit accumulati nel periodo.
//
// Formula corrente (Foundation Light):
//   overall_index = min(round(period_iu_total × PIB_OVERALL_INDEX_SCALE_FACTOR), 100)
//
// Questo fattore di scala è provvisorio: mappa gli IU personali accumulati su uno
// spazio 0–100 leggibile. Il valore 10 è un punto di partenza Foundation Light.
// Non è stato validato empiricamente né calibrato tramite studio Delphi.
//
// Questa costante NON va hardcodata nelle logiche di rendering.
// Post-pilot: il fattore di scala e la forma della funzione saranno ricalibrati
// sulla base della distribuzione reale degli IU tra lavoratori.
//
// Invarianti non negoziabili:
//   - L'overall_index NON è visibile al datore di lavoro.
//   - L'overall_index NON è un indicatore di performance.
//   - L'overall_index NON fa parte del KORA Index aziendale.
//   - L'overall_index è uno strumento informativo per il lavoratore, non una valutazione.
const PIB_OVERALL_INDEX_SCALE_FACTOR = 10;

const VALID_SCENARIOS: ScenarioId[] = ['S1', 'S2', 'S3', 'S4'];

function toScenarioId(s: string): ScenarioId {
  return (VALID_SCENARIOS.includes(s as ScenarioId) ? s : 'S1') as ScenarioId;
}

export class WorkerPIBService {

  // ── Metodi SINCRONI — preview KORA_ADMIN (non toccare) ───────────────────

  // LIVE SOURCE HOOK (post-Gate-2): sostituire la sorgente sintetica con
  // l'aggregazione IU per pseudonym_id dalla pipeline reale.
  // Vedi docs/worker-pib-activation-guide.md — sezione "Attivazione sorgente reale".
  getPIB(personaId: string, scenarioId: string): WorkerPIB {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, toScenarioId(scenarioId));
    if (!preview) {
      return this.getPIB('A', 'S1');
    }
    const pib = preview.pib_light;

    const pillarBreakdown: WorkerPillarData[] = pib.pillar_breakdown.map((p) => ({
      pillar:      p.pillar,
      label:       p.label,
      score:       p.score,
      iu_total:    p.iu_total,
      trend:       p.trend,
      event_count: p.event_count,
    }));

    const timeline: WorkerTimelineEvent[] = (preview.timeline ?? []).map((t) => ({
      id:                  t.id,
      date:                t.date,
      category:            t.category,
      pillar:              t.pillar,
      source_type:         t.source_type,
      verification_status: t.verification_status,
      iu_contribution:     t.iu_contribution,
      iu_value:            t.iu_value,
      cv_eligible:         t.cv_eligible,
      cv_eligible_reason:  t.cv_eligible_reason,
    }));

    return {
      period:                         pib.period,
      period_iu_total:                pib.period_iu_total,
      overall_index:                  pib.overall_index,
      active_pillars:                 pib.active_pillars,
      total_events:                   pib.total_events,
      pillar_breakdown:               pillarBreakdown,
      timeline,
      activation_level:               pib.activation_level,
      activation_level_label:         pib.activation_level_label,
      activation_level_description:   pib.activation_level_description,
      activation_profile:             pib.activation_profile,
      activation_profile_description: pib.activation_profile_description,
      pib_derivation_note:            pib.pib_derivation_note,
      pib_derivation_basis:           'synthetic_iu_pre_computed',
      disclaimer:                     pib.disclaimer,
      not_employer_visible:           true,
      not_performance_score:          true,
      isSynthetic:                    true,
    };
  }

  // LIVE SOURCE HOOK (post-Gate-2): sostituire la sorgente sintetica con
  // record UEF individuali verificati (analytics.uef_record filtrati per pseudonym_id).
  // Vedi docs/worker-pib-activation-guide.md — sezione "Attivazione Dynamic CV reale".
  getCVData(personaId: string): WorkerCVData {
    const cvPreview = myKoraPreviewService.getDynamicCvPreview(personaId);

    const items: WorkerCVItem[] = cvPreview.items.map((item) => ({
      id:                  item.id,
      title:               item.title,
      pillar:              item.pillar,
      pillar_label:        item.pillar_label,
      date:                item.date,
      source_category:     item.source_category,
      verification_status: item.verification_status,
      shareable:           item.shareable,
      export_label:        item.export_label,
    }));

    const verifiedCount = items.filter((i) => i.verification_status === 'verified').length;

    return {
      items,
      total_items:      items.length,
      verified_count:   verifiedCount,
      disclaimer:       cvPreview.disclaimer,
      export_available: false,
      isSynthetic:      true,
    };
  }

  // ── Metodi ASYNC — WORKER JWT reale (B161) ────────────────────────────────
  //
  // Il SupabaseClient ricevuto ha la sessione del worker autenticato (cookie).
  // RLS su personal.worker_pib filtra automaticamente per auth.uid() →
  // il worker vede SOLO le proprie righe. Il service NON filtra per workerId
  // esplicito: l'isolamento è garantito dal DB, non dal codice applicativo.

  async getPIBLive(
    supabase: AnySupabaseClient,
    reportingPeriod?: string,
  ): Promise<WorkerPIB> {
    type PibRow = {
      pillar:               string;
      iu_value:             number;
      source_uef_record_id: string | null;
      reporting_period:     string;
    };
    type InitiativeRow = {
      title:                string;
      pillar:               string;
      source_uef_record_id: string | null;
      start_date:           string | null;
      eligibility_class:    string | null;
    };

    let query = supabase
      .schema('personal')
      .from('worker_pib')
      .select('pillar, iu_value, source_uef_record_id, reporting_period');

    if (reportingPeriod) {
      query = query.eq('reporting_period', reportingPeriod);
    }

    const { data, error } = await query as { data: PibRow[] | null; error: unknown };

    if (error || !data || data.length === 0) {
      return this._emptyLivePIB(reportingPeriod);
    }

    // Fetch initiative metadata for timeline — same join pattern as getCVDataLive.
    // RLS on personal.worker_initiative scopes to authenticated worker's own rows.
    const uefIds = [...new Set(data.map((r) => r.source_uef_record_id).filter(Boolean))];
    let initiatives: InitiativeRow[] = [];
    if (uefIds.length > 0) {
      const { data: initData } = await (supabase
        .schema('personal')
        .from('worker_initiative')
        .select('title, pillar, source_uef_record_id, start_date, eligibility_class')
        .in('source_uef_record_id', uefIds)) as { data: InitiativeRow[] | null; error: unknown };
      initiatives = initData ?? [];
    }

    return this._aggregatePIBRows(data, reportingPeriod, initiatives);
  }

  async getCVDataLive(supabase: AnySupabaseClient): Promise<WorkerCVData> {
    type PibRow = {
      pillar:               string;
      iu_value:             number;
      source_uef_record_id: string | null;
      reporting_period:     string;
    };
    type InitiativeRow = {
      title:                string;
      pillar:               string;
      source_uef_record_id: string | null;
      start_date:           string | null;
    };

    // Nodo A: solo righe is_exportable=true (verified, company_sourced d'ufficio)
    const { data: pibRows, error: pibErr } = await (supabase
      .schema('personal')
      .from('worker_pib')
      .select('pillar, iu_value, source_uef_record_id, reporting_period')
      .eq('is_exportable', true)) as { data: PibRow[] | null; error: unknown };

    if (pibErr || !pibRows || pibRows.length === 0) {
      return {
        items:            [],
        total_items:      0,
        verified_count:   0,
        disclaimer:       'I dati del tuo Dynamic Impact CV™ non sono ancora disponibili.',
        export_available: true,
        isSynthetic:      false,
      };
    }

    // Recupera titoli/date dalla worker_initiative (join via source_uef_record_id)
    const uefIds = [...new Set(pibRows.map((r) => r.source_uef_record_id).filter(Boolean))];
    let initiatives: InitiativeRow[] = [];

    if (uefIds.length > 0) {
      const { data: initData } = await (supabase
        .schema('personal')
        .from('worker_initiative')
        .select('title, pillar, source_uef_record_id, start_date')
        .in('source_uef_record_id', uefIds)) as { data: InitiativeRow[] | null; error: unknown };
      initiatives = initData ?? [];
    }

    const initiativeByUefId = new Map(initiatives.map((i) => [i.source_uef_record_id, i]));

    const items: WorkerCVItem[] = pibRows.map((row, idx) => {
      const initiative = row.source_uef_record_id
        ? initiativeByUefId.get(row.source_uef_record_id)
        : undefined;
      const label = PILLAR_LABELS[row.pillar] ?? row.pillar;
      return {
        id:                  `live-cv-${idx}`,
        title:               initiative?.title ?? row.pillar,
        pillar:              row.pillar,
        pillar_label:        label,
        date:                initiative?.start_date ?? row.reporting_period,
        source_category:     'company_sourced',
        verification_status: 'verified' as const,
        shareable:           true,
        export_label:        `${label} — ${initiative?.title ?? row.reporting_period}`,
      };
    });

    return {
      items,
      total_items:      items.length,
      verified_count:   items.length,
      disclaimer:       'Dynamic Impact CV™ — voci verificate dalla fonte aziendale.',
      export_available: true,
      isSynthetic:      false,
    };
  }

  // ── Helpers aggregazione ─────────────────────────────────────────────────

  private _emptyLivePIB(reportingPeriod?: string): WorkerPIB {
    return {
      period:                         reportingPeriod ?? '—',
      period_iu_total:                0,
      overall_index:                  0,
      active_pillars:                 0,
      total_events:                   0,
      pillar_breakdown:               [],
      timeline:                       [],
      activation_level:               'initial',
      activation_level_label:         'Iniziale',
      activation_level_description:   'Nessun dato di attivazione disponibile per questo periodo.',
      activation_profile:             '—',
      activation_profile_description: '',
      pib_derivation_note:            'PIB calcolato dalla pipeline live KORA.',
      pib_derivation_basis:           'live_scoring_pipeline',
      disclaimer:                     'Dati in elaborazione. Il PIB diventa disponibile dopo l\'approvazione delle iniziative aziendali.',
      not_employer_visible:           true,
      not_performance_score:          true,
      isSynthetic:                    false,
    };
  }

  private _aggregatePIBRows(
    rows: Array<{
      pillar:               string;
      iu_value:             number;
      source_uef_record_id: string | null;
      reporting_period:     string;
    }>,
    reportingPeriod?: string,
    initiatives: Array<{
      title:                string;
      pillar:               string;
      source_uef_record_id: string | null;
      start_date:           string | null;
      eligibility_class:    string | null;
    }> = [],
  ): WorkerPIB {
    const byPillar = new Map<string, { iu_total: number; uef_ids: Set<string> }>();
    for (const row of rows) {
      const entry = byPillar.get(row.pillar) ?? { iu_total: 0, uef_ids: new Set<string>() };
      entry.iu_total += row.iu_value;
      if (row.source_uef_record_id) entry.uef_ids.add(row.source_uef_record_id);
      byPillar.set(row.pillar, entry);
    }

    const period_iu_total   = rows.reduce((s, r) => s + r.iu_value, 0);
    const totalUefIds       = new Set(rows.map((r) => r.source_uef_record_id).filter(Boolean));
    const overall_index     = Math.min(Math.round(period_iu_total * PIB_OVERALL_INDEX_SCALE_FACTOR), 100);
    const activePillars     = [...byPillar.entries()].filter(([, v]) => v.iu_total > 0);

    const pillar_breakdown: WorkerPillarData[] = activePillars.map(([pillar, v]) => ({
      pillar,
      label:       PILLAR_LABELS[pillar] ?? pillar,
      score:       +(v.iu_total / period_iu_total * 100).toFixed(1),
      iu_total:    +v.iu_total.toFixed(4),
      // Cross-period trend non disponibile in Foundation Light: richiede almeno due periodi
      // di dati storici per worker (personal.worker_pib multi-period). Disponibile post-pilot.
      // Il campo è 'not_available' — mai interpretare come "stabile" nel rendering.
      trend:       'not_available' as const,
      event_count: v.uef_ids.size,
    }));

    const activation_level = overall_index >= 75 ? 'advanced'
      : overall_index >= 50 ? 'established'
      : overall_index >= 25 ? 'developing'
      : 'initial';

    const levelLabels = {
      initial: 'Iniziale', developing: 'In sviluppo',
      established: 'Consolidato', advanced: 'Avanzato',
    } as const;
    const activation_level_label = levelLabels[activation_level];

    const dominantEntry  = [...activePillars].sort((a, b) => b[1].iu_total - a[1].iu_total)[0];
    const dominantPillar = dominantEntry?.[0];
    const dominantLabel  = dominantPillar ? (PILLAR_LABELS[dominantPillar] ?? dominantPillar) : '—';

    // Build timeline from worker_initiative join on source_uef_record_id.
    // Each UEF record appears once (deduped by uef id to avoid multi-pillar inflation).
    // Safe fields only — no worker identity, no employer-visible fields.
    //
    // NOTE: KORA Space booking-sourced PIB rows (written by cross-company-attribution.ts
    // when a booking is marked attended) have source_uef_record_id=null and source_booking_id set.
    // They ARE included in IU totals above but are excluded from the timeline here because
    // worker_initiative cannot be joined without source_uef_record_id.
    // KORA Space attendance trace is surfaced in /my-kora/bookings (attended booking card).
    // Post-Gate-2: enrich timeline via source_booking_id → commons.booking + commons.post.
    const initiativeByUefId = new Map(
      initiatives.map((i) => [i.source_uef_record_id, i]),
    );
    const seenUefIds = new Set<string>();
    const timeline: WorkerTimelineEvent[] = [];
    for (const row of rows) {
      if (!row.source_uef_record_id) continue;
      if (seenUefIds.has(row.source_uef_record_id)) continue;
      const init = initiativeByUefId.get(row.source_uef_record_id);
      if (!init) continue;
      seenUefIds.add(row.source_uef_record_id);
      const isEligible = init.eligibility_class === 'eligible';
      const iu = row.iu_value;
      timeline.push({
        id:                  `live-tl-${row.source_uef_record_id}`,
        date:                init.start_date ?? row.reporting_period,
        category:            init.title,
        pillar:              row.pillar,
        source_type:         'company_sourced',
        verification_status: 'verified',
        iu_contribution:     iu >= 5 ? 'high' : iu >= 2 ? 'medium' : 'low',
        iu_value:            iu,
        cv_eligible:         isEligible,
        cv_eligible_reason:  isEligible
          ? 'Attività idonea — può comparire nel Dynamic Impact CV.'
          : `Classe ${init.eligibility_class ?? 'sconosciuta'} — non idonea per il Dynamic Impact CV.`,
      });
    }

    return {
      period:                         rows[0]?.reporting_period ?? reportingPeriod ?? '—',
      period_iu_total:                +period_iu_total.toFixed(4),
      overall_index,
      active_pillars:                 activePillars.length,
      total_events:                   totalUefIds.size,
      pillar_breakdown,
      timeline,
      activation_level,
      activation_level_label,
      activation_level_description:   `Livello ${activation_level_label.toLowerCase()} — ${activePillars.length} pillar attivi nel periodo.`,
      activation_profile:             dominantLabel,
      activation_profile_description: `Pillar dominante: ${dominantLabel}.`,
      pib_derivation_note:            'PIB calcolato dalla pipeline live KORA sulla base degli IU degli eventi verificati.',
      pib_derivation_basis:           'live_scoring_pipeline',
      disclaimer:                     'PIB individuale — riservato al lavoratore. Non visibile all\'azienda. Non è un indicatore di performance.',
      not_employer_visible:           true,
      not_performance_score:          true,
      isSynthetic:                    false,
    };
  }
}

export const workerPIBService = new WorkerPIBService();
