'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ContractType, EmploymentCategory } from '@praxis/shared';
import { api, ApiError, fetcher } from '@/lib/api-client';

const STAGE_LABELS: Record<string, string> = {
  APPLIED: 'Candidature reçue',
  SCREENING: 'Présélection',
  INTERVIEW: 'Entretien',
  OFFER: 'Offre',
  HIRED: 'Embauché(e)',
  REJECTED: 'Rejeté(e)',
};
const STAGE_ORDER = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED'];

export default function PostingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: posting } = useSWR<any>(`/rh/recruitment/postings/${id}`, fetcher);
  const { data: applications, mutate } = useSWR<any[]>(`/rh/recruitment/postings/${id}/applications`, fetcher);
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [hiringApplicationId, setHiringApplicationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStage(applicationId: string, stage: string) {
    setError(null);
    try {
      await api.patch(`/rh/recruitment/applications/${applicationId}/stage`, { stage });
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur.');
    }
  }

  if (!posting) return <div className="text-gray-500">Chargement…</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={() => router.back()} className="text-sm text-praxis-700">
        ← Retour
      </button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{posting.title}</h1>
        <button className="btn" onClick={() => setShowCandidateForm((v) => !v)}>
          {showCandidateForm ? 'Annuler' : '+ Candidature'}
        </button>
      </div>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showCandidateForm && (
        <NewCandidateForm
          postingId={id}
          onError={setError}
          onCreated={() => {
            setShowCandidateForm(false);
            mutate();
          }}
        />
      )}

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Candidat</th>
              <th>Contact</th>
              <th>Étape</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {applications?.map((a: any) => (
              <tr key={a.id}>
                <td>
                  {a.candidate.firstName} {a.candidate.lastName}
                </td>
                <td>{a.candidate.email ?? a.candidate.phone ?? '—'}</td>
                <td>{STAGE_LABELS[a.stage] ?? a.stage}</td>
                <td className="space-x-2">
                  {a.stage !== 'HIRED' && a.stage !== 'REJECTED' && (
                    <>
                      {STAGE_ORDER.filter((s) => s !== a.stage && s !== 'REJECTED').map((s) => (
                        <button key={s} className="text-praxis-700 hover:underline" onClick={() => setStage(a.id, s)}>
                          {STAGE_LABELS[s]}
                        </button>
                      ))}
                      <button className="text-praxis-700 hover:underline" onClick={() => setHiringApplicationId(a.id)}>
                        Embaucher
                      </button>
                      <button className="text-red-600 hover:underline" onClick={() => setStage(a.id, 'REJECTED')}>
                        Rejeter
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {applications?.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  Aucune candidature.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hiringApplicationId && (
        <HireForm
          applicationId={hiringApplicationId}
          onError={setError}
          onDone={() => {
            setHiringApplicationId(null);
            mutate();
          }}
        />
      )}
    </div>
  );
}

function NewCandidateForm({ postingId, onCreated, onError }: { postingId: string; onCreated: () => void; onError: (e: string | null) => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    try {
      await api.post(`/rh/recruitment/postings/${postingId}/applications`, { firstName, lastName, email, phone });
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Erreur.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="card flex flex-wrap items-end gap-3">
      <div>
        <label className="label">Prénom</label>
        <input className="input" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </div>
      <div>
        <label className="label">Nom</label>
        <input className="input" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <div>
        <label className="label">Email</label>
        <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label">Téléphone</label>
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <button className="btn" type="submit">
        Ajouter la candidature
      </button>
    </form>
  );
}

function HireForm({ applicationId, onDone, onError }: { applicationId: string; onDone: () => void; onError: (e: string | null) => void }) {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [position, setPosition] = useState('');
  const [employmentCategory, setEmploymentCategory] = useState<EmploymentCategory>(EmploymentCategory.EMPLOYE);
  const [hireDate, setHireDate] = useState('');
  const [contractType, setContractType] = useState<ContractType>(ContractType.CDI);
  const [baseSalaryFcfa, setBaseSalaryFcfa] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    try {
      await api.post(`/rh/recruitment/applications/${applicationId}/hire`, {
        employeeNumber,
        position,
        employmentCategory,
        hireDate,
        contractType,
        baseSalaryFcfa,
      });
      onDone();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Erreur lors de l'embauche.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <h2 className="font-semibold">Convertir en employé</h2>
      <p className="text-sm text-gray-500">Nom, email et téléphone sont repris du dossier candidat — aucune ressaisie.</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Matricule</label>
          <input className="input" required value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />
        </div>
        <div>
          <label className="label">Poste</label>
          <input className="input" required value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div>
          <label className="label">Catégorie</label>
          <select className="input" value={employmentCategory} onChange={(e) => setEmploymentCategory(e.target.value as EmploymentCategory)}>
            {Object.values(EmploymentCategory).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Type de contrat</label>
          <select className="input" value={contractType} onChange={(e) => setContractType(e.target.value as ContractType)}>
            {Object.values(ContractType).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date d&apos;embauche</label>
          <input type="date" className="input" required value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Salaire de base (FCFA)</label>
          <input type="number" className="input" required value={baseSalaryFcfa} onChange={(e) => setBaseSalaryFcfa(parseInt(e.target.value || '0', 10))} />
        </div>
      </div>
      <button className="btn" type="submit">
        Confirmer l&apos;embauche
      </button>
    </form>
  );
}
