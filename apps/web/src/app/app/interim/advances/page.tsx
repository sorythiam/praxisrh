'use client';

import useSWR from 'swr';
import { api, fetcher } from '@/lib/api-client';
import { fcfa } from '@/lib/ipm-labels';

interface Advance {
  id: string;
  amountFcfa: number;
  status: string;
  createdAt: string;
  employee: { employeeNumber: string; person: { firstName: string; lastName: string } };
}

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Demandé',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  PAID: 'Payé',
};

const STATUS_BADGE: Record<string, string> = {
  REQUESTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
  PAID: 'bg-green-100 text-green-700',
};

export default function InterimAdvancesPage() {
  const { data: advances, mutate } = useSWR<Advance[]>('/interim/advances', fetcher);

  async function decide(id: string, approve: boolean) {
    await api.patch(`/interim/advances/${id}/decision`, { approve });
    mutate();
  }

  async function pay(id: string) {
    await api.post(`/interim/advances/${id}/pay`, {});
    mutate();
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Acomptes Intérim</h1>

      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>Intérimaire</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Demandé le</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {advances?.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.employee.person.firstName} {a.employee.person.lastName} ({a.employee.employeeNumber})
                </td>
                <td>{fcfa(a.amountFcfa)}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </td>
                <td>{new Date(a.createdAt).toLocaleDateString('fr-FR')}</td>
                <td className="space-x-3">
                  {a.status === 'REQUESTED' && (
                    <>
                      <button className="text-praxis-700 hover:underline" onClick={() => decide(a.id, true)}>
                        Approuver
                      </button>
                      <button className="text-red-600 hover:underline" onClick={() => decide(a.id, false)}>
                        Rejeter
                      </button>
                    </>
                  )}
                  {a.status === 'APPROVED' && (
                    <button className="text-praxis-700 hover:underline" onClick={() => pay(a.id)}>
                      Payer
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {advances?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  Aucune demande d&apos;acompte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
