'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { INTERIM_TIMESHEET_STATUS_BADGE, INTERIM_TIMESHEET_STATUS_LABELS } from '@/lib/interim-labels';

interface Timesheet {
  id: string;
  date: string;
  hours: number;
  status: string;
  siteQrVerified: boolean;
  validationToken: string | null;
  assignment: {
    employee: { employeeNumber: string; person: { firstName: string; lastName: string } };
    mission: { clientName: string; siteName: string };
  };
}

const STATUS_FILTERS = ['', 'SUBMITTED', 'APPROVED', 'REJECTED'];

export default function TimesheetsPage() {
  const [status, setStatus] = useState('');
  const { data: timesheets } = useSWR<Timesheet[]>(`/interim/timesheets${status ? `?status=${status}` : ''}`, fetcher);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyValidationLink(id: string, token: string) {
    const url = `${window.location.origin}/client-validation/${token}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">Pointages Intérim</h1>
      <p className="text-sm text-gray-500">
        La validation revient au client (lien envoyé automatiquement — voir note dans le code) ; ci-dessous, un lien
        peut être copié manuellement en cas de besoin.
      </p>

      <section className="card space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">Tous les pointages</h2>
          <select className="input w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === '' ? 'Tous les statuts' : INTERIM_TIMESHEET_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <table className="table-base">
          <thead>
            <tr>
              <th>Intérimaire</th>
              <th>Mission</th>
              <th>Date</th>
              <th>Heures</th>
              <th>QR site</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {timesheets?.map((t) => (
              <tr key={t.id}>
                <td>
                  {t.assignment.employee.person.firstName} {t.assignment.employee.person.lastName}
                </td>
                <td>
                  {t.assignment.mission.clientName} — {t.assignment.mission.siteName}
                </td>
                <td>{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                <td>{t.hours}h</td>
                <td>{t.siteQrVerified ? '✓' : '—'}</td>
                <td>
                  <span className={`badge ${INTERIM_TIMESHEET_STATUS_BADGE[t.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {INTERIM_TIMESHEET_STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </td>
                <td>
                  {t.status === 'SUBMITTED' && t.validationToken && (
                    <button className="text-praxis-700 hover:underline" onClick={() => copyValidationLink(t.id, t.validationToken!)}>
                      {copiedId === t.id ? 'Copié !' : 'Copier le lien client'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {timesheets?.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  Aucun pointage.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
