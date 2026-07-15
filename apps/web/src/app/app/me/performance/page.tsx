'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';

export default function MyPerformancePage() {
  const { data: objectives } = useSWR<any[]>('/rh/performance/me/objectives', fetcher);
  const { data: feedback } = useSWR<any[]>('/rh/performance/me/feedback', fetcher);
  const { data: reviews } = useSWR<any[]>('/rh/performance/me/reviews', fetcher);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Ma performance</h1>

      <div className="card">
        <h2 className="font-semibold">Mes objectifs</h2>
        <ul className="mt-3 space-y-3">
          {objectives?.map((o: any) => (
            <li key={o.id} className="rounded-md border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{o.title}</span>
                <span className="badge bg-gray-100 text-gray-700">{o.status}</span>
              </div>
              <div className="text-xs text-gray-500">{o.periodLabel}</div>
              {o.keyResults.map((kr: any) => (
                <div key={kr.id} className="mt-1 text-sm">
                  {kr.description}: {kr.currentValue}/{kr.targetValue} {kr.unit}
                </div>
              ))}
            </li>
          ))}
          {objectives?.length === 0 && <li className="text-gray-400">Aucun objectif pour le moment.</li>}
        </ul>
      </div>

      <div className="card">
        <h2 className="font-semibold">Feedback reçu</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {feedback?.map((f: any) => (
            <li key={f.id} className="border-b border-gray-100 pb-2">
              <span className="badge bg-gray-100 text-gray-700">{f.type}</span> {f.content}
              <div className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleDateString('fr-FR')}</div>
            </li>
          ))}
          {feedback?.length === 0 && <li className="text-gray-400">Aucun feedback reçu pour le moment.</li>}
        </ul>
      </div>

      <div className="card">
        <h2 className="font-semibold">Mes évaluations</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {reviews?.map((r: any) => (
            <li key={r.id} className="border-b border-gray-100 pb-2">
              <div className="font-medium">{r.reviewCycle.periodLabel}</div>
              <div>Auto-évaluation : {r.selfScore ?? '—'} · Manager : {r.managerScore ?? '—'} · Calibré : {r.calibratedScore ?? '—'}</div>
              {r.managerComments && <div className="text-gray-500">{r.managerComments}</div>}
            </li>
          ))}
          {reviews?.length === 0 && <li className="text-gray-400">Aucune évaluation pour le moment.</li>}
        </ul>
      </div>
    </div>
  );
}
