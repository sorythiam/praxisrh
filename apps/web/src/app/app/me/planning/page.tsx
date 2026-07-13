'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function MyPlanningPage() {
  const today = new Date();
  const in30 = new Date(today.getTime() + 30 * 86400000);
  const { data: shifts } = useSWR<any[]>(
    `/rh/planning/my?from=${toDateInput(today)}&to=${toDateInput(in30)}`,
    fetcher,
  );

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Mon planning</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Horaire</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shifts?.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</td>
                <td>
                  {new Date(s.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} –{' '}
                  {new Date(s.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td>{s.status === 'PUBLISHED' ? 'Confirmé' : 'Provisoire'}</td>
              </tr>
            ))}
            {shifts?.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-400">
                  Aucun shift prévu dans les 30 prochains jours.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
