'use client';

import type { KoraIndexOutput } from '@/lib/types';

interface BoundaryIdentityRowProps {
  output: KoraIndexOutput;
}

// Non-suppressible privacy governance row — not a disclaimer.
// Lime accent = KORA identity marker for organization-level boundary.
export function BoundaryIdentityRow({ output }: BoundaryIdentityRowProps) {
  return (
    <div
      className="flex items-center justify-between flex-wrap gap-3"
      style={{
        borderLeft:   '3px solid rgba(200,255,71,0.42)',
        borderTop:    '1px solid rgba(200,255,71,0.11)',
        borderBottom: '1px solid rgba(200,255,71,0.11)',
        background:   'rgba(200,255,71,0.022)',
        padding:      '9px 14px 9px 16px',
      }}
    >
      <div
        className="flex items-center flex-wrap font-mono text-black/25"
        style={{ fontSize: '7px', letterSpacing: '0.08em' }}
      >
        <span>N≥10 enforced</span>
        <span className="mx-1.5 opacity-35">&middot;</span>
        <span>PII Guard active</span>
        <span className="mx-1.5 opacity-35">&middot;</span>
        <span>Organization-level only</span>
        <span className="mx-1.5 opacity-35">&middot;</span>
        <span>No individual surveillance</span>
        <span className="mx-1.5 opacity-35">&middot;</span>
        <span>synthetic_demo_data: true</span>
        <span className="mx-1.5 opacity-35">&middot;</span>
        <span>Confidence Score: esterno al KORA Index v3</span>
      </div>
      <p
        className="font-mono flex-shrink-0"
        style={{ fontSize: '7px', letterSpacing: '0.08em', color: 'rgba(200,255,71,0.42)' }}
      >
        {output.methodology_version_id}
      </p>
    </div>
  );
}
