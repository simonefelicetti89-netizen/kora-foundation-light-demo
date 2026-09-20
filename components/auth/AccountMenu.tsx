'use client';

// components/auth/AccountMenu.tsx
// B118: Authenticated user account menu — shown in Header for all real sessions.
// Renders: avatar initials, email, role badge, /account link, change-password, logout.
// Only rendered when a real Supabase session exists (realRole !== null/undefined).
// Never shown to unauthenticated demo-only users.

import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { LogoutButton } from './LogoutButton';
import { BADGE_TOKENS, TOKENS } from '@/lib/design/kora-design-tokens';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const ROLE_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  KORA_ADMIN:     { label: 'KORA Admin',     bg: 'rgba(97,86,245,0.10)',  color: TOKENS.violet, border: 'rgba(97,86,245,0.28)'  },
  COMPANY_ADMIN:  { label: 'Company Admin',  bg: 'rgba(22,101,52,0.10)',  color: BADGE_TOKENS.eligible.text, border: 'rgba(22,101,52,0.28)'  },
  WORKER:         { label: 'Worker',         bg: 'rgba(37,99,235,0.10)',  color: TOKENS.info.text, border: 'rgba(37,99,235,0.28)'  },
  PARTNER:        { label: 'Partner',        bg: 'rgba(192,125,42,0.10)', color: TOKENS.safeguard.watch.text, border: 'rgba(192,125,42,0.28)' },
};

function getInitials(emailStr: string): string {
  const local = emailStr.split('@')[0] ?? '';
  if (local.includes('.')) {
    const parts = local.split('.');
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function AccountMenu() {
  const [realRole, setRealRole] = useState<string | null | undefined>(undefined);
  const [email, setEmail]       = useState<string>('');
  const [open, setOpen]         = useState(false);
  const containerRef            = useRef<HTMLDivElement>(null);
  const triggerRef              = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      const role = data.session?.user?.app_metadata?.kora_role as string | undefined;
      setRealRole(role ?? null);
      setEmail(data.session?.user?.email ?? '');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const role = session?.user?.app_metadata?.kora_role as string | undefined;
      setRealRole(role ?? null);
      setEmail(session?.user?.email ?? '');
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    // WP-073: keyboard users must be able to dismiss the open menu without a
    // mouse click outside it — Escape is the standard dismissal key for any
    // disclosure/popup pattern.
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  // Only render for authenticated real sessions
  if (!realRole) return null;

  const badge    = ROLE_BADGE[realRole] ?? { label: realRole, bg: 'rgba(6,3,43,0.06)', color: 'rgba(6,3,43,0.55)', border: 'rgba(6,3,43,0.12)' };
  const initials = getInitials(email);

  return (
    <div
      ref={containerRef}
      data-testid="account-menu-container"
      style={{ position: 'relative', fontFamily: FONT }}
    >
      {/* Trigger button */}
      <button
        ref={triggerRef}
        data-testid="account-menu-trigger"
        aria-label="Menu account"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          padding:      '4px 10px 4px 6px',
          background:   'none',
          border:       '1px solid rgba(6,3,43,0.14)',
          borderRadius: 8,
          cursor:       'pointer',
          fontFamily:   FONT,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(6,3,43,0.28)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(6,3,43,0.14)'; }}
      >
        <span
          data-testid="account-menu-avatar"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          26,
            height:         26,
            borderRadius:   999,
            background:     badge.bg,
            border:         `1px solid ${badge.border}`,
            fontSize:       9,
            fontWeight:     800,
            color:          badge.color,
            letterSpacing:  '0.05em',
            flexShrink:     0,
          }}
        >
          {initials}
        </span>
        <span
          style={{
            fontSize:      11,
            fontWeight:    500,
            color:         'rgba(6,3,43,0.65)',
            maxWidth:      140,
            overflow:      'hidden',
            textOverflow:  'ellipsis',
            whiteSpace:    'nowrap',
          }}
        >
          {email}
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          data-testid="account-menu-dropdown"
          style={{
            position:     'absolute',
            top:          '100%',
            right:        0,
            marginTop:    6,
            width:        224,
            background:   '#FFFFFF',
            border:       '1px solid rgba(6,3,43,0.10)',
            borderRadius: 12,
            boxShadow:    '0 8px 32px rgba(6,3,43,0.10)',
            zIndex:       50,
            overflow:     'hidden',
          }}
        >
          {/* Identity block */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(6,3,43,0.07)' }}>
            <p
              style={{
                fontSize:     12,
                fontWeight:   600,
                color:        TOKENS.ink,
                margin:       '0 0 6px',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
              }}
            >
              {email}
            </p>
            <span
              data-testid="account-menu-role-badge"
              style={{
                fontSize:      9,
                fontWeight:    700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding:       '3px 8px',
                borderRadius:  999,
                background:    badge.bg,
                color:         badge.color,
                border:        `1px solid ${badge.border}`,
              }}
            >
              {badge.label}
            </span>
          </div>

          {/* Navigation actions */}
          <div style={{ padding: '8px 0' }}>
            <a
              href="/account"
              data-testid="account-menu-link-account"
              onClick={() => setOpen(false)}
              style={{
                display:        'block',
                padding:        '8px 16px',
                fontSize:       12,
                fontWeight:     500,
                color:          TOKENS.ink,
                textDecoration: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,3,43,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Il tuo account
            </a>
            <a
              href="/auth/forgot-password"
              data-testid="account-menu-link-password"
              onClick={() => setOpen(false)}
              style={{
                display:        'block',
                padding:        '8px 16px',
                fontSize:       12,
                fontWeight:     500,
                color:          TOKENS.ink,
                textDecoration: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,3,43,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Cambia password
            </a>
          </div>

          {/* Logout */}
          <div style={{ padding: '8px 16px 12px', borderTop: '1px solid rgba(6,3,43,0.07)' }}>
            <LogoutButton label="Esci dall'account" />
          </div>
        </div>
      )}
    </div>
  );
}
