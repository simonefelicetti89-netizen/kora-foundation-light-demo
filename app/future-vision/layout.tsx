// app/future-vision/layout.tsx
// B36.1: Future Vision is KORA_ADMIN-visible by default.
// Real company sessions are blocked upstream by middleware (redirected to /company/workspace).
// Demo-state company users can access it — it is clearly labeled non-operational.

export default function FutureVisionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div
        className="mb-4 rounded-md border px-4 py-2.5 text-sm font-semibold"
        style={{
          borderColor: 'rgba(186,117,23,0.4)',
          background: 'rgba(186,117,23,0.08)',
          color: '#c9862d',
        }}
      >
        <span className="mr-2">Vision prodotto strategica —</span>
        <span className="font-normal">non attivo in Foundation Light · Nessun production claim</span>
      </div>
      {children}
    </div>
  );
}
