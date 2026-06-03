'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { KoraRole } from '@/lib/types';
import { formatRole } from '@/lib/formatters';
import { useRole } from '@/lib/demo-state';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface AccessDeniedStateProps {
  role: KoraRole;
  route: string;
  reason?: string;
  requiredRole?: KoraRole;
  className?: string;
}

export function AccessDeniedState({ role, route, reason, requiredRole, className }: AccessDeniedStateProps) {
  const { setRole } = useRole();
  const router = useRouter();

  function handleRoleSwitch() {
    if (!requiredRole) return;
    setRole(requiredRole);
    router.push(route);
  }

  return (
    <div
      className={cn('flex min-h-[480px] flex-col items-center justify-center p-8', className)}
      role="alert"
    >
      <div
        style={{
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          boxShadow:    TOKENS.cardShadow,
          padding:      '40px 48px',
          textAlign:    'center',
          maxWidth:     480,
          width:        '100%',
        }}
      >
        {/* Lock indicator */}
        <div style={{
          width:           44,
          height:          44,
          borderRadius:    '50%',
          background:      TOKENS.inkBorder,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          margin:          '0 auto 20px',
          border:          TOKENS.cardBorderStrong,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TOKENS.inkSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        {/* Headline */}
        <p style={{
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight:    700,
          fontSize:      '15px',
          color:         TOKENS.ink,
          letterSpacing: '-0.005em',
          marginBottom:  8,
        }}>
          Area riservata
        </p>

        {/* Route + role context */}
        <p style={{
          fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:    '12.5px',
          color:       TOKENS.inkSecondary,
          lineHeight:  1.55,
          maxWidth:    360,
          margin:      '0 auto 8px',
        }}>
          La sezione{' '}
          <code style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize:   '11px',
            background: TOKENS.inkBorder,
            borderRadius: 4,
            padding:    '1px 5px',
            color:      TOKENS.ink,
          }}>
            {route}
          </code>{' '}
          non è accessibile al ruolo{' '}
          <strong style={{ color: TOKENS.ink }}>{formatRole(role)}</strong>.
        </p>

        {reason && (
          <p style={{
            fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:   '11.5px',
            color:      TOKENS.inkHint,
            lineHeight: 1.5,
            marginBottom: 20,
          }}>
            {reason}
          </p>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: TOKENS.inkBorder, margin: '20px 0' }} />

        {requiredRole ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <p style={{
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)',
              fontSize:   '11.5px',
              color:      TOKENS.inkSecondary,
              lineHeight: 1.5,
            }}>
              Passa al ruolo{' '}
              <strong style={{ color: TOKENS.ink }}>{formatRole(requiredRole)}</strong>{' '}
              per accedere a questa area.
            </p>
            <button
              onClick={handleRoleSwitch}
              style={{
                background:   TOKENS.accent,
                color:        '#FFFFFF',
                border:       'none',
                borderRadius: 12,
                padding:      '9px 20px',
                fontSize:     '12.5px',
                fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontWeight:   600,
                cursor:       'pointer',
                boxShadow:    `0 4px 14px rgba(199,111,61,0.25)`,
                transition:   'all 140ms ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#B5602E'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = TOKENS.accent; }}
            >
              Cambia ruolo e apri →
            </button>
          </div>
        ) : (
          <p style={{
            fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)',
            fontSize:   '11.5px',
            color:      TOKENS.inkHint,
          }}>
            Usa il Role Switcher nell&apos;header per passare a un ruolo appropriato.
          </p>
        )}
      </div>
    </div>
  );
}
