'use client';

interface OperatorToolBoundaryProps {
  className?: string;
}

export function OperatorToolBoundary({ className }: OperatorToolBoundaryProps) {
  return (
    <div
      className={`rounded-lg px-4 py-3 flex items-start gap-3 ${className ?? ''}`}
      style={{
        border:          '1px solid var(--env-border)',
        backgroundColor: 'var(--env-soft)',
      }}
    >
      <svg
        className="w-4 h-4 mt-0.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        style={{ color: 'var(--env-accent)' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <div>
        <p className="text-xs font-semibold" style={{ color: 'var(--env-text)' }}>
          Strumento operativo KORA — non area self-service cliente
        </p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--env-text)', opacity: 0.8 }}>
          Nel modello Foundation Light, i file sono inviati a KORA. L&apos;operatore KORA carica, revisiona, calcola e genera il Decision Pack.
          L&apos;azienda vede solo output aggregati.
        </p>
      </div>
    </div>
  );
}
