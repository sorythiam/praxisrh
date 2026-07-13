'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function PlanningPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 6 * 86400000), [weekStart]);
  const from = toDateInput(weekStart);
  const to = toDateInput(weekEnd);

  const { data, mutate } = useSWR<{ shifts: any[]; complianceFlags: any[] }>(
    `/rh/planning?from=${from}&to=${to}`,
    fetcher,
  );
  const { data: employees } = useSWR<any[]>('/rh/employees', fetcher);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publishAll() {
    if (!data?.shifts.length) return;
    const draftIds = data.shifts.filter((s) => s.status === 'DRAFT').map((s) => s.id);
    if (draftIds.length === 0) return;
    await api.post('/rh/planning/publish', { shiftIds: draftIds });
    mutate();
  }

  async function duplicateToNextWeek() {
    await api.post('/rh/planning/duplicate-week', { weekStart: from, weeksAhead: 1 });
    mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Planning</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))}>
            ← Semaine préc.
          </button>
          <button className="btn-secondary" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))}>
            Semaine suiv. →
          </button>
          <button className="btn-secondary" onClick={duplicateToNextWeek}>
            Dupliquer +1 semaine
          </button>
          <button className="btn" onClick={publishAll}>
            Publier la semaine
          </button>
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            + Shift
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        Semaine du {weekStart.toLocaleDateString('fr-FR')} au {weekEnd.toLocaleDateString('fr-FR')}
      </p>

      {data?.complianceFlags && data.complianceFlags.length > 0 && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-800">
          {data.complianceFlags.map((f, i) => (
            <div key={i}>⚠ {f.message}</div>
          ))}
        </div>
      )}

      {showForm && (
        <NewShiftForm
          employees={employees ?? []}
          onError={setError}
          onCreated={() => {
            setShowForm(false);
            mutate();
          }}
        />
      )}
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Date</th>
              <th>Horaire</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.shifts.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.employee.person.firstName} {s.employee.person.lastName}
                </td>
                <td>{new Date(s.date).toLocaleDateString('fr-FR')}</td>
                <td>
                  {new Date(s.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} –{' '}
                  {new Date(s.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td>
                  <span className={`badge ${s.status === 'PUBLISHED' ? 'bg-praxis-100 text-praxis-700' : 'bg-gray-100 text-gray-600'}`}>
                    {s.status === 'PUBLISHED' ? 'Publié' : 'Brouillon'}
                  </span>
                </td>
                <td>
                  <button
                    className="text-red-600 hover:underline"
                    onClick={async () => {
                      await api.delete(`/rh/planning/shifts/${s.id}`);
                      mutate();
                    }}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {data?.shifts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  Aucun shift cette semaine.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewShiftForm({
  employees,
  onCreated,
  onError,
}: {
  employees: any[];
  onCreated: () => void;
  onError: (e: string | null) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('17:00');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    try {
      await api.post('/rh/planning/shifts', {
        employeeId,
        date,
        startTime: `${date}T${start}:00.000Z`,
        endTime: `${date}T${end}:00.000Z`,
      });
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Erreur lors de la création du shift.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="card flex flex-wrap items-end gap-4">
      <div>
        <label className="label">Employé</label>
        <select className="input" required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">—</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.person.firstName} {e.person.lastName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Date</label>
        <input type="date" className="input" required value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="label">Début</label>
        <input type="time" className="input" required value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      <div>
        <label className="label">Fin</label>
        <input type="time" className="input" required value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <button type="submit" className="btn">
        Ajouter
      </button>
    </form>
  );
}
