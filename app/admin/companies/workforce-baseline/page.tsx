'use client';
// A-01e: Workforce Baseline Admin — validazione baseline workforce.
// Scopo: verificare la baseline headcount/segmenti necessaria come fondamento
//        per il calcolo KORA Index.
//
// B-TRUTH first canonical seed group (2026-08-31): retired the synthetic
// data path (WorkforceBaselineService, data/synthetic/workforce-baseline.json).
// Now reads live personal.workforce_baseline via /api/admin/workforce-baseline
// and the live tenant registry via /api/admin/tenants — the exact same live
// path a DEMO-kind or LIVE-kind tenant both traverse identically. Several
// synthetic-only fields (upload-process stats, editorial completeness score,
// warnings/limitations text, activation/equity readiness flags) have no live
// source and are not shown — see lib/live/workforce-baseline-view.ts for the
// full field disposition. No placeholder values invented for any of them.
//
// KORA-WP-012 visual remediation (Founder ruling, 2026-09-21): this route
// became reachable from normal Admin navigation, which exposed a legacy page
// interior below the accepted WP-124/WP-125 Product Experience. Recomposed on
// the shared WP-125 primitives around the three real Product questions —
// validation verdict (primary), company context (secondary), aggregate groups
// by dimension (tertiary). READ-ONLY, exactly as before: no write path, no API
// change, no threshold change, no schema change. The privacy model is
// unchanged and is now stated where the operator reads the verdict.

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { PX } from '@/lib/design/kora-design-tokens';
import { ADMIN_NAV_GROUPS } from '@/lib/navigation/admin-nav-groups';
import {
  PageHead, Workspace, Col, Region, Metric, MetricStrip, Facts,
  Status, Chip, Notice, StateBlock, SkeletonRows,
} from '@/components/ui/px';
import type { WorkforceBaselineView } from '@/lib/live/workforce-baseline-view';

interface LiveTenant {
  id: string;
  tenantCode: string;
  companyName: string;
  onboardingStatus: string;
}

// Canonical dimension keys are written by persistWorkforceBaseline() and are
// plural (`departments`). This map kept only singular forms, so the UI default
// never matched real data — see dimensionLabel() and effectiveDimension below.
const DIMENSION_LABELS: Record<string, string> = {
  site:              'Sede',
  department:        'Dipartimento',
  role_family:       'Famiglia professionale',
  seniority_band:    'Fascia di seniority',
  contract_type:     'Tipo di contratto',
  employment_status: 'Status occupazionale',
  other:             'Altro',
};

/** KORA-WP-012: resolve a stored dimension key against the label map in either
 *  number — the canonical writer emits plural keys, the legacy map was
 *  singular. The raw key is the last resort, never an invented label. */
function dimensionLabel(dimension: string): string {
  return DIMENSION_LABELS[dimension]
    ?? DIMENSION_LABELS[dimension.replace(/s$/, '')]
    ?? dimension;
}

const shareLabel = (share: number) => `${(share * 100).toFixed(1)}%`;

// KORA-WP-012 Blocker A (Founder, 2026-09-21): one stored group label is
// misspelled at source (`organisazione`, written by the canonical POST path).
// The stored value and the API payload are TRUTH and stay exactly as they are;
// only the rendered Product copy is corrected, here at the presentation
// boundary. This is a fixed one-entry correction list, never a spelling
// engine: any other label renders verbatim.
const DISPLAY_LABEL_CORRECTIONS: Record<string, string> = {
  organisazione: 'organizzazione',
};

/** Display-only: corrects a known malformed stored label, nothing else. */
export function groupDisplayLabel(rawLabel: string): string {
  return DISPLAY_LABEL_CORRECTIONS[rawLabel] ?? rawLabel;
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

// A-18: KORA Admin — Workforce Baseline
export default function AdminWorkforceBaselinePage() {
  const [tenants, setTenants] = useState<LiveTenant[]>([]);
  const [tenantIdsWithBaseline, setTenantIdsWithBaseline] = useState<Set<string>>(new Set());
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [activeDimension, setActiveDimension] = useState<string>('');
  const [baseline, setBaseline] = useState<WorkforceBaselineView | null>(null);
  const [loading, setLoading] = useState(true);
  // Which tenant the currently-held baseline answer belongs to. Set only from
  // the fetch callbacks, so the pending state below is derived rather than a
  // second source of truth updated synchronously inside an effect.
  const [resolvedTenantId, setResolvedTenantId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/admin/tenants').then((r) => (r.ok ? r.json() : { tenants: [] })),
      fetch('/api/admin/workforce-baseline').then((r) => (r.ok ? r.json() : { tenantIdsWithBaseline: [] })),
    ]).then(([tenantsRes, baselinesRes]) => {
      if (cancelled) return;
      const liveTenants: LiveTenant[] = tenantsRes.tenants ?? [];
      setTenants(liveTenants);
      setTenantIdsWithBaseline(new Set(baselinesRes.tenantIdsWithBaseline ?? []));
      if (liveTenants.length > 0) setSelectedTenantId(liveTenants[0].id);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const fetchBaseline = useCallback((tenantId: string) => {
    if (!tenantId) return;
    fetch(`/api/admin/workforce-baseline?tenantId=${encodeURIComponent(tenantId)}`)
      .then((r) => (r.ok ? r.json() : { baseline: null }))
      .then((res) => setBaseline(res.baseline ?? null))
      .catch(() => setBaseline(null))
      .finally(() => setResolvedTenantId(tenantId));
  }, []);

  useEffect(() => {
    if (selectedTenantId) fetchBaseline(selectedTenantId);
  }, [selectedTenantId, fetchBaseline]);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  // A baseline answer for another tenant is not this tenant's answer: the
  // regions show their pending state until the selected tenant resolves.
  const baselineLoading = Boolean(selectedTenantId) && resolvedTenantId !== selectedTenantId;

  const dimensionKeys = useMemo(
    () => [...new Set((baseline?.aggregateGroups ?? []).map((g) => g.dimension_type))],
    [baseline],
  );

  // KORA-WP-012 correctness fix: the visible dimension is DERIVED from the data
  // the API actually returned, never from a hard-coded default. A stale or
  // absent selection falls back to the first real dimension, so the first
  // render already shows the group the baseline contains.
  const effectiveDimension = activeDimension && dimensionKeys.includes(activeDimension)
    ? activeDimension
    : (dimensionKeys[0] ?? '');

  const visibleGroups = (baseline?.aggregateGroups ?? [])
    .filter((g) => g.dimension_type === effectiveDimension)
    .sort((a, b) => b.employee_count - a.employee_count);

  const thresholdMet = baseline?.minimumCompanyThresholdMet ?? false;

  // ── rail: company context / selection ─────────────────────────────────
  const companyRail = (
    <Region label="Azienda cliente">
      {loading ? (
        <SkeletonRows rows={3} rowHeight={44} />
      ) : tenants.length === 0 ? (
        <StateBlock
          title="Nessuna azienda cliente registrata"
          body="Il registro tenant non contiene ancora aziende. La baseline si valida dopo la registrazione dell'azienda."
        />
      ) : (
        <div style={{ display: 'grid', gap: 7 }}>
          {tenants.map((t) => {
            const isSelected = t.id === selectedTenantId;
            const hasBaseline = tenantIdsWithBaseline.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedTenantId(t.id)}
                style={{
                  display: 'grid', gap: 5, width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '10px 12px', minWidth: 0,
                  borderRadius: PX.rInner,
                  border: `1px solid ${isSelected ? PX.violetEdge : PX.line}`,
                  background: isSelected ? PX.violetTint : PX.l1,
                  fontFamily: PX.sans,
                  transition: `border-color ${PX.t1} ${PX.ease}, background ${PX.t1} ${PX.ease}`,
                }}
              >
                <span style={{
                  fontSize: 13, fontWeight: 700, letterSpacing: '-0.008em', minWidth: 0,
                  overflowWrap: 'anywhere', color: isSelected ? PX.violet700 : PX.ink,
                }}>
                  {t.companyName}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 650, color: PX.ink3, fontVariantNumeric: 'tabular-nums' }}>
                    {t.tenantCode}
                  </span>
                  <Status tone={hasBaseline ? 'ok' : 'idle'}>
                    {hasBaseline ? 'Baseline presente' : 'Nessuna baseline'}
                  </Status>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Region>
  );

  const privacyRail = (
    <Region label="Regola di privacy" tone="inset">
      <Notice tone="info">
        Nessun dato individuale: la baseline è aggregata per costruzione. I cluster sotto la soglia di
        gruppo sono soppressi prima della scrittura, non nascosti a schermo. KORA misura
        l&apos;organizzazione, non gli individui.
      </Notice>
    </Region>
  );

  // KORA-WP-012 Blocker B (Founder, 2026-09-21): this region used to send a
  // KORA Admin operator into the Company portal (`/company/ingestion`). The
  // Admin Product owns its own intake destination, so the link now resolves
  // from ADMIN_NAV_GROUPS — label included — and can never drift from the
  // Product's own terminology. An unresolvable destination is omitted rather
  // than rendered under an invented label.
  const adminIntake = ADMIN_NAV_GROUPS
    .flatMap((g) => g.items)
    .find((i) => i.href === '/admin/data-intake');

  const relatedPaths: Array<{ href: string; label: string; hint: string }> = [
    { href: '/admin/companies', label: 'Company Registry', hint: 'registro aziende cliente' },
    ...(adminIntake ? [{ href: adminIntake.href, label: adminIntake.label, hint: 'caricamento dati azienda' }] : []),
  ];

  const pathsRail = (
    <Region label="Percorsi collegati">
      <div style={{ display: 'grid', gap: 9 }}>
        {relatedPaths.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              display: 'grid', gap: 2, padding: '9px 11px', minWidth: 0,
              borderRadius: PX.rInner, border: `1px solid ${PX.line}`, background: PX.l1,
              textDecoration: 'none', fontFamily: PX.sans,
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 700, color: PX.violet700, overflowWrap: 'anywhere' }}>
              {l.label}
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: PX.ink3 }}>{l.hint}</span>
          </Link>
        ))}
      </div>
    </Region>
  );

  // ── primary: the validation verdict ───────────────────────────────────
  const verdictRegion = (
    <Region label="Baseline corrente — validazione">
      {loading || baselineLoading ? (
        <SkeletonRows rows={4} rowHeight={40} />
      ) : !selectedTenant ? (
        <StateBlock
          title="Nessuna azienda selezionata"
          body="Seleziona un'azienda cliente per verificarne la workforce baseline."
        />
      ) : !baseline ? (
        <StateBlock
          tone="pending"
          title="Baseline non ancora caricata"
          body={
            <>
              {selectedTenant.companyName} non ha ancora una workforce baseline, quindi non è validabile
              e non può entrare nel calcolo KORA Index. Onboarding status:{' '}
              <strong>{selectedTenant.onboardingStatus?.replace(/_/g, ' ') || 'non avviato'}</strong>.
              La baseline si registra dal Tenant Registry.
            </>
          }
          action={
            <Link
              href="/admin/tenants"
              style={{
                display: 'inline-flex', alignItems: 'center', minHeight: 34, padding: '0 13px',
                borderRadius: PX.rCtl, border: `1px solid ${PX.violetEdge}`, background: PX.violetTint,
                color: PX.violet700, fontFamily: PX.sans, fontSize: 12.5, fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Apri Tenant Registry
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{
              fontSize: 42, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums', color: PX.ink, fontFamily: PX.sans,
            }}>
              {baseline.totalWorkers}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: PX.ink2, fontFamily: PX.sans }}>
              lavoratori nella baseline
            </span>
            <span style={{ marginLeft: 'auto' }}>
              <Status tone={thresholdMet ? 'ok' : 'risk'}>
                {thresholdMet ? 'Soglia soddisfatta' : 'Sotto soglia'}
              </Status>
            </span>
          </div>

          <p style={{
            margin: 0, maxWidth: '72ch', fontSize: 13, lineHeight: 1.6,
            color: PX.ink2, fontFamily: PX.sans,
          }}>
            {thresholdMet
              ? `${baseline.totalWorkers} lavoratori contro una soglia minima di ${baseline.minimumCompanyThreshold}: la popolazione è sufficiente perché l'azienda entri nel calcolo KORA Index per il periodo ${baseline.reportingPeriod}.`
              : `${baseline.totalWorkers} lavoratori contro una soglia minima di ${baseline.minimumCompanyThreshold}: la popolazione non è sufficiente, quindi l'azienda non è validata per il calcolo KORA Index del periodo ${baseline.reportingPeriod}.`}
          </p>

          <MetricStrip>
            <Metric label="Soglia minima azienda" value={baseline.minimumCompanyThreshold} hint="richiesta per la validazione" />
            <Metric label="Soglia gruppo (N≥)" value={baseline.minimumGroupSize} hint="sotto questa soglia il cluster è soppresso" />
            <Metric label="Periodo" value={baseline.reportingPeriod} hint="periodo di riferimento" />
          </MetricStrip>

          <Facts rows={[
            ['Azienda',   `${baseline.companyName} · ${baseline.tenantCode}`],
            ['Registrata', `${formatStamp(baseline.createdAt)} · ${baseline.createdBy}`],
          ]} />
        </div>
      )}
    </Region>
  );

  // ── tertiary: aggregate groups by dimension ───────────────────────────
  const groupsRegion = (
    <Region
      label="Gruppi aggregati per dimensione"
      actions={
        baseline && dimensionKeys.length > 0 ? (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>
            {dimensionKeys.map((dim) => (
              <button
                key={dim}
                type="button"
                aria-pressed={dim === effectiveDimension}
                onClick={() => setActiveDimension(dim)}
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
              >
                <Chip selected={dim === effectiveDimension}>{dimensionLabel(dim)}</Chip>
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      {loading || baselineLoading ? (
        <SkeletonRows rows={3} rowHeight={34} />
      ) : !baseline ? (
        <StateBlock
          title="Nessuna distribuzione da mostrare"
          body="La distribuzione per dimensione esiste solo dopo la registrazione di una baseline."
        />
      ) : dimensionKeys.length === 0 ? (
        <StateBlock
          title="Baseline senza suddivisione per dimensione"
          body="Questa baseline registra il solo totale dei lavoratori: non contiene gruppi per sede, dipartimento o altra dimensione. Il totale resta valido per la soglia minima."
        />
      ) : visibleGroups.length === 0 ? (
        <StateBlock
          title={`Nessun gruppo visibile per ${dimensionLabel(effectiveDimension)}`}
          body={`Tutti i cluster di questa dimensione sono sotto la soglia di ${baseline.minimumGroupSize} lavoratori e sono stati soppressi prima della scrittura.`}
        />
      ) : (
        <div style={{ display: 'grid', gap: 9, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: PX.ink3, fontFamily: PX.sans }}>
            {dimensionLabel(effectiveDimension)} · {visibleGroups.length === 1 ? '1 gruppo visibile' : `${visibleGroups.length} gruppi visibili`}
            {' '}· solo gruppi ≥ {baseline.minimumGroupSize} lavoratori
            {dimensionKeys.length > 1 ? ` · ${dimensionKeys.length} dimensioni registrate` : ''}
          </p>
          {visibleGroups.map((g) => (
            <div
              key={g.group_id}
              style={{
                display: 'grid', gap: 7, padding: '11px 13px', minWidth: 0,
                borderRadius: PX.rInner, border: `1px solid ${PX.l2Edge}`, background: PX.l2,
                fontFamily: PX.sans,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: PX.ink, minWidth: 0, overflowWrap: 'anywhere' }}>
                  {groupDisplayLabel(g.group_label)}
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 17, fontWeight: 750, fontVariantNumeric: 'tabular-nums', color: PX.ink }}>
                    {g.employee_count}
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 650, color: PX.ink3, fontVariantNumeric: 'tabular-nums' }}>
                    {shareLabel(g.share_of_workforce)}
                  </span>
                </span>
              </div>
              <div
                role="img"
                aria-label={`${groupDisplayLabel(g.group_label)}: ${g.employee_count} lavoratori, ${shareLabel(g.share_of_workforce)} del totale`}
                style={{ height: 6, borderRadius: PX.rPill, background: PX.inkWash, overflow: 'hidden' }}
              >
                <div style={{
                  height: 6, borderRadius: PX.rPill, background: PX.violet,
                  width: `${Math.min(Math.max(g.share_of_workforce * 100, 1.5), 100)}%`,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Region>
  );

  return (
    <>
      <PageHead
        eyebrow="KORA Admin — Validazione workforce"
        title="Workforce Baseline"
        lead="Validazione aggregata della popolazione di un'azienda cliente: soglia minima, soglia di gruppo e distribuzione per dimensione. Il setup operativo resta lato KORA Admin; il portale azienda mostra solo output e stato."
        meta={
          baseline ? (
            <>
              <Chip>{baseline.companyName}</Chip>
              <Chip>Periodo {baseline.reportingPeriod}</Chip>
              <Status tone={thresholdMet ? 'ok' : 'risk'}>
                {thresholdMet ? 'Soglia soddisfatta' : 'Sotto soglia'}
              </Status>
            </>
          ) : selectedTenant && !loading ? (
            <>
              <Chip>{selectedTenant.companyName}</Chip>
              <Status tone="idle">Nessuna baseline</Status>
            </>
          ) : undefined
        }
      />

      <Workspace>
        <Col span="main">
          {verdictRegion}
          {groupsRegion}
        </Col>
        <Col span="rail">
          {companyRail}
          {privacyRail}
          {pathsRail}
        </Col>
      </Workspace>
    </>
  );
}
