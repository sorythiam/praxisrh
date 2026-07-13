'use client';

import useSWR from 'swr';
import { fetcher, getToken } from '@/lib/api-client';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function MyPayslipsPage() {
  const { data: payslips } = useSWR<any[]>('/rh/payroll/my/payslips', fetcher);

  async function download(year: number, month: number) {
    const token = getToken();
    const res = await fetch(`/api/rh/payroll/my/payslips/${year}/${month}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Mes bulletins de paie</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Période</th>
              <th>Distribué le</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payslips?.map((p) => (
              <tr key={p.id}>
                <td>
                  {MONTHS_FR[p.periodMonth - 1]} {p.periodYear}
                </td>
                <td>{new Date(p.distributedAt).toLocaleDateString('fr-FR')}</td>
                <td>
                  <button className="text-praxis-700 hover:underline" onClick={() => download(p.periodYear, p.periodMonth)}>
                    Télécharger
                  </button>
                </td>
              </tr>
            ))}
            {payslips?.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-400">
                  Aucun bulletin disponible pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
