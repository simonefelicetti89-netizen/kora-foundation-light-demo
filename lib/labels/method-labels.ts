// Display labels for BTI taxonomy identifiers rendered in company-facing surfaces.
// Keys are internal identifiers — never rename them. Only the display label changes.
export const METHOD_LABELS: Record<string, string> = {
  economic_relief:                 'Benefit monetari',
  economic_relief_spend:           'Spesa benefit monetari',
  economic_relief_share:           'Quota benefit monetari',
  deep_activation:                 'Attivazione profonda',
  deep_activation_spend:           'Spesa attivazione profonda',
  deep_activation_share:           'Quota attivazione profonda',
  activation_debt:                 'Debito di attivazione',
  reallocation_opportunity:        'Opportunità di riallocazione',
  cost_per_impact_unit:            'Costo per Impact Unit',
  cost_per_deep_activated_worker:  'Costo per lavoratore attivato in profondità',
  equity_of_spend:                 'Equità della spesa',
  pillar_investment_balance:       'Bilanciamento investimenti per pillar',
  bti_score:                       'Punteggio BTI',
} as const;

export function getMethodLabel(key: string): string {
  return METHOD_LABELS[key as keyof typeof METHOD_LABELS] ?? key;
}
