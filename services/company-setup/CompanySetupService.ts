import type {
  CompanySetupInput,
  CompanySetupValidationResult,
  CompanySetupTemplate,
  CompanySetupDraft,
  CompanySetupStatus,
  CompanySizeBand,
  WorkforceBaselinePreview,
  CompanySetupPipelineLink,
} from '@/lib/types';

const TEMPLATES: CompanySetupTemplate[] = [
  {
    template_id: 'small_company_30_plus',
    label: 'Piccola Impresa (30+)',
    size_band: 'small_30_49',
    description: 'Ottimizzato per organizzazioni 30–49 dipendenti con attività welfare consolidate.',
    suggested_pillars: ['LIFE', 'GROWTH', 'CONNECTION'],
    activation_benchmark_note: 'Benchmark attivazione: AR ≥ 40%, MAR ≥ 30% per CLEAR.',
    recommended_for: ['PMI', 'Startup crescita', 'Aziende familiari'],
  },
  {
    template_id: 'mid_market_multi_site',
    label: 'Mid-Market Multi-Sede',
    size_band: 'mid_50_249',
    description: 'Progettato per 50–249 dipendenti distribuiti su più siti con esigenze di distribuzione equa.',
    suggested_pillars: ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT'],
    activation_benchmark_note: 'Equity distribuiva critica con N siti > 2. EQ monitorato con soglia cluster ≥ 10.',
    recommended_for: ['Medie imprese', 'Realtà multi-sede regionali'],
  },
  {
    template_id: 'enterprise_preview',
    label: 'Enterprise (1000+)',
    size_band: 'enterprise_1000_plus',
    description: 'Configurazione per organizzazioni complesse con workforce distribuita e programmi welfare articolati.',
    suggested_pillars: ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'],
    activation_benchmark_note: 'Tutti e 5 i pillar raccomandati. LEGACY rilevante per workforce senior.',
    recommended_for: ['Grandi aziende', 'Corporate con divisioni multiple'],
  },
  {
    template_id: 'care_intensive_workforce',
    label: 'Workforce Care-Intensive',
    size_band: 'mid_50_249',
    description: 'Per settori con alta incidenza di salute, sicurezza e supporto psicologico (sanità, educazione, sociale).',
    suggested_pillars: ['LIFE', 'CONNECTION', 'LEGACY'],
    activation_benchmark_note: 'Pillar LIFE dominante atteso. LEGACY rilevante per knowledge transfer professionale.',
    recommended_for: ['Sanità', 'Educazione', 'Servizi sociali'],
  },
  {
    template_id: 'manufacturing_operations',
    label: 'Manifattura & Operations',
    size_band: 'large_250_999',
    description: 'Ottimizzato per workforce operativa con turni, siti produttivi e diversità contrattuale.',
    suggested_pillars: ['LIFE', 'GROWTH', 'CONNECTION'],
    activation_benchmark_note: 'Equity per tipo contratto e turno critica. WB monitorato su distribuzione oraria.',
    recommended_for: ['Manifattura', 'Logistica', 'Produzione'],
  },
  {
    template_id: 'services_distributed',
    label: 'Servizi Distribuiti',
    size_band: 'mid_50_249',
    description: 'Per aziende di servizi con workforce remota, ibrida o distribuita geograficamente.',
    suggested_pillars: ['GROWTH', 'CONNECTION', 'IMPACT'],
    activation_benchmark_note: 'PC (Pillar Coverage) e CO (Continuità) critici su workforce ibrida.',
    recommended_for: ['Consulenza', 'Tech', 'Servizi professionali'],
  },
];

function deriveSizeBand(headcount: number): CompanySizeBand {
  if (headcount < 50) return 'small_30_49';
  if (headcount < 250) return 'mid_50_249';
  if (headcount < 1000) return 'large_250_999';
  return 'enterprise_1000_plus';
}

function buildWorkforcePreview(input: CompanySetupInput): WorkforceBaselinePreview {
  const sizeBand = deriveSizeBand(input.headcount);
  const siteCount = input.multi_site ? (input.site_count ?? 2) : 1;
  const eligible = input.headcount >= 30;
  return {
    headcount: input.headcount,
    size_band: sizeBand,
    multi_site: input.multi_site,
    site_count: siteCount,
    eligible_for_pipeline: eligible,
    cluster_note:
      input.headcount >= 30
        ? `Soglia cluster: gruppi ≥ 10 lavoratori visibili nell'analisi distribuzione. Gruppi < 10 soppressi per privacy.`
        : `Sotto soglia minima Foundation Light (30). Pipeline non disponibile.`,
    privacy_threshold_note:
      'KORA misura l\'organizzazione, non gli individui. Nessun dato individuale visibile ai ruoli aziendali.',
  };
}

function buildPipelineLinks(input: CompanySetupInput): CompanySetupPipelineLink[] {
  const eligible = input.headcount >= 30;
  return [
    {
      stage: 'workforce_baseline',
      label: 'Workforce Baseline',
      href: '/company/workforce-baseline',
      available: eligible,
      note: eligible
        ? 'Carica i dati workforce per completare il profilo.'
        : 'Richiede almeno 30 lavoratori.',
    },
    {
      stage: 'ingestion',
      label: 'AI Ingestion Studio',
      href: '/company/ingestion',
      available: eligible,
      note: 'Carica dati welfare, formazione e iniziative per avviare il pipeline KORA.',
    },
    {
      stage: 'uef_review',
      label: 'UEF Review',
      href: '/company/uef-review',
      available: false,
      note: 'Disponibile dopo completamento ingestion.',
    },
    {
      stage: 'scoring',
      label: 'Scoring Run',
      href: '/company/scoring',
      available: false,
      note: 'Disponibile dopo UEF Review.',
    },
    {
      stage: 'kora_index',
      label: 'KORA Index',
      href: '/company/kora-index',
      available: false,
      note: 'Output finale del pipeline KORA.',
    },
  ];
}

class CompanySetupService {
  listTemplates(): CompanySetupTemplate[] {
    return TEMPLATES;
  }

  getTemplate(templateId: string): CompanySetupTemplate | null {
    return TEMPLATES.find((t) => t.template_id === templateId) ?? null;
  }

  suggestTemplate(input: Partial<CompanySetupInput>): CompanySetupTemplate | null {
    if (!input.headcount) return null;
    const band = deriveSizeBand(input.headcount);
    const sectorLower = (input.sector ?? '').toLowerCase();
    if (sectorLower.includes('sanità') || sectorLower.includes('health') || sectorLower.includes('educazi')) {
      return TEMPLATES.find((t) => t.template_id === 'care_intensive_workforce') ?? null;
    }
    if (sectorLower.includes('manifattur') || sectorLower.includes('logistic') || sectorLower.includes('produz')) {
      return TEMPLATES.find((t) => t.template_id === 'manufacturing_operations') ?? null;
    }
    return TEMPLATES.find((t) => t.size_band === band) ?? null;
  }

  validate(input: CompanySetupInput): CompanySetupValidationResult {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!input.company_name?.trim()) {
      errors.push({ field: 'company_name', message: 'Nome azienda obbligatorio.' });
    }
    if (!input.legal_name?.trim()) {
      errors.push({ field: 'legal_name', message: 'Ragione sociale obbligatoria.' });
    }
    if (!input.sector?.trim()) {
      errors.push({ field: 'sector', message: 'Settore obbligatorio.' });
    }
    if (!input.headquarters_city?.trim()) {
      errors.push({ field: 'headquarters_city', message: 'Sede principale obbligatoria.' });
    }
    if (!input.primary_contact_name?.trim()) {
      errors.push({ field: 'primary_contact_name', message: 'Referente principale obbligatorio.' });
    }
    if (!input.reporting_year?.trim()) {
      errors.push({ field: 'reporting_year', message: 'Anno di riferimento obbligatorio.' });
    }

    const headcount = Number(input.headcount);
    const headcountEligible = headcount >= 30;

    if (!headcount || headcount < 1) {
      errors.push({ field: 'headcount', message: 'Numero dipendenti obbligatorio.' });
    } else if (!headcountEligible) {
      errors.push({
        field: 'headcount',
        message: 'Foundation Light richiede almeno 30 lavoratori. Sotto soglia: pipeline non disponibile.',
      });
    } else if (headcount < 50) {
      warnings.push({
        field: 'headcount',
        message: 'Con meno di 50 dipendenti, alcuni cluster potrebbero essere soppressi per privacy (soglia ≥ 10).',
      });
    }

    if (input.multi_site && (!input.site_count || input.site_count < 2)) {
      warnings.push({
        field: 'site_count',
        message: 'Multi-sede selezionato: indica il numero di sedi per abilitare l\'analisi distribuzione.',
      });
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      headcount_eligible: headcountEligible,
      min_headcount_required: 30,
    };
  }

  createDraft(input: CompanySetupInput): CompanySetupDraft {
    const validation = this.validate(input);
    const status: CompanySetupStatus = validation.is_valid
      ? 'pipeline_ready'
      : !validation.headcount_eligible
      ? 'blocked_below_threshold'
      : 'draft';
    const template = input.preferred_template_id
      ? this.getTemplate(input.preferred_template_id)
      : this.suggestTemplate(input);

    return {
      draft_id: `draft-${Date.now()}`,
      created_at: new Date().toISOString(),
      status,
      input,
      validation,
      workforce_preview: buildWorkforcePreview(input),
      template,
      pipeline_handoff: buildPipelineLinks(input),
      demo_session_only: true,
      production_ready: false,
      synthetic_demo_data: true,
    };
  }

  getSectorOptions() {
    return [
      { value: 'manifattura', label: 'Manifattura & Produzione' },
      { value: 'servizi_professionali', label: 'Servizi Professionali' },
      { value: 'tecnologia', label: 'Tecnologia & Software' },
      { value: 'sanita', label: 'Sanità & Farmaceutica' },
      { value: 'educazione', label: 'Educazione & Formazione' },
      { value: 'retail', label: 'Retail & Grande Distribuzione' },
      { value: 'finanza', label: 'Finanza & Assicurazioni' },
      { value: 'logistica', label: 'Logistica & Trasporti' },
      { value: 'costruzioni', label: 'Costruzioni & Ingegneria' },
      { value: 'hospitality', label: 'Hospitality & Turismo' },
      { value: 'media', label: 'Media & Comunicazione' },
      { value: 'sociale', label: 'Terzo Settore & No-profit' },
      { value: 'energia', label: 'Energia & Utilities' },
      { value: 'altro', label: 'Altro' },
    ];
  }

  getReportingYearOptions() {
    return ['2025', '2024', '2023'].map((y) => ({ value: y, label: y }));
  }
}

export const companySetupService = new CompanySetupService();
