'use client';

import { usePathname } from 'next/navigation';
import { useRole } from '@/lib/demo-state';
import { isAdminRole } from '@/lib/permissions';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const AREA_LABELS: Record<string, string> = {
  '/my-kora':  'Worker · My KORA',
  '/partner':  'Partner',
  '/advisor':  'Advisor',
  '/company':  'Company Admin',
};

function resolveArea(pathname: string): string | null {
  for (const [prefix, label] of Object.entries(AREA_LABELS)) {
    if (pathname.startsWith(prefix)) return label;
  }
  return null;
}

// FounderPreviewBanner — shown when KORA_ADMIN is previewing a non-admin portal.
//
// This banner is PURELY presentational.
// It does NOT grant any backend permissions.
// Server-side auth (kora-session.ts + middleware) remains the authoritative security layer.
// viewMode (demo-state activeRole) ≠ actualRole (Supabase app_metadata.kora_role).
export function FounderPreviewBanner() {
  const { activeRole, setRole } = useRole();
  const pathname = usePathname();

  // Only show when KORA_ADMIN is on a non-admin route
  if (!isAdminRole(activeRole)) return null;
  const area = resolveArea(pathname);
  if (!area) return null;

  return (
    <div
      style={{
        background:   TOKENS.ink,
        borderBottom: `1px solid rgba(255,255,255,0.07)`,
        padding:      '6px 20px',
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        flexWrap:     'wrap',
      }}
    >
      {/* Terracotta label */}
      <span style={{
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontWeight:    700,
        fontSize:      '9px',
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color:         TOKENS.accent,
        flexShrink:    0,
      }}>
        Founder Preview
      </span>

      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>·</span>

      <span style={{
        fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontSize:   '11px',
        fontWeight: 500,
        color:      'rgba(255,255,255,0.72)',
      }}>
        Visualizzando come <strong style={{ color: '#FFFFFF', fontWeight: 700 }}>{area}</strong>
      </span>

      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 'auto' }}>
        actualRole: KORA_ADMIN · viewMode: preview
      </span>

      <button
        onClick={() => setRole('KORA_ADMIN')}
        style={{
          fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:     '10px',
          fontWeight:   600,
          color:        TOKENS.accent,
          background:   'transparent',
          border:       `1px solid ${TOKENS.accent}50`,
          borderRadius: 999,
          padding:      '2px 10px',
          cursor:       'pointer',
          flexShrink:   0,
          transition:   'all 120ms ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${TOKENS.accent}18`; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        ← Admin
      </button>
    </div>
  );
}
