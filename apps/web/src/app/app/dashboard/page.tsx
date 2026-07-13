'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';

export default function DashboardPage() {
  const { data } = useSWR<any>('/rh/dashboard/overview', fetcher);

  if (!data) return <div className="text-gray-500">Chargement…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tableau de bord RH</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Effectif total" value={data.headcount.total} />
        <Stat label="Actifs" value={data.headcount.active} />
        <Stat label="Onboarding" value={data.headcount.onboarding} />
        <Stat label="Turnover 12 mois" value={`${data.turnoverRate}%`} />
      </div>

      <div className="card">
        <h2 className="font-semibold">Masse salariale (dernière paie)</h2>
        <p className="mt-2 text-2xl font-bold">{data.massSalarialeFcfa.toLocaleString('fr-FR')} FCFA</p>
        {data.lastPayrollPeriod && (
          <p className="text-sm text-gray-500">
            Période {data.lastPayrollPeriod.month}/{data.lastPayrollPeriod.year}
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold">Pyramide des âges</h2>
        <div className="mt-4 space-y-2">
          {Object.entries(data.ageBuckets).map(([bucket, count]) => (
            <div key={bucket} className="flex items-center gap-3">
              <span className="w-16 text-sm text-gray-500">{bucket}</span>
              <div className="h-4 flex-1 rounded bg-gray-100">
                <div
                  className="h-4 rounded bg-praxis-500"
                  style={{ width: `${Math.min(100, ((count as number) / Math.max(1, data.headcount.total)) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right text-sm">{count as number}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
