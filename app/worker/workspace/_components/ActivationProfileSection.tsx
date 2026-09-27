// app/worker/workspace/_components/ActivationProfileSection.tsx
// B111: Worker Private Activation Profile — display component.
// Receives pre-computed profile data from the server component.
// Pure display — no interactivity, no API calls, no employer-visible data.
// NEVER shows rankings, percentiles, or comparisons with other workers.

import type { WorkerActivationProfile, PillarDistributionEntry } from '@/app/api/worker/activation-profile/route';
import { BADGE_TOKENS, PILLAR_COLORS, TOKENS, SPACE, typeStyle } from '@/lib/design/kora-design-tokens';


const PILLAR_LABELS: Record<string, string> = {
  LIFE:       'Life',
  GROWTH:     'Growth',
  CONNECTION: 'Connection',
  IMPACT:     'Impact',
  LEGACY:     'Legacy',
};

const PILLAR_DESCRIPTIONS: Record<string, string> = {
  LIFE:       'Salute, benessere, prevenzione',
  GROWTH:     'Formazione, competenze, sviluppo',
  CONNECTION: 'Mentoring, collaborazione, comunità',
  IMPACT:     'Volontariato, iniziative sociali',
  LEGACY:     'Trasmissione conoscenza, memoria organizzativa',
};

function PillarBar({ entry, max }: { entry: PillarDistributionEntry; max: number }) {
  const color = PILLAR_COLORS[entry.pillar] ?? '#555';
  const pct   = max > 0 ? Math.round((entry.total_active / max) * 100) : 0;
  const hasActivity = entry.total_active > 0;

  return (
    <div style={{ display: 'grid', gap: SPACE.xs }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.xs }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: hasActivity ? color : 'rgba(6,3,43,0.15)',
            flexShrink: 0, display: 'inline-block',
          }} />
          <span style={{
            ...typeStyle('caption', { weight: 700 }), color: hasActivity ? TOKENS.ink : 'rgba(6,3,43,0.35)',
          }}>
            {PILLAR_LABELS[entry.pillar] ?? entry.pillar}
          </span>
          <span style={{ ...typeStyle('caption'), color: 'rgba(6,3,43,0.35)' }}>
            {PILLAR_DESCRIPTIONS[entry.pillar]}
          </span>
        </div>
        <span style={{
          ...typeStyle('caption', { weight: 700, tabular: true }), color: hasActivity ? color : 'rgba(6,3,43,0.25)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {entry.total_active}
        </span>
      </div>
      <div style={{
        height: 5, background: 'rgba(6,3,43,0.07)', borderRadius: 99, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: hasActivity ? color : 'transparent',
          borderRadius: 99, transition: 'width 0.3s ease',
          opacity: hasActivity ? 1 : 0,
        }} />
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: 'rgba(6,3,43,0.03)', border: '1px solid rgba(6,3,43,0.07)',
      borderRadius: 7, padding: `${SPACE.sm}px ${SPACE.md}px`, textAlign: 'center',
    }}>
      <div style={{ ...typeStyle('subsection', { weight: 800, tabular: true }), color: TOKENS.ink, lineHeight: 1 }}>{value}</div>
      <div style={{ ...typeStyle('meta', { weight: 600 }), color: 'rgba(6,3,43,0.45)', marginTop: SPACE.xs, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}

export function ActivationProfileSection({ profile }: { profile: WorkerActivationProfile }) {
  const max = Math.max(...profile.pillarDistribution.map(p => p.total_active), 1);
  const { activitySummary } = profile;
  const lastDate = profile.lastActivityAt
    ? profile.lastActivityAt.slice(0, 10)
    : null;

  if (profile.profileStatus === 'empty') {
    return (
      <div>
        {/* Privacy card — always visible */}
        <PrivacyCard />

        <div
          data-testid="activation-profile-empty"
          style={{
            background: 'rgba(6,3,43,0.03)', border: '1px dashed rgba(6,3,43,0.12)',
            borderRadius: 8, padding: `${SPACE.lg}px`, textAlign: 'center', marginTop: SPACE.md,
          }}
        >
          <p style={{ ...typeStyle('caption'), color: 'rgba(6,3,43,0.45)', margin: 0 }}>
            Nessuna attività registrata ancora.<br />
            Esprimi interesse o iscriviti a un&apos;iniziativa per iniziare.<br />
            <span style={{ ...typeStyle('caption'), color: 'rgba(6,3,43,0.35)' }}>
              Questo profilo non è una valutazione individuale e non viene condiviso con la tua azienda.
            </span>
          </p>
        </div>

        <InterpretationNote text={profile.interpretationNote} />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: SPACE.md }}>
      {/* Privacy card — always visible */}
      <PrivacyCard />

      {/* Pillar distribution */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)',
        borderRadius: 10, padding: `${SPACE.md}px ${SPACE.lg}px`,
      }}>
        <h3 style={subheadingStyle}>Distribuzione per pillar</h3>
        <div style={{ display: 'grid', gap: SPACE.md }}>
          {profile.pillarDistribution.map(entry => (
            <PillarBar key={entry.pillar} entry={entry} max={max} />
          ))}
        </div>
      </div>

      {/* Activity summary */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)',
        borderRadius: 10, padding: `${SPACE.md}px ${SPACE.lg}px`,
      }}>
        <h3 style={subheadingStyle}>Riepilogo attività</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: SPACE.sm }}>
          <StatCell label="Interessi" value={activitySummary.total_interested} />
          <StatCell label="Iscrizioni" value={activitySummary.total_registered} />
          <StatCell label="Presenze" value={activitySummary.total_attended} />
          <StatCell label="Cancellati" value={activitySummary.total_cancelled} />
        </div>
        {lastDate && (
          <p style={{ ...typeStyle('caption'), color: 'rgba(6,3,43,0.35)', marginTop: SPACE.sm, marginBottom: 0 }}>
            Ultimo aggiornamento: {lastDate}
          </p>
        )}
      </div>

      {/* Insights */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)',
        borderRadius: 10, padding: `${SPACE.md}px ${SPACE.lg}px`,
      }}>
        <h3 style={subheadingStyle}>Segnali di attivazione</h3>
        <div style={{ display: 'grid', gap: SPACE.sm }}>
          {profile.strongestPillar && (
            <InsightRow
              label="Pillar più attivo"
              value={`${PILLAR_LABELS[profile.strongestPillar]} — ${PILLAR_DESCRIPTIONS[profile.strongestPillar]}`}
              color={PILLAR_COLORS[profile.strongestPillar] ?? '#555'}
            />
          )}
          {profile.emergingPillar && (
            <InsightRow
              label="Pillar in crescita"
              value={`${PILLAR_LABELS[profile.emergingPillar]} — ${PILLAR_DESCRIPTIONS[profile.emergingPillar]}`}
              color={PILLAR_COLORS[profile.emergingPillar] ?? '#555'}
            />
          )}
          {profile.missingPillars.length > 0 && (
            <InsightRow
              label="Pillar non ancora esplorati"
              value={profile.missingPillars.map(p => PILLAR_LABELS[p] ?? p).join(', ')}
              color="rgba(6,3,43,0.35)"
              muted
            />
          )}
        </div>
      </div>

      <InterpretationNote text={profile.interpretationNote} />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

const subheadingStyle: React.CSSProperties = {
  ...typeStyle('meta', { weight: 700 }), textTransform: 'uppercase',
  letterSpacing: '0.07em', color: 'rgba(6,3,43,0.40)', marginBottom: SPACE.md, marginTop: 0,
};

function PrivacyCard() {
  return (
    <div style={{
      background: 'rgba(47,125,85,0.06)', border: '1px solid rgba(47,125,85,0.18)',
      borderRadius: 8, padding: `${SPACE.md}px ${SPACE.md}px`,
    }}>
      <p style={{ ...typeStyle('caption'), color: BADGE_TOKENS.eligible.text, margin: 0 }}>
        <strong>Profilo privato.</strong>{' '}
        Il tuo datore di lavoro vede solo dati aggregati sopra soglia — mai questo profilo individuale.
        Non è una valutazione individuale e non genera ranking.
      </p>
    </div>
  );
}

function InsightRow({
  label, value, color, muted,
}: { label: string; value: string; color: string; muted?: boolean }) {
  return (
    <div style={{
      display: 'flex', gap: SPACE.sm, alignItems: 'flex-start',
      paddingBottom: SPACE.sm, borderBottom: '1px solid rgba(6,3,43,0.05)',
    }}>
      <span style={{
        ...typeStyle('meta', { weight: 700 }), textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'rgba(6,3,43,0.40)', flexShrink: 0, paddingTop: 1, minWidth: 140,
      }}>
        {label}
      </span>
      <span style={{ ...typeStyle('caption'), color: muted ? 'rgba(6,3,43,0.40)' : TOKENS.ink, fontStyle: muted ? 'italic' : 'normal' }}>
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, marginRight: SPACE.xs, verticalAlign: 'middle' }} />
        {value}
      </span>
    </div>
  );
}

function InterpretationNote({ text }: { text: string }) {
  return (
    <p style={{
      ...typeStyle('caption'), color: 'rgba(6,3,43,0.40)', margin: 0,
      borderTop: '1px solid rgba(6,3,43,0.05)', paddingTop: SPACE.md,
    }}>
      {text}
    </p>
  );
}
