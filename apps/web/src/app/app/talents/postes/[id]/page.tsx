'use client';

import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api, fetcher } from '@/lib/api-client';

export default function PosteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: poste } = useSWR<any>(`/rh/talents/postes/${id}`, fetcher);
  const { data: applications, mutate: mutateApplications } = useSWR<any[]>(`/rh/talents/postes/${id}/applications`, fetcher);
  const { data: successionPlan, mutate: mutateSuccession } = useSWR<any>(
    poste?.isKeyRole ? `/rh/talents/postes/${id}/succession-plan` : null,
    fetcher,
    { shouldRetryOnError: false },
  );
  const { data: suggestions } = useSWR<any[]>(
    poste?.isKeyRole ? `/rh/talents/postes/${id}/succession-suggestions` : null,
    fetcher,
  );

  if (!poste) return <div className="text-gray-500">Chargement…</div>;

  async function decide(applicationId: string, status: string) {
    await api.patch(`/rh/talents/applications/${applicationId}`, { status });
    mutateApplications();
  }

  async function createSuccessionPlan() {
    await api.post(`/rh/talents/postes/${id}/succession-plan`, {});
    mutateSuccession();
  }

  async function addCandidate(employeeId: string) {
    if (!successionPlan) return;
    await api.post(`/rh/talents/succession-plans/${successionPlan.id}/candidates`, { employeeId, readiness: 'DEVELOPING' });
    mutateSuccession();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={() => router.back()} className="text-sm text-praxis-700">
        ← Retour
      </button>
      <div className="card">
        <h1 className="text-xl font-bold">{poste.title}</h1>
        <p className="text-sm text-gray-500">{poste.department}</p>
        {poste.description && <p className="mt-2 text-sm">{poste.description}</p>}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-600">Compétences requises</h3>
          <ul className="mt-1 text-sm">
            {poste.requirements.map((r: any) => (
              <li key={r.id}>
                {r.competence.name} — niveau {r.requiredLevel}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold">Candidatures internes</h2>
        <table className="table-base mt-3">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Statut</th>
              <th>Message</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {applications?.map((a: any) => (
              <tr key={a.id}>
                <td>
                  {a.employee.person.firstName} {a.employee.person.lastName}
                </td>
                <td>{a.status}</td>
                <td>{a.message ?? '—'}</td>
                <td className="space-x-2">
                  <button className="text-praxis-700 hover:underline" onClick={() => decide(a.id, 'EN_EVALUATION')}>
                    En évaluation
                  </button>
                  <button className="text-praxis-700 hover:underline" onClick={() => decide(a.id, 'RETENU')}>
                    Retenu
                  </button>
                  <button className="text-red-600 hover:underline" onClick={() => decide(a.id, 'REJETE')}>
                    Rejeté
                  </button>
                </td>
              </tr>
            ))}
            {applications?.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-400">
                  Aucune candidature pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {poste.isKeyRole && (
        <div className="card">
          <h2 className="font-semibold">Plan de succession (poste clé)</h2>
          {!successionPlan ? (
            <button className="btn mt-3" onClick={createSuccessionPlan}>
              Créer le plan de succession
            </button>
          ) : (
            <>
              <table className="table-base mt-3">
                <thead>
                  <tr>
                    <th>Candidat</th>
                    <th>Préparation</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {successionPlan.candidates.map((c: any) => (
                    <tr key={c.id}>
                      <td>
                        {c.employee.person.firstName} {c.employee.person.lastName}
                      </td>
                      <td>{c.readiness}</td>
                      <td>{c.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="mt-4 text-sm font-semibold text-gray-600">Suggestions (par correspondance de compétences)</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {suggestions?.map((s: any) => (
                  <li key={s.employee.id} className="flex items-center justify-between">
                    <span>
                      {s.employee.person.firstName} {s.employee.person.lastName} — {s.eligibility.matchPercent}% de
                      correspondance
                    </span>
                    <button className="text-praxis-700 hover:underline" onClick={() => addCandidate(s.employee.id)}>
                      Ajouter au plan
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
