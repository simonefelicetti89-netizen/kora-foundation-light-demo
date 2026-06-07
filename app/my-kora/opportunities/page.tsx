'use client';
// W-04: Opportunità — iniziative consigliate per deepening dell'attivazione.
// Scopo: mostrare al lavoratore opportunità personalizzate per pillar
//        (learning, mentoring, community, wellbeing) e IU stimati per ognuna.
// Le opportunità sono suggerimenti, non obblighi. Il lavoratore decide.
// Dati erogati da WorkerOpportunityService — nessun dato hardcoded nel componente.
// not_employer_visible: true — questa pagina non è mai visibile ai ruoli aziendali.

import { useRole, usePersona, useScenario } from '@/lib/demo-state';
import { workerOpportunityService, type WorkerOpportunity } from '@/services/worker-opportunity/WorkerOpportunityService';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { PreviewToLiveNotice } from '@/components/my-kora/PreviewToLiveNotice';
import { cn } from '@/lib/utils';

const PILLAR_COLORS: Record<string, string> = {
  LIFE:       'bg-[#2F7D55]',
  GROWTH:     'bg-[#2F7D55]',
  CONNECTION: 'bg-[#D99767]',
  IMPACT:     'bg-[#D99A2B]',
  LEGACY:     'bg-[#8A7562]',
};

const PILLAR_LIGHT: Record<string, string> = {
  LIFE:       'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  GROWTH:     'bg-[rgba(47,125,85,0.10)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  CONNECTION: 'bg-[rgba(217,151,103,0.10)] text-[#D99767] border-[rgba(217,151,103,0.25)]',
  IMPACT:     'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
  LEGACY:     'bg-[rgba(138,117,98,0.10)] text-[#8A7562] border-[rgba(138,117,98,0.25)]',
};

const TYPE_BADGE: Record<string, string> = {
  learning:  'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  mentoring: 'bg-[rgba(97,86,245,0.08)] text-[#6156F5] border-[rgba(97,86,245,0.22)]',
  community: 'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
  wellbeing: 'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]',
};

const TYPE_LABEL: Record<string, string> = {
  learning:  'Formazione',
  mentoring: 'Mentoring',
  community: 'Community',
  wellbeing: 'Benessere',
};

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-[rgba(158,59,47,0.07)] text-[#9E3B2F] border-[rgba(158,59,47,0.20)]',
  medium: 'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
  low:    'bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]',
};

// W-04: Opportunità per te
export default function Opportunities() {
  const { activeRole }     = useRole();
  const { activePersona }  = usePersona();
  const { activeScenario } = useScenario();

  if (!workerOpportunityService.canAccess(activeRole)) {
    return (
      <div className="space-y-4">
        <div>
          <h1 style={{ fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, fontSize: "1.875rem", letterSpacing: "-0.03em", lineHeight: 1.06, color: "#06032B" }}>
            Opportunità per te
          </h1>
          <p className="text-sm text-[rgba(6,3,43,0.52)]">Percorsi e iniziative abbinati al tuo profilo di impatto</p>
        </div>
        <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] p-6 text-center">
          <p className="text-sm font-semibold text-[#9E3B2F]">Accesso Limitato</p>
          <p className="mt-1 text-xs text-[rgba(158,59,47,0.90)] max-w-sm mx-auto">
            Le opportunità personalizzate sono visibili solo al lavoratore. I ruoli datore di lavoro
            non possono accedere ai percorsi individuali.
          </p>
          <p className="mt-3 text-xs font-mono text-[rgba(158,59,47,0.55)]">Ruolo attivo: {activeRole}</p>
        </div>
      </div>
    );
  }

  const personaId = activePersona?.id ?? 'persona-elena-m';
  const opportunities: WorkerOpportunity[] = workerOpportunityService.compute(personaId, activeRole, activeScenario);

  return (
    <div className="space-y-6">
      <div>
        <BoundaryBadge mode="PREVIEW" variant="light" suffix="· Worker layer · dati sintetici" style={{ marginBottom: 6 }} />
        <h1 style={{ fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, fontSize: "1.875rem", letterSpacing: "-0.03em", lineHeight: 1.06, color: "#06032B" }}>
          Opportunità per te
        </h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)]">
          Percorsi e iniziative abbinati al tuo profilo di impatto — {opportunities.length} suggerimenti
        </p>
      </div>

      {/* ── PreviewToLiveNotice — Task 3 */}
      <PreviewToLiveNotice
        what="Stai vedendo le opportunità suggerite per il tuo profilo di impatto."
        preview="Le opportunità mostrate sono illustrative — abbinate a un profilo sintetico dimostrativo."
        live="In Pilot+, le opportunità proverranno da partner KORA reali e iniziative verificate dalla tua azienda."
        privacy="Il tuo datore di lavoro non vede quali opportunità esplori o selezioni."
      />

      {/* Privacy notice — non-suppressible */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] p-3">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.88)]">Visibile solo a te.</p>
        <p className="text-xs text-[rgba(6,3,43,0.72)] mt-0.5 leading-relaxed">
          Il tuo datore di lavoro non vede quali opportunità esplori o selezioni. La partecipazione
          genera IU solo se e quando avviene e viene verificata.
        </p>
      </div>

      {/* Demo notice */}
      <div className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] p-3">
        <p className="text-xs font-semibold text-[#8A5A00]">Solo anteprima — Foundation Light</p>
        <p className="text-xs text-[#8A5A00] mt-0.5">
          I pulsanti di adesione non sono attivi in questa demo. Nessuna prenotazione reale, nessuna
          notifica a partner, nessun pagamento. In produzione, la richiesta passerebbe da KORA verso
          il partner autorizzato.
        </p>
      </div>

      {/* Opportunity cards — WorkerOpportunityService driven, persona-specific */}
      <div className="space-y-3">
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            data-testid={`worker-opp-${opp.pillar}`}
            className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden"
          >
            {/* Pillar accent bar */}
            <div className={cn('h-1 w-full', PILLAR_COLORS[opp.pillar] ?? 'bg-[rgba(6,3,43,0.18)]')} />

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{opp.title}</p>
                    <span className={cn(
                      'rounded border px-1.5 py-0.5 text-xs font-medium',
                      PILLAR_LIGHT[opp.pillar] ?? 'bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
                    )}>
                      {opp.pillar_label}
                    </span>
                    <span className={cn('rounded border px-1.5 py-0.5 text-xs', TYPE_BADGE[opp.type] ?? '')}>
                      {TYPE_LABEL[opp.type]}
                    </span>
                    <span className={cn('rounded border px-1.5 py-0.5 text-xs', PRIORITY_BADGE[opp.priority] ?? '')}>
                      {opp.priority === 'high' ? 'Priorità alta' : opp.priority === 'medium' ? 'Media' : 'Bassa'}
                    </span>
                  </div>
                  <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5">{opp.subtitle}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-[rgba(6,3,43,0.40)]">Provider</p>
                  <p className="text-xs font-medium text-[rgba(6,3,43,0.78)] mt-0.5">{opp.provider}</p>
                </div>
                <div>
                  <p className="text-xs text-[rgba(6,3,43,0.40)]">Formato</p>
                  <p className="text-xs font-medium text-[rgba(6,3,43,0.78)] mt-0.5">{opp.format}</p>
                </div>
                <div>
                  <p className="text-xs text-[rgba(6,3,43,0.40)]">IU potenziali</p>
                  <p className="text-xs font-medium text-[#C76F3D] mt-0.5">{opp.iu_potential}</p>
                </div>
              </div>

              {/* Match reason */}
              <div className="mt-3 rounded bg-[rgba(6,3,43,0.03)] border border-[rgba(6,3,43,0.05)] px-3 py-2">
                <p className="text-xs text-[rgba(6,3,43,0.52)] italic leading-relaxed">{opp.match_reason}</p>
              </div>

              {/* Explainability — source signal */}
              <div className="mt-2 rounded bg-[rgba(6,3,43,0.02)] border border-[rgba(6,3,43,0.05)] px-3 py-2">
                <p className="text-xs font-semibold text-[rgba(6,3,43,0.45)] mb-0.5 uppercase tracking-widest" style={{ fontSize: '9px' }}>Suggerito perché</p>
                <p className="text-xs text-[rgba(6,3,43,0.45)] leading-relaxed">{opp.source_signal}</p>
              </div>

              {/* Partner type hint — Task 7 */}
              <div className="mt-2 rounded bg-[rgba(199,111,61,0.04)] border border-[rgba(199,111,61,0.14)] px-3 py-2">
                <p className="text-xs font-semibold text-[rgba(199,111,61,0.75)] mb-0.5 uppercase tracking-widest" style={{ fontSize: '9px' }}>Tipo partner KORA (anteprima)</p>
                <p className="text-xs text-[rgba(6,3,43,0.50)] leading-relaxed">{opp.partner_type_hint}</p>
              </div>

              <div className="mt-3 flex items-center justify-end">
                <button
                  disabled
                  className="rounded-md border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.40)] cursor-not-allowed"
                >
                  Richiedi partecipazione — Solo anteprima
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* IU generation clarification — Task 8 */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-3">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.62)] mb-1">Come si generano gli Impact Unit dalle opportunità?</p>
        <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">
          Gli Impact Unit non vengono generati semplicemente esplorando questa pagina o visualizzando un&apos;opportunità.
          Gli IU possono essere generati solo dopo una partecipazione reale e verificata — completamento dell&apos;attività,
          evidenza registrata nel sistema KORA, revisione da parte di un advisor o partner autorizzato.
        </p>
        <p className="mt-1.5 text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">
          Gli &quot;IU potenziali&quot; mostrati su ogni opportunità sono stime orientative basate sulla metodologia KORA v0.1.
          Il valore reale dipende da completamento, verifica dell&apos;evidenza e fattori di correzione applicati.
          Questi dati sono sintetici e solo a scopo dimostrativo.
        </p>
        <p className="mt-1.5 text-xs font-mono text-[rgba(6,3,43,0.28)]">
          synthetic_demo_data: true · methodology_version: v0.1 · calibration_status: pre_empirical_calibration
        </p>
      </div>
    </div>
  );
}
