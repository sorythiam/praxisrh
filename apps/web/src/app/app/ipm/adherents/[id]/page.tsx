'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';
import {
  IPM_CARD_STATUS_BADGE,
  IPM_CARD_STATUS_LABELS,
  IPM_CASE_STATUS_BADGE,
  IPM_CASE_STATUS_LABELS,
  IPM_CAP_CATEGORY_LABELS,
  IPM_DEPENDENT_RELATIONSHIP_LABELS,
  fcfa,
} from '@/lib/ipm-labels';

interface Beneficiary {
  id: string;
  cardNumber: string;
  coverageRatePercent: number;
  effectiveCardStatus: string;
  cardStatus: string;
  suspensionReason?: string | null;
  employee: { employeeNumber: string; person: { firstName: string; lastName: string } };
}

interface Dependent {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  cardNumber: string;
  isActive: boolean;
}

interface Contribution {
  id: string;
  periodYear: number;
  periodMonth: number;
  assietteFcfa: number;
  employerShareFcfa: number;
  employeeShareFcfa: number;
  status: string;
}

interface ReimbursementCase {
  id: string;
  category: string;
  invoiceNumber: string;
  amountClaimedFcfa: number;
  amountApprovedFcfa: number | null;
  status: string;
  createdAt: string;
}

export default function AdherentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: beneficiary, mutate } = useSWR<Beneficiary>(`/ipm/beneficiaries/${id}`, fetcher);
  const { data: dependents, mutate: mutateDependents } = useSWR<Dependent[]>(`/ipm/beneficiaries/${id}/dependents`, fetcher);
  const { data: contributions } = useSWR<Contribution[]>(`/ipm/contributions/beneficiaries/${id}`, fetcher);
  const { data: cases } = useSWR<ReimbursementCase[]>(`/ipm/reimbursements/beneficiaries/${id}/history`, fetcher);

  const [showDependentForm, setShowDependentForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [relationship, setRelationship] = useState('ENFANT');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addDependent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/ipm/beneficiaries/${id}/dependents`, {
        firstName,
        lastName,
        relationship,
        dateOfBirth: dateOfBirth || undefined,
      });
      setShowDependentForm(false);
      setFirstName('');
      setLastName('');
      setDateOfBirth('');
      mutateDependents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'ajout.");
    }
  }

  async function suspend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.patch(`/ipm/beneficiaries/${id}/suspend`, { reason: suspendReason });
      setShowSuspendForm(false);
      setSuspendReason('');
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la suspension.');
    }
  }

  async function reactivate() {
    setError(null);
    try {
      await api.patch(`/ipm/beneficiaries/${id}/reactivate`);
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la réactivation.');
    }
  }

  if (!beneficiary) return <div className="text-gray-500">Chargement…</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {beneficiary.employee.person.firstName} {beneficiary.employee.person.lastName}
        </h1>
        <p className="text-sm text-gray-500">Matricule {beneficiary.employee.employeeNumber}</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Carte IPM</h2>
          <span className={`badge ${IPM_CARD_STATUS_BADGE[beneficiary.effectiveCardStatus] ?? 'bg-gray-100 text-gray-700'}`}>
            {IPM_CARD_STATUS_LABELS[beneficiary.effectiveCardStatus] ?? beneficiary.effectiveCardStatus}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">N° carte : </span>
            <span className="font-mono">{beneficiary.cardNumber}</span>
          </div>
          <div>
            <span className="text-gray-500">Taux de couverture : </span>
            {beneficiary.coverageRatePercent}%
          </div>
        </div>
        {beneficiary.suspensionReason && (
          <p className="text-sm text-amber-700">Motif de suspension : {beneficiary.suspensionReason}</p>
        )}
        <div className="flex gap-3 pt-2">
          {beneficiary.cardStatus === 'ACTIVE' ? (
            <button className="btn-secondary" onClick={() => setShowSuspendForm((v) => !v)}>
              Suspendre
            </button>
          ) : (
            <button className="btn-secondary" onClick={reactivate}>
              Réactiver
            </button>
          )}
        </div>
        {showSuspendForm && (
          <form onSubmit={suspend} className="flex gap-3 border-t border-gray-100 pt-3">
            <input
              className="input"
              placeholder="Motif de suspension"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              required
            />
            <button className="btn-danger shrink-0" type="submit">
              Confirmer
            </button>
          </form>
        )}
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Ayants droit</h2>
          <button className="btn" onClick={() => setShowDependentForm((v) => !v)}>
            {showDependentForm ? 'Annuler' : '+ Ajouter un ayant droit'}
          </button>
        </div>
        {showDependentForm && (
          <form onSubmit={addDependent} className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            <input className="input" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            <select className="input" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
              {Object.entries(IPM_DEPENDENT_RELATIONSHIP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input className="input" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            <button className="btn col-span-2" type="submit">
              Ajouter
            </button>
          </form>
        )}
        <table className="table-base">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Lien</th>
              <th>N° carte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dependents?.map((d) => (
              <tr key={d.id}>
                <td>
                  {d.firstName} {d.lastName}
                </td>
                <td>{IPM_DEPENDENT_RELATIONSHIP_LABELS[d.relationship] ?? d.relationship}</td>
                <td className="font-mono text-xs">{d.cardNumber}</td>
              </tr>
            ))}
            {dependents?.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-gray-400">
                  Aucun ayant droit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Historique des cotisations</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Période</th>
              <th>Assiette</th>
              <th>Part employeur</th>
              <th>Part salarié</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contributions?.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.periodMonth}/{c.periodYear}
                </td>
                <td>{fcfa(c.assietteFcfa)}</td>
                <td>{fcfa(c.employerShareFcfa)}</td>
                <td>{fcfa(c.employeeShareFcfa)}</td>
                <td>{c.status}</td>
              </tr>
            ))}
            {contributions?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">
                  Aucune cotisation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Historique des dossiers de remboursement</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Facture</th>
              <th>Montant réclamé</th>
              <th>Montant approuvé</th>
              <th>Statut</th>
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
              </tr>
            ))}
            {cases?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">
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
