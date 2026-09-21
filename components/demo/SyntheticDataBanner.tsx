'use client';
// SyntheticDataBanner — banner ambiente non-suppressible.
// Scopo: comunicare l'ambiente attivo (DEMO/LIVE/FUTURE) in modo inequivocabile.
// Usa var(--env-accent) da globals.css per restare coerente con l'environment switching.
// B150: mostra 'live' per utenti reali (COMPANY_ADMIN, WORKER) — mai 'demo'.

import { useEffect, useState } from 'react';
import { useEnvironment } from '@/lib/demo-state';
import { resolveRealRoleFromSession, resolveBannerEnvironment } from '@/lib/demo-state/demo-controls-guard';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { TriangleAlert } from 'lucide-react';
import { PX } from '@/lib/design/kora-design-tokens';
import type { Environment } from '@/lib/types';

const ENV_BANNER: Record<Environment, { main: string; secondary: string }> = {
  demo: {
    main:      'DEMO · DATI SIMULATI',
    secondary: 'Ambiente commerciale dimostrativo. Il pilot reale usa dati ricevuti e processati da KORA Operator.',
  },
  live: {
    main:      'LIVE · SERVICE-ASSISTED',
    secondary: 'KORA Operator gestisce intake, review, scoring e Decision Pack. Il cliente consuma output aggregati.',
  },
  future: {
    main:      'FUTURE · ROADMAP · NON ATTIVO',
    secondary: 'Funzionalità future non disponibili in Foundation Light. Nessun production claim.',
  },
};

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export function SyntheticDataBanner() {
  const { activeEnvironment } = useEnvironment();
  const [realRole, setRealRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setRealRole(resolveRealRoleFromSession(data.session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setRealRole(resolveRealRoleFromSession(session));
    });
    return () => subscription.unsubscribe();
  }, []);

  const effectiveEnv = resolveBannerEnvironment(realRole, activeEnvironment as 'demo' | 'live' | 'future');
  if (effectiveEnv === null) return null;

  const { main, secondary } = ENV_BANNER[effectiveEnv];

  // KORA-WP-125 — presentation remediation authorized by the Founder
  // (2026-09-20). The legacy full-bleed bright-orange strip is replaced by the
  // WP-124 warning language: a 3px left bar + icon + text (HANDOFF §12), with
  // severity carried by bar, icon AND wording together — never colour alone.
  //
  // WHAT DID NOT CHANGE, and must not: the wording of `main` and `secondary`
  // is byte-identical; the banner is still rendered unconditionally by the
  // shared shell for every environment that requires it; it is still the
  // first thing in the authenticated document; `role="banner"` and the
  // environment aria-label are unchanged. It is a warning, it is visible, it
  // is not dismissible, and it says exactly what it said before.
  return (
    <div
      role="banner"
      aria-label={`Ambiente corrente: ${activeEnvironment}`}
      className="w-full"
      style={{
        flexShrink:   0,
        display:      'flex',
        gap:          10,
        alignItems:   'flex-start',
        padding:      '10px 24px',
        background:   PX.warnTint,
        color:        PX.warnText,
        boxShadow:    `inset 3px 0 0 ${PX.warn}`,
        borderBottom: `1px solid ${PX.line}`,
      }}
    >
      <TriangleAlert size={16} strokeWidth={2} aria-hidden="true" style={{ flex: 'none', marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontFamily:    FONT,
            fontSize:      '11px',
            fontWeight:    800,
            letterSpacing: '0.07em',
            lineHeight:    1.3,
            textTransform: 'uppercase',
          }}
        >
          {main}
        </p>
        <p
          style={{
            fontFamily: FONT,
            fontSize:   '11.5px',
            fontWeight: 500,
            marginTop:  2,
            lineHeight: 1.45,
            overflowWrap: 'anywhere',
          }}
        >
          {secondary}
        </p>
      </div>
    </div>
  );
}
