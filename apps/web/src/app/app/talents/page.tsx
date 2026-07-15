'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';

export default function TalentsAdminPage() {
  const { data: competences, mutate: mutateCompetences } = useSWR<any[]>('/rh/talents/competences', fetcher);
  const { data: postes, mutate: mutatePostes } = useSWR<any[]>('/rh/talents/postes', fetcher);
  const [newCompetence, setNewCompetence] = useState('');
  const [showPosteForm, setShowPosteForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addCompetence(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompetence.trim()) return;
    await api.post('/rh/talents/competences', { name: newCompetence });
    setNewCompetence('');
    mutateCompetences();
  }

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold">Talents & évolution de carrière</h1>

      <section className="card space-y-4">
        <h2 className="font-semibold">Référentiel de compétences</h2>
        <form onSubmit={addCompetence} className="flex gap-3">
          <input className="input" placeholder="Nouvelle compétence (ex: Service client)" value={newCompetence} onChange={(e) => setNewCompetence(e.target.value)} />
          <button className="btn" type="submit">
            Ajouter
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {competences?.map((c) => (
            <span key={c.id} className="badge bg-gray-100 text-gray-700">
              {c.name}
            </span>
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Postes internes</h2>
          <button className="btn" onClick={() => setShowPosteForm((v) => !v)}>
            {showPosteForm ? 'Annuler' : '+ Poste interne'}
          </button>
        </div>

        {showPosteForm && (
          <NewPosteForm
            competences={competences ?? []}
            onError={setError}
            onCreated={() => {
              setShowPosteForm(false);
              mutatePostes();
            }}
          />
        )}
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <table className="table-base">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Département</th>
              <th>Poste clé</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {postes?.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.department ?? '—'}</td>
                <td>{p.isKeyRole ? 'Oui' : 'Non'}</td>
                <td>{p.status}</td>
                <td>
                  <Link href={`/app/talents/postes/${p.id}`} className="text-praxis-700 hover:underline">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
            {postes?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  Aucun poste interne.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function NewPosteForm({
  competences,
  onCreated,
  onError,
}: {
  competences: any[];
  onCreated: () => void;
  onError: (e: string | null) => void;
}) {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [isKeyRole, setIsKeyRole] = useState(false);
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState<{ competenceId: string; requiredLevel: number }[]>([]);

  function addRequirement() {
    if (competences.length === 0) return;
    setRequirements((prev) => [...prev, { competenceId: competences[0].id, requiredLevel: 3 }]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    try {
      await api.post('/rh/talents/postes', { title, department, isKeyRole, description, requirements });
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Erreur lors de la création.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-md border border-gray-200 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Titre du poste</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Département</label>
          <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isKeyRole} onChange={(e) => setIsKeyRole(e.target.checked)} />
        Poste clé (nécessite un plan de succession)
      </label>

      <div>
        <div className="flex items-center justify-between">
          <label className="label mb-0">Compétences requises</label>
          <button type="button" className="btn-secondary text-xs" onClick={addRequirement}>
            + Ajouter
          </button>
        </div>
        {requirements.map((r, i) => (
          <div key={i} className="mt-2 flex items-center gap-3">
            <select
              className="input"
              value={r.competenceId}
              onChange={(e) => {
                const next = [...requirements];
                next[i] = { ...next[i], competenceId: e.target.value };
                setRequirements(next);
              }}
            >
              {competences.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="input w-32"
              value={r.requiredLevel}
              onChange={(e) => {
                const next = [...requirements];
                next[i] = { ...next[i], requiredLevel: parseInt(e.target.value, 10) };
                setRequirements(next);
              }}
            >
              {[1, 2, 3, 4, 5].map((lvl) => (
                <option key={lvl} value={lvl}>
                  Niveau {lvl}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button type="submit" className="btn">
        Créer le poste
      </button>
    </form>
  );
}
