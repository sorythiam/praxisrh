'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
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
  justifiesAbsenceFrom?: string | null;
  justifiesAbsenceTo?: string | null;
  linkedLeaveRequestId?: string | null;
  createdAt: string;
  beneficiary: {
    cardNumber: string;
    coverageRatePercent: number;
    employee: { employeeNumber: string; person: { firstName: string; lastName: string } };
  };
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

export default function DossierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: reimbursementCase, mutate } = useSWR<ReimbursementCase>(`/ipm/reimbursements/${id}`, fetcher);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReasonCode, setRejectionReasonCode] = useState('');
  const [showRejectForm, setShowRejectForm] = useState<'gestionnaire' | 'medical' | null>(null);
  const [busy, setBusy] = useState(false);

  async function decide(kind: 'gestionnaire' | 'medical', approve: boolean, reason?: string) {
    setError(null);
    setBusy(true);
    try {
      const path = kind === 'gestionnaire' ? `/ipm/reimbursements/${id}/gestionnaire-decision` : `/ipm/reimbursements/${id}/medical-review`;
      await api.patch(path, { approve, rejectionReasonCode: reason });
      setShowRejectForm(null);
      setRejectionReasonCode('');
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la décision.');
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    setError(null);
    setBusy(true);
    try {
      await api.post(`/ipm/reimbursements/${id}/pay`, {});
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors du paiement.');
    } finally {
      setBusy(false);
    }
  }

  if (!reimbursementCase) return <div className="text-gray-500">Chargement…</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dossier #{reimbursementCase.id.slice(0, 8)}</h1>
          <p className="text-sm text-gray-500">
            {reimbursementCase.beneficiary.employee.person.firstName} {reimbursementCase.beneficiary.employee.person.lastName} (
            {reimbursementCase.beneficiary.cardNumber})
          </p>
        </div>
        <span className={`badge ${IPM_CASE_STATUS_BADGE[reimbursementCase.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {IPM_CASE_STATUS_LABELS[reimbursementCase.status] ?? reimbursementCase.status}
        </span>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

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
            <span className="text-gray-500">Prestataire : </span>
            {reimbursementCase.providerName ?? '—'}
          </div>
          <div>
            <span className="text-gray-500">Montant réclamé : </span>
            {fcfa(reimbursementCase.amountClaimedFcfa)}
          </div>
          <div>
            <span className="text-gray-500">Montant approuvé : </span>
            {fcfa(reimbursementCase.amountApprovedFcfa)}
          </div>
          <div>
            <span className="text-gray-500">Taux de couverture : </span>
            {reimbursementCase.beneficiary.coverageRatePercent}%
          </div>
        </div>
        {reimbursementCase.rejectionReasonCode && (
          <p className="text-red-700">Motif de rejet : {reimbursementCase.rejectionReasonCode}</p>
        )}
        {reimbursementCase.justifiesAbsenceFrom && (
          <p className="text-gray-600">
            Justifie une absence du {new Date(reimbursementCase.justifiesAbsenceFrom).toLocaleDateString('fr-FR')} au{' '}
            {reimbursementCase.justifiesAbsenceTo ? new Date(reimbursementCase.justifiesAbsenceTo).toLocaleDateString('fr-FR') : '—'}
            {reimbursementCase.linkedLeaveRequestId ? ' — demande de congé maladie créée automatiquement.' : ''}
          </p>
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
            <p className="text-gray-400">Aucune pièce jointe.</p>
          )}
        </div>
      </section>

      {reimbursementCase.status === 'SUBMITTED' && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Décision du gestionnaire</h2>
          <div className="flex gap-3">
            <button className="btn" disabled={busy} onClick={() => decide('gestionnaire', true)}>
              Approuver
            </button>
            <button className="btn-danger" disabled={busy} onClick={() => setShowRejectForm('gestionnaire')}>
              Rejeter
            </button>
          </div>
          {showRejectForm === 'gestionnaire' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                decide('gestionnaire', false, rejectionReasonCode);
              }}
              className="flex gap-3"
            >
              <input
                className="input"
                placeholder="Motif de rejet"
                value={rejectionReasonCode}
                onChange={(e) => setRejectionReasonCode(e.target.value)}
                required
              />
              <button className="btn-danger shrink-0" type="submit">
                Confirmer le rejet
              </button>
            </form>
          )}
        </section>
      )}

      {reimbursementCase.status === 'PENDING_MEDICAL_REVIEW' && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Contrôle médical (acte sensible)</h2>
          <div className="flex gap-3">
            <button className="btn" disabled={busy} onClick={() => decide('medical', true)}>
              Approuver
            </button>
            <button className="btn-danger" disabled={busy} onClick={() => setShowRejectForm('medical')}>
              Rejeter
            </button>
          </div>
          {showRejectForm === 'medical' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                decide('medical', false, rejectionReasonCode);
              }}
              className="flex gap-3"
            >
              <input
                className="input"
                placeholder="Motif de rejet"
                value={rejectionReasonCode}
                onChange={(e) => setRejectionReasonCode(e.target.value)}
                required
              />
              <button className="btn-danger shrink-0" type="submit">
                Confirmer le rejet
              </button>
            </form>
          )}
        </section>
      )}

      {reimbursementCase.status === 'APPROVED' && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Paiement</h2>
          <button className="btn" disabled={busy} onClick={pay}>
            Payer par mobile money
          </button>
        </section>
      )}
    </div>
  );
}
