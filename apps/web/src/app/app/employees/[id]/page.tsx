'use client';

import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api, fetcher } from '@/lib/api-client';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: employee, mutate } = useSWR<any>(`/rh/employees/${id}`, fetcher);

  if (!employee) return <div className="text-gray-500">Chargement…</div>;

  async function activate() {
    await api.patch(`/rh/employees/${id}/activate`);
    mutate();
  }

  async function offboard() {
    const endDate = prompt('Date de fin de contrat (AAAA-MM-JJ) ?');
    if (!endDate) return;
    await api.patch(`/rh/employees/${id}/offboard`, { endDate });
    mutate();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <button onClick={() => router.back()} className="text-sm text-praxis-700">
        ← Retour
      </button>
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {employee.person.firstName} {employee.person.lastName}
            </h1>
            <p className="text-sm text-gray-500">
              {employee.employeeNumber} · {employee.position}
            </p>
          </div>
          <span className="badge bg-gray-100 text-gray-700">{employee.status}</span>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd>{employee.person.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Téléphone</dt>
            <dd>{employee.person.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Mobile money</dt>
            <dd>
              {employee.person.mobileMoneyProvider} {employee.person.mobileMoneyNumber ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Date d&apos;embauche</dt>
            <dd>{new Date(employee.hireDate).toLocaleDateString('fr-FR')}</dd>
          </div>
        </dl>

        <div className="mt-6 flex gap-3">
          {employee.status === 'ONBOARDING' && (
            <button onClick={activate} className="btn">
              Activer (fin onboarding)
            </button>
          )}
          {employee.status === 'ACTIVE' && (
            <button onClick={offboard} className="btn-danger">
              Démarrer l&apos;offboarding
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold">Contrats</h2>
        <table className="table-base mt-3">
          <thead>
            <tr>
              <th>Type</th>
              <th>Statut</th>
              <th>Début</th>
              <th>Fin</th>
              <th>Salaire base</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employee.contracts?.map((c: any) => (
              <tr key={c.id}>
                <td>{c.type}</td>
                <td>{c.status}</td>
                <td>{new Date(c.startDate).toLocaleDateString('fr-FR')}</td>
                <td>{c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : '—'}</td>
                <td>{c.baseSalaryFcfa.toLocaleString('fr-FR')} FCFA</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
