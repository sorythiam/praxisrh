'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ApiError, fetcher } from '@/lib/api-client';
import { IPM_CARD_STATUS_BADGE, IPM_CARD_STATUS_LABELS, IPM_DEPENDENT_RELATIONSHIP_LABELS } from '@/lib/ipm-labels';

interface Dependent {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  cardNumber: string;
}

interface Beneficiary {
  cardNumber: string;
  coverageRatePercent: number;
  effectiveCardStatus: string;
  dependents: Dependent[];
}

export default function MyIpmCoveragePage() {
  const { data: beneficiary, error } = useSWR<Beneficiary>('/ipm/beneficiaries/me', fetcher);

  if (error) {
    return (
      <div className="max-w-lg">
        <h1 className="mb-4 text-2xl font-bold">Ma couverture IPM</h1>
        <div className="card text-gray-500">
          {error instanceof ApiError ? error.message : "Vous n'êtes pas encore adhérent IPM."}
        </div>
      </div>
    );
  }

  if (!beneficiary) return <div className="text-gray-500">Chargement…</div>;

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Ma couverture IPM</h1>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-mono text-lg">{beneficiary.cardNumber}</div>
          <span className={`badge ${IPM_CARD_STATUS_BADGE[beneficiary.effectiveCardStatus] ?? 'bg-gray-100 text-gray-700'}`}>
            {IPM_CARD_STATUS_LABELS[beneficiary.effectiveCardStatus] ?? beneficiary.effectiveCardStatus}
          </span>
        </div>
        <p className="text-sm text-gray-600">Taux de couverture : {beneficiary.coverageRatePercent}%</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Ayants droit</h2>
        <ul className="space-y-1 text-sm">
          {beneficiary.dependents.map((d) => (
            <li key={d.id} className="flex justify-between">
              <span>
                {d.firstName} {d.lastName} ({IPM_DEPENDENT_RELATIONSHIP_LABELS[d.relationship] ?? d.relationship})
              </span>
              <span className="font-mono text-xs text-gray-500">{d.cardNumber}</span>
            </li>
          ))}
          {beneficiary.dependents.length === 0 && <li className="text-gray-400">Aucun ayant droit enregistré.</li>}
        </ul>
      </section>

      <Link href="/app/me/ipm/reimbursements" className="btn inline-flex">
        Mes remboursements
      </Link>
    </div>
  );
}
