'use client';

interface PageMastheadProps {
  eyebrow: string;
  title: string;
  subline?: string;
  meta?: string;
}

export function PageMasthead({ eyebrow, title, subline, meta }: PageMastheadProps) {
  return (
    <div className="mb-8">
      {/* Eyebrow — terracotta, uppercase, spaced */}
      <p
        className="uppercase mb-3"
        style={{
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight:    600,
          fontSize:      '11px',
          letterSpacing: '0.09em',
          color:         '#C76F3D',
        }}
      >
        {eyebrow}
      </p>

      {/* Title — Instrument Serif, editorial weight */}
      <h1
        className="font-kora-serif text-kora-ink leading-[1.04]"
        style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', letterSpacing: '-0.02em' }}
      >
        {title}
      </h1>

      {subline && (
        <p
          className="mt-2.5"
          style={{
            fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:    '15px',
            lineHeight:  1.5,
            color:       'rgba(6,3,43,0.62)',
            letterSpacing: '-0.003em',
          }}
        >
          {subline}
        </p>
      )}

      {meta && (
        <p
          className="mt-1.5"
          style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:      '11px',
            color:         'rgba(6,3,43,0.38)',
            letterSpacing: '0.02em',
          }}
        >
          {meta}
        </p>
      )}
    </div>
  );
}
