'use client';

// components/layout/Header.tsx
// KORA-WP-125 — top chrome condiviso del Prodotto autenticato.
// HANDOFF §3: sticky, 56px, L0 traslucido con blur, 1px di regola inferiore.
//
// ── ONE PRODUCT / NO DEMO RUNTIME ────────────────────────────────────────────
// Autorità: docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md
// (decisione Founder, 2026-08-31) e Master Plan v2.1 §13. KORA ha UN SOLO
// runtime di Prodotto: demo e live condividono schema, servizi, metodologia e
// UI — "Differenza: solo la provenienza del dato". Nessuna indicazione
// automatica, guidata dall'architettura, che i dati siano demo o sintetici può
// comparire nel Prodotto autenticato.
//
// Rimossi da questo header — rimossi, non ridisegnati:
//   EnvironmentSwitcher (DEMO/LIVE/FUTURE) · ScenarioSwitcher · PersonaSwitcher
//   · RoleSwitcher · badge ambiente.
// Erano l'orchestrazione di un secondo modo di Prodotto. Il Registro
// Architetturale (2026-09-06) aveva già stabilito che CLAUDE.md §10 — che li
// elenca come "allowed work" — è perimetro storico pre-Gate-2, NON un mandato
// permanente, e che PATCH_03 è la decisione più recente e più specifica.
//
// I componenti NON sono cancellati: restano disponibili all'isola showcase
// `/demo/*`, separatamente governata (D-C), e all'infrastruttura di test.
//
// Cosa resta, e perché: solo contesto reale — identità del workspace risolta
// dalla sessione, posizione canonica nella navigazione, controlli dell'account
// autenticato. Nessuna capability inventata: niente ricerca, niente command
// palette, niente selettore di periodo, niente CTA globale, perché nessuna di
// queste esiste oggi nel Prodotto. Le pagine che ne possiedono davvero una la
// compongono negli slot.

import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useRole } from '@/lib/demo-state';
import { PX } from '@/lib/design/kora-design-tokens';
import { AccountMenu } from '@/components/auth/AccountMenu';
import { useSidebarDrawer, SIDEBAR_DRAWER_ID } from '@/components/layout/SidebarDrawerContext';
import { resolveRouteContext } from '@/lib/navigation/route-context';
import { WORKSPACE_IDENTITY } from '@/lib/navigation/workspace-identity';

export function Header() {
  const { activeRole } = useRole();
  const drawer = useSidebarDrawer();
  const pathname = usePathname();

  const routeCtx = resolveRouteContext(pathname, activeRole);
  const workspace = WORKSPACE_IDENTITY[activeRole] ?? null;

  return (
    <header className="px-top sticky top-0 z-30 flex shrink-0 items-center gap-3 px-4 sm:px-6">
      {/* WP-088: mobile-only sidebar drawer toggle. Hidden at md+ where the
          sidebar is a permanent column. Presentation only — opens the same
          navigation, changes no route or nav structure. */}
      <button
        type="button"
        onClick={drawer.toggle}
        aria-label={drawer.open ? 'Chiudi navigazione' : 'Apri navigazione'}
        aria-expanded={drawer.open}
        aria-controls={SIDEBAR_DRAWER_ID}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg md:hidden"
        style={{ background: 'transparent', border: `1px solid ${PX.line2}`, cursor: 'pointer' }}
      >
        <span aria-hidden="true" className="flex flex-col gap-[3px]">
          <span style={{ display: 'block', width: 16, height: 2, borderRadius: 1, background: PX.ink }} />
          <span style={{ display: 'block', width: 16, height: 2, borderRadius: 1, background: PX.ink }} />
          <span style={{ display: 'block', width: 16, height: 2, borderRadius: 1, background: PX.ink }} />
        </span>
      </button>

      {/* Workspace identity — HANDOFF §16/§21.5. The gradient chip is the only
          element that varies by environment; everything else is identical
          across workspaces. Derived from the session's role, never from
          whether the tenant happens to hold synthetic data. */}
      {workspace && (
        <span className="flex shrink-0 items-center gap-2.5" data-px-workspace={workspace.key}>
          <span
            aria-hidden="true"
            style={{
              width: 26, height: 26, borderRadius: 7, flex: 'none',
              display: 'grid', placeItems: 'center',
              background: workspace.gradient,
              color: PX.onViolet, fontSize: 11, fontWeight: 800, letterSpacing: '-0.01em',
            }}
          >
            {workspace.initial}
          </span>
          <span
            className="hidden truncate lg:block"
            style={{ fontSize: 12.5, fontWeight: 700, color: PX.ink, letterSpacing: '-0.01em' }}
          >
            {workspace.label}
          </span>
        </span>
      )}

      {/* Route context — canonical navigation metadata only, never a guessed
          label. Deliberately outside any scrolling strip, so it is always
          visible at every width. */}
      {(routeCtx.section || routeCtx.page) && (
        <>
          <span aria-hidden="true" className="hidden sm:block" style={{ width: 1, height: 20, background: PX.line2, flex: 'none' }} />
          <nav
            aria-label="Posizione corrente"
            className="flex min-w-0 items-center gap-1.5"
            style={{ fontSize: 12.5, fontWeight: 600, color: PX.ink3 }}
          >
            {routeCtx.section && (
              <>
                <span className="hidden truncate md:block">{routeCtx.section}</span>
                <ChevronRight size={13} strokeWidth={2.4} aria-hidden="true" className="hidden md:block" style={{ opacity: 0.4, flex: 'none' }} />
              </>
            )}
            {routeCtx.page && (
              <span className="truncate" style={{ color: PX.ink, fontWeight: 700 }} aria-current="page">
                {routeCtx.page}
              </span>
            )}
          </nav>
        </>
      )}

      {/* Page-owned slots. Empty until a page that genuinely owns a search or an
          action composes into them — never filled to look finished. */}
      <div data-px-slot="page-search" className="ml-auto flex min-w-0 items-center gap-2" />
      <div data-px-slot="page-actions" className="flex shrink-0 items-center gap-2" />

      <div className="flex items-center gap-3 shrink-0">
        <AccountMenu />
      </div>
    </header>
  );
}
