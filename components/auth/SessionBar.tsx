// components/auth/SessionBar.tsx
// Server component — session identity strip with logout and password-change link.
// Renders: email · role badge · "Cambia password" · "Esci".
// Import in server-side layouts/pages where the session is already verified.

import Link from 'next/link';
import { LogoutButton } from './LogoutButton';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const ROLE_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  KORA_ADMIN:      { label: 'KORA Admin',      bg: 'rgba(97,86,245,0.10)',  color: '#3b30c9', border: 'rgba(97,86,245,0.28)'  },
  COMPANY_ADMIN:   { label: 'Company Admin',   bg: 'rgba(22,101,52,0.10)',  color: '#166534', border: 'rgba(22,101,52,0.28)'  },
  WORKER:          { label: 'Worker',          bg: 'rgba(37,99,235,0.10)',  color: '#1e4a8a', border: 'rgba(37,99,235,0.28)'  },
};

interface SessionBarProps {
  email: string;
  role: string;
}

export function SessionBar({ email, role }: SessionBarProps) {
  const badge = ROLE_BADGE[role] ?? {
    label: role, bg: 'rgba(6,3,43,0.06)', color: 'rgba(6,3,43,0.55)', border: 'rgba(6,3,43,0.12)',
  };

  return (
    <div
      data-testid="session-bar"
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        padding:      '8px 16px',
        background:   'rgba(6,3,43,0.025)',
        borderBottom: '1px solid rgba(6,3,43,0.07)',
        flexWrap:     'wrap',
        minHeight:    38,
        fontFamily:   FONT,
      }}
    >
      {/* Email */}
      <span style={{ fontSize: 11, color: 'rgba(6,3,43,0.55)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
        {email}
      </span>

      {/* Role badge */}
      <span style={{
        fontSize:     '9px',
        fontWeight:   700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding:      '3px 8px',
        borderRadius: 999,
        background:   badge.bg,
        color:        badge.color,
        border:       `1px solid ${badge.border}`,
        flexShrink:   0,
      }}>
        {badge.label}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Change password link */}
      <Link
        href="/auth/forgot-password"
        style={{
          fontSize:   '11px',
          fontWeight: 500,
          color:      'rgba(6,3,43,0.40)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          letterSpacing: '0.01em',
        }}
      >
        Cambia password
      </Link>

      {/* Logout */}
      <LogoutButton />
    </div>
  );
}
