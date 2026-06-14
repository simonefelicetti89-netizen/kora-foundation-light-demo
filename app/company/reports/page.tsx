'use client';
// C-09: Decision Pack — live-only: richiede sessione company autenticata.
// Output board-ready con KI, CS, Safeguard, ComponentBreakdown e ActivationSafeguardPanel live.
// Nessun dato sintetico. Nessun branch demo.

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
import { SectionLabel }            from '@/components/ui/SectionLabel';
import { ProvenanceFooter }        from '@/components/company/cockpit/ProvenanceFooter';
import { TOKENS }                  from '@/lib/design/kora-design-tokens';

function safeguardLabel(status: string): string {
  if (status === 'CLEAR')   return 'Clear';
  if (status === 'FLAGGED') return 'Flagged';
  return 'Warning';
}

function safeguardToken(status: string): { bg: string; text: string; dot: string } {
  if (status === 'CLEAR')   return TOKENS.safeguard.pass;
  if (status === 'FLAGGED') return TOKENS.safeguard.cap;
  return TOKENS.safeguard.watch;
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
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'rgba(6,3,43,0.40)' }}>Caricamento…</p>
      </div>
    );
  }

  const hasKoraData = scoring?.status === 'ok';
  if (!hasKoraData) {
    return (
      <div style={{ padding: '32px 0' }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#06032B' }}>
          Decision Pack non ancora disponibile
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(6,3,43,0.52)', marginTop: 6 }}>
          Completa il processo di intake e scoring per generare il Decision Pack.
        </p>
        <a
          href="/api/company/decision-pack"
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 16, fontSize: '12px', color: TOKENS.accent, textDecoration: 'underline' }}
        >
          Apri Board Pack (struttura demo) →
        </a>
      </div>
    );
  }

  const output    = scoring!.koraIndex!;
  const aggregate = scoring!.aggregate!;
  const AR        = aggregate.activation_rate ?? 0;
  const MAR       = aggregate.meaningful_activation_rate ?? 0;
  const safeguard = activationSafeguardService.evaluate(AR, MAR);
  const safegTk   = safeguardToken(output.safeguard_status);

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

      {/* ── Lettura direzionale ────────────────────────────────────────────── */}
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem 1.5rem' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginBottom: 8 }}>
          Lettura direzionale — non certificativa
        </p>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.7 }}>
          KORA converte dati aggregati, KORA Index, Confidence Score, Safeguard e raccomandazioni in output direzionali.
          Il Decision Pack è un supporto informativo per il confronto interno — non una certificazione ESG, non un report regolatorio automatico,
          non un&apos;attestazione pubblica.
        </p>
      </div>

      {/* ── KORA Index™ live — KI, CS, Safeguard ─────────────────────────── */}
      <div style={{
        background:   TOKENS.surface,
        border:       `1px solid ${TOKENS.accent}44`,
        borderLeft:   `4px solid ${TOKENS.accent}`,
        borderRadius: TOKENS.cardRadius,
        padding:      '1.5rem',
      }}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.accent }}>
            KORA Decision Pack · La tua organizzazione
          </p>
          <span style={{ fontSize: '10px', fontWeight: 600, background: 'rgba(47,125,85,0.10)', color: '#2F7D55', borderRadius: 4, padding: '2px 8px', border: '1px solid rgba(47,125,85,0.22)' }}>
            LIVE
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-5 sm:grid-cols-3">
          <div style={{ background: TOKENS.inkBorder, borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 6 }}>KORA Index™</p>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2.5rem', color: TOKENS.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {output.kora_index_value}
            </p>
            <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 4 }}>/100</p>
          </div>
          <div style={{ background: `${TOKENS.accent}08`, border: `1px solid ${TOKENS.accent}22`, borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 6 }}>Confidence Score</p>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2.5rem', color: TOKENS.accent, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {(output.confidence_score * 100).toFixed(0)}%
            </p>
            <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 4 }}>indicatore esterno · peso 0</p>
          </div>
          <div style={{ background: safegTk.bg, border: `1px solid ${safegTk.dot}44`, borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: safegTk.text, opacity: 0.75, marginBottom: 6 }}>Activation Safeguard</p>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.75rem', color: safegTk.text, lineHeight: 1 }}>
              {safeguardLabel(output.safeguard_status)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pb-5" style={{ borderBottom: TOKENS.cardBorder, marginBottom: 20 }}>
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.safeguard.watch.text }}>pre_empirical_calibration</span>
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.safeguard.cap.text }}>production_ready: false</span>
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint }}>{aggregate.methodology_version_id}</span>
          {aggregate.reporting_period && (
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint }}>{aggregate.reporting_period}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/company/decision-pack"
            target="_blank" rel="noopener noreferrer"
            style={{ borderRadius: 6, background: TOKENS.ink, padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'none' }}
          >
            Apri Board Pack →
          </a>
          <span style={{ fontSize: '11px', color: TOKENS.inkHint }}>
            Usa Stampa / Salva come PDF dal browser (Cmd+P)
          </span>
        </div>
      </div>

      {/* ── ComponentBreakdown live — 10 componenti ───────────────────────── */}
      <SectionLabel>KORA Index™ — Scomposizione 10 componenti</SectionLabel>
      <KoraIndexHero output={output} />
      <ComponentBreakdown components={output.components} />

      {/* ── Activation Safeguard Panel live ───────────────────────────────── */}
      <SectionLabel>Activation Safeguard</SectionLabel>
      <ActivationSafeguardPanel result={safeguard} explanation={undefined} />

      {/* ── Export & distribuzione ─────────────────────────────────────────── */}
      <SectionLabel>Export & distribuzione</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
        <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65, marginBottom: 14 }}>
          Il Board Pack Preview è disponibile come documento stampabile PDF-ready.
          Export PDF automatico non attivo in Foundation Light — usare il browser per Salva come PDF.
        </p>
        <a
          href="/api/company/decision-pack"
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 6, background: TOKENS.ink, padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'none', marginBottom: 16 }}
        >
          Apri Board Pack →
          <span style={{ fontWeight: 400, fontSize: '10px', color: 'rgba(244,241,233,0.60)' }}>
            Stampa / Salva PDF dal browser (Cmd+P)
          </span>
        </a>
        <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>
          Report Excel, API export e distribuzione automatica sono disponibili in fase pilot.
        </p>
      </div>

      {/* ── KORA Contribution™ — dati non ancora disponibili in live ─────── */}
      <SectionLabel>KORA Contribution™ — Indicatore Companion</SectionLabel>
      <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.accent}33`, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span style={{ fontSize: '10px', fontWeight: 700, background: `${TOKENS.accent}14`, color: TOKENS.accent, borderRadius: 4, padding: '2px 7px' }}>
            Indicatore Companion
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint }}>
            not_kora_index_component: true
          </span>
        </div>
        <p style={{ fontSize: '12.5px', color: TOKENS.inkSecondary, lineHeight: 1.65, marginBottom: 12 }}>
          KORA Contribution™ misura il contributo collettivo e territoriale dell&apos;organizzazione oltre il perimetro interno.{' '}
          <strong style={{ color: TOKENS.ink }}>Non modifica e non influenza il KORA Index™.</strong>
        </p>
        <div style={{ fontSize: '13px', color: TOKENS.inkHint, background: TOKENS.inkBorder, borderRadius: 8, padding: '0.875rem 1rem' }}>
          KORA Contribution live sarà disponibile dopo la prima verifica di iniziative collettive con evidenza partner.
        </div>
      </div>

      {/* ── Normative Mapping Light ───────────────────────────────────────── */}
      <SectionLabel>Normative Mapping Light</SectionLabel>
      <NormativeMappingLightSection mapping={getNormativeMappingLight()} />

      {/* ── Confini metodologici ───────────────────────────────────────────── */}
      <SectionLabel>Confini metodologici e perimetro informativo</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginBottom: 12 }}>
          Decision Pack misura l&apos;organizzazione, non gli individui.
        </p>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            'KORA Foundation Light · pre_empirical_calibration — output direzionale, non certificazione pubblica o attestazione regolatoria.',
            'Confidence Score: indicatore esterno di affidabilità dati, peso = 0 nel KORA Index v1.0. Non è una componente del punteggio.',
            'Correlazione ≠ causalità — tutti i segnali KORA sono associativi, non predittivi.',
            'KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.',
          ].map((note) => (
            <li key={note} style={{ display: 'flex', gap: 8, fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>
              <span style={{ flexShrink: 0, color: TOKENS.inkHint, marginTop: 2 }}>·</span>
              {note}
            </li>
          ))}
        </ul>
      </div>

      <PrivacyBoundaryNote />

      <ProvenanceFooter
        methodologyVersionId={aggregate.methodology_version_id}
        calibrationStatus={aggregate.calibration_status}
        reportingPeriod={aggregate.reporting_period}
      />
    </div>
  );
}
