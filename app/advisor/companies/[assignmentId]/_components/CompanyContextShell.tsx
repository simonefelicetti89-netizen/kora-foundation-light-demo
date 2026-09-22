'use client';

// KORA-WP-064 (second pass) — the per-Company Advisor workspace frame.
//
// WHAT CHANGED AND WHY. The first pass proved the architecture but produced a
// backoffice: a tall masthead, seven equal pills and the SAME rail —
// Assegnazione / Limite di accesso / Percorsi collegati — repeated on every
// route whether or not it helped that job. Chrome dominated the work.
//
// Now: one compact context bar (Company, role, state, and the way back),
// a segmented section switcher, and the full width given to the work. A
// secondary panel is OPT-IN per route (`secondary`), so it appears only where
// it materially helps, and the access rule is stated once, here, not on six
// pages.
//
// Access is still resolved from the assignment-scoped endpoint, never inferred
// from the route parameter.

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { PX } from '@/lib/design/kora-design-tokens';
import { Workspace, Col, Status, StateBlock, SkeletonRows } from '@/components/ui/px';
import { COMPANY_SECTIONS, sectionHref, fetchAssignment, type AssignedCompany } from '../_lib';

export function CompanyContextShell({
  assignmentId, children, secondary,
}: {
  assignmentId: string;
  children: (company: AssignedCompany) => ReactNode;
  /** Context-specific panel. Omit it when the job wants the whole width. */
  secondary?: (company: AssignedCompany) => ReactNode;
}) {
  const pathname = usePathname();
  const [company, setCompany] = useState<AssignedCompany | null>(null);
  const [failed, setFailed] = useState(false);
  const [resolved, setResolved] = useState(false);

  const load = useCallback(() => {
    fetchAssignment(assignmentId)
      .then((c) => setCompany(c))
      .catch(() => setFailed(true))
      .finally(() => setResolved(true));
  }, [assignmentId]);

  useEffect(() => { load(); }, [load]);

  if (!resolved) return <SkeletonRows rows={5} rowHeight={44} />;

  if (failed) {
    return (
      <StateBlock
        title="Contesto Company non disponibile"
        body="Non è stato possibile leggere le tue assegnazioni. Ricarica la pagina; se il problema persiste contatta KORA."
      />
    );
  }

  if (!company) {
    return (
      <StateBlock
        title="Company non assegnata"
        body="Questa Company non risulta fra le tue assegnazioni attive. Il portale Advisor mostra soltanto le Company su cui hai un’assegnazione in corso."
        action={
          <Link
            href="/advisor/companies"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 34, padding: '0 13px',
              borderRadius: PX.rCtl, border: `1px solid ${PX.violetEdge}`, background: PX.violetTint,
              color: PX.violet700, fontFamily: PX.sans, fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
            }}
          >
            <ChevronLeft size={15} strokeWidth={2.2} aria-hidden="true" />
            Torna alle tue Company
          </Link>
        }
      />
    );
  }

  const body = children(company);
  const panel = secondary?.(company);

  return (
    <>
      {/* ── Context bar: who I am working for, in one line ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 0,
          padding: '0 0 13px', marginBottom: 14, borderBottom: `1px solid ${PX.line}`, fontFamily: PX.sans,
        }}
      >
        <Link
          href="/advisor/companies"
          aria-label="Torna alle tue Company"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, flex: 'none', borderRadius: PX.rCtl,
            border: `1px solid ${PX.line2}`, background: PX.l1, color: PX.ink2, textDecoration: 'none',
          }}
        >
          <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />
        </Link>

        <div style={{ display: 'grid', gap: 1, minWidth: 0 }}>
          <h1 style={{
            margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.022em', lineHeight: 1.2,
            color: PX.ink, minWidth: 0, overflowWrap: 'anywhere',
          }}>
            {company.companyName}
          </h1>
          <span style={{ fontSize: 11.5, fontWeight: 650, color: PX.ink3 }}>
            {company.role} · Workspace Advisor
          </span>
        </div>

        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <Status tone={company.valid ? 'ok' : 'warn'}>
            {company.valid ? 'Relazione attiva' : 'In attivazione'}
          </Status>
          <span
            title="Vedi soltanto le Company su cui hai un’assegnazione attiva, e di ciascuna soltanto il lavoro Advisor. Nessun dato individuale dei lavoratori è accessibile da questo portale."
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, height: 23, padding: '0 8px',
              borderRadius: PX.rChip, background: PX.inkWash, border: `1px solid ${PX.line}`,
              fontSize: 11, fontWeight: 700, color: PX.ink3,
            }}
          >
            <ShieldCheck size={13} strokeWidth={2.2} aria-hidden="true" />
            Accesso limitato all’assegnazione
          </span>
        </span>
      </div>

      {!company.valid && company.invalidReasons.length > 0 && (
        <p style={{
          margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: PX.warnText ?? PX.ink2,
          fontFamily: PX.sans, overflowWrap: 'anywhere',
        }}>
          Assegnazione non ancora pienamente valida: {company.invalidReasons.join(' · ')}.
        </p>
      )}

      {/* ── Section switcher: one control, not seven loose buttons ── */}
      <nav
        aria-label="Sezioni della Company"
        style={{
          display: 'flex', gap: 2, minWidth: 0, marginBottom: 16, padding: 3,
          borderRadius: PX.rCtl, border: `1px solid ${PX.line}`, background: PX.l2,
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        }}
      >
        {COMPANY_SECTIONS.map((s) => {
          const href = sectionHref(assignmentId, s.slug);
          const active = pathname === href;
          return (
            <Link
              key={s.slug || 'overview'}
              href={href}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 11px',
                flex: 'none', borderRadius: 6, fontFamily: PX.sans, fontSize: 12.5,
                fontWeight: active ? 750 : 650, textDecoration: 'none', whiteSpace: 'nowrap',
                background: active ? PX.l1 : 'transparent',
                color: active ? PX.ink : PX.ink3,
                boxShadow: active ? PX.sh1 : 'none',
              }}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>

      {panel ? (
        <Workspace>
          <Col span="main">{body}</Col>
          <Col span="rail">{panel}</Col>
        </Workspace>
      ) : (
        body
      )}
    </>
  );
}
