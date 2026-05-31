'use client';

interface PageMastheadProps {
  eyebrow: string;
  title: string;
  subline?: string;
  meta?: string;
}

export function PageMasthead({ eyebrow, title, subline, meta }: PageMastheadProps) {
  return (
    <div className="mb-7">
      <p
        className="font-mono uppercase mb-2.5"
        style={{ fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(20,18,46,0.50)' }}
      >
        {eyebrow}
      </p>
      <h1
        className="font-kora-serif text-kora-ink leading-[1.04]"
        style={{ fontSize: 'clamp(2.25rem, 4vw, 2.875rem)', letterSpacing: '-0.025em' }}
      >
        {title}
      </h1>
      {subline && (
        <p
          className="mt-2"
          style={{ fontSize: '13px', color: 'rgba(20,18,46,0.55)', letterSpacing: '-0.003em' }}
        >
          {subline}
        </p>
      )}
      {meta && (
        <p
          className="mt-1"
          style={{ fontSize: '11px', color: 'rgba(20,18,46,0.35)' }}
        >
          {meta}
        </p>
      )}
    </div>
  );
}
