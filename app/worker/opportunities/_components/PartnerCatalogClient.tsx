'use client';
// app/worker/opportunities/_components/PartnerCatalogClient.tsx
// B116: Interactive partner catalog with pillar filter for workers.
// Display-only: no booking, no contact, no ranking, no pricing.
// No click tracking — browsing is private and not stored.
//
// KORA-WP-129 Wave 4b (W2): the card grid becomes ONE Region of hairline rows.
// The pillar filter is EXISTING capability and is preserved exactly — no
// ranking, recommendation or personalisation is introduced. Every label,
// description and privacy sentence is unchanged.

import { useState } from 'react';
import type { PartnerItem } from '../page';
import { PILLAR_COLORS, TOKENS, SPACE, typeStyle, PX, type PillarColorKey } from '@/lib/design/kora-design-tokens';
import { Region, Chip, NotYetAvailable, Zero } from '@/components/ui/px';

const PILLARS   = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;

const PILLAR_LABELS: Record<string, string> = {
  LIFE: 'Life', GROWTH: 'Growth', CONNECTION: 'Connection',
  IMPACT: 'Impact', LEGACY: 'Legacy',
};

const PILLAR_DESCRIPTIONS: Record<string, string> = {
  LIFE:       'Salute, benessere, prevenzione',
  GROWTH:     'Formazione, competenze, sviluppo',
  CONNECTION: 'Mentoring, collaborazione, comunità',
  IMPACT:     'Volontariato, iniziative sociali',
  LEGACY:     'Trasmissione conoscenza, memoria organizzativa',
};

const DELIVERY_LABELS: Record<string, string> = {
  online: 'Online', onsite: 'In presenza', hybrid: 'Ibrido',
};

export function PartnerCatalogClient({ partners }: { partners: PartnerItem[] }) {
  const [pillarFilter, setPillarFilter] = useState<string>('all');

  const displayed = pillarFilter === 'all'
    ? partners
    : partners.filter(p => p.pillar === pillarFilter);

  if (partners.length === 0) {
    // Not an absence of data but a capability that is not live yet: the admin
    // publishes partners, and until then there is nothing to show.
    return (
      <div data-testid="partner-catalog-empty">
        <NotYetAvailable
          title="La rete partner sarà disponibile prossimamente"
          expected="I partner vengono pubblicati dall'amministratore KORA — quando attivi, appariranno qui organizzati per pillar."
        />
      </div>
    );
  }

  return (
    <Region label="Rete partner">
      {/* Pillar filter — existing capability, unchanged */}
      <div style={{ display: 'flex', gap: SPACE.sm, marginBottom: SPACE.md, flexWrap: 'wrap' }}>
        <FilterChip label="Tutti" active={pillarFilter === 'all'} onClick={() => setPillarFilter('all')} />
        {PILLARS.filter(p => partners.some(partner => partner.pillar === p)).map(p => (
          <FilterChip
            key={p}
            label={PILLAR_LABELS[p] ?? p}
            active={pillarFilter === p}
            onClick={() => setPillarFilter(p)}
            color={PILLAR_COLORS[p]}
          />
        ))}
      </div>

      {displayed.length === 0 ? (
        <Zero measured={`partner nel pillar ${pillarFilter}`} />
      ) : (
        <div>
          {displayed.map((partner, i) => (
            <PartnerRow key={partner.id} partner={partner} last={i === displayed.length - 1} />
          ))}
        </div>
      )}

      <p style={{ ...typeStyle('caption'), color: TOKENS.inkHint, marginTop: SPACE.md, marginBottom: 0 }}>
        {displayed.length} partner{displayed.length !== 1 ? ' disponibili' : ' disponibile'}
        {pillarFilter !== 'all' && ` per pillar ${pillarFilter}`}.
        La tua navigazione non viene registrata né condivisa con la tua azienda.
      </p>
    </Region>
  );
}

// One partner ROW, not a card. The pillar keeps its colour because the
// catalogue is organised by pillar; every other qualifier is quiet text.
function PartnerRow({ partner, last }: { partner: PartnerItem; last: boolean }) {
  const pillarColor = PILLAR_COLORS[partner.pillar as PillarColorKey] ?? TOKENS.inkHint;

  return (
    <div
      data-testid={`partner-card-${partner.pillar}`}
      style={{
        display: 'grid', gap: SPACE.xs, padding: `${SPACE.md}px 0`,
        borderBottom: last ? undefined : `1px solid ${PX.line}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: SPACE.sm, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, ...typeStyle('label', { weight: 700 }), color: TOKENS.ink }}>
          {partner.name}
          {partner.category && (
            <span style={{ ...typeStyle('caption'), color: TOKENS.inkHint }}>{' · '}{partner.category}</span>
          )}
        </p>
        <Chip>{DELIVERY_LABELS[partner.delivery_mode] ?? partner.delivery_mode}</Chip>
      </div>

      <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkHint }}>
        <span style={{ ...typeStyle('caption', { weight: 700 }), color: pillarColor }}>
          {PILLAR_LABELS[partner.pillar] ?? partner.pillar}
        </span>
        {' · '}{PILLAR_DESCRIPTIONS[partner.pillar]}
        {partner.city && <>{' · '}{partner.city}</>}
      </p>

      {partner.description && (
        <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkSecondary }}>
          {partner.description.length > 180
            ? `${partner.description.slice(0, 180)}…`
            : partner.description}
        </p>
      )}

      {partner.website_url && (
        <p style={{ margin: 0 }}>
          <a
            href={partner.website_url}
            target="_blank"
            rel="noreferrer noopener"
            style={{ ...typeStyle('caption', { weight: 700 }), color: TOKENS.accent, textDecoration: 'none' }}
          >
            Scopri di più →
          </a>
          <span style={{ ...typeStyle('caption'), color: TOKENS.inkHint, marginLeft: SPACE.sm }}>
            (link esterno — KORA non traccia questo click)
          </span>
        </p>
      )}
    </div>
  );
}

function FilterChip({
  label, active, onClick, color,
}: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...typeStyle('caption', { weight: 600 }),
        padding: `${SPACE.xs}px 14px` /* optical: control-internal, KORA-WP-141 documented exception */,
        borderRadius: 99, cursor: 'pointer', border: '1px solid',
        background: active ? (color ?? TOKENS.ink) : 'transparent',
        color: active ? '#fff' : (color ?? TOKENS.inkSecondary),
        borderColor: active ? (color ?? TOKENS.ink) : TOKENS.inkBorder,
      }}
    >
      {label}
    </button>
  );
}
