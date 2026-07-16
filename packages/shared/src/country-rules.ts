/**
 * Shape of the country rules engine. One versioned record per country;
 * a new country is added by inserting a new row, never by editing code.
 */
export interface CountryRuleSet {
  countryCode: string; // ISO 3166-1 alpha-2, e.g. "SN"
  countryName: string;
  currency: string; // "XOF"
  effectiveFrom: string; // ISO date
  smigMonthlyFcfa: number; // SMIG mensuel
  legalWeeklyHours: number;
  overtimeTiers: { upToHoursPerWeek: number; multiplier: number }[];
  socialContributions: {
    code: string; // e.g. "IPRES_RETRAITE", "CSS_PRESTATIONS_FAMILIALES"
    label: string;
    employeeRate: number; // fraction, e.g. 0.056
    employerRate: number;
    ceilingFcfa?: number;
  }[];
  incomeTaxBrackets: { upToFcfa: number | null; rate: number }[];
  paidLeaveDaysPerMonthWorked: number; // congés payés accrual
  noticePeriodDaysByCategory: Record<string, number>;
  cddMaxRenewals: number;
  cddMaxTotalDurationMonths: number;
  publicHolidays: { date: string; label: string }[];
}

// NOTE: these figures are indicative placeholders for development/demo
// purposes. Per the founding principle (section 2.3 of the spec), this
// rule set must be reviewed and signed off by a local labor-law expert
// before any production payroll run relies on it.
export const SENEGAL_RULES_2026: CountryRuleSet = {
  countryCode: 'SN',
  countryName: 'Sénégal',
  currency: 'XOF',
  effectiveFrom: '2026-01-01',
  smigMonthlyFcfa: 63763,
  legalWeeklyHours: 40,
  overtimeTiers: [
    { upToHoursPerWeek: 8, multiplier: 1.15 },
    { upToHoursPerWeek: 14, multiplier: 1.4 },
    { upToHoursPerWeek: Infinity, multiplier: 1.6 },
  ],
  socialContributions: [
    {
      code: 'IPRES_RETRAITE',
      label: 'IPRES — Retraite',
      employeeRate: 0.056,
      employerRate: 0.084,
      ceilingFcfa: 3400000,
    },
    {
      code: 'CSS_PRESTATIONS_FAMILIALES',
      label: 'CSS — Prestations familiales',
      employeeRate: 0,
      employerRate: 0.07,
      ceilingFcfa: 63000,
    },
    {
      code: 'CSS_ACCIDENTS_TRAVAIL',
      label: 'CSS — Accidents du travail',
      employeeRate: 0,
      employerRate: 0.03,
      ceilingFcfa: 63000,
    },
  ],
  incomeTaxBrackets: [
    { upToFcfa: 630000, rate: 0 },
    { upToFcfa: 1500000, rate: 0.2 },
    { upToFcfa: 4000000, rate: 0.3 },
    { upToFcfa: 8000000, rate: 0.35 },
    { upToFcfa: 13500000, rate: 0.37 },
    { upToFcfa: null, rate: 0.4 },
  ],
  paidLeaveDaysPerMonthWorked: 2.5,
  noticePeriodDaysByCategory: {
    ouvrier: 8,
    employe: 30,
    agent_maitrise: 30,
    cadre: 90,
  },
  cddMaxRenewals: 2,
  cddMaxTotalDurationMonths: 24,
  publicHolidays: [
    { date: '2026-01-01', label: 'Jour de l’An' },
    { date: '2026-04-04', label: 'Fête de l’Indépendance' },
    { date: '2026-05-01', label: 'Fête du Travail' },
    { date: '2026-12-25', label: 'Noël' },
  ],
};

/**
 * Second country, added purely as data per the spec's "un pays à la
 * fois, par configuration" principle (section 2.3) — no code in
 * rules.service.ts, payroll.service.ts, or anywhere else changed to
 * onboard it. Same indicative-placeholder disclaimer as Senegal's set
 * above: review with a local labor-law expert before any production
 * payroll run relies on it.
 */
export const COTE_DIVOIRE_RULES_2026: CountryRuleSet = {
  countryCode: 'CI',
  countryName: "Côte d'Ivoire",
  currency: 'XOF',
  effectiveFrom: '2026-01-01',
  smigMonthlyFcfa: 75000,
  legalWeeklyHours: 40,
  overtimeTiers: [
    { upToHoursPerWeek: 6, multiplier: 1.15 },
    { upToHoursPerWeek: 14, multiplier: 1.5 },
    { upToHoursPerWeek: Infinity, multiplier: 1.75 },
  ],
  socialContributions: [
    {
      code: 'CNPS_RETRAITE',
      label: 'CNPS — Retraite',
      employeeRate: 0.063,
      employerRate: 0.077,
      ceilingFcfa: 3375000,
    },
    {
      code: 'CNPS_PRESTATIONS_FAMILIALES',
      label: 'CNPS — Prestations familiales',
      employeeRate: 0,
      employerRate: 0.0575,
      ceilingFcfa: 70000,
    },
    {
      code: 'CNPS_ACCIDENTS_TRAVAIL',
      label: 'CNPS — Accidents du travail',
      employeeRate: 0,
      employerRate: 0.03,
      ceilingFcfa: 70000,
    },
  ],
  incomeTaxBrackets: [
    { upToFcfa: 300000, rate: 0 },
    { upToFcfa: 547000, rate: 0.1 },
    { upToFcfa: 979000, rate: 0.15 },
    { upToFcfa: 1519000, rate: 0.2 },
    { upToFcfa: 2179000, rate: 0.25 },
    { upToFcfa: 3106000, rate: 0.3 },
    { upToFcfa: 4626000, rate: 0.35 },
    { upToFcfa: 7266000, rate: 0.4 },
    { upToFcfa: null, rate: 0.45 },
  ],
  paidLeaveDaysPerMonthWorked: 2.2,
  noticePeriodDaysByCategory: {
    ouvrier: 8,
    employe: 15,
    agent_maitrise: 30,
    cadre: 90,
  },
  cddMaxRenewals: 2,
  cddMaxTotalDurationMonths: 24,
  publicHolidays: [
    { date: '2026-01-01', label: 'Jour de l’An' },
    { date: '2026-05-01', label: 'Fête du Travail' },
    { date: '2026-08-07', label: 'Fête de l’Indépendance' },
    { date: '2026-08-15', label: 'Assomption' },
    { date: '2026-11-15', label: 'Journée Nationale de la Paix' },
    { date: '2026-12-25', label: 'Noël' },
  ],
};
