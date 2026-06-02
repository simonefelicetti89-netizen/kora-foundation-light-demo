// classify-test.ts — B21 classification matrix for 30 canonical cases
import { classifyEligibilityBatch } from '@/lib/kora-engine/eligibility-gate';

const cases = [
  { id: 'buoni_pasto',    raw: { nome_iniziativa: 'Buoni pasto mensili', categoria: 'buoni pasto meal voucher benefit', importo: 18000, partecipanti: 78 } },
  { id: 'gift_card',      raw: { nome_iniziativa: 'Gift card dipendenti', categoria: 'gift card buono acquisto benefit', importo: 4000, partecipanti: 72 } },
  { id: 'welfare_wallet', raw: { nome_iniziativa: 'Welfare wallet', categoria: 'welfare cash wallet generalista benefit', importo: 12000, partecipanti: 70 } },
  { id: 'voucher_gen',    raw: { nome_iniziativa: 'Voucher generalista', categoria: 'voucher generalista fringe benefit', importo: 3000, partecipanti: 40 } },
  { id: 'rimborso_gen',   raw: { nome_iniziativa: 'Rimborso generico', categoria: 'rimborso generico spese welfare benefit', importo: 2500, partecipanti: 60 } },
  { id: 'palestra',       raw: { nome_iniziativa: 'Convenzione palestra', categoria: 'palestra gym fitness attivita fisica benessere', partecipanti: 28 } },
  { id: 'smart_wk',       raw: { nome_iniziativa: 'Smart working policy', categoria: 'smart working lavoro agile flessibilita policy' } },
  { id: 'ferie_ill',      raw: { nome_iniziativa: 'Ferie illimitate', categoria: 'ferie illimitate unlimited pto leave policy', tipo: 'policy' } },
  { id: 'disconness',     raw: { nome_iniziativa: 'Diritto disconnessione', categoria: 'diritto disconnessione digitale policy', tipo: 'policy' } },
  { id: 'permessi_gen',   raw: { nome_iniziativa: 'Permessi extra genitorialita', categoria: 'permessi extra genitorialita parental leave policy', partecipanti: 38 } },
  { id: 'assicurazione',  raw: { nome_iniziativa: 'Assicurazione sanitaria', categoria: 'assicurazione sanitaria polizza welfare salute', importo: 15000, partecipanti: 72 } },
  { id: 'previdenza',     raw: { nome_iniziativa: 'Previdenza integrativa', categoria: 'previdenza integrativa fondo pensione complementare', importo: 8000, partecipanti: 55 } },
  { id: 'training_lms',   raw: { nome_iniziativa: 'Formazione LMS export', categoria: 'formazione professionale upskilling reskilling', importo: 28000, partecipanti: 65, fonte: 'export lms piattaforma' } },
  { id: 'mentoring',      raw: { nome_iniziativa: 'Mentoring aziendale', categoria: 'mentoring coaching senior junior sviluppo professionale', importo: 10000, partecipanti: 50 } },
  { id: 'psicologico',    raw: { nome_iniziativa: 'Supporto psicologico', categoria: 'supporto psicologico counselling mental health benessere', importo: 18000, partecipanti: 45 } },
  { id: 'caregiver',      raw: { nome_iniziativa: 'Caregiver support', categoria: 'caregiver assistenza familiare supporto welfare', importo: 12000, partecipanti: 20 } },
  { id: 'nido',           raw: { nome_iniziativa: 'Nido aziendale', categoria: 'nido aziendale childcare asilo bambini contributo', importo: 15000, partecipanti: 16 } },
  { id: 'di_strutturato', raw: { nome_iniziativa: 'D&I programma annuale', categoria: 'diversity inclusion programma strutturato annuale percorso', importo: 12000, partecipanti: 55 } },
  { id: 'reskilling',     raw: { nome_iniziativa: 'Reskilling tecnico', categoria: 'reskilling professionale formazione upskilling tecnologico', importo: 25000, partecipanti: 40 } },
  { id: 'leadership',     raw: { nome_iniziativa: 'Leadership program', categoria: 'leadership program corso sviluppo manageriale professionale', importo: 15000, partecipanti: 18 } },
  { id: 'knowledge_tr',   raw: { nome_iniziativa: 'Knowledge transfer', categoria: 'trasferimento competenze legacy senior junior conoscenza', importo: 8000, partecipanti: 35 } },
  { id: 'volontariato',   raw: { nome_iniziativa: 'Volontariato ONG', categoria: 'volontariato aziendale territorio impatto sociale comunita', importo: 14000, partecipanti: 38 } },
  { id: 'survey_eng',     raw: { nome_iniziativa: 'Survey engagement', categoria: 'survey engagement comunicazione interna follow-up' } },
  { id: 'team_build',     raw: { nome_iniziativa: 'Team building', categoria: 'team building evento aziendale generico', partecipanti: 100 } },
  { id: 'convention',     raw: { nome_iniziativa: 'Convention aziendale', categoria: 'convention evento aziendale convegno', partecipanti: 420 } },
  { id: 'no_meeting',     raw: { nome_iniziativa: 'No meeting day', categoria: 'no meeting day focus time riunioni policy' } },
  { id: 'sicurezza',      raw: { nome_iniziativa: 'Corso sicurezza 81', categoria: 'sicurezza obbligatoria dlgs 81 compliance hse', importo: 5000, partecipanti: 180 } },
  { id: 'dpi',            raw: { nome_iniziativa: 'DPI distribuzione', categoria: 'dpi sicurezza obbligatoria protezione individuale', importo: 6000, partecipanti: 350 } },
  { id: 'sorveglianza',   raw: { nome_iniziativa: 'Sorveglianza sanitaria', categoria: 'sorveglianza sanitaria obbligatoria medico competente', importo: 12000, partecipanti: 420 } },
  { id: 'form_231',       raw: { nome_iniziativa: 'Formazione 231', categoria: 'modello 231 compliance legale obbligatoria adempimento', importo: 6000, partecipanti: 420 } },
  { id: 'patentino',      raw: { nome_iniziativa: 'Patentino obbligatorio', categoria: 'patentino obbligatorio carrelli elevatori sicurezza', importo: 5000, partecipanti: 85 } },
].map((t, i) => ({ recordId: t.id, batchId: 'test', rowIndex: i, detectedRecordType: 'welfare_program' as const, raw: t.raw as Record<string, unknown> }));

const results = classifyEligibilityBatch(cases);

const EXPECTED: Record<string, { elig: string; impact: string }> = {
  buoni_pasto:    { elig: 'limited',         impact: 'bti_only' },
  gift_card:      { elig: 'limited',         impact: 'bti_only' },
  welfare_wallet: { elig: 'limited',         impact: 'bti_only' },
  voucher_gen:    { elig: 'limited',         impact: 'bti_only' },
  rimborso_gen:   { elig: 'limited',         impact: 'bti_only' },
  palestra:       { elig: 'eligible',        impact: 'generates_iu' },
  smart_wk:       { elig: 'eligible',        impact: 'generates_iu' },
  ferie_ill:      { elig: 'eligible',        impact: 'generates_iu' },
  disconness:     { elig: 'eligible',        impact: 'generates_iu' },
  permessi_gen:   { elig: 'eligible',        impact: 'generates_iu' },
  assicurazione:  { elig: 'eligible',        impact: 'generates_iu' },
  previdenza:     { elig: 'eligible',        impact: 'generates_iu' },
  training_lms:   { elig: 'eligible',        impact: 'generates_iu' },
  mentoring:      { elig: 'eligible',        impact: 'generates_iu' },
  psicologico:    { elig: 'eligible',        impact: 'generates_iu' },
  caregiver:      { elig: 'eligible',        impact: 'generates_iu' },
  nido:           { elig: 'eligible',        impact: 'generates_iu' },
  di_strutturato: { elig: 'eligible',        impact: 'generates_iu' },
  reskilling:     { elig: 'eligible',        impact: 'generates_iu' },
  leadership:     { elig: 'eligible',        impact: 'generates_iu' },
  knowledge_tr:   { elig: 'eligible',        impact: 'generates_iu' },
  volontariato:   { elig: 'eligible',        impact: 'generates_iu' },
  survey_eng:     { elig: 'review_required', impact: 'pending_review' },
  team_build:     { elig: 'review_required', impact: 'pending_review' },
  convention:     { elig: 'review_required', impact: 'pending_review' },
  no_meeting:     { elig: 'eligible',        impact: 'generates_iu' },
  sicurezza:      { elig: 'blocked',         impact: 'excluded' },
  dpi:            { elig: 'blocked',         impact: 'excluded' },
  sorveglianza:   { elig: 'blocked',         impact: 'excluded' },
  form_231:       { elig: 'blocked',         impact: 'excluded' },
  patentino:      { elig: 'blocked',         impact: 'excluded' },
};

console.log('\nB21 — CLASSIFICATION MATRIX (31 cases)');
console.log('─'.repeat(100));
console.log('Case'.padEnd(16) + 'Actual Elig'.padEnd(18) + 'Exp Elig'.padEnd(18) + 'Impact Treatment'.padEnd(20) + 'PASS?');
console.log('─'.repeat(100));

let pass = 0, fail = 0;
for (let i = 0; i < cases.length; i++) {
  const r = results[i];
  const exp = EXPECTED[cases[i].recordId];
  const ok = exp ? (r.status === exp.elig) : true;
  if (ok) pass++; else fail++;
  console.log(
    cases[i].recordId.padEnd(16) +
    r.status.padEnd(18) +
    (exp?.elig ?? '?').padEnd(18) +
    r.impactTreatment.padEnd(20) +
    (ok ? '✓' : '✗  ← MISMATCH')
  );
}

console.log('─'.repeat(100));
console.log(`RESULT: ${pass}/${pass+fail} classification checks passed`);
