'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';
import { fcfa } from '@/lib/ipm-labels';
import { INTERIM_MISSION_STATUS_BADGE, INTERIM_MISSION_STATUS_LABELS } from '@/lib/interim-labels';

interface Mission {
  id: string;
  clientName: string;
  siteName: string;
  status: string;
  billingRateFcfaPerHour: number;
  payRateFcfaPerHour: number;
  assignments: { id: string }[];
}

export default function MissionsPage() {
  const { data: missions, mutate } = useSWR<Mission[]>('/interim/missions', fetcher);
  const [showForm, setShowForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientContactName, setClientContactName] = useState('');
  const [clientContactEmail, setClientContactEmail] = useState('');
  const [clientContactPhone, setClientContactPhone] = useState('');
  const [siteName, setSiteName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [billingRateFcfaPerHour, setBillingRateFcfaPerHour] = useState(2500);
  const [payRateFcfaPerHour, setPayRateFcfaPerHour] = useState(1500);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function createMission(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/interim/missions', {
        clientName,
        clientContactName: clientContactName || undefined,
        clientContactEmail: clientContactEmail || undefined,
        clientContactPhone: clientContactPhone || undefined,
        siteName,
        startDate,
        billingRateFcfaPerHour,
        payRateFcfaPerHour,
      });
      setShowForm(false);
      setClientName('');
      setClientContactName('');
      setClientContactEmail('');
      setClientContactPhone('');
      setSiteName('');
      setStartDate('');
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Missions Intérim</h1>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : '+ Nouvelle mission'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createMission} className="card grid grid-cols-2 gap-3">
          <input className="input" placeholder="Client" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
          <input className="input" placeholder="Site" value={siteName} onChange={(e) => setSiteName(e.target.value)} required />
          <input
            className="input"
            placeholder="Contact client (nom)"
            value={clientContactName}
            onChange={(e) => setClientContactName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Contact client (email)"
            type="email"
            value={clientContactEmail}
            onChange={(e) => setClientContactEmail(e.target.value)}
          />
          <input
            className="input"
            placeholder="Contact client (téléphone)"
            value={clientContactPhone}
            onChange={(e) => setClientContactPhone(e.target.value)}
          />
          <div>
            <label className="label">Date de début</label>
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Taux de facturation (FCFA/h)</label>
            <input
              className="input"
              type="number"
              value={billingRateFcfaPerHour}
              onChange={(e) => setBillingRateFcfaPerHour(parseInt(e.target.value, 10))}
              required
            />
          </div>
          <div>
            <label className="label">Taux de paie intérimaire (FCFA/h)</label>
            <input
              className="input"
              type="number"
              value={payRateFcfaPerHour}
              onChange={(e) => setPayRateFcfaPerHour(parseInt(e.target.value, 10))}
              required
            />
          </div>
          {error && <div className="col-span-2 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <button className="btn col-span-2" type="submit" disabled={submitting}>
            Créer la mission
          </button>
        </form>
      )}

      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>Client</th>
              <th>Site</th>
              <th>Taux facturation</th>
              <th>Taux paie</th>
              <th>Affectés</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {missions?.map((m) => (
              <tr key={m.id}>
                <td>{m.clientName}</td>
                <td>{m.siteName}</td>
                <td>{fcfa(m.billingRateFcfaPerHour)}/h</td>
                <td>{fcfa(m.payRateFcfaPerHour)}/h</td>
                <td>{m.assignments.length}</td>
                <td>
                  <span className={`badge ${INTERIM_MISSION_STATUS_BADGE[m.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {INTERIM_MISSION_STATUS_LABELS[m.status] ?? m.status}
                  </span>
                </td>
                <td>
                  <Link href={`/app/interim/missions/${m.id}`} className="text-praxis-700 hover:underline">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
            {missions?.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  Aucune mission.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
