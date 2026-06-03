// app/future-vision/layout.tsx
// B36.1: Future Vision is KORA_ADMIN-visible by default.
// Real company sessions are blocked upstream by middleware (redirected to /company/workspace).
// Demo-state company users can access it — it is clearly labeled non-operational.

import { TOKENS } from '@/lib/design/kora-design-tokens';

export default function FutureVisionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div
        className="mb-4 rounded-md border px-4 py-2.5 text-sm font-semibold"
        style={{
          borderColor: `${TOKENS.safeguard.watch.dot}66`,
          background: TOKENS.safeguard.watch.bg,
          color: TOKENS.safeguard.watch.text,
        }}
      >
        <span className="mr-2">Vision prodotto strategica —</span>
        <span className="font-normal">non attivo in Foundation Light · Nessun production claim</span>
      </div>
      {children}
    </div>
  );
}
