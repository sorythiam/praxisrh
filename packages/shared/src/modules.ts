/**
 * The three subscribable modules. Pack Intérim requires RH to be active
 * on the same tenant (enforced both at subscription time and by the
 * ModuleGuard on the API).
 */
export enum ModuleCode {
  RH = 'RH',
  IPM = 'IPM',
  INTERIM = 'INTERIM',
}

export const MODULE_LABELS: Record<ModuleCode, string> = {
  [ModuleCode.RH]: 'Praxis RH',
  [ModuleCode.IPM]: 'Praxis IPM',
  [ModuleCode.INTERIM]: 'Pack Intérim',
};

export const MODULE_DEPENDENCIES: Partial<Record<ModuleCode, ModuleCode[]>> = {
  [ModuleCode.INTERIM]: [ModuleCode.RH],
};

export interface ModulePricing {
  code: ModuleCode;
  baseFcfaPerEstablishment: number;
  variableFcfaPerActivePerson: number;
  variableLabel: string;
}

// Base pricing catalogue (FCFA). Indicative default values — the platform
// admin can override per-tenant negotiated pricing from the back-office.
export const MODULE_PRICING: Record<ModuleCode, ModulePricing> = {
  [ModuleCode.RH]: {
    code: ModuleCode.RH,
    baseFcfaPerEstablishment: 25000,
    variableFcfaPerActivePerson: 1500,
    variableLabel: 'par employé actif / mois',
  },
  [ModuleCode.IPM]: {
    code: ModuleCode.IPM,
    baseFcfaPerEstablishment: 35000,
    variableFcfaPerActivePerson: 1000,
    variableLabel: 'par adhérent actif / mois',
  },
  [ModuleCode.INTERIM]: {
    code: ModuleCode.INTERIM,
    baseFcfaPerEstablishment: 15000,
    variableFcfaPerActivePerson: 800,
    variableLabel: 'par intérimaire actif / mois',
  },
};

export function computeMonthlyPriceFcfa(
  selected: ModuleCode[],
  activeCounts: Partial<Record<ModuleCode, number>>,
): number {
  return selected.reduce((total, code) => {
    const pricing = MODULE_PRICING[code];
    const count = activeCounts[code] ?? 0;
    return total + pricing.baseFcfaPerEstablishment + count * pricing.variableFcfaPerActivePerson;
  }, 0);
}
