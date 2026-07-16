'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';
import { fcfa } from '@/lib/ipm-labels';

interface Advance {
  id: string;
  amountFcfa: number;
  status: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Demandé',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  PAID: 'Payé',
};

export default function MyInterimAdvancesPage() {
  const { data: advances, mutate } = useSWR<Advance[]>('/interim/advances/me', fetcher);
  const [amountFcfa, setAmountFcfa] = useState(20000);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/interim/advances/me', { amountFcfa });
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la demande.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Mes acomptes intérim</h1>

      <form onSubmit={submit} className="card flex items-end gap-3">
        <div className="flex-1">
          <label className="label">Montant (FCFA)</label>
          <input className="input" type="number" value={amountFcfa} onChange={(e) => setAmountFcfa(parseInt(e.target.value, 10))} required />
        </div>
        <button className="btn shrink-0" type="submit" disabled={submitting}>
          Demander
        </button>
      </form>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>Montant</th>
              <th>Statut</th>
              <th>Demandé le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {advances?.map((a) => (
              <tr key={a.id}>
                <td>{fcfa(a.amountFcfa)}</td>
                <td>{STATUS_LABELS[a.status] ?? a.status}</td>
                <td>{new Date(a.createdAt).toLocaleDateString('fr-FR')}</td>
              </tr>
            ))}
            {advances?.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-400">
                  Aucune demande.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
