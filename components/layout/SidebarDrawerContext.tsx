'use client';

// components/layout/SidebarDrawerContext.tsx
// KORA-WP-088 — Responsive/Design System Full Closure (KORA-GAP-RESPONSIVE-001).
//
// Shared open/closed state for the mobile sidebar drawer. Lives in its own
// module rather than inside AppShell because both Header (which renders the
// toggle) and Sidebar (which renders the drawer) consume it, and AppShell
// already imports both — putting the context in AppShell would create a
// circular import.
//
// Presentation-only: this changes nothing about navigation structure,
// route architecture, or role resolution (all frozen by KORA-WP-073).

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface SidebarDrawerState {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarDrawerContext = createContext<SidebarDrawerState>({
  open: false,
  toggle: () => {},
  close: () => {},
});

export function SidebarDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, toggle, close }), [open, toggle, close]);
  return <SidebarDrawerContext.Provider value={value}>{children}</SidebarDrawerContext.Provider>;
}

export function useSidebarDrawer(): SidebarDrawerState {
  return useContext(SidebarDrawerContext);
}

/** Shared id so the Header toggle can reference the drawer it controls (aria-controls). */
export const SIDEBAR_DRAWER_ID = 'kora-sidebar-drawer';
