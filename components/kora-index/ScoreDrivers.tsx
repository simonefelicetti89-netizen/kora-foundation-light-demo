'use client';

import { RankedGroup, RankedItem, RankedLine } from '@/components/ui/px';
import { TM } from '@/components/ui/TM';

interface WeakComponent {
  code:  string;
  label: string;
}

interface ScoreDriversProps {
  weakComponents: WeakComponent[];
}

// Business-language driver descriptions for each component code
// KORA-WP-141 DEFECT FOUND WHILE RECOMPOSING THIS BLOCK: this library was keyed
// on the SUPERSEDED component codes (NI, VR, CO, WB, EQ). The engine emits the
// canonical ten (AR, MAR, EVQ, INT, CONT, EQW, EQS, PC, PB, BTI), so every lookup
// missed and all three drivers fell through to the same generic sentence — the
// block said nothing three times. Canonical codes are now the keys; the
// superseded codes are kept as aliases so no older payload regresses.
const DRIVER_LIBRARY: Record<string, {
  title:   string;
  impact:  string;
  action:  string;
  macro:   string;
}> = {
  AR:  {
    title:  'Copertura insufficiente',
    impact: 'Una quota significativa della workforce non ha ancora ricevuto attivazione verificata nel periodo.',
    action: 'Espandere le iniziative alle sedi e ai reparti con minore partecipazione.',
    macro:  'REACH',
  },
  MAR: {
    title:  'Profondità limitata',
    impact: 'L\'attivazione significativa (sopra soglia materialità) è concentrata su una minoranza.',
    action: 'Intensificare i programmi ad attivazione profonda e verificata.',
    macro:  'REACH',
  },
  EVQ: {
    title:  'Evidenze incomplete',
    impact: 'Una parte degli Impact Units non è supportata da evidenza verificata — il Confidence Score™ ne risente.',
    action: 'Completare il data intake con fonti strutturate e protocolli advisor.',
    macro:  'QUALITY',
  },
  INT: {
    title:  'Intensità bassa',
    impact: 'La media degli Impact Units per lavoratore attivo è sotto il target di configurazione.',
    action: 'Prioritizzare programmi con alta additionality e continuità strutturata.',
    macro:  'QUALITY',
  },
  CONT: {
    title:  'Continuità assente',
    impact: 'L\'attivazione avviene a burst senza ricorrenza tra periodi.',
    action: 'Introdurre programmi ricorrenti e misurare la partecipazione nel tempo.',
    macro:  'QUALITY',
  },
  EQW: {
    title:  'Distribuzione squilibrata tra lavoratori',
    impact: 'Gli Impact Units sono concentrati su pochi lavoratori attivi.',
    action: 'Ribilanciare l\'accesso alle iniziative verso i lavoratori meno attivi.',
    macro:  'EQUITY',
  },
  EQS: {
    title:  'Equità tra reparti bassa',
    impact: 'Il tasso di attivazione è molto diverso tra dipartimenti e sedi.',
    action: 'Programmi ad accesso allargato nei reparti con bassa partecipazione storica.',
    macro:  'EQUITY',
  },
  PC:  {
    title:  'Copertura pillar incompleta',
    impact: 'Non tutti i 5 pilastri KORA sono rappresentati con sufficiente presenza.',
    action: 'Attivare programmi sui pilastri scoperti — in particolare CONNECTION e LEGACY.',
    macro:  'EQUITY',
  },
  PB:  {
    title:  'Squilibrio tra pilastri',
    impact: 'Un pilastro domina (tipicamente LIFE) — la distribuzione è asimmetrica.',
    action: 'Diversificare il mix di iniziative verso i pilastri sottorappresentati.',
    macro:  'EQUITY',
  },
  BTI: {
    title:  'Budget non si converte in attivazione',
    impact: 'La quota di budget che genera attivazione profonda è inferiore al target.',
    action: 'Ridurre economic relief e riallocare verso iniziative con Impact Units verificabili.',
    macro:  'BTI',
  },
  CS:  {
    title:  'Confidence Score™ basso',
    impact: 'L\'affidabilità delle fonti dati è limitata — output direzionale, non certificativo.',
    action: 'Completare data intake e aumentare la copertura delle fonti strutturate.',
    macro:  'QUALITY',
  },
};

// Superseded component codes, retained as aliases only.
const SUPERSEDED_ALIASES: Record<string, string> = {
  NI: 'INT', VR: 'EVQ', CO: 'CONT', WB: 'EQW', EQ: 'EQS',
};

// ScoreDrivers — ONE ranked driver group, not three cards.
// KORA-WP-141: the three drivers used to be three separate cards, each with its
// own 3px coloured top border, its own filled rank disc (red, gold, grey) and its
// own drop shadow. They now share the canonical RankedGroup grammar with the
// board actions and the BTI recommendations.
export function ScoreDrivers({ weakComponents }: ScoreDriversProps) {
  const drivers = weakComponents.slice(0, 3).map((wc) => ({
    ...DRIVER_LIBRARY[wc.code] ?? DRIVER_LIBRARY[SUPERSEDED_ALIASES[wc.code] ?? ''] ?? {
      title:  wc.label,
      impact: 'Questo componente sta limitando il KORA Index™.',
      action: 'Analizzare le iniziative correlate e verificare la qualità delle evidenze.',
      macro:  '—',
    },
    code: wc.code,
  }));

  if (drivers.length === 0) return null;

  return (
    <RankedGroup title="Cosa limita il punteggio" note={<>In ordine di impatto sul <TM>KORA Index</TM></>}>
      {drivers.map((driver, i) => (
        <RankedItem
          key={driver.code}
          rank={i + 1}
          title={driver.title}
          meta={driver.code}
          last={i === drivers.length - 1}
        >
          <RankedLine>{driver.impact}</RankedLine>
          <RankedLine tone="tertiary">{'→ '}{driver.action}</RankedLine>
        </RankedItem>
      ))}
    </RankedGroup>
  );
}
