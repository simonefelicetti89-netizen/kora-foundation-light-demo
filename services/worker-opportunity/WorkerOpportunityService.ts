// Worker Opportunity Engine — deterministic, rule-based, no AI, no LLM.
// Generates personalized opportunity suggestions for workers based on pillar activity.
//
// Master Plan §33 DO-NOT-DELETE / FUTURE CORE: "base tecnica di Exposure."
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): the
// former demo entry point compute(personaId, role, scenarioId) — which read
// persona fixtures via MyKoraPreviewService.getMyKoraHomePreview() — was
// retired along with that service (see
// docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md). It was
// verified fresh to have zero real callers (its sole caller was the
// now-retired /my-kora/opportunities demo page). computeFromPillars() is the
// preserved technical foundation — it takes real pillar data directly and
// has no synthetic-service dependency; wiring it to a live pillar-breakdown
// source is future work, not done here.
//
// Privacy: worker-self data only. Never accessible to employer roles.
// Employer roles must NEVER call or receive output from this service.
// methodologyStatus: pre_empirical_calibration
// not_employer_visible: true (mandatory — constitutional privacy boundary)

import type { KoraRole } from '@/lib/types';
import type { WorkerPillarData } from '@/lib/types/domains/worker-pib';

// Worker roles that may access this service
const WORKER_ROLES: ReadonlySet<KoraRole> = new Set<KoraRole>(['WORKER', 'KORA_ADMIN']);

export type WorkerOpportunityType = 'learning' | 'mentoring' | 'community' | 'wellbeing';

export interface WorkerOpportunity {
  id:               string;
  title:            string;
  subtitle:         string;
  pillar:           string;
  pillar_label:     string;
  type:             WorkerOpportunityType;
  provider:         string;
  format:           string;
  iu_potential:     string;
  match_reason:     string;
  source_signal:    string;   // explainability: WHY this was generated
  partner_type_hint: string;  // Task 7 — what kind of partner could help
  priority:         'high' | 'medium' | 'low';
  status:           'preview';
  not_employer_visible: true;
}

// ── Partner type hints by pillar ─────────────────────────────────────────────

const PARTNER_TYPE_HINT: Record<string, string> = {
  LIFE:       'Provider welfare e salute — programmi prevenzione, supporto psicologico, nutrizione, attività fisica.',
  GROWTH:     'Formatore certificato o LMS partner — corsi professionali, upskilling digitale, certificazioni riconosciute.',
  CONNECTION: 'Rete di mentoring o community partner — programmi peer, community interne, collaborazione trasversale.',
  IMPACT:     'Associazione territoriale o partner ESG — volontariato strutturato, progetti sociali, iniziative comunitarie.',
  LEGACY:     'Network professionale senior o knowledge management partner — mentoring senior-junior, trasferimento conoscenza.',
};

// ── Opportunity templates by pillar and type ─────────────────────────────────

interface OpportunityTemplate {
  title:        string;
  subtitle:     string;
  provider:     string;
  format:       string;
  iu_potential: string;
  match_reason: string;
  type:         WorkerOpportunityType;
  for_pillar:   string;
}

const TEMPLATES_BY_PILLAR: Record<string, OpportunityTemplate[]> = {
  LIFE: [
    {
      title:        'Check prevenzione salute — programma annuale',
      subtitle:     'Supporto preventivo e benessere fisico',
      provider:     'Provider welfare KORA',
      format:       'Visita + report personalizzato',
      iu_potential: '0.8–1.2 IU',
      match_reason: 'Il pillar LIFE non ha eventi recenti — una visita preventiva genera IU verificati con evidenza di livello L3.',
      type:         'wellbeing',
      for_pillar:   'LIFE',
    },
    {
      title:        'Supporto psicologico — sessioni individuali',
      subtitle:     'Benessere mentale e resilienza',
      provider:     'Partner salute mentale',
      format:       'Sessioni online (6 sessioni)',
      iu_potential: '0.6–0.9 IU per sessione',
      match_reason: 'Il pillar LIFE mostra attività prevalentemente fisica — il supporto psicologico diversifica il profilo LIFE con alta qualità evidenza.',
      type:         'wellbeing',
      for_pillar:   'LIFE',
    },
  ],
  GROWTH: [
    {
      title:        'Certificazione competenze digitali',
      subtitle:     'Upskilling e crescita professionale',
      provider:     'LMS partner KORA',
      format:       'Corso online certificato (40h)',
      iu_potential: '1.0–1.4 IU',
      match_reason: 'Il pillar GROWTH ha pochi eventi verificati — una certificazione LMS porta IU di alta qualità (EV L3).',
      type:         'learning',
      for_pillar:   'GROWTH',
    },
    {
      title:        'Percorso leadership e management',
      subtitle:     'Sviluppo competenze manageriali',
      provider:     'Academy interna / partner formazione',
      format:       'Blended (4 settimane)',
      iu_potential: '0.9–1.3 IU',
      match_reason: 'Un percorso strutturato multi-sessione aumenta il tuo Continuity score e genera IU distribuiti nel tempo.',
      type:         'learning',
      for_pillar:   'GROWTH',
    },
  ],
  CONNECTION: [
    {
      title:        'Programma mentoring — diventa mentor',
      subtitle:     'Trasferimento competenze e community',
      provider:     'Programma interno KORA',
      format:       'Sessioni mensili (3 mesi)',
      iu_potential: '0.5–0.8 IU per sessione',
      match_reason: 'Il pillar CONNECTION è basso nel tuo profilo — il mentoring genera IU per il pillar CONNECTION con alta continuità.',
      type:         'mentoring',
      for_pillar:   'CONNECTION',
    },
    {
      title:        'Community of practice — join o avvia',
      subtitle:     'Collaborazione trasversale e peer learning',
      provider:     'Community interna aziendale',
      format:       'Sessioni bi-settimanali (online)',
      iu_potential: '0.4–0.7 IU per sessione',
      match_reason: 'Una community attiva genera IU CONNECTION distribuiti nel tempo con evidenza documentabile (log partecipazione).',
      type:         'community',
      for_pillar:   'CONNECTION',
    },
  ],
  IMPACT: [
    {
      title:        'Volontariato aziendale — progetto territoriale',
      subtitle:     'Contributo comunitario e impatto sociale',
      provider:     'Partner ESG / Associazione locale',
      format:       'Giornata intera + report',
      iu_potential: '0.9–1.3 IU',
      match_reason: 'Il pillar IMPACT è assente o minimo nel tuo profilo — un\'attività di volontariato con evidenza (report associazione) genera IU di alta qualità.',
      type:         'community',
      for_pillar:   'IMPACT',
    },
    {
      title:        'Iniziativa sostenibilità aziendale',
      subtitle:     'Progetto ambiente e comunità',
      provider:     'Iniziativa interna / partner ESG',
      format:       'Progetto trimestrale',
      iu_potential: '0.7–1.0 IU',
      match_reason: 'Un progetto ESG strutturato contribuisce al pillar IMPACT e alla rendicontazione CSR aziendale con evidenza verificabile.',
      type:         'community',
      for_pillar:   'IMPACT',
    },
  ],
  LEGACY: [
    {
      title:        'Mentoring senior-junior — programma Knowledge Transfer',
      subtitle:     'Trasmissione conoscenza e legacy organizzativa',
      provider:     'Programma interno / network seniority',
      format:       'Sessioni mensili (6 mesi)',
      iu_potential: '0.6–0.9 IU per sessione',
      match_reason: 'Il pillar LEGACY è assente nel tuo profilo — il mentoring di un collega junior attiva il pillar con IU verificabili e possibilità DF [1.00–1.30].',
      type:         'mentoring',
      for_pillar:   'LEGACY',
    },
    {
      title:        'Documentazione knowledge base interna',
      subtitle:     'Formalizzazione best practice e memoria organizzativa',
      provider:     'Iniziativa interna',
      format:       'Progetto documentazione (1 mese)',
      iu_potential: '0.4–0.7 IU',
      match_reason: 'Documentare competenze e processi contribuisce al pillar LEGACY con evidenza strutturata e beneficio collettivo misurabile.',
      type:         'learning',
      for_pillar:   'LEGACY',
    },
  ],
};

// ── Source signal builder ─────────────────────────────────────────────────────

function buildSourceSignal(pillar: string, pillarScore: number, eventCount: number): string {
  if (eventCount === 0) {
    return `Rilevato perché: nessuna attività registrata nel pillar ${pillar} nel periodo corrente. Pillar inattivo nel tuo profilo.`;
  }
  if (pillarScore < 20) {
    return `Rilevato perché: pillar ${pillar} score ${pillarScore}/100 — tra i pillar più bassi del tuo profilo. Solo ${eventCount} event${eventCount === 1 ? 'o' : 'i'} registrat${eventCount === 1 ? 'o' : 'i'}.`;
  }
  return `Rilevato perché: pillar ${pillar} score ${pillarScore}/100 — c'è margine di crescita significativo rispetto ai pillar più attivi del tuo profilo.`;
}

// ── Service class ─────────────────────────────────────────────────────────────

export class WorkerOpportunityService {
  canAccess(role: KoraRole): boolean {
    return WORKER_ROLES.has(role);
  }

  computeFromPillars(pillarBreakdown: WorkerPillarData[]): WorkerOpportunity[] {
    if (pillarBreakdown.length === 0) return [];

    // Sort pillars by score ascending (weakest first)
    const sorted = [...pillarBreakdown].sort((a, b) => a.score - b.score);

    const opportunities: WorkerOpportunity[] = [];

    for (const pillarData of sorted) {
      const templates = TEMPLATES_BY_PILLAR[pillarData.pillar];
      if (!templates) continue;

      // Always include top 2 templates for the 2 weakest pillars; 1 template for others
      const maxTemplates = sorted.indexOf(pillarData) < 2 ? 2 : 1;
      const selectedTemplates = templates.slice(0, maxTemplates);

      for (const tpl of selectedTemplates) {
        const priority: 'high' | 'medium' | 'low' =
          pillarData.score === 0       ? 'high'   :
          pillarData.score < 25        ? 'medium' : 'low';

        opportunities.push({
          id:                `worker-opp-${pillarData.pillar.toLowerCase()}-${tpl.type}`,
          title:             tpl.title,
          subtitle:          tpl.subtitle,
          pillar:            pillarData.pillar,
          pillar_label:      pillarData.label,
          type:              tpl.type,
          provider:          tpl.provider,
          format:            tpl.format,
          iu_potential:      tpl.iu_potential,
          match_reason:      tpl.match_reason,
          source_signal:     buildSourceSignal(pillarData.pillar, pillarData.score, pillarData.event_count),
          partner_type_hint: PARTNER_TYPE_HINT[pillarData.pillar] ?? 'Partner KORA specializzato.',
          priority,
          status:            'preview',
          not_employer_visible: true,
        });
      }
    }

    // Sort: high first, then medium, then low
    const ORDER = { high: 0, medium: 1, low: 2 };
    return opportunities.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
  }
}

export const workerOpportunityService = new WorkerOpportunityService();
