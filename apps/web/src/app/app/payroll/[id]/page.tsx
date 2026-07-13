'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api, ApiError, fetcher, getToken } from '@/lib/api-client';

export default function PayrollReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: report, mutate } = useSWR<any>(`/rh/payroll/reports/${id}`, fetcher);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!report) return <div className="text-gray-500">Chargement…</div>;

  async function run(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  }

  const totalNet = report.lines.reduce((s: number, l: any) => s + l.netSalaryFcfa, 0);
  const anomalyCount = report.lines.filter((l: any) => l.anomalyFlags?.length > 0).length;

  async function exportCsv() {
    const token = getToken();
    const res = await fetch(`/api/rh/payroll/reports/${id}/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paie-${report.periodYear}-${report.periodMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <button onClick={() => router.back()} className="text-sm text-praxis-700">
        ← Retour
      </button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Paie {report.periodMonth}/{report.periodYear}
        </h1>
        <span className="badge bg-gray-100 text-gray-700">{report.status}</span>
      </div>

      <div className="card flex flex-wrap gap-3">
        <button className="btn-secondary" disabled={busy} onClick={() => run(() => api.post(`/rh/payroll/reports/${id}/validate`))}>
          Valider
        </button>
        <button className="btn-secondary" disabled={busy} onClick={exportCsv}>
          Exporter CSV
        </button>
        <button className="btn-secondary" disabled={busy} onClick={() => run(() => api.post(`/rh/payroll/reports/${id}/distribute`))}>
          Distribuer les bulletins
        </button>
        <button className="btn" disabled={busy} onClick={() => run(() => api.post(`/rh/payroll/reports/${id}/pay`, {}))}>
          Verser par mobile money
        </button>
      </div>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="text-sm text-gray-500">Total net à payer</div>
          <div className="text-xl font-bold">{totalNet.toLocaleString('fr-FR')} FCFA</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Anomalies détectées</div>
          <div className="text-xl font-bold text-amber-600">{anomalyCount}</div>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Brut</th>
              <th>Cotisations</th>
              <th>Impôt</th>
              <th>Net</th>
              <th>Anomalies</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {report.lines.map((l: any) => (
              <tr key={l.id}>
                <td>
                  {l.employee.person.firstName} {l.employee.person.lastName}
                </td>
                <td>{l.grossSalaryFcfa.toLocaleString('fr-FR')}</td>
                <td>{l.employeeContributionsFcfa.toLocaleString('fr-FR')}</td>
                <td>{l.incomeTaxFcfa.toLocaleString('fr-FR')}</td>
                <td className="font-medium">{l.netSalaryFcfa.toLocaleString('fr-FR')}</td>
                <td>
                  {l.anomalyFlags?.map((f: any, i: number) => (
                    <div key={i} className="text-xs text-amber-700">
                      ⚠ {f.message}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
