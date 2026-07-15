'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';
import {
  IPM_CAP_CATEGORY_LABELS,
  IPM_CASE_STATUS_BADGE,
  IPM_CASE_STATUS_LABELS,
  fcfa,
} from '@/lib/ipm-labels';

interface ReimbursementCase {
  id: string;
  category: string;
  invoiceNumber: string;
  amountClaimedFcfa: number;
  amountApprovedFcfa: number | null;
  status: string;
  createdAt: string;
  beneficiary: { cardNumber: string; employee: { person: { firstName: string; lastName: string } } };
}

interface AnnualCap {
  category: string;
  annualCapFcfa: number;
}

const STATUS_FILTERS = ['', 'SUBMITTED', 'PENDING_MEDICAL_REVIEW', 'APPROVED', 'REJECTED', 'PAID'];

export default function DossiersPage() {
  const [status, setStatus] = useState('');
  const { data: cases } = useSWR<ReimbursementCase[]>(`/ipm/reimbursements${status ? `?status=${status}` : ''}`, fetcher);
  const { data: caps, mutate: mutateCaps } = useSWR<AnnualCap[]>('/ipm/reimbursements/caps', fetcher);
  const [showCapForm, setShowCapForm] = useState(false);
  const [capCategory, setCapCategory] = useState('DENTAIRE');
  const [capAmount, setCapAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function setCap(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/ipm/reimbursements/caps', { category: capCategory, annualCapFcfa: capAmount });
      setShowCapForm(false);
      mutateCaps();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur.');
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">Dossiers de remboursement IPM</h1>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Plafonds annuels par catégorie</h2>
          <button className="btn-secondary" onClick={() => setShowCapForm((v) => !v)}>
            {showCapForm ? 'Annuler' : '+ Définir un plafond'}
          </button>
        </div>
        {showCapForm && (
          <form onSubmit={setCap} className="flex flex-wrap items-end gap-3">
            <select className="input" value={capCategory} onChange={(e) => setCapCategory(e.target.value)}>
              {Object.entries(IPM_CAP_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              className="input w-40"
              type="number"
              placeholder="Plafond FCFA"
              value={capAmount}
              onChange={(e) => setCapAmount(parseInt(e.target.value, 10))}
              required
            />
            <button className="btn" type="submit">
              Enregistrer
            </button>
          </form>
        )}
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="flex flex-wrap gap-2">
          {caps?.map((c) => (
            <span key={c.category} className="badge bg-gray-100 text-gray-700">
              {IPM_CAP_CATEGORY_LABELS[c.category] ?? c.category}: {fcfa(c.annualCapFcfa)}
            </span>
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">Dossiers</h2>
          <select className="input w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === '' ? 'Tous les statuts' : IPM_CASE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <table className="table-base">
          <thead>
            <tr>
              <th>Adhérent</th>
              <th>Catégorie</th>
              <th>Facture</th>
              <th>Montant réclamé</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cases?.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.beneficiary.employee.person.firstName} {c.beneficiary.employee.person.lastName}
                </td>
                <td>{IPM_CAP_CATEGORY_LABELS[c.category] ?? c.category}</td>
                <td>{c.invoiceNumber}</td>
                <td>{fcfa(c.amountClaimedFcfa)}</td>
                <td>
                  <span className={`badge ${IPM_CASE_STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {IPM_CASE_STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </td>
                <td>
                  <Link href={`/app/ipm/dossiers/${c.id}`} className="text-praxis-700 hover:underline">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
            {cases?.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  Aucun dossier.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
