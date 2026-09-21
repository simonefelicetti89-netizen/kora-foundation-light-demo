'use client';

// KORA-WP-064 — the Advisor portfolio.
//
// Before this package every Advisor job lived on this one page as nested
// accordions per Company: messages, appointments, notes, cases, review
// assessments and KORAL Review, ~950 lines, no navigation, no deep link, no
// Company context beyond the row you had opened. The capabilities were never
// the problem — the information architecture was (Founder ruling READING 1 —
// DECOMPOSE, 2026-09-21).
//
// This surface now answers only the portfolio question: which Companies am I
// assigned to, and which one do I need to enter. Each Company's work lives at
// /advisor/companies/[assignmentId], deep-linkable, one section per job.
//
// No new API, no new capability, no cross-Company aggregation (Reading 3 was
// explicitly not selected), and the global Advisor navigation still carries
// exactly two destinations — a Company is never hardcoded into the shell.

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PX } from '@/lib/design/kora-design-tokens';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { PageHead, Workspace, Col, Region, Status, StateBlock, SkeletonRows } from '@/components/ui/px';
import { COMPANY_SECTIONS, sectionHref, type AssignedCompany } from './[assignmentId]/_lib';

export default function AdvisorCompaniesPage() {
  const [companies, setCompanies] = useState<AssignedCompany[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Master/detail selection. Purely presentational: the detail is built from
  // the assignment row the list already holds — no second request, and no
  // per-Company capability fan-out (which would be an N+1 across assignments).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Below WP-125's OWN rail breakpoint (1200px — the number app/globals.css
  // already uses to collapse main+rail) the detail belongs under the selected
  // row, not in a second pane. No new breakpoint is introduced.
  const [narrow, setNarrow] = useState(false);

  const load = useCallback(() => {
    fetch('/api/advisor/companies', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const rows: AssignedCompany[] = d.companies ?? [];
          setCompanies(rows);
          if (rows[0]) setSelectedId((cur) => cur ?? rows[0].assignmentId);
        }
        else { setErrorMsg(d.error ?? 'Errore nel caricamento.'); setFailed(true); }
      })
      .catch(() => { setErrorMsg('Errore di rete.'); setFailed(true); });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1200px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const state: 'loading' | 'loaded' | 'error' =
    failed ? 'error' : companies === null ? 'loading' : 'loaded';

  const list = companies ?? [];
  const active = list.filter((c) => c.valid).length;
  const activating = list.length - active;

  const selected = list.find((c) => c.assignmentId === selectedId) ?? null;

  return (
    <>
      <PageHead
        eyebrow="Workspace Advisor"
        title="Le tue Company"
        lead="Le Company su cui hai un’assegnazione attiva. Scegline una per vederne il contesto ed entrare nel suo workspace."
        meta={
          state === 'loaded' ? (
            <>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, height: 23, padding: '0 9px',
                borderRadius: PX.rChip, background: PX.inkWash, border: `1px solid ${PX.line}`,
                fontFamily: PX.sans, fontSize: 11, fontWeight: 700, color: PX.ink3,
              }}>
                <ShieldCheck size={13} strokeWidth={2.2} aria-hidden="true" />
                {list.length === 1 ? '1 assegnazione attiva' : `${list.length} assegnazioni attive`}
              </span>
              {activating > 0 && (
                <Status tone="warn">
                  {activating === 1 ? '1 in attivazione' : `${activating} in attivazione`}
                </Status>
              )}
            </>
          ) : undefined
        }
      />

      {state === 'loading' ? (
        <SkeletonRows rows={4} rowHeight={54} />
      ) : state === 'error' ? (
        <StateBlock
          title="Assegnazioni non disponibili"
          body={errorMsg || 'Non è stato possibile leggere le tue assegnazioni. Ricarica la pagina; se il problema persiste contatta KORA.'}
        />
      ) : list.length === 0 ? (
        <StateBlock
          tone="pending"
          title="Nessuna Company assegnata al momento"
          body="Le assegnazioni sono create e chiuse da KORA Admin: un Advisor non si auto-assegna e una Company non sceglie il proprio Advisor. Quando una Company ti viene assegnata compare qui con tutto il lavoro collegato."
        />
      ) : (
        <Workspace>
          {/* MASTER — the portfolio itself */}
          <Col span="main">
            <Region label="Assegnazioni attive">
              <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                {list.map((c) => {
                  const isSel = c.assignmentId === selectedId;
                  return (
                    <div key={c.assignmentId} style={{ display: 'grid', gap: 0, minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.assignmentId)}
                        aria-pressed={isSel}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
                          padding: '12px 13px', minWidth: 0, cursor: 'pointer',
                          borderRadius: PX.rInner,
                          border: `1px solid ${isSel ? PX.violetEdge : PX.line}`,
                          background: isSel ? PX.violetTint : PX.l1,
                          fontFamily: PX.sans,
                        }}
                      >
                        <span style={{ display: 'grid', gap: 3, minWidth: 0, flex: '1 1 auto' }}>
                          <span style={{
                            fontSize: 14, fontWeight: 780, letterSpacing: '-0.014em',
                            color: isSel ? PX.violet700 : PX.ink, minWidth: 0, overflowWrap: 'anywhere',
                          }}>
                            {c.companyName}
                          </span>
                          <span style={{ fontSize: 11.5, fontWeight: 650, color: PX.ink3 }}>{c.role}</span>
                        </span>
                        <Status tone={c.valid ? 'ok' : 'warn'}>
                          {c.valid ? 'Relazione attiva' : 'In attivazione'}
                        </Status>
                      </button>

                      {/* At phone width the detail belongs under its own row,
                          not in a second pane forced beside it. */}
                      {isSel && narrow && detailBody(c, true)}
                    </div>
                  );
                })}
              </div>
            </Region>

            <p style={{ margin: 0, maxWidth: '84ch', fontSize: 11.5, fontWeight: 600, lineHeight: 1.55, color: PX.ink3, fontFamily: PX.sans }}>
              Le assegnazioni sono create e chiuse da KORA Admin: un Advisor non si auto-assegna e una Company non
              sceglie il proprio Advisor. Ogni Company ha un solo Company Advisor attivo; tu puoi seguirne più di una.
            </p>
          </Col>

          {/* DETAIL — context of the selected Company, from the same row */}
          <Col span="rail" style={narrow ? { display: 'none' } : undefined}>
            <Region label="Company selezionata">
              {selected ? detailBody(selected, false) : (
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: PX.ink3, fontFamily: PX.sans }}>
                  Seleziona una Company per vederne il contesto e le aree di lavoro.
                </p>
              )}
            </Region>
          </Col>
        </Workspace>
      )}
    </>
  );
}

/** The selected-Company context. Every value comes from the assignment row the
 *  list already returned: name, role, relationship validity, and the canonical
 *  section set. No capability endpoint is called from the portfolio. */
function detailBody(c: AssignedCompany, inline: boolean) {
  return (
    <div style={{
      display: 'grid', gap: 11, minWidth: 0, fontFamily: PX.sans,
      ...(inline
        ? { padding: '11px 13px', marginTop: 6, borderRadius: PX.rInner, border: `1px solid ${PX.l2Edge}`, background: PX.l2 }
        : {}),
    }}>
      {inline && (
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PX.ink3 }}>
          Contesto
        </span>
      )}

      {!inline && (
        <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 780, letterSpacing: '-0.014em', color: PX.ink, overflowWrap: 'anywhere' }}>
            {c.companyName}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 650, color: PX.ink3 }}>{c.role}</span>
          <span style={{ marginTop: 3 }}>
            <Status tone={c.valid ? 'ok' : 'warn'}>{c.valid ? 'Relazione attiva' : 'In attivazione'}</Status>
          </span>
        </div>
      )}

      {!c.valid && c.invalidReasons.length > 0 && (
        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, lineHeight: 1.5, color: PX.ink3, overflowWrap: 'anywhere' }}>
          {c.invalidReasons.join(' · ')}
        </p>
      )}

      <Link
        href={`/advisor/companies/${c.assignmentId}`}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 9,
          minHeight: 36, padding: '0 13px', borderRadius: PX.rCtl,
          border: `1px solid ${PX.violetEdge}`, background: PX.violetTint, color: PX.violet700,
          fontSize: 12.5, fontWeight: 750, textDecoration: 'none',
        }}
      >
        Entra nel workspace
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
      </Link>

      <div style={{ display: 'grid', gap: 5, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PX.ink3 }}>
          Aree di lavoro
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
          {COMPANY_SECTIONS.filter((s) => s.slug).map((s) => (
            <Link
              key={s.slug}
              href={sectionHref(c.assignmentId, s.slug)}
              style={{
                display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 9px',
                borderRadius: PX.rChip, border: `1px solid ${PX.line2}`, background: PX.l1,
                color: PX.ink2, fontSize: 11.5, fontWeight: 650, textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
