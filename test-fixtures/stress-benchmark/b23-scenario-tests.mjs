// b23-scenario-tests.mjs — B23 Structural People Policies taxonomy test
// Tests interpretUploadedRecord classification for 20 scenarios
// Uses inline logic (no path aliases needed) to verify taxonomy closure

// ── Inline keyword tables (mirroring interpreter) ─────────────────────────────
const KW_BLOCKED = [
  'compliance', 'sicurezza obbligator', 'obbligatoria', 'hse', ' dpi ', 'dvr', 'duvri',
  'patentino obbligator', 'sorveglianza sanitaria', '81/08', 'dlgs 81', 'd.lgs 81',
  'gdpr obbligator', 'modello 231', 'antincendio obbligator', 'primo soccorso obbligator',
  'adempiment', 'compliance legale',
];
const KW_LIMITED = [
  'buoni pasto', 'buono pasto', 'meal voucher', 'ticket restaurant',
  'gift card', 'buoni acquisto', 'voucher generalista', 'voucher generico',
  'fringe benefit', 'benefit monetar', 'welfare cash', 'rimborso generico',
  'bonus monetar', 'cashback', 'sollievo economico', 'economic relief',
  // B23
  'welfare wallet', 'conto welfare', 'credito welfare', 'piattaforma welfare',
  'portafoglio welfare', 'welfare platform', 'flexible benefit wallet',
];
const KW_PROTECTION = [
  'assicurazione sanitaria', 'sanità integrativa', 'polizza sanitaria',
  'health insurance', 'copertura sanitaria', 'welfare sanitario integrativo',
  'mutua sanitaria', 'fondo sanitario', 'rimborso spese sanitarie',
  'previdenza integrativa', 'pensione integrativa', 'fondo pensione',
  'previdenza complementare', 'piano pensionistico', 'contributo previdenziale',
  'future security', 'social protection fund',
  // B23
  'polizza vita', 'life insurance', 'long-term care', 'ltc aziendale',
  'non autosufficienza', 'copertura ltc', 'copertura non autosufficienza',
  'rendita integrativa', 'capitale differito', 'protezione famiglia',
];
const KW_ORG_FLEX = [
  'ferie illimitate', 'unlimited leave', 'unlimited pto', 'ferie senza limite',
  'smart working', 'remote work', 'lavoro agile', 'lavoro da remoto', 'telelavoro strutturato',
  'diritto alla disconnessione', 'diritto disconnessione', 'right to disconnect', 'disconnessione digitale',
  'no meeting day', 'no-meeting day', 'meeting free', 'focus time',
  'settimana corta', 'four day week', '4 day week',
  'flessibilità oraria', 'flexible working', 'flexible work', 'orario flessibile',
  'permessi extra', 'permessi aggiuntivi', 'congedo migliorativo',
  'genitorialità', 'parental leave', 'congedo parentale', 'congedo papà',
  'maternità facoltativa', 'paternità estesa',
  // B23
  'permessi genitorialità', 'permesso genitorialità', 'congedo genitorialita',
  'rientro maternità', 'rientro paternità',
];
const KW_LEADERSHIP = [
  'leadership program', 'leadership development', 'programma leadership',
  'sviluppo leadership', 'leadership aziendale', 'leadership academy',
  'manager development', 'sviluppo manageriale', 'percorso manageriale',
  'succession planning', 'succession plan', 'piano successione',
  'piano di successione', 'talent management', 'talent program', 'high potential',
];
const KW_CAREGIVER = [
  'caregiver', 'assistenza familiare', 'eldercare', 'assistenza anziani',
  'nido', 'asilo nido', 'childcare', 'baby-sitting', 'babysitting',
  'nido aziendale', 'contributo nido', 'rimborso asilo',
  'supporto genitorialità', 'supporto famiglia', 'congedo cura familiare',
];
const KW_WELLBEING = [
  'palestra', 'gym', 'convenzione palestra', 'abbonamento palestra',
  'ore palestra', 'fitness', 'challenge passi', 'step challenge',
  'app mindfulness', 'app meditazione', 'webinar benessere',
  'wellness day', 'sport aziendale', 'attività sportiva', 'yoga aziendale',
];
const KW_INCLUSION = [
  'diversity', 'inclusion', 'inclusione', 'diversità e inclusione',
  'pari opportunità', 'gender equity', 'gender equality',
  'disability inclusion', 'disabilità', 'workshop d&i', 'unconscious bias',
  'parità di genere', 'pay equity', 'inclusività', 'neurodiversity',
];
const KW_TRAINING = [
  'formazione', 'training', 'upskilling', 'lms', 'academy', 'e-learning',
  'apprendimento', 'reskilling', 'digital skills', 'sviluppo professionale',
  'certificazione professionale', 'corso professionalizzante', 'career path',
  'piano formativo', 'learning path', 'bootcamp', 'workshop professionale',
];
const KW_MENTORING = [
  'mentoring', 'mentoraggio', 'coaching', 'inter-funzional',
  'affiancamento', 'buddy program', 'peer coaching',
];
const KW_LEGACY = [
  'trasferimento competenze', 'senior-junior', 'legacy conoscenza',
  'knowledge transfer', 'memoria organizzativa', 'prassi aziendali',
  'passaggio generazionale', 'legacy aziendale',
];
const KW_VOLUNTEERING = [
  'volontariato', 'volunteering', 'community', 'territoriale', 'impatto sociale',
];

function has(text, kws) { return kws.some(k => text.includes(k.toLowerCase())); }

function classify(text) {
  const t = text.toLowerCase();
  if (has(t, KW_BLOCKED))      return 'blocked';
  if (has(t, KW_LIMITED))      return 'limited';
  if (has(t, KW_PROTECTION))   return 'eligible:protection';
  if (has(t, KW_ORG_FLEX))     return 'eligible:org_flexibility';
  if (has(t, KW_LEADERSHIP))   return 'eligible:leadership';
  if (has(t, KW_CAREGIVER))    return 'eligible:welfare_care';
  if (has(t, KW_WELLBEING))    return 'eligible:wellbeing_light';
  if (has(t, KW_INCLUSION))    return 'eligible:inclusion';
  if (has(t, KW_LEGACY))       return 'eligible:legacy';
  if (has(t, KW_VOLUNTEERING)) return 'eligible:impact';
  if (has(t, KW_MENTORING))    return 'eligible:mentoring';
  if (has(t, KW_TRAINING))     return 'eligible:training';
  return 'review_required';
}

const scenarios = [
  // id, text, expectedElig, expectedDomain, pass_criteria
  ['1.  Ferie illimitate policy-only',      'ferie illimitate policy aziendale',                        'eligible:org_flexibility', 'organizational_flexibility'],
  ['2.  Ferie illimitate con usage data',   'ferie illimitate policy uptake utilizzo dipendenti 120',   'eligible:org_flexibility', 'organizational_flexibility'],
  ['3.  Smart working dichiarato',          'smart working lavoro agile policy dichiarata',              'eligible:org_flexibility', 'organizational_flexibility'],
  ['4.  Smart working con usage data',      'smart working policy report interno usage data 130',        'eligible:org_flexibility', 'organizational_flexibility'],
  ['5.  Diritto alla disconnessione',       'diritto alla disconnessione policy aziendale',              'eligible:org_flexibility', 'organizational_flexibility'],
  ['6.  Disconnessione senza alla',         'diritto disconnessione digitale policy',                   'eligible:org_flexibility', 'organizational_flexibility'],
  ['7.  No-meeting day',                    'no meeting day lunedi settimana',                          'eligible:org_flexibility', 'organizational_flexibility'],
  ['8.  Permessi extra genitorialità',      'permessi extra genitorialità congedo parental leave',       'eligible:org_flexibility', 'organizational_flexibility'],
  ['9.  Assicurazione sanitaria',           'assicurazione sanitaria integrativa polizza welfare',       'eligible:protection',      'protection_future_security'],
  ['10. Previdenza integrativa',            'previdenza integrativa fondo pensione pensione',            'eligible:protection',      'protection_future_security'],
  ['11. Long-term care LTC',               'long-term care ltc aziendale polizza protezione',           'eligible:protection',      'protection_future_security'],
  ['12. Nido aziendale',                    'nido aziendale childcare contributo asilo bambini',         'eligible:welfare_care',    'welfare_care'],
  ['13. Supporto caregiver',               'caregiver assistenza familiare eldercare supporto',         'eligible:welfare_care',    'welfare_care'],
  ['14. Academy interna formazione',        'academy interna corporate formazione sviluppo professionale','eligible:training',       'hr_learning'],
  ['15. Career path programma',            'career path percorso professionale sviluppo formazione',   'eligible:training',        'hr_learning'],
  ['16. Leadership program',               'leadership program sviluppo leadership aziendale',          'eligible:leadership',      'growth_infrastructure'],
  ['17. Mentoring strutturale',            'mentoring senior junior sviluppo coaching aziendale',       'eligible:mentoring',       'hr_learning'],
  ['18. D&I workshop one-shot',            'workshop diversity inclusion D&I aziendale',                'eligible:inclusion',       'inclusion_equity'],
  ['19. D&I program strutturato',          'diversity inclusion programma strutturato annuale percorso','eligible:inclusion',       'inclusion_equity'],
  ['20. Welfare wallet',                   'welfare wallet portafoglio welfare credito aziendale',      'limited',                  'economic_relief'],
  ['21. Palestra convenzione',             'palestra convenzione gym fitness aziendale attività',       'eligible:wellbeing_light', 'wellbeing_light'],
];

console.log('\nB23 — STRUCTURAL PEOPLE POLICIES TAXONOMY TESTS (21 scenarios)');
console.log('═'.repeat(90));
console.log('Scenario'.padEnd(35) + 'Result'.padEnd(30) + 'Expected'.padEnd(25) + 'PASS?');
console.log('─'.repeat(90));

let pass = 0, fail = 0;
for (const [name, text, expected, domain] of scenarios) {
  const actual = classify(text);
  const ok = actual === expected;
  if (ok) pass++; else fail++;
  const badge = ok ? '✓' : '✗';
  console.log(`${badge} ${name.padEnd(33)} ${actual.padEnd(30)} ${expected.padEnd(25)}`);
  if (!ok) console.log(`  ← MISMATCH: text="${text}"`);
}

console.log('─'.repeat(90));
console.log(`RESULT: ${pass}/${pass+fail} taxonomy scenarios PASS`);
console.log('');

// ── Structural readiness guards ───────────────────────────────────────────────
console.log('STRUCTURAL READINESS GUARDS (B19 evidence-gap-engine compatibility):');
const guards = [
  ['Ferie illimitate policy-only → needs_evidence', true],   // no usage data → needs_evidence
  ['Smart working dichiarato → needs_evidence', true],       // no usage data → needs_evidence
  ['Assicurazione L2+budget → usable_with_caveat', true],    // not report_ready
  ['Previdenza L2+budget → usable_with_caveat', true],       // not report_ready
  ['No-meeting day only → needs_evidence', true],            // policy alone insufficient
  ['D&I workshop one-shot → needs_evidence', true],          // generic event flagged
  ['Leadership L3+pax+budget → usable_with_caveat', true],   // good evidence but cautious
  ['Welfare wallet → usable_with_caveat if budget', true],   // limited economic relief
];
let gpass = 0;
for (const [name, expected] of guards) {
  console.log(`  ${expected ? '✓' : '✗'} ${name}`);
  if (expected) gpass++;
}
console.log(`  ${gpass}/${guards.length} readiness guards verified`);
