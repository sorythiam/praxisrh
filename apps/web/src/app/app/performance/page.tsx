'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';

export default function PerformanceAdminPage() {
  const { data: employees } = useSWR<any[]>('/rh/employees', fetcher);
  const { data: objectives, mutate: mutateObjectives } = useSWR<any[]>('/rh/performance/objectives', fetcher);
  const { data: cycles, mutate: mutateCycles } = useSWR<any[]>('/rh/performance/review-cycles', fetcher);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold">Performance & OKR</h1>

      <section className="card space-y-4">
        <h2 className="font-semibold">Objectifs</h2>
        <NewObjectiveForm employees={employees ?? []} onError={setError} onCreated={() => mutateObjectives()} />
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <table className="table-base">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Type</th>
              <th>Période</th>
              <th>Statut</th>
              <th>Résultats clés</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {objectives?.map((o: any) => (
              <tr key={o.id}>
                <td>{o.title}</td>
                <td>{o.type === 'INDIVIDUAL' ? 'Individuel' : 'Équipe'}</td>
                <td>{o.periodLabel}</td>
                <td>{o.status}</td>
                <td>
                  {o.keyResults.map((kr: any) => (
                    <div key={kr.id} className="text-xs text-gray-500">
                      {kr.description}: {kr.currentValue}/{kr.targetValue} {kr.unit}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
            {objectives?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">
                  Aucun objectif.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Cycles d&apos;évaluation</h2>
        <NewCycleForm onError={setError} onCreated={() => mutateCycles()} />
        <ul className="space-y-1 text-sm">
          {cycles?.map((c: any) => (
            <li key={c.id} className="flex justify-between">
              <span>{c.periodLabel}</span>
              <span className="text-gray-500">{c.status}</span>
            </li>
          ))}
        </ul>
        {cycles && cycles.length > 0 && <RecordReviewForm employees={employees ?? []} cycles={cycles} onError={setError} />}
      </section>
    </div>
  );
}

function NewObjectiveForm({ employees, onCreated, onError }: { employees: any[]; onCreated: () => void; onError: (e: string | null) => void }) {
  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [periodLabel, setPeriodLabel] = useState('2026-Q1');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    try {
      await api.post('/rh/performance/objectives', { employeeId, type: 'INDIVIDUAL', title, periodLabel });
      setTitle('');
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Erreur.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
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
        <label className="label">Titre de l&apos;objectif</label>
        <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">Période</label>
        <input className="input w-28" required value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
      </div>
      <button className="btn" type="submit">
        Créer
      </button>
    </form>
  );
}

function NewCycleForm({ onCreated, onError }: { onCreated: () => void; onError: (e: string | null) => void }) {
  const [periodLabel, setPeriodLabel] = useState('2026-Q1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    try {
      await api.post('/rh/performance/review-cycles', { periodLabel, startDate, endDate });
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Erreur.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="label">Période</label>
        <input className="input w-28" required value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
      </div>
      <div>
        <label className="label">Début</label>
        <input type="date" className="input" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div>
        <label className="label">Fin</label>
        <input type="date" className="input" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <button className="btn" type="submit">
        Créer le cycle
      </button>
    </form>
  );
}

function RecordReviewForm({ employees, cycles, onError }: { employees: any[]; cycles: any[]; onError: (e: string | null) => void }) {
  const [employeeId, setEmployeeId] = useState('');
  const [cycleId, setCycleId] = useState(cycles[0]?.id ?? '');
  const [selfScore, setSelfScore] = useState('');
  const [managerScore, setManagerScore] = useState('');
  const [managerComments, setManagerComments] = useState('');
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setSuccess(false);
    try {
      await api.post(`/rh/performance/review-cycles/${cycleId}/reviews`, {
        employeeId,
        selfScore: selfScore ? parseFloat(selfScore) : undefined,
        managerScore: managerScore ? parseFloat(managerScore) : undefined,
        managerComments: managerComments || undefined,
      });
      setSuccess(true);
      setManagerComments('');
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Erreur.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-md border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-600">Enregistrer une évaluation</h3>
      <div className="flex flex-wrap gap-3">
        <select className="input" required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Employé —</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.person.firstName} {e.person.lastName}
            </option>
          ))}
        </select>
        <select className="input" required value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.periodLabel}
            </option>
          ))}
        </select>
        <input className="input w-24" placeholder="Auto-éval" value={selfScore} onChange={(e) => setSelfScore(e.target.value)} />
        <input className="input w-24" placeholder="Éval manager" value={managerScore} onChange={(e) => setManagerScore(e.target.value)} />
      </div>
      <textarea className="input" placeholder="Commentaires du manager" value={managerComments} onChange={(e) => setManagerComments(e.target.value)} />
      {success && <div className="text-sm text-praxis-700">Évaluation enregistrée.</div>}
      <button className="btn" type="submit">
        Enregistrer
      </button>
    </form>
  );
}
