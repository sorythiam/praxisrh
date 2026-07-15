import { EmployeeStatus, IpmCardStatus } from '@prisma/client';

const EMPLOYMENT_ENDED_STATUSES: EmployeeStatus[] = [EmployeeStatus.OFFBOARDING, EmployeeStatus.TERMINATED];

/**
 * "Une fin de contrat, une fin de mission ou une mise à pied ... déclenche
 * automatiquement une alerte — voire une suspension — de la carte IPM
 * correspondante" (section 10.2). Rather than trying to eagerly keep a
 * stored `cardStatus` in sync with every RH status change (which risks
 * going stale), the effective status folds the employee's current
 * employment status in at read time: a card can never appear ACTIVE once
 * the underlying contract has ended, regardless of what was last stored.
 */
export function computeEffectiveCardStatus(beneficiary: {
  cardStatus: IpmCardStatus;
  employee: { status: EmployeeStatus };
}): IpmCardStatus {
  if (EMPLOYMENT_ENDED_STATUSES.includes(beneficiary.employee.status)) {
    return IpmCardStatus.SUSPENDED;
  }
  return beneficiary.cardStatus;
}
