'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';

export default function RecruitmentPage() {
  const { data: postings, mutate } = useSWR<any[]>('/rh/recruitment/postings', fetcher);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/rh/recruitment/postings', { title, department, description });
      setShowForm(false);
      setTitle('');
      setDepartment('');
      setDescription('');
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur.');
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recrutement</h1>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : "+ Offre d'emploi"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="label">Titre du poste</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Département</label>
            <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <button className="btn" type="submit">
            Publier l&apos;offre
          </button>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Département</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {postings?.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.department ?? '—'}</td>
                <td>{p.status}</td>
                <td>
                  <Link href={`/app/recruitment/${p.id}`} className="text-praxis-700 hover:underline">
                    Voir le pipeline
                  </Link>
                </td>
              </tr>
            ))}
            {postings?.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  Aucune offre publiée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
