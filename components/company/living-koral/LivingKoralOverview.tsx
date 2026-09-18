'use client';

// components/company/living-koral/LivingKoralOverview.tsx
// KORA-WP-114 — Living KORAL Company Hub (V1 core, KORAL Mark excluded —
// Founder adjudication, .kora-audit/output/172_..._PRE_CHECK.md §31).
//
// Purely presentational — consumes the already-shaped
// LivingKoralCompanyView (lib/living-koral-company-view/types.ts) passed
// down from the Server Component page. Never imports Supabase, never
// reads a raw DB row, never computes Morphogenesis/recognition logic
// (this WP's own §5/§12 instruction — components consume service
// outputs, CLAUDE.md §12 principle 2).
//
// NO KORAL MARK ANYWHERE IN THIS FILE — no shape, color, geometry,
// generative visual, seal, glyph, SVG identity, canvas drawing, or
// "coming soon" placeholder (this WP's own §3, absolute). Current
// structural state is rendered as plain cards/typography only.
//
// NO evaluative language — Strengthening ≠ good, Weakening ≠ bad,
// Disappearance ≠ failure, Emergence ≠ success (this WP's own §2.B). No
// score/quality/health/performance/maturity/grade wording anywhere below.

import { TOKENS } from '@/lib/design/kora-design-tokens';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { EmptyState } from '@/components/ui/EmptyState';
import type { LivingKoralCompanyView } from '@/lib/living-koral-company-view/types';

function formatItalianDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

function cardStyle(): React.CSSProperties {
  return {
    background:   TOKENS.surface,
    border:       TOKENS.cardBorder,
    borderRadius: TOKENS.cardRadius,
    boxShadow:    TOKENS.cardShadow,
    padding:      '24px 28px',
  };
}

function label(text: string): React.ReactElement {
  return (
    <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 4 }}>
      {text}
    </p>
  );
}

function value(text: string, size = 15): React.ReactElement {
  return (
    <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: size, fontWeight: 600, color: TOKENS.ink, lineHeight: 1.4 }}>
      {text}
    </p>
  );
}

interface Props {
  view: LivingKoralCompanyView;
}

export function LivingKoralOverview({ view }: Props) {
  return (
    <div style={{ maxWidth: 880 }}>
      <PageHeader
        eyebrow="Living KORAL"
        title="La tua Living KORAL"
        subline="L'identità organizzativa della tua azienda su KORA, costruita esclusivamente da trasformazioni organizzative reali e riconosciute."
      />

      {view.status === 'no_state_yet' && (
        <EmptyState
          title="Nessuna trasformazione organizzativa riconosciuta finora"
          body="La Living KORAL della tua azienda comparirà qui non appena KORA riconoscerà la prima trasformazione organizzativa reale — ad esempio l'attivazione o la conclusione di un'iniziativa aziendale. Non è un errore: significa semplicemente che nessuna trasformazione è stata ancora riconosciuta."
        />
      )}

      {view.status === 'integrity_error' && (
        <EmptyState
          variant="warning"
          title="Dati Living KORAL temporaneamente non disponibili"
          body="Non è stato possibile caricare correttamente lo stato Living KORAL della tua azienda in questo momento. Il team KORA è stato informato. Riprova più tardi o contatta il tuo KORA Admin."
        />
      )}

      {view.status === 'ok' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <section>
            <SectionLabel>Stato attuale</SectionLabel>
            <div style={cardStyle()}>
              <div style={{ marginBottom: 18 }}>
                {label('Revisione corrente')}
                {value(String(view.revision ?? 0), 20)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(view.regions ?? []).map((region) => (
                  <div key={region.domain} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `1px solid ${TOKENS.inkBorder}`, paddingTop: 12 }}>
                    <span style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 13.5, color: TOKENS.inkSecondary }}>
                      {region.domainLabel}
                    </span>
                    <span style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 15, fontWeight: 700, color: TOKENS.ink }}>
                      {region.elementCount}
                    </span>
                  </div>
                ))}
                {(view.regions ?? []).length === 0 && (
                  <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 13, color: TOKENS.inkHint }}>
                    Nessuna area strutturale attiva al momento.
                  </p>
                )}
              </div>
            </div>
          </section>

          {view.latestTransformation && (
            <section>
              <SectionLabel>Ultima trasformazione riconosciuta</SectionLabel>
              <div style={cardStyle()}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div>
                    {label('Categoria')}
                    {value(view.latestTransformation.categoryLabel)}
                  </div>
                  <div>
                    {label('Area')}
                    {value(view.latestTransformation.domainLabel)}
                  </div>
                  <div>
                    {label('Avvenuta il')}
                    {value(formatItalianDate(view.latestTransformation.occurredAt))}
                  </div>
                  <div>
                    {label('Riconosciuta da KORA il')}
                    {value(formatItalianDate(view.latestTransformation.recognizedAt))}
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${TOKENS.inkBorder}`, paddingTop: 16 }}>
                  {label('Perché KORA ha riconosciuto questa trasformazione')}
                  <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 14, color: TOKENS.inkSecondary, lineHeight: 1.6, marginTop: 4 }}>
                    {view.latestTransformation.categoryDescription}
                  </p>
                  {view.latestTransformation.sourceLabel && (
                    <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 14, color: TOKENS.ink, lineHeight: 1.6, marginTop: 10 }}>
                      Origine: <strong>{view.latestTransformation.sourceLabel}</strong>
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
