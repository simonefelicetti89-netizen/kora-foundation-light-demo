'use client';

// app/worker/onboarding/_flow.tsx
// B113: Worker Onboarding & Privacy Consent — 5-step multi-step flow.
// Pure display and interaction — no employer-visible data.
// NEVER shows rankings, comparisons, or individual data to employer.
// Privacy boundary is explained clearly before any consent is recorded.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';
const INK = '#06032B';

const TOTAL_STEPS = 5;

// ── Pillar colors (informational, not scoring) ────────────────────────────────

const PILLAR_ITEMS = [
  { code: 'LIFE',       label: 'Life',       color: '#16a34a', desc: 'Salute, benessere, prevenzione' },
  { code: 'GROWTH',     label: 'Growth',     color: '#2563eb', desc: 'Formazione, competenze, sviluppo' },
  { code: 'CONNECTION', label: 'Connection', color: '#9333ea', desc: 'Mentoring, collaborazione' },
  { code: 'IMPACT',     label: 'Impact',     color: '#dc2626', desc: 'Volontariato, iniziative sociali' },
  { code: 'LEGACY',     label: 'Legacy',     color: '#ca8a04', desc: 'Trasmissione conoscenza' },
];

// ── Shared UI atoms ───────────────────────────────────────────────────────────

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 28 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 99,
            background: i < current ? INK : 'rgba(6,3,43,0.12)',
            transition: 'background 300ms ease',
          }}
        />
      ))}
    </div>
  );
}

function StepLabel({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <span style={{
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
        fontWeight: 700,
        color: 'rgba(6,3,43,0.35)',
        background: 'rgba(6,3,43,0.05)',
        borderRadius: 4,
        padding: '2px 7px',
        flexShrink: 0,
      }}>
        {String(n).padStart(2, '0')}/{String(TOTAL_STEPS).padStart(2, '0')}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.38)' }}>
        {label}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.025em', color: INK, marginBottom: 12, lineHeight: 1.2 }}>
      {children}
    </h2>
  );
}

function BodyText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: FONT, fontSize: 13, color: 'rgba(6,3,43,0.65)', lineHeight: 1.65, margin: 0 }}>
      {children}
    </p>
  );
}

function PrivacyChip({ text, positive }: { text: string; positive: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      background: positive ? 'rgba(22,101,52,0.07)' : 'rgba(6,3,43,0.04)',
      border: positive ? '1px solid rgba(22,101,52,0.18)' : '1px solid rgba(6,3,43,0.09)',
      borderRadius: 8, padding: '10px 12px',
    }}>
      <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{positive ? '✓' : '·'}</span>
      <span style={{ fontFamily: FONT, fontSize: 12, color: positive ? '#1a4731' : 'rgba(6,3,43,0.60)', lineHeight: 1.5 }}>
        {text}
      </span>
    </div>
  );
}

function NavButtons({
  onBack, onNext, nextLabel, nextDisabled, loading,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            fontFamily: FONT, fontSize: 13, fontWeight: 600,
            background: 'none', border: '1px solid rgba(6,3,43,0.14)',
            borderRadius: 10, padding: '11px 20px',
            color: 'rgba(6,3,43,0.55)', cursor: 'pointer',
            transition: 'border-color 150ms ease',
          }}
        >
          ← Indietro
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || loading}
        style={{
          flex: 1, fontFamily: FONT, fontWeight: 700, fontSize: 13,
          background: (nextDisabled || loading) ? 'rgba(6,3,43,0.30)' : INK,
          color: '#fff', border: 'none', borderRadius: 10,
          padding: '12px 20px', cursor: (nextDisabled || loading) ? 'not-allowed' : 'pointer',
          transition: 'background 150ms ease', minHeight: 44,
        }}
      >
        {loading ? 'Salvataggio…' : (nextLabel ?? 'Continua →')}
      </button>
    </div>
  );
}

// ── Step 1 — Benvenuto ────────────────────────────────────────────────────────

function Step1Benvenuto({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <StepLabel n={1} label="Benvenuto" />
      <SectionTitle>Il tuo spazio privato di attivazione</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
        <BodyText>
          <strong style={{ color: INK }}>KORA è una piattaforma di intelligenza organizzativa.</strong>{' '}
          Aiuta la tua azienda a capire come si attiva collettivamente — non a valutare singoli lavoratori.
        </BodyText>
        <BodyText>
          Il tuo spazio in KORA è <strong style={{ color: INK }}>privato</strong>. Puoi registrare le iniziative a cui partecipi,
          tenere note personali e costruire un profilo di attivazione per pillar.
        </BodyText>
        <div style={{
          background: 'rgba(6,3,43,0.03)', border: '1px solid rgba(6,3,43,0.08)',
          borderRadius: 10, padding: '16px 18px', marginTop: 4,
        }}>
          <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(6,3,43,0.40)', marginBottom: 10 }}>
            I 5 pillar KORA
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {PILLAR_ITEMS.map(p => (
              <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: INK, flexShrink: 0 }}>{p.label}</span>
                <span style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(6,3,43,0.45)' }}>{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <NavButtons onNext={onNext} />
    </div>
  );
}

// ── Step 2 — Cosa vede l'azienda ──────────────────────────────────────────────

function Step2CosaVedeAzienda({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <StepLabel n={2} label="Cosa vede l'azienda" />
      <SectionTitle>Il tuo datore di lavoro vede solo aggregati anonimi</SectionTitle>
      <BodyText>
        L&apos;azienda riceve dati collettivi sull&apos;organizzazione — mai dati individuali su di te.
      </BodyText>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(6,3,43,0.40)', marginBottom: 4 }}>
          L&apos;azienda vede
        </p>
        {[
          'Solo dati aggregati — mai dati individuali',
          'Solo se ci sono almeno 10 lavoratori nel conteggio (soglia privacy)',
          'Quote di partecipazione per pillar — senza nomi né identificativi',
        ].map(t => <PrivacyChip key={t} text={t} positive={true} />)}
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(6,3,43,0.40)', marginBottom: 4 }}>
          L&apos;azienda non vede mai
        </p>
        {[
          'Il tuo profilo individuale',
          'Le tue scelte e partecipazioni specifiche',
          'Le tue note private',
          'Il tuo storico personale',
          'Nessun ranking o confronto tra lavoratori',
          'Dati sotto soglia — se il gruppo è troppo piccolo, il dato viene soppresso',
        ].map(t => <PrivacyChip key={t} text={t} positive={false} />)}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ── Step 3 — Cosa vedi tu ─────────────────────────────────────────────────────

function Step3CosaVediTu({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <StepLabel n={3} label="Cosa vedi tu" />
      <SectionTitle>Il tuo spazio — tutto tuo, sempre privato</SectionTitle>
      <BodyText>
        Il tuo workspace KORA è il tuo spazio di attivazione personale.
        Puoi esplorare le iniziative disponibili nella tua azienda e tenere traccia della tua partecipazione.
      </BodyText>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          'Le iniziative pubblicate dalla tua azienda',
          'Il tuo storico personale di partecipazione',
          'Il tuo profilo privato per pillar (visibile solo a te)',
          'Le tue note personali (mai visibili all\'azienda)',
          'Il tuo Dynamic Impact CV e la rete partner — disponibili nel tuo spazio',
        ].map(t => <PrivacyChip key={t} text={t} positive={true} />)}
      </div>

      <div style={{
        marginTop: 18,
        background: 'rgba(6,3,43,0.03)', border: '1px solid rgba(6,3,43,0.08)',
        borderRadius: 8, padding: '12px 14px',
      }}>
        <p style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(6,3,43,0.55)', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: INK }}>Importante:</strong> il tuo profilo per pillar non è una valutazione individuale.
          Non genera ranking, non viene confrontato con altri lavoratori e non viene condiviso con l&apos;azienda.
        </p>
      </div>

      <NavButtons onBack={onBack} onNext={onNext} />
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
      <StepLabel n={4} label="Consenso privacy" />
      <SectionTitle>Prima di iniziare</SectionTitle>
      <BodyText>
        Conferma di aver compreso come funziona il boundary privacy di KORA.
        Non è un documento legale — è una dichiarazione di comprensione operativa.
      </BodyText>

      <div style={{ marginTop: 22 }}>
        <label
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer',
            background: accepted ? 'rgba(22,101,52,0.06)' : 'rgba(6,3,43,0.03)',
            border: accepted ? '1.5px solid rgba(22,101,52,0.25)' : '1.5px solid rgba(6,3,43,0.12)',
            borderRadius: 10, padding: '16px 16px',
            transition: 'background 200ms ease, border-color 200ms ease',
          }}
        >
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#166534', marginTop: 2, flexShrink: 0, cursor: 'pointer' }}
            aria-label="Accetta il boundary privacy KORA"
          />
          <span style={{ fontFamily: FONT, fontSize: 13, color: INK, lineHeight: 1.65 }}>
            Ho compreso che il mio profilo individuale resta privato e che l&apos;azienda vede solo dati aggregati anonimi.
            Capisco che KORA misura l&apos;organizzazione, non valuta me come individuo.
          </span>
        </label>
      </div>

      {!accepted && (
        <p style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(6,3,43,0.45)', marginTop: 10, lineHeight: 1.5 }}>
          È necessario confermare la comprensione del boundary privacy per accedere al tuo spazio KORA.
        </p>
      )}

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!accepted}
      />
    </div>
  );
}

// ── Step 5 — Profilo minimo ───────────────────────────────────────────────────

function Step5Profilo({
  onBack,
  onComplete,
  displayName,
  setDisplayName,
  lang,
  setLang,
  loading,
  error,
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
  const inputStyle: React.CSSProperties = {
    fontFamily: FONT, fontSize: 14, color: INK,
    background: '#fff', border: '1px solid rgba(6,3,43,0.14)',
    borderRadius: 10, padding: '11px 14px', width: '100%',
    outline: 'none', display: 'block',
    transition: 'border-color 200ms ease',
  };

  return (
    <div>
      <StepLabel n={5} label="Il tuo profilo" />
      <SectionTitle>Un ultimo passo</SectionTitle>
      <BodyText>
        Puoi personalizzare come appari nel tuo spazio. Tutto è facoltativo.
      </BodyText>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 22 }}>
        <div>
          <label style={{ display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(6,3,43,0.50)', marginBottom: 6 }}>
            Nome visualizzato (opzionale)
          </label>
          <input
            type="text"
            placeholder="Es. Mario R."
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#C76F3D'; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(6,3,43,0.14)'; }}
          />
          <p style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(6,3,43,0.35)', marginTop: 5 }}>
            Non visibile all&apos;azienda. Usato solo nel tuo spazio personale.
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(6,3,43,0.50)', marginBottom: 6 }}>
            Lingua preferita
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['it', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                disabled={loading}
                style={{
                  fontFamily: FONT, fontSize: 12, fontWeight: 600,
                  padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                  border: lang === l ? `2px solid ${INK}` : '1.5px solid rgba(6,3,43,0.14)',
                  background: lang === l ? INK : '#fff',
                  color: lang === l ? '#fff' : 'rgba(6,3,43,0.60)',
                  transition: 'all 150ms ease',
                }}
              >
                {l === 'it' ? '🇮🇹 Italiano' : '🇬🇧 English'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              borderRadius: 8, border: '1px solid rgba(158,59,47,0.30)',
              background: 'rgba(158,59,47,0.07)', padding: '10px 14px',
              fontFamily: FONT, fontSize: 12, color: '#9E3B2F', lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}
      </div>

      <NavButtons
        onBack={onBack}
        onNext={onComplete}
        nextLabel="Accedi al mio spazio →"
        loading={loading}
      />
    </div>
  );
}

// ── Review mode — already completed ──────────────────────────────────────────

function ReviewMode({ initialDisplayName }: { initialDisplayName: string | null }) {
  const router = useRouter();

  return (
    <div>
      <div style={{
        background: 'rgba(22,101,52,0.07)', border: '1px solid rgba(22,101,52,0.20)',
        borderRadius: 8, padding: '12px 16px', marginBottom: 24,
      }}>
        <p style={{ fontFamily: FONT, fontSize: 12, color: '#1a4731', lineHeight: 1.5, margin: 0 }}>
          <strong>Privacy boundary attivo.</strong> Hai già completato l&apos;onboarding KORA.
          Questa è una revisione del boundary privacy — nessun nuovo consenso richiesto.
        </p>
      </div>

      <SectionTitle>Il boundary privacy KORA</SectionTitle>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
        <p style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(6,3,43,0.40)', marginBottom: 4 }}>
          Cosa vede l&apos;azienda
        </p>
        {[
          'Solo dati aggregati — mai dati individuali',
          'Solo se ci sono almeno 10 lavoratori nel conteggio',
          'Quote di partecipazione per pillar — senza identificativi',
        ].map(t => <PrivacyChip key={t} text={t} positive={true} />)}

        <p style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(6,3,43,0.40)', marginTop: 10, marginBottom: 4 }}>
          L&apos;azienda non vede mai
        </p>
        {[
          'Il tuo profilo individuale, storico o note private',
          'Nessun ranking o confronto tra lavoratori',
        ].map(t => <PrivacyChip key={t} text={t} positive={false} />)}
      </div>

      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          onClick={() => router.push('/worker/workspace')}
          style={{
            width: '100%', fontFamily: FONT, fontWeight: 700, fontSize: 13,
            background: INK, color: '#fff', border: 'none',
            borderRadius: 10, padding: '12px 20px', cursor: 'pointer', minHeight: 44,
          }}
        >
          ← Torna al tuo spazio
        </button>
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
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
        <ReviewMode initialDisplayName={initialDisplayName} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px', fontFamily: FONT }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C76F3D', marginBottom: 4 }}>
          My KORA · Primo accesso
        </p>
        <h1 style={{ fontFamily: FONT, fontSize: '1.8rem', fontWeight: 800, color: INK, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 4 }}>
          Benvenuto in KORA
        </h1>
      </div>

      <StepProgress current={step} total={TOTAL_STEPS} />

      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.09)',
        borderRadius: 14, padding: '28px 28px',
        boxShadow: '0 2px 16px rgba(6,3,43,0.06)',
      }}>
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
      </div>

      <p style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(6,3,43,0.30)', textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
        KORA Foundation Light · Privacy Consent v1.0 · Il tuo datore di lavoro non vede questi dati
      </p>
    </div>
  );
}
