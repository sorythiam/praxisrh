'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { fcfa } from '@/lib/ipm-labels';
import { INTERIM_ASSIGNMENT_STATUS_LABELS } from '@/lib/interim-labels';

interface Assignment {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  mission: { clientName: string; siteName: string; payRateFcfaPerHour: number };
}

export default function MyInterimMissionsPage() {
  const { data: assignments } = useSWR<Assignment[]>('/interim/missions/me', fetcher);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Mes missions intérim</h1>

      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>Client</th>
              <th>Site</th>
              <th>Taux</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assignments?.map((a) => (
              <tr key={a.id}>
                <td>{a.mission.clientName}</td>
                <td>{a.mission.siteName}</td>
                <td>{fcfa(a.mission.payRateFcfaPerHour)}/h</td>
                <td>{INTERIM_ASSIGNMENT_STATUS_LABELS[a.status] ?? a.status}</td>
              </tr>
            ))}
            {assignments?.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  Aucune mission pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Link href="/app/me/interim/timesheets" className="btn inline-flex">
        Soumettre un pointage
      </Link>
    </div>
  );
}
