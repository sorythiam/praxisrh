export enum ContractType {
  CDI = 'CDI',
  CDD = 'CDD',
  STAGE = 'STAGE',
  PRESTATION = 'PRESTATION',
}

export enum EmploymentCategory {
  OUVRIER = 'ouvrier',
  EMPLOYE = 'employe',
  AGENT_MAITRISE = 'agent_maitrise',
  CADRE = 'cadre',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  TERMINATED = 'TERMINATED',
}

export enum EmployeeStatus {
  ONBOARDING = 'ONBOARDING',
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  OFFBOARDING = 'OFFBOARDING',
  TERMINATED = 'TERMINATED',
}

export enum LeaveType {
  CONGE_PAYE = 'CONGE_PAYE',
  MALADIE = 'MALADIE',
  MATERNITE = 'MATERNITE',
  PATERNITE = 'PATERNITE',
  EVENEMENT_FAMILIAL = 'EVENEMENT_FAMILIAL',
  SANS_SOLDE = 'SANS_SOLDE',
  AUTRE = 'AUTRE',
}

export enum LeaveRequestStatus {
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_HR = 'PENDING_HR',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum ShiftStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export enum ClockEventType {
  CLOCK_IN = 'CLOCK_IN',
  CLOCK_OUT = 'CLOCK_OUT',
  BREAK_START = 'BREAK_START',
  BREAK_END = 'BREAK_END',
}

export enum ClockEventSource {
  ONLINE = 'ONLINE',
  OFFLINE_SYNC = 'OFFLINE_SYNC',
}

export enum PaymentTransactionType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  SALARY = 'SALARY',
  ADVANCE = 'ADVANCE',
  REIMBURSEMENT = 'REIMBURSEMENT',
}

export enum PayrollReportStatus {
  DRAFT = 'DRAFT',
  ANOMALY_REVIEW = 'ANOMALY_REVIEW',
  VALIDATED = 'VALIDATED',
  EXPORTED = 'EXPORTED',
  PAID = 'PAID',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  INITIATED = 'INITIATED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum PayoutProvider {
  WAVE = 'WAVE',
  ORANGE_MONEY = 'ORANGE_MONEY',
}

export enum NotificationChannel {
  WHATSAPP = 'WHATSAPP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

export enum SubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
}
