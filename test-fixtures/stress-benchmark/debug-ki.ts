import { runKoraPipeline } from '@/lib/kora-engine/run-kora-pipeline';
const r = runKoraPipeline({
  tenantId: 'debug', batchId: 'b', workforcePopulation: 100,
  records: [
    { recordId: 'r1', batchId: 'b', rowIndex: 0, detectedRecordType: 'training' as const, raw: { nome_iniziativa: 'Formazione professionale', categoria: 'formazione professionale upskilling', importo: 10000, partecipanti: 40, fonte: 'report interno HR' } },
    { recordId: 'r2', batchId: 'b', rowIndex: 1, detectedRecordType: 'welfare_program' as const, raw: { nome_iniziativa: 'Buoni pasto', categoria: 'buoni pasto meal voucher', importo: 12000, partecipanti: 90 } },
  ]
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mb = r.koraIndex.macroblocks as any;
console.log('KI=' + r.koraIndex.value + ' AR=' + r.activation.activationReach);
console.log('MB_keys=' + Object.keys(mb).join(','));
console.log('activationReach=' + mb['activationReach']);
console.log('activationQuality=' + mb['activationQuality']);
console.log('distributionEquity=' + mb['distributionEquity']);
console.log('budgetToHumanImpact=' + mb['budgetToHumanImpact']);
