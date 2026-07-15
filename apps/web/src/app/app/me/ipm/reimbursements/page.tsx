'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';
import { IPM_CAP_CATEGORY_LABELS, IPM_CASE_STATUS_BADGE, IPM_CASE_STATUS_LABELS, fcfa } from '@/lib/ipm-labels';

interface ReimbursementCase {
  id: string;
  category: string;
  invoiceNumber: string;
  amountClaimedFcfa: number;
  amountApprovedFcfa: number | null;
  status: string;
  createdAt: string;
}

interface Beneficiary {
  dependents: { id: string; firstName: string; lastName: string }[];
}

export default function MyIpmReimbursementsPage() {
  const { data: cases, mutate } = useSWR<ReimbursementCase[]>('/ipm/reimbursements/me', fetcher);
  const { data: beneficiary } = useSWR<Beneficiary>('/ipm/beneficiaries/me', fetcher);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('PHARMACIE');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [providerName, setProviderName] = useState('');
  const [amountClaimedFcfa, setAmountClaimedFcfa] = useState(0);
  const [dependentId, setDependentId] = useState('');
  const [justifiesAbsenceFrom, setJustifiesAbsenceFrom] = useState('');
  const [justifiesAbsenceTo, setJustifiesAbsenceTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/ipm/reimbursements/me', {
        category,
        invoiceNumber,
        providerName: providerName || undefined,
        amountClaimedFcfa,
        dependentId: dependentId || undefined,
        justifiesAbsenceFrom: justifiesAbsenceFrom || undefined,
        justifiesAbsenceTo: justifiesAbsenceTo || undefined,
      });
      setShowForm(false);
      setInvoiceNumber('');
      setProviderName('');
      setAmountClaimedFcfa(0);
      setDependentId('');
      setJustifiesAbsenceFrom('');
      setJustifiesAbsenceTo('');
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mes demandes de remboursement</h1>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : '+ Nouvelle demande'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card grid grid-cols-2 gap-3">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(IPM_CAP_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className="input" value={dependentId} onChange={(e) => setDependentId(e.target.value)}>
            <option value="">Pour moi-même</option>
            {beneficiary?.dependents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.firstName} {d.lastName}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Numéro de facture"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            required
          />
          <input className="input" placeholder="Prestataire" value={providerName} onChange={(e) => setProviderName(e.target.value)} />
          <input
            className="input"
            type="number"
            placeholder="Montant réclamé (FCFA)"
            value={amountClaimedFcfa}
            onChange={(e) => setAmountClaimedFcfa(parseInt(e.target.value, 10))}
            required
          />
          <div />
          <div>
            <label className="label">Absence justifiée du (optionnel)</label>
            <input className="input" type="date" value={justifiesAbsenceFrom} onChange={(e) => setJustifiesAbsenceFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Au</label>
            <input className="input" type="date" value={justifiesAbsenceTo} onChange={(e) => setJustifiesAbsenceTo(e.target.value)} />
          </div>
          {error && <div className="col-span-2 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <button className="btn col-span-2" type="submit" disabled={submitting}>
            Soumettre la demande
          </button>
        </form>
      )}

      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Facture</th>
              <th>Montant réclamé</th>
              <th>Montant remboursé</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cases?.map((c) => (
              <tr key={c.id}>
                <td>{IPM_CAP_CATEGORY_LABELS[c.category] ?? c.category}</td>
                <td>{c.invoiceNumber}</td>
                <td>{fcfa(c.amountClaimedFcfa)}</td>
                <td>{fcfa(c.amountApprovedFcfa)}</td>
                <td>
                  <span className={`badge ${IPM_CASE_STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {IPM_CASE_STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </td>
                <td>
                  <Link href={`/app/me/ipm/reimbursements/${c.id}`} className="text-praxis-700 hover:underline">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
            {cases?.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
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
