'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';
import { fcfa } from '@/lib/ipm-labels';
import { INTERIM_INVOICE_STATUS_BADGE, INTERIM_INVOICE_STATUS_LABELS } from '@/lib/interim-labels';

interface Invoice {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  totalAmountFcfa: number;
  status: string;
  mission: { clientName: string; siteName: string };
}

interface Mission {
  id: string;
  clientName: string;
  siteName: string;
}

export default function BillingPage() {
  const { data: invoices, mutate } = useSWR<Invoice[]>('/interim/billing/proforma', fetcher);
  const { data: missions } = useSWR<Mission[]>('/interim/missions', fetcher);
  const [missionId, setMissionId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGenerating(true);
    try {
      await api.post('/interim/billing/proforma', { missionId, periodStart, periodEnd });
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la génération.');
    } finally {
      setGenerating(false);
    }
  }

  async function markSent(id: string) {
    await api.patch(`/interim/billing/proforma/${id}/sent`);
    mutate();
  }

  async function markPaid(id: string) {
    await api.patch(`/interim/billing/proforma/${id}/paid`);
    mutate();
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Facturation Intérim</h1>

      <section className="card space-y-4">
        <h2 className="font-semibold">Générer une facture proforma</h2>
        <p className="text-xs text-gray-500">
          Calculée uniquement à partir des pointages approuvés par le client sur la période, au taux de facturation de
          la mission.
        </p>
        <form onSubmit={generate} className="flex flex-wrap items-end gap-3">
          <select className="input" value={missionId} onChange={(e) => setMissionId(e.target.value)} required>
            <option value="">Mission…</option>
            {missions?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.clientName} — {m.siteName}
              </option>
            ))}
          </select>
          <div>
            <label className="label">Début période</label>
            <input className="input" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
          </div>
          <div>
            <label className="label">Fin période</label>
            <input className="input" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
          </div>
          <button className="btn shrink-0" type="submit" disabled={generating}>
            Générer
          </button>
        </form>
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Factures proforma</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Mission</th>
              <th>Période</th>
              <th>Heures</th>
              <th>Montant</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices?.map((inv) => (
              <tr key={inv.id}>
                <td>
                  {inv.mission.clientName} — {inv.mission.siteName}
                </td>
                <td>
                  {new Date(inv.periodStart).toLocaleDateString('fr-FR')} – {new Date(inv.periodEnd).toLocaleDateString('fr-FR')}
                </td>
                <td>{inv.totalHours}h</td>
                <td>{fcfa(inv.totalAmountFcfa)}</td>
                <td>
                  <span className={`badge ${INTERIM_INVOICE_STATUS_BADGE[inv.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {INTERIM_INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                  </span>
                </td>
                <td className="space-x-3">
                  {inv.status === 'DRAFT' && (
                    <button className="text-praxis-700 hover:underline" onClick={() => markSent(inv.id)}>
                      Marquer envoyée
                    </button>
                  )}
                  {inv.status === 'SENT' && (
                    <button className="text-praxis-700 hover:underline" onClick={() => markPaid(inv.id)}>
                      Marquer payée
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {invoices?.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  Aucune facture proforma.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
