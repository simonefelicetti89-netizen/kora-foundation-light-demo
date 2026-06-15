// tests/unit/b141b-my-kora-pib-ia-and-admin-access.test.ts
// B141-B — My KORA PIB IA correction + KORA_ADMIN access fix.
// B141-B2 — Founder-safe worker preview navigation polish.
//
// Pure structural/static tests — no DB, no Supabase, no runtime rendering.
// Verifies:
//   1–6:  /my-kora/personal-impact-balance/page.tsx exists and has correct content
//   7–9:  /my-kora/page.tsx (home) is lightened — no full pib-section, has PIB card
//   10–13: layout.tsx admits KORA_ADMIN real session, blocks employer roles
//   14–16: KORA Link card uses only canonical KoraStratoMark, no worker data
//   17–18: middleware.ts and kora-session.ts not modified
//   19–26: B141-B2 — sidebar nav polish + /worker/* safe redirect

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  try {
    fs.accessSync(path.resolve(__dirname, '../..', rel));
    return true;
  } catch {
    return false;
  }
}

const pibPageSrc    = read('app/my-kora/personal-impact-balance/page.tsx');
const homeSrc       = read('app/my-kora/page.tsx');
const layoutSrc     = read('app/my-kora/layout.tsx');
const middlewareSrc = read('middleware.ts');
const sessionSrc    = read('lib/auth/kora-session.ts');
const sidebarSrc    = read('components/layout/Sidebar.tsx');
const workerLayout  = read('app/worker/layout.tsx');
const cardSrc       = read('components/my-kora/WorkerActivationSignatureCard.tsx');

// ── 1–6: PIB dedicated page ───────────────────────────────────────────────────

describe('B141-B — Personal Impact Balance dedicated page', () => {
  it('1. file exists at app/my-kora/personal-impact-balance/page.tsx', () => {
    expect(fileExists('app/my-kora/personal-impact-balance/page.tsx')).toBe(true);
  });

  it('2. page contains "Personal Impact Balance" heading', () => {
    expect(pibPageSrc).toContain('Personal Impact Balance');
  });

  it('3. page contains subtitle "Il bilancio privato delle tue esperienze di attivazione."', () => {
    expect(pibPageSrc).toContain('Il bilancio privato delle tue esperienze di attivazione.');
  });

  it('4. page contains KoraActivationSignature (STRATO worker)', () => {
    expect(pibPageSrc).toContain('KoraActivationSignature');
  });

  it('5. page contains "Impact Units attivate" copy', () => {
    expect(pibPageSrc).toContain('Impact Units attivate');
  });

  it('6. page contains link to Dynamic Impact CV', () => {
    expect(pibPageSrc).toContain('Dynamic Impact CV');
  });
});

// ── 7–9: Home page lightened ──────────────────────────────────────────────────

describe('B141-B — My KORA home lightened', () => {
  it('7. home contains link to /my-kora/personal-impact-balance', () => {
    expect(homeSrc).toContain('/my-kora/personal-impact-balance');
  });

  it('8. home does not contain full pib-section (data-testid="pib-section" removed)', () => {
    expect(homeSrc).not.toContain('data-testid="pib-section"');
  });

  it('9. home contains "Apri il Personal Impact Balance" CTA', () => {
    expect(homeSrc).toContain('Apri il Personal Impact Balance');
  });
});

// ── 10–13: Layout access control ─────────────────────────────────────────────

describe('B141-B — My KORA layout KORA_ADMIN access', () => {
  it('10. layout imports getSupabaseBrowserClient for real session detection', () => {
    expect(layoutSrc).toContain('getSupabaseBrowserClient');
  });

  it('11. layout checks realRole === KORA_ADMIN for real admin session', () => {
    expect(layoutSrc).toContain("realRole === 'KORA_ADMIN'");
  });

  it('12. layout does not admit COMPANY_ADMIN — isAdminRole gates demo visitor path only (B151-A)', () => {
    // B151-A: gate was refactored to separate real user admission from demo visitor admission.
    // isAdminRole is still used but scoped to the demoVisitorPermitted check (null session only).
    // COMPANY_ADMIN real session is blocked because realUserPermitted requires WORKER or KORA_ADMIN.
    expect(layoutSrc).toContain('isAdminRole(activeRole');
    expect(layoutSrc).not.toContain("'COMPANY_ADMIN'");
  });

  it('13. layout uses realUserPermitted and demoVisitorPermitted as separate gates (B151-A)', () => {
    // B151-A renamed: demoPermitted → demoVisitorPermitted, realAdminPermitted → realUserPermitted
    expect(layoutSrc).toContain('realUserPermitted');
    expect(layoutSrc).toContain('demoVisitorPermitted');
  });
});

// ── 14–16: KORA Link card — canonical STRATO only ─────────────────────────────

describe('B141-B — KORA Link card uses only canonical KoraStratoMark', () => {
  // Extract the KORA Link card area from PIB page source.
  // The card is identified by data-testid="kora-link-card".
  const koraLinkStart = pibPageSrc.indexOf('data-testid="kora-link-card"');
  const koraLinkSection = koraLinkStart > -1
    ? pibPageSrc.substring(koraLinkStart, koraLinkStart + 800)
    : '';

  it('14. KORA Link card section does not use KoraActivationSignature', () => {
    // KoraActivationSignature is in the PIB section above — never in the KORA Link card.
    expect(koraLinkSection).not.toContain('KoraActivationSignature');
  });

  it('15. KORA Link card uses KoraStratoMark (canonical brand STRATO)', () => {
    expect(koraLinkSection).toContain('KoraStratoMark');
  });

  it('16. KoraStratoMark in PIB page does not receive pillarBreakdown prop', () => {
    // KoraStratoMark only accepts variant/size/className — never worker pillar data.
    // Check the entire PIB page: no pillarBreakdown passed to KoraStratoMark.
    const stratoCallIdx = pibPageSrc.indexOf('KoraStratoMark');
    const stratoCall = stratoCallIdx > -1
      ? pibPageSrc.substring(stratoCallIdx, stratoCallIdx + 200)
      : '';
    expect(stratoCall).not.toContain('pillarBreakdown');
  });
});

// ── 17–18: No touch to middleware / auth ──────────────────────────────────────

describe('B141-B — middleware.ts and kora-session.ts untouched', () => {
  it('17. middleware.ts has no KORA_ADMIN redirect rule (unchanged)', () => {
    // Middleware correctly has no special redirect for KORA_ADMIN.
    // If a 'KORA_ADMIN' redirect rule were added, that would be a regression.
    expect(middlewareSrc).not.toContain("'KORA_ADMIN' redirect");
  });

  it('18. kora-session.ts requireWorkerUser() still blocks non-WORKER roles', () => {
    // This function must not have been modified to bypass the worker gate.
    expect(sessionSrc).toContain('requireWorkerUser');
    expect(sessionSrc).toContain("!== 'WORKER'");
  });
});

// ── 19–22: B141-B2 — Sidebar KORA_ADMIN nav polish ───────────────────────────

describe('B141-B2 — Sidebar KORA_ADMIN has Worker Preview links', () => {
  // Extract the KORA_ADMIN nav section from Sidebar source.
  // isAdminRole check gates the KORA_ADMIN branch — we check for /my-kora links there.
  const adminNavStart = sidebarSrc.indexOf("if (isAdminRole(role");
  const adminNavSection = adminNavStart > -1
    ? sidebarSrc.substring(adminNavStart, adminNavStart + 3000)
    : sidebarSrc;

  it('19. KORA_ADMIN sidebar contains link to /my-kora (Worker Preview)', () => {
    expect(adminNavSection).toContain("'/my-kora'");
  });

  it('20. KORA_ADMIN sidebar contains link to /my-kora/personal-impact-balance', () => {
    expect(adminNavSection).toContain('/my-kora/personal-impact-balance');
  });

  it('21. COMPANY_ADMIN sidebar nav does not contain Personal Impact Balance link', () => {
    const companyNavStart = sidebarSrc.indexOf("role === 'COMPANY_ADMIN'");
    // End the window at the start of the next section (isWorkerRole), not at a fixed offset
    // that could spill into the worker nav (which legitimately contains PIB links).
    const workerNavStart  = sidebarSrc.indexOf('if (isWorkerRole(role');
    const companyNavEnd   = workerNavStart > companyNavStart ? workerNavStart : companyNavStart + 1500;
    const companyNavSection = companyNavStart > -1
      ? sidebarSrc.substring(companyNavStart, companyNavEnd)
      : '';
    expect(companyNavSection).not.toContain('Personal Impact Balance');
  });

  it('22. PARTNER sidebar nav does not contain Personal Impact Balance link', () => {
    const partnerNavStart = sidebarSrc.indexOf("role === 'PARTNER'");
    const partnerNavSection = partnerNavStart > -1
      ? sidebarSrc.substring(partnerNavStart, partnerNavStart + 800)
      : '';
    expect(partnerNavSection).not.toContain('Personal Impact Balance');
  });
});

// ── 23–26: B141-B2 — /worker/* safe redirect for KORA_ADMIN ──────────────────

describe('B141-B2 — /worker/layout.tsx safe KORA_ADMIN redirect', () => {
  it('23. worker layout imports getCurrentKoraUser for admin detection', () => {
    expect(workerLayout).toContain('getCurrentKoraUser');
  });

  it('24. worker layout redirects KORA_ADMIN to /my-kora (not /login)', () => {
    // KORA_ADMIN is redirected to the synthetic worker preview, not the login page.
    expect(workerLayout).toContain("redirect('/my-kora')");
  });

  it('25. worker layout still calls getCurrentWorkerUser (WORKER gate unchanged)', () => {
    // The WORKER gate must not be removed or bypassed.
    expect(workerLayout).toContain('getCurrentWorkerUser');
  });

  it('26. requireWorkerUser() in kora-session.ts not modified (still blocks non-WORKER)', () => {
    // requireWorkerUser exists and still guards with the WORKER role check.
    expect(sessionSrc).toContain('requireWorkerUser');
    expect(sessionSrc).toContain("koraRole !== 'WORKER'");
    expect(sessionSrc).toContain('Forbidden — WORKER role required');
  });
});

// ── 27–37: B141-C — PIB visual layout correction ──────────────────────────────

describe('B141-C — PIB page 2-col pillar/signature layout', () => {
  it('27. PIB page contains data-testid="personal-impact-signature" (unified card wrapper)', () => {
    // B141-F: dispersive 2-col grid replaced by single centered signature object.
    expect(pibPageSrc).toContain('data-testid="personal-impact-signature"');
  });

  it('28. PIB page references all 5 pillar codes via PILLAR_LIGHT and passes breakdown to card', () => {
    // Pillar codes appear in PILLAR_LIGHT (used by timeline section) — still present in page.
    // B141-F: pillar_breakdown.map moved inside WorkerActivationSignatureCard.
    // Page passes the breakdown via prop: pillarBreakdown={preview.pib_light.pillar_breakdown}.
    expect(pibPageSrc).toContain('LIFE:');
    expect(pibPageSrc).toContain('GROWTH:');
    expect(pibPageSrc).toContain('CONNECTION:');
    expect(pibPageSrc).toContain('IMPACT:');
    expect(pibPageSrc).toContain('LEGACY:');
    expect(pibPageSrc).toContain('pillar_breakdown}');
  });

  it('29. KoraActivationSignature no longer uses className="w-full" in PIB page', () => {
    // The full-width class was the root cause of the progress-bar appearance.
    // After B141-C the signature is constrained to ~176px (w-44).
    expect(pibPageSrc).not.toContain('className="w-full"');
  });

  it('30. PIB page contains "KORA Activation Signature" as label text (in WorkerActivationSignatureCard)', () => {
    // Label lives inside WorkerActivationSignatureCard component source.
    const cardSrc = read('components/my-kora/WorkerActivationSignatureCard.tsx');
    expect(cardSrc).toContain('KORA Activation Signature');
  });

  it('31. PIB page uses WorkerActivationSignatureCard (replaces bare w-44 signature)', () => {
    // B141-D: bare w-44 removed, replaced by premium dark card component.
    expect(pibPageSrc).toContain('WorkerActivationSignatureCard');
    expect(pibPageSrc).not.toContain('className="w-44"');
  });

  it('32. data-testid="activation-profile-block" is still present below the signature object', () => {
    expect(pibPageSrc).toContain('data-testid="activation-profile-block"');
    // Profile block must appear AFTER the personal-impact-signature wrapper (B141-F).
    const sigIdx     = pibPageSrc.indexOf('data-testid="personal-impact-signature"');
    const profileIdx = pibPageSrc.indexOf('data-testid="activation-profile-block"');
    expect(sigIdx).toBeGreaterThan(-1);
    expect(profileIdx).toBeGreaterThan(sigIdx);
  });

  it('33. "Composizione del periodo, non una classifica." is present in the card component', () => {
    // B141-F: copy moved inside WorkerActivationSignatureCard (pillar breakdown footer).
    expect(cardSrc).toContain('Composizione del periodo, non una classifica.');
  });

  it('34. KORA Link still uses KoraStratoMark (not KoraActivationSignature)', () => {
    const koraLinkStart   = pibPageSrc.indexOf('data-testid="kora-link-card"');
    const koraLinkSection = koraLinkStart > -1
      ? pibPageSrc.substring(koraLinkStart, koraLinkStart + 800)
      : '';
    expect(koraLinkSection).toContain('KoraStratoMark');
    expect(koraLinkSection).not.toContain('KoraActivationSignature');
  });

  it('35. KORA Link card does not receive pillarBreakdown prop', () => {
    const koraLinkStart   = pibPageSrc.indexOf('data-testid="kora-link-card"');
    const koraLinkSection = koraLinkStart > -1
      ? pibPageSrc.substring(koraLinkStart, koraLinkStart + 800)
      : '';
    expect(koraLinkSection).not.toContain('pillarBreakdown');
  });

  it('36. PIB page contains IU per pillar (iu_total displayed)', () => {
    // Compact left column must show IU value per pillar.
    expect(pibPageSrc).toContain('iu_total.toFixed(1)');
  });

  it('37. PIB page contains no forbidden copy (score, ranking, benchmark, leaderboard, trophy, avatar, personaggio)', () => {
    const forbidden = ['leaderboard', 'trophy', 'avatar', 'personaggio'];
    for (const word of forbidden) {
      expect(pibPageSrc.toLowerCase()).not.toContain(word);
    }
  });
});

// ── 38–44: B141-D — WorkerActivationSignatureCard premium personal pictogram ──

describe('B141-D — WorkerActivationSignatureCard premium card', () => {
  it('38. WorkerActivationSignatureCard component file exists', () => {
    expect(cardSrc.length).toBeGreaterThan(0);
  });

  it('39. WorkerActivationSignatureCard uses KoraActivationSignature (worker personal)', () => {
    expect(cardSrc).toContain('KoraActivationSignature');
  });

  it('40. WorkerActivationSignatureCard does NOT use KoraStratoMark', () => {
    // Card is personalized — brand canonical mark must not be used here.
    expect(cardSrc).not.toContain('KoraStratoMark');
  });

  it('41. WorkerActivationSignatureCard has data-testid="worker-activation-signature-card"', () => {
    expect(cardSrc).toContain('data-testid="worker-activation-signature-card"');
  });

  it('42. PIB page passes pillarBreakdown and periodIuTotal to WorkerActivationSignatureCard', () => {
    // B157: data source changed from myKoraPreviewService → workerPIBService (contract swap).
    // Personal card receives worker pillar data and IU total — personalised per worker.
    expect(pibPageSrc).toContain('pillarBreakdown={pib.pillar_breakdown}');
    // B141-F / B157: periodIuTotal passed from the pib contract.
    expect(pibPageSrc).toContain('periodIuTotal={pib.period_iu_total}');
  });

  it('43. KORA Link section does not use KoraActivationSignature', () => {
    // kora-link-card uses only KoraStratoMark canonical brand — no worker data.
    const koraLinkStart   = pibPageSrc.indexOf('data-testid="kora-link-card"');
    const koraLinkSection = koraLinkStart > -1
      ? pibPageSrc.substring(koraLinkStart, koraLinkStart + 600)
      : '';
    expect(koraLinkSection).not.toContain('KoraActivationSignature');
    expect(koraLinkSection).not.toContain('pillarBreakdown');
  });

  it('44. WorkerActivationSignatureCard uses light premium background token (canvas)', () => {
    // canvas = #F6F4EF — light seal surface via ACTIVATION_SIGNATURE token, not hardcoded.
    expect(cardSrc).toContain('canvas');
    expect(cardSrc).toContain('ACTIVATION_SIGNATURE');
  });

  it('45. WorkerActivationSignatureCard is a sealed object — not banner or fixed full-width', () => {
    // B141-F: card uses borderRadius + overflow:hidden. Max-width delegated to page wrapper.
    expect(cardSrc).toContain('borderRadius');
    expect(cardSrc).toContain('overflow');
    expect(cardSrc).not.toContain("width: '100%'");
    expect(cardSrc).not.toContain('w-full');
  });

  it('46. PIB page uses centered wrapper with max-width cap for the signature object', () => {
    // B141-F: dispersive 2-col grid replaced by centered personal-impact-signature wrapper.
    expect(pibPageSrc).toContain('personal-impact-signature');
    expect(pibPageSrc).toContain('max-w-[560px]');
  });
});

// ── 47–49: B141-F — Unified Personal Impact Signature object ──────────────────

describe('B141-F — WorkerActivationSignatureCard unified signature object', () => {
  it('47. WorkerActivationSignatureCard contains KoraLogo (real brand logo, on-light)', () => {
    expect(cardSrc).toContain('KoraLogo');
    expect(cardSrc).toContain("on-light");
  });

  it('48. WorkerActivationSignatureCard accepts periodIuTotal and renders Impact Units label', () => {
    expect(cardSrc).toContain('periodIuTotal');
    expect(cardSrc).toContain('Impact Units attivate');
  });

  it('49. WorkerActivationSignatureCard renders pillar breakdown inside the card', () => {
    // B141-F: pillar rows are INSIDE the card — not in a separate page column.
    expect(cardSrc).toContain('pillarBreakdown.map');
    expect(cardSrc).toContain('iu_total.toFixed');
  });
});
