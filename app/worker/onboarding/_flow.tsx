'use client';

// app/worker/onboarding/_flow.tsx
// B113: Worker Onboarding & Privacy Consent — 5-step multi-step flow.
// Pure display and interaction — no employer-visible data.
// NEVER shows rankings, comparisons, or individual data to employer.
// Privacy boundary is explained clearly before any consent is recorded.
//
// KORA-WP-129 Wave 4b (W3A) — migrated onto the Product Experience system.
// The five steps, their order, their copy, the consent gate, the API call and
// every redirect are unchanged: this is a presentation migration. What changed
// is that the surface now composes inside the Worker shell using the canonical
// type roles and spacing scale instead of a floating card with its own scale.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SPACE, PILLAR_COLORS, PX, typeStyle } from '@/lib/design/kora-design-tokens';
import { PageHead, Region, Notice, Body, Secondary, Meta, Section } from '@/components/ui/px';
import { Field, PrimaryAction, SecondaryAction, entryInputStyle } from '../_entry/entry-ui';

const TOTAL_STEPS = 5;

const STEP_NAMES = ['Benvenuto', "Cosa vede l'azienda", 'Cosa vedi tu', 'Consenso privacy', 'Il tuo profilo'] as const;

// ── Pillar colors (informational, not scoring) ────────────────────────────────

const PILLAR_ITEMS = [
  { code: 'LIFE',       label: 'Life',       color: PILLAR_COLORS.LIFE,       desc: 'Salute, benessere, prevenzione' },
  { code: 'GROWTH',     label: 'Growth',     color: PILLAR_COLORS.GROWTH,     desc: 'Formazione, competenze, sviluppo' },
  { code: 'CONNECTION', label: 'Connection', color: PILLAR_COLORS.CONNECTION, desc: 'Mentoring, collaborazione' },
  { code: 'IMPACT',     label: 'Impact',     color: PILLAR_COLORS.IMPACT,     desc: 'Volontariato, iniziative sociali' },
  { code: 'LEGACY',     label: 'Legacy',     color: PILLAR_COLORS.LEGACY,     desc: 'Trasmissione conoscenza' },
];

// ── Shared UI atoms ───────────────────────────────────────────────────────────

/** Progress the reader can locate themselves in, without a stepper competing
 *  with the step's own heading for attention. */
function StepProgress({ current }: { current: number }) {
  return (
    <div style={{ display: 'grid', gap: 10, marginBottom: SPACE.lg }}>
      <Meta style={{ color: PX.ink3 }}>
        Passo {current} di {TOTAL_STEPS} · {STEP_NAMES[current - 1]}
      </Meta>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={current}
        aria-label="Avanzamento onboarding"
        style={{ display: 'flex', gap: SPACE.xs }}
      >
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 3, borderRadius: PX.rPill,
              background: i < current ? PX.ink : PX.inkWash,
              transition: `background ${PX.t3} ${PX.ease}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** A line of the privacy boundary. The mark carries the sense, not the colour. */
function BoundaryLine({ text, positive }: { text: string; positive: boolean }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, listStyle: 'none', margin: 0 }}>
      <span
        aria-hidden="true"
        style={{ flex: 'none', width: 16, textAlign: 'center', fontWeight: 700, lineHeight: 1.5, color: positive ? PX.ok : PX.inkMute }}
      >
        {positive ? '✓' : '·'}
      </span>
      <Secondary as="span" style={{ color: PX.ink2 }}>{text}</Secondary>
    </li>
  );
}

function BoundaryList({ label, items, positive }: { label: string; items: string[]; positive: boolean }) {
  return (
    <div style={{ display: 'grid', gap: SPACE.sm }}>
      <Meta style={{ color: PX.ink3 }}>{label}</Meta>
      <ul style={{ display: 'grid', gap: SPACE.sm, margin: 0, padding: 0 }}>
        {items.map((t) => <BoundaryLine key={t} text={t} positive={positive} />)}
      </ul>
    </div>
  );
}

function StepNav({
  onBack, onNext, nextLabel, nextDisabled, loading,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: SPACE.sm, marginTop: SPACE.xl, flexWrap: 'wrap' }}>
      {onBack && <SecondaryAction onClick={onBack}>Indietro</SecondaryAction>}
      {/* The primary is sized, not stretched: a button that grows to fill the
          row reads as a bar, and stops reading as a decision. It still shrinks
          to share the row with Indietro on a narrow viewport. */}
      <div style={{ flex: '0 1 280px', minWidth: 200 }}>
        <PrimaryAction onClick={onNext} disabled={nextDisabled} busy={loading} full>
          {loading ? 'Salvataggio…' : (nextLabel ?? 'Continua')}
        </PrimaryAction>
      </div>
    </div>
  );
}

// ── Step 1 — Benvenuto ────────────────────────────────────────────────────────

function Step1Benvenuto({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <Section style={{ margin: '0 0 12px' }}>Il tuo spazio privato di attivazione</Section>
      <div style={{ display: 'grid', gap: SPACE.md }}>
        <Body style={{ margin: 0, color: PX.ink2 }}>
          <strong style={{ color: PX.ink }}>KORA è una piattaforma di intelligenza organizzativa.</strong>{' '}
          Aiuta la tua azienda a capire come si attiva collettivamente — non a valutare singoli lavoratori.
        </Body>
        <Body style={{ margin: 0, color: PX.ink2 }}>
          Il tuo spazio in KORA è <strong style={{ color: PX.ink }}>privato</strong>. Puoi registrare le iniziative a cui partecipi,
          tenere note personali e costruire un profilo di attivazione per pillar.
        </Body>

        <div style={{ display: 'grid', gap: SPACE.sm, marginTop: SPACE.sm }}>
          <Meta style={{ color: PX.ink3 }}>I 5 pillar KORA</Meta>
          <ul style={{ display: 'grid', gap: SPACE.sm, margin: 0, padding: 0 }}>
            {PILLAR_ITEMS.map((p) => (
              <li key={p.code} style={{ display: 'flex', alignItems: 'baseline', gap: 10, listStyle: 'none', margin: 0 }}>
                <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: PX.rPill, background: p.color, flex: 'none', display: 'inline-block' }} />
                <Secondary as="span" style={{ color: PX.ink, fontWeight: 600, flex: 'none' }}>{p.label}</Secondary>
                <Secondary as="span" style={{ color: PX.ink3 }}>{p.desc}</Secondary>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <StepNav onNext={onNext} />
    </div>
  );
}

// ── Step 2 — Cosa vede l'azienda ──────────────────────────────────────────────

function Step2CosaVedeAzienda({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <Section style={{ margin: '0 0 12px' }}>Il tuo datore di lavoro vede solo aggregati anonimi</Section>
      <Body style={{ margin: 0, color: PX.ink2 }}>
        L&apos;azienda riceve dati collettivi sull&apos;organizzazione — mai dati individuali su di te.
      </Body>

      <div style={{ display: 'grid', gap: SPACE.lg, marginTop: SPACE.lg }}>
        <BoundaryList
          label="L'azienda vede"
          positive
          items={[
            'Solo dati aggregati — mai dati individuali',
            'Solo se ci sono almeno 10 lavoratori nel conteggio (soglia privacy)',
            'Quote di partecipazione per pillar — senza nomi né identificativi',
          ]}
        />
        <BoundaryList
          label="L'azienda non vede mai"
          positive={false}
          items={[
            'Il tuo profilo individuale',
            'Le tue scelte e partecipazioni specifiche',
            'Le tue note private',
            'Il tuo storico personale',
            'Nessun ranking o confronto tra lavoratori',
            'Dati sotto soglia — se il gruppo è troppo piccolo, il dato viene soppresso',
          ]}
        />
      </div>

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ── Step 3 — Cosa vedi tu ─────────────────────────────────────────────────────

function Step3CosaVediTu({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <Section style={{ margin: '0 0 12px' }}>Il tuo spazio — tutto tuo, sempre privato</Section>
      <Body style={{ margin: 0, color: PX.ink2 }}>
        Il tuo workspace KORA è il tuo spazio di attivazione personale.
        Puoi esplorare le iniziative disponibili nella tua azienda e tenere traccia della tua partecipazione.
      </Body>

      <div style={{ marginTop: SPACE.lg }}>
        <BoundaryList
          label="Nel tuo spazio trovi"
          positive
          items={[
            'Le iniziative pubblicate dalla tua azienda',
            'Il tuo storico personale di partecipazione',
            'Il tuo profilo privato per pillar (visibile solo a te)',
            'Le tue note personali (mai visibili all\'azienda)',
            'Il tuo Dynamic Impact CV e la rete partner — disponibili nel tuo spazio',
          ]}
        />
      </div>

      <div style={{ marginTop: SPACE.lg }}>
        <Notice tone="info">
          <strong>Importante:</strong> il tuo profilo per pillar non è una valutazione individuale.
          Non genera ranking, non viene confrontato con altri lavoratori e non viene condiviso con l&apos;azienda.
        </Notice>
      </div>

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ── Step 4 — Consenso privacy operativo ──────────────────────────────────────

function Step4Consenso({
  onBack, onNext, accepted, setAccepted,
}: {
  onBack: () => void;
  onNext: () => void;
  accepted: boolean;
  setAccepted: (v: boolean) => void;
}) {
  return (
    <div>
      <Section style={{ margin: '0 0 12px' }}>Prima di iniziare</Section>
      <Body style={{ margin: 0, color: PX.ink2 }}>
        Conferma di aver compreso come funziona il boundary privacy di KORA.
        Non è un documento legale — è una dichiarazione di comprensione operativa.
      </Body>

      <div style={{ marginTop: SPACE.lg }}>
        <label
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer',
            background: accepted ? PX.okTint : PX.l2,
            border: `1px solid ${accepted ? PX.ok : PX.l2Edge}`,
            borderRadius: PX.rInner, padding: SPACE.md,
            transition: `background ${PX.t3} ${PX.ease}, border-color ${PX.t3} ${PX.ease}`,
          }}
        >
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: PX.ok, marginTop: 2, flexShrink: 0, cursor: 'pointer' }}
            aria-label="Accetta il boundary privacy KORA"
          />
          <Body as="span" style={{ margin: 0, color: PX.ink }}>
            Ho compreso che il mio profilo individuale resta privato e che l&apos;azienda vede solo dati aggregati anonimi.
            Capisco che KORA misura l&apos;organizzazione, non valuta me come individuo.
          </Body>
        </label>
      </div>

      {!accepted && (
        <Secondary style={{ margin: '12px 0 0', color: PX.ink3 }}>
          È necessario confermare la comprensione del boundary privacy per accedere al tuo spazio KORA.
        </Secondary>
      )}

      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!accepted} />
    </div>
  );
}

// ── Step 5 — Profilo minimo ───────────────────────────────────────────────────

function Step5Profilo({
  onBack, onComplete, displayName, setDisplayName, lang, setLang, loading, error,
}: {
  onBack: () => void;
  onComplete: () => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  lang: 'it' | 'en';
  setLang: (v: 'it' | 'en') => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div>
      <Section style={{ margin: '0 0 12px' }}>Un ultimo passo</Section>
      <Body style={{ margin: 0, color: PX.ink2 }}>
        Puoi personalizzare come appari nel tuo spazio. Tutto è facoltativo.
      </Body>

      <div style={{ display: 'grid', gap: SPACE.lg, marginTop: SPACE.lg }}>
        <Field
          id="display-name"
          label="Nome visualizzato (opzionale)"
          hint="Non visibile all'azienda. Usato solo nel tuo spazio personale."
        >
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="text"
              placeholder="Es. Mario R."
              aria-label="Nome visualizzato (opzionale)"
              aria-describedby={describedBy}
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
              style={entryInputStyle(invalid)}
              onFocus={(e) => { e.currentTarget.style.borderColor = PX.violet; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = PX.line2; }}
            />
          )}
        </Field>

        <div style={{ display: 'grid', gap: SPACE.sm }}>
          <Meta style={{ color: PX.ink3 }}>Lingua preferita</Meta>
          <div role="group" aria-label="Lingua preferita" style={{ display: 'flex', gap: SPACE.sm }}>
            {(['it', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                disabled={loading}
                aria-pressed={lang === l}
                style={{
                  ...typeStyle('secondary', { weight: 600 }),
                  padding: '10px 20px', minHeight: 44, borderRadius: PX.rCtl, cursor: 'pointer',
                  border: `1px solid ${lang === l ? PX.ink : PX.line2}`,
                  background: lang === l ? PX.ink : PX.l1,
                  color: lang === l ? '#fff' : PX.ink2,
                  transition: `background ${PX.t2} ${PX.ease}, border-color ${PX.t2} ${PX.ease}`,
                }}
              >
                {l === 'it' ? 'Italiano' : 'English'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div role="alert">
            <Notice tone="risk">{error}</Notice>
          </div>
        )}
      </div>

      <StepNav onBack={onBack} onNext={onComplete} nextLabel="Accedi al mio spazio" loading={loading} />
    </div>
  );
}

// ── Review mode — already completed ──────────────────────────────────────────

function ReviewMode() {
  const router = useRouter();

  return (
    <div>
      <Notice tone="ok">
        <strong>Privacy boundary attivo.</strong> Hai già completato l&apos;onboarding KORA.
        Questa è una revisione del boundary privacy — nessun nuovo consenso richiesto.
      </Notice>

      <div style={{ marginTop: SPACE.lg }}>
        <Section style={{ margin: '0 0 16px' }}>Il boundary privacy KORA</Section>

        <div style={{ display: 'grid', gap: SPACE.lg }}>
          <BoundaryList
            label="Cosa vede l'azienda"
            positive
            items={[
              'Solo dati aggregati — mai dati individuali',
              'Solo se ci sono almeno 10 lavoratori nel conteggio',
              'Quote di partecipazione per pillar — senza identificativi',
            ]}
          />
          <BoundaryList
            label="L'azienda non vede mai"
            positive={false}
            items={[
              'Il tuo profilo individuale, storico o note private',
              'Nessun ranking o confronto tra lavoratori',
            ]}
          />
        </div>
      </div>

      <div style={{ marginTop: SPACE.xl }}>
        <PrimaryAction onClick={() => router.push('/worker/workspace')} full>
          Torna al tuo spazio
        </PrimaryAction>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  reviewMode: boolean;
  initialDisplayName: string | null;
  initialLang: 'it' | 'en';
}

export function OnboardingFlow({ reviewMode, initialDisplayName, initialLang }: OnboardingFlowProps) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [accepted, setAccepted] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '');
  const [lang, setLang] = useState<'it' | 'en'>(initialLang);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/worker/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptPrivacyBoundary: true,
          display_name:  displayName.trim() || undefined,
          preferred_lang: lang,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Errore nel salvataggio. Riprova.');
        setLoading(false);
        return;
      }

      router.push('/worker/workspace');
    } catch {
      setError('Errore di rete. Controlla la connessione e riprova.');
      setLoading(false);
    }
  }

  if (reviewMode) {
    return (
      // W3A remediation: the entry shell now owns the reading measure and the
    // centring (components/layout/entry-shell.module.css). Keeping a second
    // cap here stranded the column inside its own container on a narrow
    // viewport, which is the defect the shell change was meant to remove.
    <div>
        <PageHead eyebrow="My KORA · Privacy" title="Revisione del boundary privacy" />
        <Region>
          <ReviewMode />
        </Region>
      </div>
    );
  }

  return (
    // W3A remediation: the entry shell now owns the reading measure and the
    // centring (components/layout/entry-shell.module.css). Keeping a second
    // cap here stranded the column inside its own container on a narrow
    // viewport, which is the defect the shell change was meant to remove.
    <div>
      <PageHead
        eyebrow="My KORA · Primo accesso"
        title="Benvenuto in KORA"
        lead="Cinque passaggi per capire cosa vede la tua azienda, cosa resta privato e come impostare il tuo spazio."
      />

      <StepProgress current={step} />

      <Region>
        {step === 1 && <Step1Benvenuto onNext={() => setStep(2)} />}
        {step === 2 && <Step2CosaVedeAzienda onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && <Step3CosaVediTu onBack={() => setStep(2)} onNext={() => setStep(4)} />}
        {step === 4 && (
          <Step4Consenso
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
            accepted={accepted}
            setAccepted={setAccepted}
          />
        )}
        {step === 5 && (
          <Step5Profilo
            onBack={() => setStep(4)}
            onComplete={handleComplete}
            displayName={displayName}
            setDisplayName={setDisplayName}
            lang={lang}
            setLang={setLang}
            loading={loading}
            error={error}
          />
        )}
      </Region>

      {/* W3A remediation — trust, not build metadata. `Privacy Consent v1.0`
          was a version label that did not even match the canonical value the
          server records (`B113-v1.0`, app/api/worker/onboarding/route.ts), and
          the consent version is persisted server-side regardless of what this
          line says. `KORA Foundation Light` is a build label, required on KORA
          Index surfaces (CLAUDE.md §6) and not on this one. Neither is pinned
          by any test. What remains is the sentence that is Product truth. */}
      <Secondary style={{ margin: '16px 0 0', color: PX.ink3 }}>
        Il tuo datore di lavoro non vede questi dati.
      </Secondary>
    </div>
  );
}
