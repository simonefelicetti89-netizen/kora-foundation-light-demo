'use client';
// KORA-WP-027 — Onboarding Readiness Pipeline Rebuild + KORA Ready
// Attainment/Health Split.
//
// Repurposes the former COMPANY-008 "locked notice" shell (confirmed
// reachable via middleware's own COMPANY_ALLOWED_PREFIXES but with zero
// inbound link anywhere in the app before this task) into the real
// Company-facing Current Readiness Health view — blocker/warning
// distinction, doc 78 §7's own "Company-facing view" requirement.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface ReadinessCheck {
  check_id: string;
  label: string;
  status: 'ok' | 'warning' | 'blocked';
  detail: string;
  blocking: boolean;
}

interface ReadinessResponse {
  ok: boolean;
  status?: 'ready' | 'not_ready' | 'degraded' | 'revoked';
  blockers?: ReadinessCheck[];
  warnings?: ReadinessCheck[];
  attainedAt?: string | null;
  error?: string;
}

const STATUS_LABEL: Record<string, string> = {
  ready: 'Pronto',
  not_ready: 'Non ancora pronto',
  degraded: 'Attenzione — verifica necessaria',
  revoked: 'Sospeso da KORA Admin',
};

export default function CompanyOnboardingRoom() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReadinessResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/company/readiness')
      .then((res) => res.json())
      .then((json) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setData({ ok: false, error: 'Errore di rete.' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6 }}>
          Onboarding Aziendale
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>
          Stato di Prontezza KORA
        </h1>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          KORA Ready è uno stato operativo/dati, valutato automaticamente. Non riflette la qualità dell&apos;impatto, non implica idoneità commerciale o Prime.
        </p>
      </div>

      <div
        className="rounded-[16px] px-5 py-4"
        style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}
      >
        {loading && (
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>Valutazione in corso…</p>
        )}
        {!loading && data?.ok && (
          <>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TOKENS.ink, marginBottom: 8 }}>
              {STATUS_LABEL[data.status ?? ''] ?? data.status}
            </p>
            {data.attainedAt && (
              <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginBottom: 8 }}>
                Raggiunto per la prima volta il {new Date(data.attainedAt).toLocaleDateString('it-IT')}.
              </p>
            )}
            {(data.blockers ?? []).length > 0 && (
              <div className="mb-3">
                <p style={{ fontSize: '10px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>Blocchi</p>
                {(data.blockers ?? []).map((c) => (
                  <p key={c.check_id} style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginBottom: 2 }}>• {c.label}: {c.detail}</p>
                ))}
              </div>
            )}
            {(data.warnings ?? []).length > 0 && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>Avvisi</p>
                {(data.warnings ?? []).map((c) => (
                  <p key={c.check_id} style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginBottom: 2 }}>• {c.label}: {c.detail}</p>
                ))}
              </div>
            )}
            {(data.blockers ?? []).length === 0 && (data.warnings ?? []).length === 0 && (
              <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
                Nessun blocco o avviso attivo.
              </p>
            )}
          </>
        )}
        {!loading && !data?.ok && (
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>
            Impossibile valutare lo stato di prontezza in questo momento. Contatta KORA Admin.
          </p>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/company/workspace" style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.accent }}>
          Vai al Workspace →
        </Link>
        <Link href="/company/status" style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.inkSecondary }}>
          Status Center →
        </Link>
      </div>

      <p style={{ fontSize: '10px', fontFamily: 'monospace', color: TOKENS.inkHint }}>
        valutazione automatica · nessun dato sintetico
      </p>
    </div>
  );
}
