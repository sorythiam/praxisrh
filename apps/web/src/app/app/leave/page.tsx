'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Role } from '@praxis/shared';
import { useAuth } from '@/lib/auth-context';
import { api, fetcher } from '@/lib/api-client';

export default function LeaveApprovalsPage() {
  const { user } = useAuth();
  const isManager = user?.role === Role.MANAGER;
  const path = isManager ? '/rh/leave/requests/pending-manager' : '/rh/leave/requests/pending-hr';
  const { data: pending, mutate } = useSWR<any[]>(path, fetcher);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(id: string, approve: boolean) {
    setBusyId(id);
    let reason: string | undefined;
    if (!approve) {
      reason = prompt('Motif du refus ?') ?? undefined;
    }
    try {
      const decisionPath = isManager ? 'manager-decision' : 'hr-decision';
      await api.patch(`/rh/leave/requests/${id}/${decisionPath}`, { approve, reason });
      mutate();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Demandes de congés à valider</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Type</th>
              <th>Période</th>
              <th>Jours</th>
              <th>Motif</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pending?.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.employee.person.firstName} {r.employee.person.lastName}
                </td>
                <td>{r.type}</td>
                <td>
                  {new Date(r.startDate).toLocaleDateString('fr-FR')} – {new Date(r.endDate).toLocaleDateString('fr-FR')}
                </td>
                <td>{r.days}</td>
                <td>{r.reason ?? '—'}</td>
                <td className="space-x-2">
                  <button className="btn" disabled={busyId === r.id} onClick={() => decide(r.id, true)}>
                    Approuver
                  </button>
                  <button className="btn-danger" disabled={busyId === r.id} onClick={() => decide(r.id, false)}>
                    Refuser
                  </button>
                </td>
              </tr>
            ))}
            {pending?.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  Aucune demande en attente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
