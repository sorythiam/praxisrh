'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, fetcher } from '@/lib/api-client';

export default function MyTalentsPage() {
  const { data: competences } = useSWR<any[]>('/rh/talents/me/competences', fetcher);
  const { data: eligiblePostes, mutate: mutateEligible } = useSWR<any[]>('/rh/talents/me/eligible-postes', fetcher);
  const { data: developmentPlan } = useSWR<any>('/rh/talents/me/development-plan', fetcher);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  async function apply(posteId: string) {
    await api.post(`/rh/talents/postes/${posteId}/apply`, {});
    setAppliedIds((prev) => new Set(prev).add(posteId));
    mutateEligible();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Mon évolution</h1>

      <div className="card">
        <h2 className="font-semibold">Mes compétences</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {competences?.map((c: any) => (
            <li key={c.id} className="flex justify-between">
              <span>{c.competence.name}</span>
              <span className="text-gray-500">Niveau {c.level}/5</span>
            </li>
          ))}
          {competences?.length === 0 && <li className="text-gray-400">Aucune compétence évaluée pour le moment.</li>}
        </ul>
      </div>

      {developmentPlan && (
        <div className="card">
          <h2 className="font-semibold">Mon plan de développement</h2>
          <p className="mt-2 text-sm">{developmentPlan.goals}</p>
          {developmentPlan.recommendedActions?.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {developmentPlan.recommendedActions.map((a: any, i: number) => (
                <li key={i}>• {a.label}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold">Postes internes ouverts</h2>
        <p className="text-sm text-gray-500">Classés selon votre correspondance de compétences.</p>
        <ul className="mt-3 space-y-3">
          {eligiblePostes?.map(({ poste, eligibility }: any) => (
            <li key={poste.id} className="rounded-md border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{poste.title}</div>
                  <div className="text-sm text-gray-500">{poste.department}</div>
                </div>
                <span className="badge bg-praxis-50 text-praxis-700">{eligibility.matchPercent}% de correspondance</span>
              </div>
              {eligibility.missing.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Compétences à développer :{' '}
                  {eligibility.missing.map((m: any) => `${m.competenceName} (niveau ${m.currentLevel} → ${m.requiredLevel})`).join(', ')}
                </div>
              )}
              <button
                className="btn-secondary mt-2 text-sm"
                disabled={appliedIds.has(poste.id)}
                onClick={() => apply(poste.id)}
              >
                {appliedIds.has(poste.id) ? 'Candidature envoyée' : 'Me positionner'}
              </button>
            </li>
          ))}
          {eligiblePostes?.length === 0 && <li className="text-gray-400">Aucun poste interne ouvert actuellement.</li>}
        </ul>
      </div>
    </div>
  );
}
