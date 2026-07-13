'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ANOMALY_REVIEW: 'Anomalies à vérifier',
  VALIDATED: 'Validé',
  EXPORTED: 'Exporté',
  PAID: 'Payé',
};

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function PayrollListPage() {
  const { data: reports, mutate } = useSWR<any[]>('/rh/payroll/reports', fetcher);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      await api.post('/rh/payroll/generate', { year, month });
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la génération.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paie</h1>

      <div className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Année</label>
          <input type="number" className="input w-28" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} />
        </div>
        <div>
          <label className="label">Mois</label>
          <select className="input w-32" value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))}>
            {MONTHS_FR.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <button className="btn" disabled={generating} onClick={generate}>
          {generating ? 'Génération…' : 'Générer le rapport de paie'}
        </button>
      </div>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Période</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reports?.map((r) => (
              <tr key={r.id}>
                <td>
                  {MONTHS_FR[r.periodMonth - 1]} {r.periodYear}
                </td>
                <td>
                  <span
                    className={`badge ${
                      r.status === 'ANOMALY_REVIEW' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
                <td>
                  <Link href={`/app/payroll/${r.id}`} className="text-praxis-700 hover:underline">
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
            {reports?.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-400">
                  Aucun rapport de paie.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
