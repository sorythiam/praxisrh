const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function fmt(n: number): string {
  return n.toLocaleString('fr-FR');
}

export function renderPayslipHtml(params: {
  companyName: string;
  employeeName: string;
  employeeNumber: string;
  position: string;
  periodYear: number;
  periodMonth: number;
  baseSalaryFcfa: number;
  overtimeHours: number;
  overtimeAmountFcfa: number;
  bonusesFcfa: number;
  advancesDeductedFcfa: number;
  grossSalaryFcfa: number;
  employeeContributionsFcfa: number;
  incomeTaxFcfa: number;
  netSalaryFcfa: number;
}): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Bulletin de paie — ${params.employeeName} — ${MONTHS_FR[params.periodMonth - 1]} ${params.periodYear}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a; max-width: 700px; margin: 2rem auto; }
  h1 { font-size: 18px; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  td, th { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; }
  .amount { text-align: right; font-variant-numeric: tabular-nums; }
  .net { font-weight: bold; font-size: 16px; background: #f2f6f2; }
  .header { display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="header">
    <div><strong>${params.companyName}</strong></div>
    <div>${MONTHS_FR[params.periodMonth - 1]} ${params.periodYear}</div>
  </div>
  <h1>Bulletin de paie</h1>
  <p>${params.employeeName} — Matricule ${params.employeeNumber} — ${params.position}</p>
  <table>
    <tr><th>Élément</th><th class="amount">Montant (FCFA)</th></tr>
    <tr><td>Salaire de base</td><td class="amount">${fmt(params.baseSalaryFcfa)}</td></tr>
    <tr><td>Heures supplémentaires (${params.overtimeHours.toFixed(1)}h)</td><td class="amount">${fmt(params.overtimeAmountFcfa)}</td></tr>
    <tr><td>Primes</td><td class="amount">${fmt(params.bonusesFcfa)}</td></tr>
    <tr><td><strong>Salaire brut</strong></td><td class="amount"><strong>${fmt(params.grossSalaryFcfa)}</strong></td></tr>
    <tr><td>Cotisations sociales salariales</td><td class="amount">-${fmt(params.employeeContributionsFcfa)}</td></tr>
    <tr><td>Impôt sur salaire</td><td class="amount">-${fmt(params.incomeTaxFcfa)}</td></tr>
    <tr><td>Acomptes déduits</td><td class="amount">-${fmt(params.advancesDeductedFcfa)}</td></tr>
    <tr class="net"><td>Net à payer</td><td class="amount">${fmt(params.netSalaryFcfa)}</td></tr>
  </table>
</body>
</html>`;
}
