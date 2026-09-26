'use client';

/**
 * The verdict and its precision sub-line — the T1 of the KORA Index.
 *
 * The sentence is authored (lib/verdict) and the sub-line is generated from
 * actual figures. This component renders them and owns neither: it cannot be
 * passed a size, and it cannot compose a sentence of its own, because a verdict
 * assembled at the render layer would escape the character budget and the
 * editorial review that the library exists to enforce.
 */
export function VerdictLine({ period, verdict, precision }: {
  period: string;
  verdict: string;
  precision?: string;
}) {
  return (
    <div data-kora-region="verdict">
      <p className="kt-meta" style={{ color: 'rgba(255,255,255,0.50)', marginBottom: 24 }}>{period}</p>
      <h2 className="kt-display" style={{ color: '#FFFFFF', maxWidth: '15ch' }}>{verdict}</h2>
      {precision && (
        <p className="kt-section" style={{ fontWeight: 400, color: 'rgba(255,255,255,0.72)', marginTop: 16, maxWidth: '64ch' }}>
          {precision}
        </p>
      )}
    </div>
  );
}
