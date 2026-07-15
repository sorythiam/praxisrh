'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';
import { IPM_CARD_STATUS_BADGE, IPM_CARD_STATUS_LABELS } from '@/lib/ipm-labels';

interface Beneficiary {
  id: string;
  cardNumber: string;
  coverageRatePercent: number;
  effectiveCardStatus: string;
  employee: { employeeNumber: string; person: { firstName: string; lastName: string } };
}

interface EmployeeOption {
  id: string;
  employeeNumber: string;
  person: { firstName: string; lastName: string };
}

export default function IpmAdherentsPage() {
  const { data: beneficiaries, mutate } = useSWR<Beneficiary[]>('/ipm/beneficiaries', fetcher);
  const { data: employees } = useSWR<EmployeeOption[]>('/rh/employees', fetcher);
  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [coverageRatePercent, setCoverageRatePercent] = useState(80);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const alreadyAdherent = new Set(beneficiaries?.map((b) => b.employee.employeeNumber));
  const eligibleEmployees = employees?.filter((e) => !alreadyAdherent.has(e.employeeNumber)) ?? [];

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/ipm/beneficiaries', { employeeId, coverageRatePercent });
      setShowForm(false);
      setEmployeeId('');
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'activation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Adhérents IPM</h1>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : '+ Activer un adhérent'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={activate} className="card space-y-4">
          <div>
            <label className="label">Employé</label>
            <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
              <option value="">Sélectionner…</option>
              {eligibleEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.person.firstName} {emp.person.lastName} ({emp.employeeNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Taux de couverture (%)</label>
            <input
              className="input w-32"
              type="number"
              min={0}
              max={100}
              value={coverageRatePercent}
              onChange={(e) => setCoverageRatePercent(parseInt(e.target.value, 10))}
            />
          </div>
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <button className="btn" type="submit" disabled={submitting}>
            Activer la carte IPM
          </button>
        </form>
      )}

      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>Employé</th>
              <th>N° carte</th>
              <th>Couverture</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {beneficiaries?.map((b) => (
              <tr key={b.id}>
                <td>
                  {b.employee.person.firstName} {b.employee.person.lastName} ({b.employee.employeeNumber})
                </td>
                <td className="font-mono text-xs">{b.cardNumber}</td>
                <td>{b.coverageRatePercent}%</td>
                <td>
                  <span className={`badge ${IPM_CARD_STATUS_BADGE[b.effectiveCardStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                    {IPM_CARD_STATUS_LABELS[b.effectiveCardStatus] ?? b.effectiveCardStatus}
                  </span>
                </td>
                <td>
                  <Link href={`/app/ipm/adherents/${b.id}`} className="text-praxis-700 hover:underline">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
            {beneficiaries?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  Aucun adhérent IPM.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
