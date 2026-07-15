'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';
import { fcfa } from '@/lib/ipm-labels';

interface Contribution {
  id: string;
  periodYear: number;
  periodMonth: number;
  grossSalaryFcfa: number;
  assietteFcfa: number;
  employerShareFcfa: number;
  employeeShareFcfa: number;
  status: string;
  beneficiary: { cardNumber: string; employee: { employeeNumber: string; person: { firstName: string; lastName: string } } };
}

export default function CotisationsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [ratePercent, setRatePercent] = useState(10);
  const [employerSharePercent, setEmployerSharePercent] = useState(66.67);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: contributions, mutate } = useSWR<Contribution[]>(
    `/ipm/contributions?year=${year}&month=${month}`,
    fetcher,
  );
  const { data: overdue } = useSWR<Contribution[]>('/ipm/contributions/overdue', fetcher);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setGenerating(true);
    try {
      const res = await api.post('/ipm/contributions/generate', { year, month, ratePercent, employerSharePercent });
      setResult(res);
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la génération.');
    } finally {
      setGenerating(false);
    }
  }

  async function markPaid(id: string) {
    await api.patch(`/ipm/contributions/${id}/mark-paid`);
    mutate();
  }

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">Cotisations IPM</h1>

      <section className="card space-y-4">
        <h2 className="font-semibold">Générer les cotisations depuis la paie</h2>
        <p className="text-xs text-gray-500">
          Calculées à partir des bulletins de paie Praxis RH déjà générés pour la période — assiette plafonnée à
          250 000 FCFA.
        </p>
        <form onSubmit={generate} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Année</label>
            <input className="input w-24" type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} />
          </div>
          <div>
            <label className="label">Mois</label>
            <select className="input w-24" value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Taux (%)</label>
            <input className="input w-24" type="number" value={ratePercent} onChange={(e) => setRatePercent(parseInt(e.target.value, 10))} />
          </div>
          <div>
            <label className="label">Part employeur (%)</label>
            <input
              className="input w-28"
              type="number"
              step="0.01"
              value={employerSharePercent}
              onChange={(e) => setEmployerSharePercent(parseFloat(e.target.value))}
            />
          </div>
          <button className="btn" type="submit" disabled={generating}>
            Générer
          </button>
        </form>
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {result && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
            {result.created ?? result.length ?? 0} cotisation(s) générée(s).
            {result.skippedNoPayroll ? ` ${result.skippedNoPayroll} adhérent(s) ignoré(s) (aucune paie générée).` : ''}
          </div>
        )}
      </section>

      {overdue && overdue.length > 0 && (
        <section className="card border-amber-200 bg-amber-50 space-y-2">
          <h2 className="font-semibold text-amber-800">Cotisations en retard ({overdue.length})</h2>
        </section>
      )}

      <section className="card space-y-4">
        <h2 className="font-semibold">
          Cotisations {month}/{year}
        </h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Adhérent</th>
              <th>Assiette</th>
              <th>Part employeur</th>
              <th>Part salarié</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contributions?.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.beneficiary.employee.person.firstName} {c.beneficiary.employee.person.lastName}
                </td>
                <td>{fcfa(c.assietteFcfa)}</td>
                <td>{fcfa(c.employerShareFcfa)}</td>
                <td>{fcfa(c.employeeShareFcfa)}</td>
                <td>{c.status}</td>
                <td>
                  {c.status !== 'PAID' && (
                    <button className="text-praxis-700 hover:underline" onClick={() => markPaid(c.id)}>
                      Marquer payée
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {contributions?.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  Aucune cotisation pour cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
