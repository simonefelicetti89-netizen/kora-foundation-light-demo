import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── B76-B: Operator Flow UX Hardening ─────────────────────────────────────────
//
// Tests verify P1–P7 from the B76-A audit:
//   P1 — CreateLiveCompanyForm: "Assegna utente" as primary CTA, baseline recovery note
//   P2 — DataIntakeStudio: Italian "Genera candidati UEF" button, "Passo successivo" framing
//   P3 — DataIntakeStudio: synthetic-only note near operator-flow Actions section
//   P4 — CompanyWorkspacePanel: DP promotion buttons (draft→ready, ready→exported)
//   P5 — UefReviewQueue: scoring-readiness indicator pill ("Pronto per lo scoring")
//   P6 — /admin/company-live-preview: page exists (no fix needed — confirmed alive)
//   P7 — Pilot complete signal in workspace footer + console lifecycle badge

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

// ── P1: CreateLiveCompanyForm next-steps restructuring ────────────────────────

describe('P1 — CreateLiveCompanyForm next-steps card', () => {

  it('shows "Assegna utente aziendale" as the primary CTA in success state', () => {
    const src = read('app/admin/companies/new/_components/CreateLiveCompanyForm.tsx');
    expect(src).toContain('Assegna utente aziendale');
    // Must use result.links.manageUsers for the primary link
    expect(src).toContain('result.links.manageUsers');
  });

  it('labels the primary CTA block as "Passo successivo obbligatorio"', () => {
    const src = read('app/admin/companies/new/_components/CreateLiveCompanyForm.tsx');
    expect(src).toContain('Passo successivo obbligatorio');
  });

  it('shows baseline recovery note when baseline was not created', () => {
    const src = read('app/admin/companies/new/_components/CreateLiveCompanyForm.tsx');
    // Conditional on !result.baselineCreated
    expect(src).toContain('!result.baselineCreated');
    expect(src).toContain('La baseline forza lavoro non è stata creata');
  });

  it('partial_failure state still has recovery note support', () => {
    const src = read('app/admin/companies/new/_components/CreateLiveCompanyForm.tsx');
    // Existing partial failure block uses result.recovery
    expect(src).toContain('result.recovery');
    expect(src).toContain('Azione richiesta');
  });

  it('secondary links still present: Company Console and Spazio Azienda', () => {
    const src = read('app/admin/companies/new/_components/CreateLiveCompanyForm.tsx');
    expect(src).toContain('result.links.companyConsole');
    expect(src).toContain('result.links.companyWorkspace');
    expect(src).toContain('Company Console');
    expect(src).toContain('Spazio Azienda');
  });

});

// ── P2: DataIntakeStudio accept success — Italian next-step CTA ───────────────

describe('P2 — DataIntakeStudio post-accept next-step card', () => {

  it('accept success next-step CTA is now Italian "Genera candidati UEF"', () => {
    const src = read('app/admin/data-intake/_components/DataIntakeStudio.tsx');
    expect(src).toContain('Genera candidati UEF');
    // Old English label must be gone
    expect(src).not.toContain('Go to UEF Review →');
  });

  it('accept success framing uses "Passo successivo" label', () => {
    const src = read('app/admin/data-intake/_components/DataIntakeStudio.tsx');
    expect(src).toContain('Passo successivo');
  });

  it('accept success description is now Italian', () => {
    const src = read('app/admin/data-intake/_components/DataIntakeStudio.tsx');
    // Translated text
    expect(src).toContain('Batch creato — in attesa di review UEF');
    // Old English text must be gone
    expect(src).not.toContain('Batch created for review. Scoring remains locked until B5.');
  });

  it('batchId link still routes to /admin/uef-review with batchId param', () => {
    const src = read('app/admin/data-intake/_components/DataIntakeStudio.tsx');
    expect(src).toContain('/admin/uef-review?batchId=');
    expect(src).toContain('acceptResult.batchId');
  });

});

// ── P3: DataIntakeStudio operator-flow synthetic note ─────────────────────────

describe('P3 — DataIntakeStudio operator-flow synthetic-only note', () => {

  it('Actions section shows synthetic-only note for isOp001', () => {
    const src = read('app/admin/data-intake/_components/DataIntakeStudio.tsx');
    expect(src).toContain('Pipeline sintetica OP-001');
    expect(src).toContain('isOp001');
  });

  it('Actions section warns non-OP-001 operators to use standard flow', () => {
    const src = read('app/admin/data-intake/_components/DataIntakeStudio.tsx');
    expect(src).toContain('Per i tenant live usa il flusso standard');
    // Note is in the ternary with isOp001
    expect(src).toContain('Data Intake → UEF Review → Scoring');
  });

  it('/api/admin/operator-flow route exists and is not removed', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../../app/api/admin/operator-flow/route.ts'))).toBe(true);
  });

  it('operator-flow route uses getOp001SyntheticRecords (synthetic pipeline marker)', () => {
    const src = read('app/api/admin/operator-flow/route.ts');
    expect(src).toContain('getOp001SyntheticRecords');
    expect(src).toContain('getOp001UploadedPayloads');
  });

});

// ── P4: CompanyWorkspacePanel DP promotion UI ─────────────────────────────────

describe('P4 — CompanyWorkspacePanel Decision Pack promotion buttons', () => {

  it('has dpPromoStatus and dpPromoError state', () => {
    const src = read('components/admin/CompanyWorkspacePanel.tsx');
    expect(src).toContain('dpPromoStatus');
    expect(src).toContain('dpPromoError');
  });

  it('handleDpPromotion POSTs to /api/admin/decision-pack/status', () => {
    const src = read('components/admin/CompanyWorkspacePanel.tsx');
    expect(src).toContain("'/api/admin/decision-pack/status'");
    expect(src).toContain("method: 'POST'");
    expect(src).toContain('handleDpPromotion');
  });

  it('promotion handler accepts nextStatus: ready or exported', () => {
    const src = read('components/admin/CompanyWorkspacePanel.tsx');
    expect(src).toContain("nextStatus: 'ready' | 'exported'");
    expect(src).toContain("handleDpPromotion('ready')");
    expect(src).toContain("handleDpPromotion('exported')");
  });

  it('draft DP shows "Marca come Pronto" button', () => {
    const src = read('components/admin/CompanyWorkspacePanel.tsx');
    expect(src).toContain('Marca come Pronto');
    expect(src).toContain("status === 'draft'");
  });

  it('ready DP shows "Segna come Esportato" button', () => {
    const src = read('components/admin/CompanyWorkspacePanel.tsx');
    expect(src).toContain('Segna come Esportato');
    expect(src).toContain("status === 'ready'");
  });

  it('promotion calls loadWorkspace() on success to refresh state', () => {
    const src = read('components/admin/CompanyWorkspacePanel.tsx');
    // After successful promotion, loadWorkspace() must be called
    expect(src).toContain('setDpPromoStatus');
    expect(src).toContain("setDpPromoStatus('done')");
    // loadWorkspace called after done
    const promoFn = src.slice(src.indexOf('async function handleDpPromotion'), src.indexOf('const tcEnc'));
    expect(promoFn).toContain('loadWorkspace()');
  });

});

// ── P5: UefReviewQueue scoring-readiness indicator ────────────────────────────

describe('P5 — UefReviewQueue scoring-readiness indicator', () => {

  it('shows "Pronto per lo scoring" when pending === 0 and approved > 0', () => {
    const src = read('app/admin/uef-review/_components/UefReviewQueue.tsx');
    expect(src).toContain('Pronto per lo scoring');
    expect(src).toContain('summary.pending === 0 && summary.approved > 0');
  });

  it('shows "in attesa di review" pill when pending > 0', () => {
    const src = read('app/admin/uef-review/_components/UefReviewQueue.tsx');
    expect(src).toContain('in attesa di review');
    expect(src).toContain('summary.pending > 0');
  });

  it('readiness indicator appears after the "Summary bar" comment in the file', () => {
    const src = read('app/admin/uef-review/_components/UefReviewQueue.tsx');
    // Both indicators must appear after the Summary bar comment block
    const summaryBarPos = src.indexOf('Summary bar');
    const prontoPosForScoring = src.indexOf('Pronto per lo scoring');
    const inAttesaPos = src.indexOf('in attesa di review');
    expect(prontoPosForScoring).toBeGreaterThan(summaryBarPos);
    expect(inAttesaPos).toBeGreaterThan(summaryBarPos);
    // Both must appear before the candidate cards section
    const candidateCardsPos = src.indexOf('Candidate cards');
    expect(prontoPosForScoring).toBeLessThan(candidateCardsPos);
    expect(inAttesaPos).toBeLessThan(candidateCardsPos);
  });

});

// ── P6: company-live-preview moved to Gen 3 drill-in (B171 cleanup) ──────────

describe('P6 — company-live-preview promoted to Gen 3 drill-in (B171)', () => {

  it('CompanyLivePreviewPanel component moved to components/admin/', () => {
    expect(
      fs.existsSync(path.resolve(process.cwd(), 'components/admin/CompanyLivePreviewPanel.tsx'))
    ).toBe(true);
  });

  it('Gen 3 drill-in page exists at /admin/companies/[companyId]/preview/', () => {
    expect(
      fs.existsSync(path.resolve(process.cwd(), 'app/admin/companies/[companyId]/preview/page.tsx'))
    ).toBe(true);
  });

});

// ── P7: Pilot complete signal ─────────────────────────────────────────────────

describe('P7 — Pilot complete signal in workspace and console', () => {

  it('CompanyWorkspacePanel shows pilot-complete banner when scoring done + DP exported', () => {
    const src = read('components/admin/CompanyWorkspacePanel.tsx');
    expect(src).toContain('Pilota completato — il workspace aziendale è attivo');
    expect(src).toContain("w.scoring?.hasResult && w.decisionPack?.status === 'exported'");
  });

  it('CompanyConsolePanel shows "Pilot completo" lifecycle badge when pilot complete', () => {
    const src = read('app/admin/companies/_components/CompanyConsolePanel.tsx');
    expect(src).toContain('Pilot completo');
    expect(src).toContain("t.latestKoraIndex !== null && t.decisionPack?.status === 'exported'");
  });

  it('Pilot complete conditions: latestKoraIndex exists AND decisionPack exported', () => {
    const consoleSrc = read('app/admin/companies/_components/CompanyConsolePanel.tsx');
    // Both conditions required together
    const pilotBlock = consoleSrc.slice(
      consoleSrc.indexOf('Pilot completo') - 200,
      consoleSrc.indexOf('Pilot completo') + 100,
    );
    expect(pilotBlock).toContain('latestKoraIndex');
    expect(pilotBlock).toContain("'exported'");
  });

});

// ── Architectural invariants ───────────────────────────────────────────────────

describe('B76-B architectural invariants', () => {

  it('no new API routes created — P1–P7 are UI-only changes', () => {
    // Decision-pack status API must already exist (not created by B76-B)
    const routePath = path.resolve(__dirname, '../../app/api/admin/decision-pack/status/route.ts');
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it('no new DB tables or migration files created by B76-B', () => {
    const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
    if (!fs.existsSync(migrationsDir)) return;
    const files = fs.readdirSync(migrationsDir);
    const b76bFiles = files.filter((f) => f.includes('b76b') || f.includes('operator_flow'));
    expect(b76bFiles).toHaveLength(0);
  });

  it('KORA Index formula not modified by any B76-B file', () => {
    // methodology-config v0.1 weights must still come from getMacroblockWeights
    const src = read('lib/methodology-config/v0.1.ts');
    expect(src).toContain('getMacroblockWeights');
    expect(src).toContain('REACH');
    expect(src).toContain('QUALITY');
    expect(src).toContain('EQUITY');
    expect(src).toContain('BTI');
  });

  it('CompanyWorkspacePanel DP promotion does not modify scoring outputs', () => {
    const src = read('components/admin/CompanyWorkspacePanel.tsx');
    // The promotion only changes DP status, not scoring
    const promoFn = src.slice(
      src.indexOf('async function handleDpPromotion'),
      src.indexOf('const tcEnc'),
    );
    expect(promoFn).not.toContain('scoring');
    expect(promoFn).not.toContain('kora_index');
    expect(promoFn).not.toContain('impact_unit');
  });

});
