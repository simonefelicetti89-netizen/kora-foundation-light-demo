'use client';

// components/company/living-koral/EditionsArchive.tsx
// KORA-WP-115 — KORAL Edition (Portrait folded into Edition).
//
// Purely presentational + a narrow client-side fetch/submit layer —
// consumes the already-shaped LivingKoralEditionView (lib/living-koral-
// edition/edition-view.ts) exclusively; never imports Supabase, never
// reads a raw DB row (CLAUDE.md §12 principle 2, matching
// LivingKoralOverview.tsx's own established discipline).
//
// ARCHIVE, NOT PROGRESSION — chronology (createdAt DESC) is display
// ordering only, never a quality/maturity progression (this WP's own
// §12 instruction). No score deltas, no improvement arrows, no good/bad
// language. Multiple Editions may legitimately reference the identical
// frozen Living KORAL moment (Founder adjudication #3) — rendered as
// distinct, independently Company-named archival records, never implying
// different organizational states.
//
// NO KORAL MARK, NO VISUAL GRAMMAR ANYWHERE IN THIS FILE — no shape,
// color, geometry, generative visual, seal, glyph, SVG identity, canvas
// drawing, image, or download/export/share/publish control of any kind
// (Founder adjudication #4, this WP's own §13 boundary). The narrative/
// document-form Portrait is plain text only, derived entirely from
// LivingKoralEditionView's own already-frozen fields.
//
// NO rename/edit/delete/annotate/comparison control — an Edition is
// immutable once created; this component offers exactly two actions:
// view the archive, create a new Edition (this WP's own §10 boundary).

import { useState } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { EmptyState } from '@/components/ui/EmptyState';
import type { LivingKoralEditionView } from '@/lib/living-koral-edition/edition-view';

function formatItalianDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

function cardStyle(): React.CSSProperties {
  return {
    background: TOKENS.surface,
    border: TOKENS.cardBorder,
    borderRadius: TOKENS.cardRadius,
    boxShadow: TOKENS.cardShadow,
    padding: '22px 26px',
  };
}

function label(text: string): React.ReactElement {
  return (
    <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 4 }}>
      {text}
    </p>
  );
}

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `edition-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const ERROR_MESSAGES: Record<string, string> = {
  conflict: 'Questa creazione è già stata inviata con un nome diverso. Ricarica e riprova con un nuovo nome.',
  in_progress: 'La creazione è già in corso — attendi qualche istante.',
  no_recognized_transformation: 'Nessuna trasformazione organizzativa riconosciuta da preservare al momento.',
  invalid_name: 'Inserisci un nome per l\'Edizione (massimo 200 caratteri).',
};

interface Props {
  initialEditions: LivingKoralEditionView[];
  /** Whether the Company currently has an eligible Living KORAL state to freeze — mirrors app/company/living-koral's own status !== 'no_state_yet' check. No creation is offered when false (nothing exists yet to preserve). */
  canCreate: boolean;
}

export function EditionsArchive({ initialEditions, canCreate }: Props) {
  const [editions, setEditions] = useState<LivingKoralEditionView[]>(initialEditions);
  const [name, setName] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => newIdempotencyKey());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/company/living-koral/editions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, idempotencyKey }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setEditions((prev) => [data.edition as LivingKoralEditionView, ...prev]);
        setName('');
        setIdempotencyKey(newIdempotencyKey()); // a NEW distinct creation gets a NEW key — this WP's own §3 adjudication
      } else {
        setError(ERROR_MESSAGES[data.error] ?? data.error ?? 'Non è stato possibile creare l\'Edizione.');
      }
    } catch {
      setError('Errore di rete — riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 28 }}>
      {canCreate && (
        <section>
          <SectionLabel>Preserva il momento attuale</SectionLabel>
          <div style={cardStyle()}>
            <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 13.5, color: TOKENS.inkSecondary, lineHeight: 1.6, marginBottom: 16 }}>
              Crea un’Edizione per conservare, in modo permanente, la Living KORAL della tua azienda così com’è oggi. La Living KORAL corrente continuerà a evolvere: questa Edizione resterà invariata.
            </p>
            <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome dell’Edizione (es. “Chiusura Q1 2026”)"
                maxLength={200}
                disabled={submitting}
                style={{
                  flex: '1 1 280px',
                  padding: '10px 14px',
                  fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                  fontSize: 13.5,
                  color: TOKENS.ink,
                  border: TOKENS.cardBorderStrong,
                  borderRadius: 10,
                  background: TOKENS.canvas,
                }}
              />
              <button
                type="submit"
                disabled={submitting || name.trim().length === 0}
                style={{
                  padding: '10px 20px',
                  fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  background: submitting || name.trim().length === 0 ? TOKENS.inkBorderStrong : TOKENS.accent,
                  border: 'none',
                  borderRadius: 10,
                  cursor: submitting || name.trim().length === 0 ? 'default' : 'pointer',
                }}
              >
                {submitting ? 'Creazione in corso…' : 'Crea Edizione'}
              </button>
            </form>
            {error && (
              <p role="alert" style={{ marginTop: 10, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 12.5, color: TOKENS.safeguard.watch.text }}>
                {error}
              </p>
            )}
          </div>
        </section>
      )}

      <section>
        <SectionLabel>Archivio Edizioni</SectionLabel>
        {editions.length === 0 ? (
          <EmptyState
            title="Nessuna Edizione preservata finora"
            body="Le Edizioni che crei per conservare la Living KORAL della tua azienda in un momento specifico compariranno qui."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {editions.map((edition) => (
              <div key={edition.id} style={cardStyle()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 16, fontWeight: 700, color: TOKENS.ink }}>
                    {edition.name}
                  </p>
                  <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 11.5, color: TOKENS.inkMeta }}>
                    Creata il {formatItalianDate(edition.createdAt)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    {label('Categoria')}
                    <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 14, fontWeight: 600, color: TOKENS.ink }}>{edition.categoryLabel}</p>
                  </div>
                  <div>
                    {label('Area')}
                    <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 14, fontWeight: 600, color: TOKENS.ink }}>{edition.domainLabel}</p>
                  </div>
                  <div>
                    {label('Avvenuta il')}
                    <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 14, fontWeight: 600, color: TOKENS.ink }}>{formatItalianDate(edition.occurredAt)}</p>
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${TOKENS.inkBorder}`, paddingTop: 12 }}>
                  <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 13.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
                    {edition.categoryDescription}
                  </p>
                  {edition.sourceLabel && (
                    <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 13.5, color: TOKENS.ink, marginTop: 8 }}>
                      Origine: <strong>{edition.sourceLabel}</strong>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
