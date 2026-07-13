'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { LeaveType } from '@praxis/shared';
import { api, ApiError, fetcher } from '@/lib/api-client';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  CONGE_PAYE: 'Congé payé',
  MALADIE: 'Maladie',
  MATERNITE: 'Maternité',
  PATERNITE: 'Paternité',
  EVENEMENT_FAMILIAL: 'Événement familial',
  SANS_SOLDE: 'Sans solde',
  AUTRE: 'Autre',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_MANAGER: 'En attente (manager)',
  PENDING_HR: 'En attente (RH)',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulé',
};

export default function MyLeavePage() {
  const { data: balance } = useSWR<any>('/rh/leave/my/balance', fetcher);
  const { data: requests, mutate } = useSWR<any[]>('/rh/leave/my/requests', fetcher);
  const [type, setType] = useState<LeaveType>(LeaveType.CONGE_PAYE);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/rh/leave/requests', { type, startDate, endDate, reason });
      setStartDate('');
      setEndDate('');
      setReason('');
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la demande.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Mes congés</h1>

      {balance && (
        <div className="card grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-500">Acquis</div>
            <div className="text-xl font-bold">{balance.accruedDays}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Pris</div>
            <div className="text-xl font-bold">{balance.takenDays}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Solde</div>
            <div className="text-xl font-bold text-praxis-700">{balance.remainingDays}</div>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="card space-y-4">
        <h2 className="font-semibold">Nouvelle demande</h2>
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
            {Object.values(LeaveType).map((t) => (
              <option key={t} value={t}>
                {LEAVE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Début</label>
            <input type="date" className="input" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Fin</label>
            <input type="date" className="input" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Motif (optionnel)</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Type</th>
              <th>Période</th>
              <th>Jours</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests?.map((r) => (
              <tr key={r.id}>
                <td>{LEAVE_TYPE_LABELS[r.type]}</td>
                <td>
                  {new Date(r.startDate).toLocaleDateString('fr-FR')} – {new Date(r.endDate).toLocaleDateString('fr-FR')}
                </td>
                <td>{r.days}</td>
                <td>{STATUS_LABELS[r.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
