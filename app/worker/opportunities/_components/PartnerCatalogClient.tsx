'use client';
// app/worker/opportunities/_components/PartnerCatalogClient.tsx
// B116: Interactive partner catalog with pillar filter for workers.
// Display-only: no booking, no contact, no ranking, no pricing.
// No click tracking — browsing is private and not stored.

import { useState } from 'react';
import type { PartnerItem } from '../page';

const PILLARS   = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;

const PILLAR_COLORS: Record<string, string> = {
  LIFE: '#16a34a', GROWTH: '#2563eb', CONNECTION: '#9333ea',
  IMPACT: '#dc2626', LEGACY: '#ca8a04',
};

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
    return (
      <div
        data-testid="partner-catalog-empty"
        style={{
          background: 'rgba(6,3,43,0.03)', border: '1px dashed rgba(6,3,43,0.15)',
          borderRadius: 10, padding: '32px', textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.45)', margin: 0, lineHeight: 1.6 }}>
          La rete partner sarà disponibile prossimamente.<br />
          <span style={{ fontSize: 11, color: 'rgba(6,3,43,0.35)' }}>
            I partner vengono pubblicati dall&apos;amministratore KORA — quando attivi, appariranno qui organizzati per pillar.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Pillar filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
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
        <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.40)', textAlign: 'center', padding: '24px 0' }}>
          Nessun partner per il pillar selezionato.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {displayed.map(partner => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </div>
      )}

      <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.35)', marginTop: 20, lineHeight: 1.5 }}>
        {displayed.length} partner{displayed.length !== 1 ? ' disponibili' : ' disponibile'}
        {pillarFilter !== 'all' && ` per pillar ${pillarFilter}`}.
        La tua navigazione non viene registrata né condivisa con la tua azienda.
      </p>
    </div>
  );
}

function PartnerCard({ partner }: { partner: PartnerItem }) {
  const pillarColor = PILLAR_COLORS[partner.pillar] ?? '#555';

  return (
    <div
      data-testid={`partner-card-${partner.pillar}`}
      style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.09)',
        borderRadius: 10, padding: '16px 18px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: pillarColor,
            }}>
              {PILLAR_LABELS[partner.pillar] ?? partner.pillar}
            </span>
            <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.35)' }}>
              {PILLAR_DESCRIPTIONS[partner.pillar]}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#06032B', marginBottom: 2 }}>
            {partner.name}
          </div>
          {partner.category && (
            <div style={{ fontSize: 10, color: 'rgba(6,3,43,0.45)' }}>{partner.category}</div>
          )}
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            background: 'rgba(6,3,43,0.05)', color: 'rgba(6,3,43,0.50)',
            borderRadius: 4, padding: '2px 6px',
          }}>
            {DELIVERY_LABELS[partner.delivery_mode] ?? partner.delivery_mode}
          </span>
          {partner.city && (
            <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.35)' }}>{partner.city}</span>
          )}
        </div>
      </div>

      {/* Description */}
      {partner.description && (
        <div style={{ fontSize: 11, color: 'rgba(6,3,43,0.55)', lineHeight: 1.5, marginTop: 8 }}>
          {partner.description.length > 180
            ? `${partner.description.slice(0, 180)}…`
            : partner.description}
        </div>
      )}

      {/* External link — opens in new tab, no tracking */}
      {partner.website_url && (
        <div style={{ marginTop: 12 }}>
          <a
            href={partner.website_url}
            target="_blank"
            rel="noreferrer noopener"
            style={{
              fontSize: 11, fontWeight: 600, color: '#2563eb',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            Scopri di più →
          </a>
          <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.30)', marginLeft: 8 }}>
            (link esterno — KORA non traccia questo click)
          </span>
        </div>
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
        padding: '4px 14px', borderRadius: 99, fontSize: 11, fontWeight: 600,
        cursor: 'pointer', border: '1px solid',
        background: active ? (color ?? '#06032B') : 'transparent',
        color: active ? '#fff' : (color ?? 'rgba(6,3,43,0.55)'),
        borderColor: active ? (color ?? '#06032B') : 'rgba(6,3,43,0.15)',
        transition: 'all 0.1s',
      }}
    >
      {label}
    </button>
  );
}
