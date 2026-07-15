'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { getToken } from '@/lib/api-client';
import { IPM_CAP_CATEGORY_LABELS, fcfa } from '@/lib/ipm-labels';

interface Overview {
  activeBeneficiaries: number;
  totalContributionsFcfa: number;
  totalPrestationsFcfa: number;
  sinistraliteRatio: number | null;
  topCategories: { category: string; amountFcfa: number }[];
  pendingCasesCount: number;
}

function downloadExport(path: string) {
  const token = getToken();
  const url = new URL(`/api${path}`, window.location.origin);
  fetch(url.toString(), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then(async (res) => {
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match?.[1] ?? 'export.csv';
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(a.href);
    })
    .catch(() => alert("Échec de l'export."));
}

export default function IpmDashboardPage() {
  const { data: overview } = useSWR<Overview>('/ipm/dashboard/overview', fetcher);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [month, setMonth] = useState(now.getMonth() + 1);

  return (
    <div className="max-w-5xl space-y-8">
      <h1 className="text-2xl font-bold">Praxis IPM — Tableau de bord</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card">
          <div className="text-xs uppercase text-gray-400">Adhérents actifs</div>
          <div className="mt-1 text-2xl font-bold">{overview?.activeBeneficiaries ?? '—'}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-gray-400">Cotisations (année)</div>
          <div className="mt-1 text-xl font-bold">{overview ? fcfa(overview.totalContributionsFcfa) : '—'}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-gray-400">Prestations (année)</div>
          <div className="mt-1 text-xl font-bold">{overview ? fcfa(overview.totalPrestationsFcfa) : '—'}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-gray-400">Ratio sinistralité</div>
          <div className="mt-1 text-2xl font-bold">{overview?.sinistraliteRatio !== null && overview?.sinistraliteRatio !== undefined ? `${overview.sinistraliteRatio}%` : '—'}</div>
        </div>
      </div>

      {overview && overview.pendingCasesCount > 0 && (
        <div className="card border-amber-200 bg-amber-50 text-sm text-amber-800">
          {overview.pendingCasesCount} dossier(s) en attente de traitement.
        </div>
      )}

      <section className="card space-y-4">
        <h2 className="font-semibold">Top postes de dépense</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Montant remboursé (année)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {overview?.topCategories.map((c) => (
              <tr key={c.category}>
                <td>{IPM_CAP_CATEGORY_LABELS[c.category] ?? c.category}</td>
                <td>{fcfa(c.amountFcfa)}</td>
              </tr>
            ))}
            {overview?.topCategories.length === 0 && (
              <tr>
                <td colSpan={2} className="py-6 text-center text-gray-400">
                  Aucune prestation approuvée cette année.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Exports réglementaires</h2>
        <p className="text-xs text-gray-500">
          L'export ICAMO ci-dessous utilise un format représentatif (aucune spécification officielle ICAMO
          publiée n'était disponible) — à confirmer avant tout dépôt réel.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Année</label>
            <input className="input w-28" type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} />
          </div>
          <div>
            <label className="label">Trimestre</label>
            <select className="input w-28" value={quarter} onChange={(e) => setQuarter(parseInt(e.target.value, 10))}>
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>
                  T{q}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-secondary" onClick={() => downloadExport(`/ipm/dashboard/export/icamo?year=${year}&quarter=${quarter}`)}>
            Export ICAMO (CSV)
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-4 border-t border-gray-100 pt-4">
          <div>
            <label className="label">Année</label>
            <input className="input w-28" type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} />
          </div>
          <div>
            <label className="label">Mois</label>
            <select className="input w-28" value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-secondary" onClick={() => downloadExport(`/ipm/dashboard/export/consolidated-payroll?year=${year}&month=${month}`)}>
            Paie consolidée RH + IPM (CSV)
          </button>
        </div>
      </section>
    </div>
  );
}
