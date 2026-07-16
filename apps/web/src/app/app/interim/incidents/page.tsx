'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';
import { INTERIM_INCIDENT_SEVERITY_BADGE, INTERIM_INCIDENT_SEVERITY_LABELS } from '@/lib/interim-labels';

interface Incident {
  id: string;
  description: string;
  severity: string;
  createdAt: string;
  employee: { employeeNumber: string; person: { firstName: string; lastName: string } };
  mission?: { clientName: string } | null;
}

interface BlacklistEntry {
  id: string;
  reason: string;
  createdAt: string;
  employee: { id: string; employeeNumber: string; person: { firstName: string; lastName: string } };
}

interface EmployeeOption {
  id: string;
  employeeNumber: string;
  person: { firstName: string; lastName: string };
}

export default function IncidentsPage() {
  const { data: incidents, mutate: mutateIncidents } = useSWR<Incident[]>('/interim/incidents', fetcher);
  const { data: blacklist, mutate: mutateBlacklist } = useSWR<BlacklistEntry[]>('/interim/blacklist', fetcher);
  const { data: employees } = useSWR<EmployeeOption[]>('/rh/employees', fetcher);

  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentEmployeeId, setIncidentEmployeeId] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');

  const [showBlacklistForm, setShowBlacklistForm] = useState(false);
  const [blacklistEmployeeId, setBlacklistEmployeeId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function reportIncident(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/interim/incidents', { employeeId: incidentEmployeeId, description, severity });
      setShowIncidentForm(false);
      setDescription('');
      mutateIncidents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors du signalement.");
    }
  }

  async function blacklistEmployee(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/interim/blacklist', { employeeId: blacklistEmployeeId, reason });
      setShowBlacklistForm(false);
      setReason('');
      mutateBlacklist();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la mise en liste noire.');
    }
  }

  async function liftBlacklist(employeeId: string) {
    await api.patch(`/interim/blacklist/${employeeId}/lift`, { liftedReason: 'Levée manuelle' });
    mutateBlacklist();
  }

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold">Incidents &amp; liste noire</h1>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Liste noire</h2>
          <button className="btn" onClick={() => setShowBlacklistForm((v) => !v)}>
            {showBlacklistForm ? 'Annuler' : '+ Mettre en liste noire'}
          </button>
        </div>
        {showBlacklistForm && (
          <form onSubmit={blacklistEmployee} className="flex flex-wrap items-end gap-3">
            <select className="input" value={blacklistEmployeeId} onChange={(e) => setBlacklistEmployeeId(e.target.value)} required>
              <option value="">Employé…</option>
              {employees?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.person.firstName} {emp.person.lastName} ({emp.employeeNumber})
                </option>
              ))}
            </select>
            <input className="input" placeholder="Motif" value={reason} onChange={(e) => setReason(e.target.value)} required />
            <button className="btn-danger shrink-0" type="submit">
              Confirmer
            </button>
          </form>
        )}
        <table className="table-base">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Motif</th>
              <th>Depuis</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {blacklist?.map((b) => (
              <tr key={b.id}>
                <td>
                  {b.employee.person.firstName} {b.employee.person.lastName} ({b.employee.employeeNumber})
                </td>
                <td>{b.reason}</td>
                <td>{new Date(b.createdAt).toLocaleDateString('fr-FR')}</td>
                <td>
                  <button className="text-praxis-700 hover:underline" onClick={() => liftBlacklist(b.employee.id)}>
                    Lever
                  </button>
                </td>
              </tr>
            ))}
            {blacklist?.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-400">
                  Personne sur liste noire.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Incidents signalés</h2>
          <button className="btn" onClick={() => setShowIncidentForm((v) => !v)}>
            {showIncidentForm ? 'Annuler' : '+ Signaler un incident'}
          </button>
        </div>
        {showIncidentForm && (
          <form onSubmit={reportIncident} className="grid grid-cols-2 gap-3">
            <select className="input" value={incidentEmployeeId} onChange={(e) => setIncidentEmployeeId(e.target.value)} required>
              <option value="">Employé…</option>
              {employees?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.person.firstName} {emp.person.lastName} ({emp.employeeNumber})
                </option>
              ))}
            </select>
            <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              {Object.entries(INTERIM_INCIDENT_SEVERITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              className="input col-span-2"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <button className="btn col-span-2" type="submit">
              Signaler
            </button>
          </form>
        )}
        <table className="table-base">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Mission</th>
              <th>Description</th>
              <th>Sévérité</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {incidents?.map((i) => (
              <tr key={i.id}>
                <td>
                  {i.employee.person.firstName} {i.employee.person.lastName} ({i.employee.employeeNumber})
                </td>
                <td>{i.mission?.clientName ?? '—'}</td>
                <td>{i.description}</td>
                <td>
                  <span className={`badge ${INTERIM_INCIDENT_SEVERITY_BADGE[i.severity] ?? 'bg-gray-100 text-gray-700'}`}>
                    {INTERIM_INCIDENT_SEVERITY_LABELS[i.severity] ?? i.severity}
                  </span>
                </td>
                <td>{new Date(i.createdAt).toLocaleDateString('fr-FR')}</td>
              </tr>
            ))}
            {incidents?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">
                  Aucun incident signalé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
