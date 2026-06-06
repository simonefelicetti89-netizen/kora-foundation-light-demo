'use client';
// W-06: Impatto Collettivo — contributo personale del lavoratore a iniziative collettive e territoriali.
// Foundation Light: dati sintetici illustrativi per-persona.
// Nessuna identità worker reale, nessun ranking, nessun social feed, nessun conteggio co-partecipanti.
// KORA Contribution™ è un indicatore companion — mai parte del KORA Index™.

import { usePersona, useRole, useScenario } from '@/lib/demo-state';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import { isContributionEligibleEvent, CONTRIBUTION_PILLARS } from '@/lib/kora-engine/contribution-family-detector';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { isWorkerRole } from '@/lib/permissions';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const PILLAR_LABELS: Record<string, string> = {
  IMPACT:     'Impact',
  CONNECTION: 'Connection',
  LEGACY:     'Legacy',
};

const VERIF_LABELS: Record<string, string> = {
  verified:     'Verificata',
  partial:      'Parziale',
  self_declared:'Autodichiarata',
};

const VERIF_COLOR: Record<string, string> = {
  verified:     TOKENS.safeguard.pass.text,
  partial:      TOKENS.safeguard.watch.text,
  self_declared:TOKENS.inkHint,
};

// Dynamic CV relevance: IMPACT and LEGACY events are directly CV-exportable (high);
// CONNECTION contribution events are shareable with partial evidence or above.
function cvRelevance(pillar: string, verif: string): 'alta' | 'media' | 'bassa' {
  if (pillar === 'IMPACT') return verif === 'verified' ? 'alta' : 'media';
  if (pillar === 'LEGACY') return verif === 'verified' ? 'alta' : 'media';
  if (pillar === 'CONNECTION') return verif === 'self_declared' ? 'bassa' : 'media';
  return 'bassa';
}

export default function CollectiveImpact() {
  const { activeRole }     = useRole();
  const { activeScenario } = useScenario();
  const { activePersona }  = usePersona();
  const personaId          = activePersona?.id ?? 'persona-elena-m';

  // Role guard — My KORA is worker-private
  if (!isWorkerRole(activeRole)) {
    return (
      <div style={{ maxWidth: 560 }}>
        <p style={{ fontFamily: FONT, fontSize: '13px', color: TOKENS.inkHint, padding: '32px 0' }}>
          Questa sezione è riservata ai lavoratori. Nessun dato individuale è visibile ai ruoli aziendali.
        </p>
      </div>
    );
  }

  const preview              = myKoraPreviewService.getMyKoraHomePreview(personaId, activeScenario);
  const personaLabel         = preview?.persona_label ?? personaId;

  // Filter contribution-eligible events: IMPACT, CONNECTION, LEGACY pillars
  const contributionTimeline = (preview?.timeline ?? []).filter((item) =>
    isContributionEligibleEvent({ pillar: item.pillar }),
  );

  const totalContribIU  = contributionTimeline.reduce((s, i) => s + i.iu_value, 0);
  const pillarsActive   = [...new Set(contributionTimeline.map((i) => i.pillar))];
  const verifiedCount   = contributionTimeline.filter((i) => i.verification_status === 'verified').length;

  return (
    <div style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '10px', letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.accent, marginBottom: 10 }}>
          My KORA · Impatto Collettivo
        </p>
        <h1 style={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.875rem', letterSpacing: '-0.03em', lineHeight: 1.06, color: TOKENS.ink, marginBottom: 6 }}>
          Contributo Collettivo
        </h1>
        <p style={{ fontFamily: FONT, fontSize: '13.5px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          Le tue attività collettive e territoriali — non un social feed. Il tuo contributo alimenta il{' '}
          <span style={{ fontWeight: 600, color: TOKENS.ink }}>Contribution Intelligence™</span>{' '}
          (indicatore companion, distinto dal KORA Index™).
        </p>
      </div>

      {/* Synthetic data disclaimer — non-suppressible */}
      <div style={{ borderRadius: TOKENS.cardRadiusSm, border: `1px solid ${TOKENS.safeguard.watch.dot}44`, background: TOKENS.safeguard.watch.bg, padding: '10px 14px', fontSize: '11.5px', color: TOKENS.safeguard.watch.text, lineHeight: 1.6 }}>
        <span style={{ fontWeight: 600 }}>Dati sintetici illustrativi</span>{' '}
        · Il tracking reale richiederà identità worker-owned e consenso esplicito (Pilot+).
        <span style={{ fontFamily: 'monospace', display: 'block', marginTop: 4, fontSize: '10px', opacity: 0.7 }}>
          synthetic_demo_data: true · persona: {personaLabel} · scenario: {activeScenario}
        </span>
      </div>

      {/* Summary stats */}
      {contributionTimeline.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Attività contribution', value: contributionTimeline.length },
              { label: 'Contribution IU totali', value: totalContribIU.toFixed(2) },
              { label: 'Pillar attivi',           value: pillarsActive.length },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '0.875rem', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginBottom: 4 }}>{label}</p>
                <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.5rem', color: TOKENS.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Pillar mini-breakdown */}
          {pillarsActive.length > 0 && (
            <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1rem' }}>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 10 }}>
                IU per pillar contribution
              </p>
              {CONTRIBUTION_PILLARS.map((p) => {
                const pillarIU  = contributionTimeline
                  .filter((i) => i.pillar === p)
                  .reduce((s, i) => s + i.iu_value, 0);
                const maxIU     = Math.max(
                  ...CONTRIBUTION_PILLARS.map((pp) =>
                    contributionTimeline.filter((i) => i.pillar === pp).reduce((s, i) => s + i.iu_value, 0),
                  ), 0.01,
                );
                return (
                  <div key={p} style={{ marginBottom: 8 }}>
                    <div className="flex justify-between items-center mb-1">
                      <span style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.ink }}>{PILLAR_LABELS[p] ?? p}</span>
                      <span style={{ fontSize: '11px', color: TOKENS.inkHint, fontVariantNumeric: 'tabular-nums' }}>{pillarIU.toFixed(2)} IU</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 9999, background: TOKENS.inkTrack, overflow: 'hidden' }}>
                      <div style={{ height: 4, borderRadius: 9999, width: `${(pillarIU / maxIU) * 100}%`, background: TOKENS.accent }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Activity timeline */}
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint }}>
            Attività collettive nel periodo
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contributionTimeline.map((item) => {
              const cvRel    = cvRelevance(item.pillar, item.verification_status);
              const verfCol  = VERIF_COLOR[item.verification_status] ?? TOKENS.inkHint;
              return (
                <div
                  key={item.id}
                  style={{
                    background:   TOKENS.surface,
                    border:       TOKENS.cardBorder,
                    borderRadius: TOKENS.cardRadius,
                    padding:      '0.875rem 1rem',
                    display:      'flex', flexDirection: 'column', gap: 8,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: '12.5px', fontWeight: 600, color: TOKENS.ink, lineHeight: 1.35 }}>{item.category}</p>
                      <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 2 }}>
                        {new Date(item.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-jakarta)', fontSize: '10px', fontWeight: 700,
                      background: TOKENS.inkBorder, color: TOKENS.ink,
                      borderRadius: 4, padding: '2px 7px', flexShrink: 0,
                    }}>
                      {item.pillar}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>Impact Units</p>
                      <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.125rem', color: TOKENS.ink, fontVariantNumeric: 'tabular-nums' }}>
                        {item.iu_value.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>Evidenza</p>
                      <p style={{ fontSize: '11px', fontWeight: 500, color: verfCol }}>
                        {VERIF_LABELS[item.verification_status] ?? item.verification_status}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>Dynamic CV</p>
                      <p style={{
                        fontSize: '11px', fontWeight: 500,
                        color: cvRel === 'alta' ? TOKENS.safeguard.pass.text : cvRel === 'media' ? TOKENS.safeguard.watch.text : TOKENS.inkHint,
                      }}>
                        Rilevanza {cvRel}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Privacy invariant */}
          <div style={{ borderRadius: TOKENS.cardRadiusSm, border: TOKENS.cardBorder, padding: '12px 16px', background: TOKENS.inkBorder }}>
            <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '11.5px', color: TOKENS.ink, marginBottom: 4 }}>
              Privacy — cosa vede l&apos;azienda
            </p>
            <p style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
              Il datore di lavoro vede solo il <strong>Contribution Score aggregato aziendale</strong>.
              Non vede le tue attività individuali, i tuoi IU di contributo, né il tuo Dynamic CV.
              Nessun ranking, nessun confronto tra colleghi, nessun social feed.
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkMeta, marginTop: 8 }}>
              verifiedContributions: {verifiedCount} / {contributionTimeline.length} · not_employer_visible: true · no_ranking: true
            </p>
          </div>
        </>
      ) : (
        /* No contribution events for this persona/scenario */
        <div style={{ borderRadius: TOKENS.cardRadius, border: TOKENS.cardBorder, background: TOKENS.taupe, padding: '28px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: FONT, fontSize: '13px', color: TOKENS.inkHint, lineHeight: 1.6 }}>
            Nessuna attività collettiva registrata per {personaLabel} nello scenario {activeScenario}.
            Prova a selezionare lo scenario S2 per visualizzare esempi di volontariato, mentoring e trasferimento conoscenza.
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkMeta, marginTop: 12 }}>
            contribution_events: 0 · scenario: {activeScenario}
          </p>
        </div>
      )}

      {/* Architecture note */}
      <div style={{ borderRadius: TOKENS.cardRadiusSm, border: TOKENS.cardBorder, padding: '12px 16px' }}>
        <p style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          Il Contribution Intelligence™ misura contributo collettivo e territoriale —
          è un indicatore companion al KORA Index™, mai parte del punteggio aziendale.
          Nessun ranking individuale, nessun social feed. Il tracking cross-company si abilita nelle fasi successive del pilot.
        </p>
      </div>

    </div>
  );
}
