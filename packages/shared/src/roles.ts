/**
 * Platform-wide roles. PRAXIS_ADMIN operates the platform itself (billing,
 * module activation, support) and never sees tenant operational data.
 * All other roles are scoped to a single tenant.
 */
export enum Role {
  PRAXIS_ADMIN = 'PRAXIS_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  HR_ADMIN = 'HR_ADMIN',
  IPM_MANAGER = 'IPM_MANAGER',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.PRAXIS_ADMIN]: 'Administrateur Praxis',
  [Role.COMPANY_ADMIN]: 'Administrateur entreprise',
  [Role.HR_ADMIN]: 'DRH / Administrateur RH',
  [Role.IPM_MANAGER]: 'Gestionnaire IPM',
  [Role.MANAGER]: 'Manager',
  [Role.EMPLOYEE]: 'Employé',
};

// Roles that can see the entire tenant's HR data (not just their own team).
export const TENANT_WIDE_HR_ROLES = [Role.COMPANY_ADMIN, Role.HR_ADMIN];
