'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';
import { fcfa } from '@/lib/ipm-labels';
import {
  INTERIM_ASSIGNMENT_STATUS_LABELS,
  INTERIM_MISSION_STATUS_BADGE,
  INTERIM_MISSION_STATUS_LABELS,
  INTERIM_TIMESHEET_STATUS_BADGE,
  INTERIM_TIMESHEET_STATUS_LABELS,
} from '@/lib/interim-labels';

interface Assignment {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  employee: { employeeNumber: string; person: { firstName: string; lastName: string } };
}

interface Mission {
  id: string;
  clientName: string;
  clientContactName?: string | null;
  clientContactEmail?: string | null;
  siteName: string;
  siteQrToken: string;
  status: string;
  billingRateFcfaPerHour: number;
  payRateFcfaPerHour: number;
  assignments: Assignment[];
}

interface EmployeeOption {
  id: string;
  employeeNumber: string;
  status: string;
  person: { firstName: string; lastName: string };
}

interface Timesheet {
  id: string;
  date: string;
  hours: number;
  status: string;
  siteQrVerified: boolean;
  assignment: { employee: { person: { firstName: string; lastName: string } } };
}

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: mission, mutate } = useSWR<Mission>(`/interim/missions/${id}`, fetcher);
  const { data: employees } = useSWR<EmployeeOption[]>('/rh/employees', fetcher);
  const { data: timesheets } = useSWR<Timesheet[]>(`/interim/timesheets?missionId=${id}`, fetcher);

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const alreadyAssigned = new Set(mission?.assignments.filter((a) => a.status === 'ACTIVE').map((a) => a.employee.employeeNumber));
  const eligibleEmployees = employees?.filter((e) => e.status === 'ACTIVE' && !alreadyAssigned.has(e.employeeNumber)) ?? [];

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/interim/missions/${id}/assignments`, { employeeId, startDate: assignStartDate });
      setShowAssignForm(false);
      setEmployeeId('');
      setAssignStartDate('');
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'affectation.");
    }
  }

  async function endAssignment(assignmentId: string) {
    await api.patch(`/interim/missions/assignments/${assignmentId}/end`);
    mutate();
  }

  async function closeMission() {
    await api.patch(`/interim/missions/${id}/close`);
    mutate();
  }

  if (!mission) return <div className="text-gray-500">Chargement…</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{mission.clientName}</h1>
          <p className="text-sm text-gray-500">{mission.siteName}</p>
        </div>
        <span className={`badge ${INTERIM_MISSION_STATUS_BADGE[mission.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {INTERIM_MISSION_STATUS_LABELS[mission.status] ?? mission.status}
        </span>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="card space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-500">Contact client : </span>
            {mission.clientContactName ?? '—'} {mission.clientContactEmail ? `(${mission.clientContactEmail})` : ''}
          </div>
          <div>
            <span className="text-gray-500">Taux facturation / paie : </span>
            {fcfa(mission.billingRateFcfaPerHour)}/h — {fcfa(mission.payRateFcfaPerHour)}/h
          </div>
        </div>
        <div>
          <span className="text-gray-500">Code QR site (à afficher physiquement) : </span>
          <span className="font-mono text-xs">{mission.siteQrToken}</span>
        </div>
        {mission.status === 'ACTIVE' && (
          <button className="btn-secondary mt-2" onClick={closeMission}>
            Clôturer la mission
          </button>
        )}
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Affectations</h2>
          <button className="btn" onClick={() => setShowAssignForm((v) => !v)}>
            {showAssignForm ? 'Annuler' : '+ Affecter un intérimaire'}
          </button>
        </div>
        {showAssignForm && (
          <form onSubmit={assign} className="flex flex-wrap items-end gap-3">
            <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
              <option value="">Sélectionner un employé…</option>
              {eligibleEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.person.firstName} {emp.person.lastName} ({emp.employeeNumber})
                </option>
              ))}
            </select>
            <input className="input" type="date" value={assignStartDate} onChange={(e) => setAssignStartDate(e.target.value)} required />
            <button className="btn shrink-0" type="submit">
              Affecter
            </button>
          </form>
        )}
        <table className="table-base">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Début</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mission.assignments.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.employee.person.firstName} {a.employee.person.lastName} ({a.employee.employeeNumber})
                </td>
                <td>{new Date(a.startDate).toLocaleDateString('fr-FR')}</td>
                <td>{INTERIM_ASSIGNMENT_STATUS_LABELS[a.status] ?? a.status}</td>
                <td>
                  {a.status === 'ACTIVE' && (
                    <button className="text-praxis-700 hover:underline" onClick={() => endAssignment(a.id)}>
                      Terminer
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {mission.assignments.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-400">
                  Aucune affectation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Pointages de la mission</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Intérimaire</th>
              <th>Date</th>
              <th>Heures</th>
              <th>QR site</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {timesheets?.map((t) => (
              <tr key={t.id}>
                <td>
                  {t.assignment.employee.person.firstName} {t.assignment.employee.person.lastName}
                </td>
                <td>{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                <td>{t.hours}h</td>
                <td>{t.siteQrVerified ? '✓' : '—'}</td>
                <td>
                  <span className={`badge ${INTERIM_TIMESHEET_STATUS_BADGE[t.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {INTERIM_TIMESHEET_STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </td>
              </tr>
            ))}
            {timesheets?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">
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
