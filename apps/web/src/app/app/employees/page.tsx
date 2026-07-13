'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ContractType, EmploymentCategory } from '@praxis/shared';
import { api, ApiError, fetcher } from '@/lib/api-client';

interface EmployeeRow {
  id: string;
  employeeNumber: string;
  position: string;
  status: string;
  person: { firstName: string; lastName: string; email?: string; phone?: string };
  contracts: { baseSalaryFcfa: number; type: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  ONBOARDING: 'Onboarding',
  ACTIVE: 'Actif',
  ON_LEAVE: 'En congé',
  SUSPENDED: 'Suspendu',
  OFFBOARDING: 'Offboarding',
  TERMINATED: 'Sorti',
};

export default function EmployeesPage() {
  const { data: employees, mutate } = useSWR<EmployeeRow[]>('/rh/employees', fetcher);
  const { data: alerts } = useSWR<any[]>('/rh/employees/alerts', fetcher);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employés</h1>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : '+ Nouvel employé'}
        </button>
      </div>

      {alerts && alerts.length > 0 && (
        <div className="card border-amber-200 bg-amber-50">
          <h2 className="font-semibold text-amber-800">Radar de conformité</h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {alerts.map((a, i) => (
              <li key={i}>
                <span className="font-medium">{a.employeeName}</span> — {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showForm && (
        <NewEmployeeForm
          onCreated={() => {
            setShowForm(false);
            mutate();
          }}
        />
      )}

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Nom</th>
              <th>Poste</th>
              <th>Salaire base</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees?.map((e) => (
              <tr key={e.id}>
                <td>{e.employeeNumber}</td>
                <td>
                  {e.person.firstName} {e.person.lastName}
                </td>
                <td>{e.position}</td>
                <td>{e.contracts[0]?.baseSalaryFcfa?.toLocaleString('fr-FR')} FCFA</td>
                <td>
                  <span className="badge bg-gray-100 text-gray-700">{STATUS_LABELS[e.status] ?? e.status}</span>
                </td>
                <td>
                  <Link href={`/app/employees/${e.id}`} className="text-praxis-700 hover:underline">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
            {employees?.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  Aucun employé pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewEmployeeForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    employeeNumber: '',
    position: '',
    employmentCategory: EmploymentCategory.EMPLOYE,
    hireDate: '',
    contractType: ContractType.CDI,
    baseSalaryFcfa: 0,
    mobileMoneyProvider: 'WAVE',
    mobileMoneyNumber: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/rh/employees', form);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <h2 className="font-semibold">Nouvel employé</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Prénom</label>
          <input className="input" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </div>
        <div>
          <label className="label">Nom</label>
          <input className="input" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="label">Matricule</label>
          <input className="input" required value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} />
        </div>
        <div>
          <label className="label">Poste</label>
          <input className="input" required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        </div>
        <div>
          <label className="label">Catégorie</label>
          <select
            className="input"
            value={form.employmentCategory}
            onChange={(e) => setForm({ ...form, employmentCategory: e.target.value as EmploymentCategory })}
          >
            {Object.values(EmploymentCategory).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Type de contrat</label>
          <select
            className="input"
            value={form.contractType}
            onChange={(e) => setForm({ ...form, contractType: e.target.value as ContractType })}
          >
            {Object.values(ContractType).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date d&apos;embauche</label>
          <input type="date" className="input" required value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
        </div>
        <div>
          <label className="label">Salaire de base (FCFA)</label>
          <input
            type="number"
            className="input"
            required
            value={form.baseSalaryFcfa}
            onChange={(e) => setForm({ ...form, baseSalaryFcfa: parseInt(e.target.value || '0', 10) })}
          />
        </div>
        <div>
          <label className="label">Opérateur mobile money</label>
          <select className="input" value={form.mobileMoneyProvider} onChange={(e) => setForm({ ...form, mobileMoneyProvider: e.target.value })}>
            <option value="WAVE">Wave</option>
            <option value="ORANGE_MONEY">Orange Money</option>
          </select>
        </div>
        <div>
          <label className="label">Numéro mobile money</label>
          <input className="input" value={form.mobileMoneyNumber} onChange={(e) => setForm({ ...form, mobileMoneyNumber: e.target.value })} />
        </div>
      </div>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? 'Création…' : 'Créer le compte employé'}
      </button>
    </form>
  );
}
