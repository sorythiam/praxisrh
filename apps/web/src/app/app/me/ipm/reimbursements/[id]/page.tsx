'use client';

import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher, getToken } from '@/lib/api-client';
import { IPM_CAP_CATEGORY_LABELS, IPM_CASE_STATUS_BADGE, IPM_CASE_STATUS_LABELS, fcfa } from '@/lib/ipm-labels';

interface ReimbursementCase {
  id: string;
  category: string;
  invoiceNumber: string;
  providerName?: string | null;
  amountClaimedFcfa: number;
  amountApprovedFcfa: number | null;
  status: string;
  rejectionReasonCode?: string | null;
  documentUrls: string[] | null;
}

function downloadDocument(caseId: string, path: string) {
  const token = getToken();
  fetch(`/api/ipm/reimbursements/${caseId}/documents/download?path=${encodeURIComponent(path)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then(async (res) => {
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = path.split('/').pop() ?? 'document';
      a.click();
      window.URL.revokeObjectURL(a.href);
    })
    .catch(() => alert('Échec du téléchargement.'));
}

export default function MyReimbursementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: reimbursementCase, mutate } = useSWR<ReimbursementCase>(`/ipm/reimbursements/${id}`, fetcher);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await api.upload(`/ipm/reimbursements/${id}/documents`, file);
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'envoi du document.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (!reimbursementCase) return <div className="text-gray-500">Chargement…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dossier #{reimbursementCase.id.slice(0, 8)}</h1>
        <span className={`badge ${IPM_CASE_STATUS_BADGE[reimbursementCase.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {IPM_CASE_STATUS_LABELS[reimbursementCase.status] ?? reimbursementCase.status}
        </span>
      </div>

      <section className="card space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-500">Catégorie : </span>
            {IPM_CAP_CATEGORY_LABELS[reimbursementCase.category] ?? reimbursementCase.category}
          </div>
          <div>
            <span className="text-gray-500">Facture : </span>
            {reimbursementCase.invoiceNumber}
          </div>
          <div>
            <span className="text-gray-500">Montant réclamé : </span>
            {fcfa(reimbursementCase.amountClaimedFcfa)}
          </div>
          <div>
            <span className="text-gray-500">Montant remboursé : </span>
            {fcfa(reimbursementCase.amountApprovedFcfa)}
          </div>
        </div>
        {reimbursementCase.rejectionReasonCode && (
          <p className="text-red-700">Motif de rejet : {reimbursementCase.rejectionReasonCode}</p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Pièces justificatives</h2>
        <div className="space-y-1">
          {reimbursementCase.documentUrls?.map((path) => (
            <button key={path} className="block text-praxis-700 hover:underline" onClick={() => downloadDocument(reimbursementCase.id, path)}>
              {path.split('/').pop()}
            </button>
          ))}
          {(!reimbursementCase.documentUrls || reimbursementCase.documentUrls.length === 0) && (
            <p className="text-gray-400">Aucune pièce jointe pour l'instant.</p>
          )}
        </div>
        <div>
          <input ref={fileInputRef} type="file" onChange={onFileChosen} disabled={uploading} className="text-sm" />
        </div>
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      </section>
    </div>
  );
}
