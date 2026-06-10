'use client';

// components/auth/LogoutButton.tsx
// Client form component that POSTs to /api/auth/logout.
// Renders as a small text button — embed inside any layout.

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

interface LogoutButtonProps {
  label?: string;
}

export function LogoutButton({ label = 'Esci' }: LogoutButtonProps) {
  return (
    <form action="/api/auth/logout" method="POST" style={{ display: 'inline' }}>
      <button
        type="submit"
        style={{
          fontFamily:   FONT,
          fontSize:     '11px',
          fontWeight:   600,
          color:        'rgba(6,3,43,0.45)',
          background:   'none',
          border:       '1px solid rgba(6,3,43,0.14)',
          borderRadius: 6,
          padding:      '4px 10px',
          cursor:       'pointer',
          transition:   'color 150ms ease, border-color 150ms ease',
          letterSpacing: '0.02em',
          whiteSpace:   'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#9E3B2F';
          e.currentTarget.style.borderColor = 'rgba(158,59,47,0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(6,3,43,0.45)';
          e.currentTarget.style.borderColor = 'rgba(6,3,43,0.14)';
        }}
      >
        {label}
      </button>
    </form>
  );
}
