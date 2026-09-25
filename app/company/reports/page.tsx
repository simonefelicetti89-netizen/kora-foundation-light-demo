'use client';
// C-09: Decision Pack — live-only: richiede sessione company autenticata.
// Output board-ready con KI, CS, Safeguard, ComponentBreakdown e ActivationSafeguardPanel live.
// Nessun dato sintetico. Nessun branch demo.
//
// KORA-WP-140 — surface & state grammar adoption. Content, order and behaviour
// are unchanged: this maps what the page already says onto the canonical roles
// and states. Three state corrections are the substance of the change:
//   - the loading guard is the LOADING state, not an unlabelled sentence;
//   - "Decision Pack non ancora disponibile" is NOT YET AVAILABLE, not an
//     absence of data and not a fault — the period simply has not been scored;
//   - KORA Contribution is NOT YET AVAILABLE, not the empty grey box that read
//     as "nothing here".
// KORA-WP-140 structure is FINAL here and must not be altered.
// KORA-WP-139 migrated the typography onto the canonical nine-role scale on top
// of that structure: every size now comes from a named role, no text sits below
// the 11px floor, and 11px is used only where the role is `meta`.

import { useCompanySession } from '../_providers/CompanySessionProvider';
import { useScoringResult }  from '@/lib/scoring-result';
import { activationSafeguardService } from '@/services/activation-safeguard/ActivationSafeguardService';
import { KoraIndexHero }           from '@/components/kora-index/KoraIndexHero';
import { ComponentBreakdown }      from '@/components/kora-index/ComponentBreakdown';
import { ActivationSafeguardPanel } from '@/components/kora-index/ActivationSafeguardPanel';
import { PrivacyBoundaryNote }          from '@/components/reports/PrivacyBoundaryNote';
import { NormativeMappingLightSection } from '@/components/reports/NormativeMappingLightSection';
import { getNormativeMappingLight }     from '@/lib/normative-mapping/normative-mapping-light';
import { PageMasthead }            from '@/components/ui/PageMasthead';
import { DecisionContext }         from '@/components/ui/DecisionContext';
import { ProvenanceFooter }        from '@/components/company/cockpit/ProvenanceFooter';
import {
  HeroJudgment, PrimaryMetric, SupportingMetric, EvidencePanel, WarningSafeguard,
  ActionGroup, Disclosure, Loading, NotYetAvailable,
} from '@/components/ui/px';
import type { Assessment } from '@/lib/design/surface-state-grammar';
import { TOKENS, typeStyle } from '@/lib/design/kora-design-tokens';

function safeguardLabel(status: string): string {
  if (status === 'CLEAR')   return 'Clear';
  if (status === 'FLAGGED') return 'Flagged';
  return 'Warning';
}

// The safeguard states a SEMANTIC CLAIM, never a colour. A CLEAR safeguard
// therefore cannot be rendered in the danger treatment: there is no parameter
// through which to ask for one.
function safeguardAssessment(status: string): Assessment {
  if (status === 'CLEAR') {
    return { kind: 'ok', label: safeguardLabel(status) };
  }
  if (status === 'FLAGGED') {
    return {
      kind: 'risk',
      label: safeguardLabel(status),
      reason: 'Attivazione sotto la soglia minima: il KORA Index non è interpretabile come indicatore di programma attivo finché il Safeguard resta Flagged.',
    };
  }
  return {
    kind: 'watch',
    label: safeguardLabel(status),
    reason: 'Attivazione in zona di attenzione: i valori sono leggibili, ma la copertura non è ancora sufficiente per conclusioni stabili.',
  };
}

// C-09: Decision Pack live
export default function Reports() {
  const { tenantId: liveId, sessionLoading } = useCompanySession();

  const COMPANY_ID = liveId ?? '';
  const { data: scoring, loading } = useScoringResult({
    tenantId:   COMPANY_ID,
    scenarioId: 'S1',
  });

  // ── Loading guard — MUST precede any data access ──────────────────────────
  if (sessionLoading || loading) {
    return <Loading label="Caricamento del Decision Pack in corso." />;
  }

  const hasKoraData = scoring?.status === 'ok';
  if (!hasKoraData) {
    return (
      <NotYetAvailable
        title="Decision Pack non ancora disponibile"
        expected="Completa il processo di intake e scoring per generare il Decision Pack. Il tuo KORA Admin ti aggiornerà quando i dati saranno pronti."
      />
    );
  }

  const output    = scoring!.koraIndex!;
  const aggregate = scoring!.aggregate!;
  const AR        = aggregate.activation_rate ?? 0;
  const MAR       = aggregate.meaningful_activation_rate ?? 0;
  const safeguard = activationSafeguardService.evaluate(AR, MAR);

  return (
    <div className="space-y-6">

      <PageMasthead
        eyebrow="Decision Pack · LIVE"
        title="Report direzionali"
        subline="Output board-ready per HR, Finance, ESG e board. Evidenze strutturate, attivazione e raccomandazioni in formato decisionale."
      />
      <DecisionContext
        question="Quali output portare al board, agli advisor ESG e alle funzioni HR e Finance?"
        boundary="KORA Foundation Light · pre_empirical_calibration · non certificativo · dati live"
      />

      {/* ── Lettura direzionale — DISCLOSURE, non un avviso ─────────────────── */}
      <Disclosure label="Lettura direzionale — non certificativa">
        <p style={{ ...typeStyle('body'), color: TOKENS.inkSecondary }}>
          KORA converte dati aggregati, KORA Index, Confidence Score, Safeguard e raccomandazioni in output direzionali.
          Il Decision Pack è un supporto informativo per il confronto interno — non una certificazione ESG, non un report regolatorio automatico,
          non un&apos;attestazione pubblica.
        </p>
      </Disclosure>

      {/* ── KORA Index™ live — HERO JUDGMENT (uno solo per superficie) ──────── */}
      <HeroJudgment
        eyebrow="KORA Decision Pack · La tua organizzazione"
        actions={
          <span style={{ ...typeStyle('meta'), background: 'rgba(47,125,85,0.10)', color: TOKENS.success, borderRadius: 4, padding: '3px 8px', border: '1px solid rgba(47,125,85,0.22)' }}>
            LIVE
          </span>
        }
        verdict={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PrimaryMetric label="KORA Index™" footnote={<span style={{ ...typeStyle('caption'), color: TOKENS.inkHint }}>/100</span>}>
              <p style={{ ...typeStyle('display', { tabular: true }), color: TOKENS.ink }}>
                {output.kora_index_value}
              </p>
            </PrimaryMetric>

            {/* `title`, not `display`: a Supporting Metric qualifies the primary and
                must never compete with it. Both at 60px read as two headlines. */}
            <SupportingMetric label="Confidence Score" footnote={<span style={{ ...typeStyle('caption'), color: TOKENS.inkHint }}>indicatore esterno · peso 0</span>}>
              <p style={{ ...typeStyle('title', { tabular: true }), color: TOKENS.accent }}>
                {(output.confidence_score * 100).toFixed(0)}%
              </p>
            </SupportingMetric>

            <WarningSafeguard label="Activation Safeguard" assessment={safeguardAssessment(output.safeguard_status)} />
          </div>
        }
      >
        <Disclosure label="Calibrazione e metodologia">
          <div className="flex flex-wrap gap-3">
            <span style={{ ...typeStyle('caption'), fontFamily: 'ui-monospace, monospace', color: TOKENS.safeguard.watch.text }}>pre_empirical_calibration</span>
            <span style={{ ...typeStyle('caption'), fontFamily: 'ui-monospace, monospace', color: TOKENS.safeguard.cap.text }}>production_ready: false</span>
            <span style={{ ...typeStyle('caption'), fontFamily: 'ui-monospace, monospace', color: TOKENS.inkHint }}>{aggregate.methodology_version_id}</span>
            {aggregate.reporting_period && (
              <span style={{ ...typeStyle('caption'), fontFamily: 'ui-monospace, monospace', color: TOKENS.inkHint }}>{aggregate.reporting_period}</span>
            )}
          </div>
        </Disclosure>

        <ActionGroup
          note={
            <span style={{ ...typeStyle('caption'), color: TOKENS.inkHint }}>
              Usa Stampa / Salva come PDF dal browser (Cmd+P)
            </span>
          }
        >
          <a
            href="/api/company/decision-pack"
            target="_blank" rel="noopener noreferrer"
            style={{ ...typeStyle('label', { weight: 700 }), borderRadius: 6, background: TOKENS.ink, padding: '9px 16px', color: '#FFFFFF', textDecoration: 'none' }}
          >
            Apri Board Pack →
          </a>
        </ActionGroup>
      </HeroJudgment>

      {/* ── Scomposizione — EVIDENCE, non un secondo hero ───────────────────── */}
      <EvidencePanel label="KORA Index™ — Scomposizione 10 componenti">
        <div className="space-y-6">
          <KoraIndexHero output={output} />
          <ComponentBreakdown components={output.components} />
        </div>
      </EvidencePanel>

      {/* ── Activation Safeguard — il dettaglio SPIEGA, non allarma due volte ─ */}
      <EvidencePanel>
        <ActivationSafeguardPanel result={safeguard} explanation={undefined} />
      </EvidencePanel>

      {/* ── Export & distribuzione — ACTION ─────────────────────────────────── */}
      <ActionGroup
        label="Export & distribuzione"
        note={
          <p style={{ ...typeStyle('caption'), color: TOKENS.inkHint }}>
            Il Board Pack Preview è disponibile come documento stampabile PDF-ready.
            Export PDF automatico non attivo in Foundation Light — usare il browser per Salva come PDF.
            Report Excel, API export e distribuzione automatica sono disponibili in fase pilot.
          </p>
        }
      >
        <a
          href="/api/company/decision-pack"
          target="_blank" rel="noopener noreferrer"
          style={{ ...typeStyle('label', { weight: 700 }), display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 6, background: TOKENS.ink, padding: '9px 16px', color: '#FFFFFF', textDecoration: 'none' }}
        >
          Apri Board Pack →
          <span style={{ ...typeStyle('caption'), fontWeight: 400, color: 'rgba(244,241,233,0.60)' }}>
            Stampa / Salva PDF dal browser (Cmd+P)
          </span>
        </a>
      </ActionGroup>

      {/* ── KORA Contribution™ — NOT YET AVAILABLE, non un vuoto ────────────── */}
      <EvidencePanel label="KORA Contribution™ — indicatore companion, separato dal KORA Index™">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span style={{ ...typeStyle('meta'), background: `${TOKENS.accent}14`, color: TOKENS.accent, borderRadius: 4, padding: '3px 7px' }}>
              Indicatore Companion
            </span>
            <span style={{ ...typeStyle('caption'), fontFamily: 'ui-monospace, monospace', color: TOKENS.inkHint }}>
              not_kora_index_component: true
            </span>
          </div>
          <p style={{ ...typeStyle('body'), color: TOKENS.inkSecondary }}>
            KORA Contribution™ misura il contributo collettivo e territoriale dell&apos;organizzazione oltre il perimetro interno.{' '}
            <strong style={{ color: TOKENS.ink }}>Non modifica e non influenza il KORA Index™.</strong>
          </p>
          <NotYetAvailable expected="KORA Contribution live sarà disponibile dopo la prima verifica di iniziative collettive con evidenza partner." />
        </div>
      </EvidencePanel>

      {/* ── Normative Mapping Light — EVIDENCE ──────────────────────────────── */}
      <EvidencePanel>
        <NormativeMappingLightSection mapping={getNormativeMappingLight()} />
      </EvidencePanel>

      {/* ── Confini metodologici — DISCLOSURE ───────────────────────────────── */}
      <Disclosure label="Confini metodologici e perimetro informativo">
        <p style={{ ...typeStyle('subsection'), color: TOKENS.ink, marginBottom: 12 }}>
          Decision Pack misura l&apos;organizzazione, non gli individui.
        </p>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            'KORA Foundation Light · pre_empirical_calibration — output direzionale, non certificazione pubblica o attestazione regolatoria.',
            'Confidence Score: indicatore esterno di affidabilità dati, peso = 0 nel KORA Index v1.0. Non è una componente del punteggio.',
            'Correlazione ≠ causalità — tutti i segnali KORA sono associativi, non predittivi.',
            'KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.',
          ].map((note) => (
            <li key={note} style={{ ...typeStyle('secondary'), display: 'flex', gap: 8, color: TOKENS.inkSecondary }}>
              <span style={{ flexShrink: 0, color: TOKENS.inkHint, marginTop: 2 }}>·</span>
              {note}
            </li>
          ))}
        </ul>
      </Disclosure>

      <Disclosure>
        <PrivacyBoundaryNote />
      </Disclosure>

      <ProvenanceFooter
        methodologyVersionId={aggregate.methodology_version_id}
        calibrationStatus={aggregate.calibration_status}
        reportingPeriod={aggregate.reporting_period}
      />
    </div>
  );
}
