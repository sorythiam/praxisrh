export const IPM_CARD_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  REVOKED: 'Révoqué',
};

export const IPM_CARD_STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-amber-100 text-amber-700',
  REVOKED: 'bg-red-100 text-red-700',
};

export const IPM_DEPENDENT_RELATIONSHIP_LABELS: Record<string, string> = {
  CONJOINT: 'Conjoint(e)',
  ENFANT: 'Enfant',
  AUTRE: 'Autre',
};

export const IPM_CAP_CATEGORY_LABELS: Record<string, string> = {
  DENTAIRE: 'Dentaire',
  OPTIQUE: 'Optique',
  HOSPITALISATION: 'Hospitalisation',
  PHARMACIE: 'Pharmacie',
  AUTRE: 'Autre',
};

export const IPM_CASE_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Soumis',
  PENDING_MEDICAL_REVIEW: 'Contrôle médical',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  PAID: 'Payé',
};

export const IPM_CASE_STATUS_BADGE: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700',
  PENDING_MEDICAL_REVIEW: 'bg-purple-100 text-purple-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  PAID: 'bg-gray-200 text-gray-700',
};

export function fcfa(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}
