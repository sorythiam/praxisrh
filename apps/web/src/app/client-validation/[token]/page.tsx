'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';

interface TimesheetView {
  status: string;
  date: string;
  hours: number;
  siteQrVerified: boolean;
  employeeName: string;
  clientName: string;
  siteName: string;
  validatedAt: string | null;
  validatedByName: string | null;
  rejectionReason: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'En attente de votre validation',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
};

export default function ClientValidationPage() {
  const { token } = useParams<{ token: string }>();
  const { data: timesheet, mutate, error: loadError } = useSWR<TimesheetView>(`/interim/client-validation/${token}`, fetcher);
  const [validatedByName, setValidatedByName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function approve() {
    if (!validatedByName.trim()) {
      setError('Merci d\'indiquer votre nom avant de valider.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.post(`/interim/client-validation/${token}/approve`, { validatedByName });
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur.');
    } finally {
      setBusy(false);
    }
  }

  async function reject(e: React.FormEvent) {
    e.preventDefault();
    if (!validatedByName.trim()) {
      setError('Merci d\'indiquer votre nom avant de rejeter.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.post(`/interim/client-validation/${token}/reject`, { validatedByName, rejectionReason });
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur.');
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-800">Lien invalide</h1>
        <p className="mt-2 text-sm text-gray-500">
          {loadError instanceof ApiError ? loadError.message : 'Ce lien de validation est invalide ou a expiré.'}
        </p>
      </main>
    );
  }

  if (!timesheet) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center text-gray-500">Chargement…</main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="mb-6 text-center text-lg font-bold text-praxis-700">Praxis — Validation client</div>
      <div className="card space-y-4">
        <h1 className="text-xl font-bold">Pointage à valider</h1>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-gray-500">Intérimaire : </span>
            {timesheet.employeeName}
          </p>
          <p>
            <span className="text-gray-500">Site : </span>
            {timesheet.siteName} ({timesheet.clientName})
          </p>
          <p>
            <span className="text-gray-500">Date : </span>
            {new Date(timesheet.date).toLocaleDateString('fr-FR')}
          </p>
          <p>
            <span className="text-gray-500">Heures déclarées : </span>
            {timesheet.hours}h
          </p>
          <p>
            <span className="text-gray-500">Présence QR vérifiée : </span>
            {timesheet.siteQrVerified ? 'Oui' : 'Non'}
          </p>
        </div>

        {timesheet.status === 'SUBMITTED' ? (
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="label">Votre nom</label>
              <input className="input" value={validatedByName} onChange={(e) => setValidatedByName(e.target.value)} />
            </div>
            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="flex gap-3">
              <button className="btn flex-1" onClick={approve} disabled={busy}>
                Valider les heures
              </button>
              <button className="btn-danger flex-1" onClick={() => setShowRejectForm((v) => !v)} disabled={busy}>
                Contester
              </button>
            </div>
            {showRejectForm && (
              <form onSubmit={reject} className="space-y-3">
                <input
                  className="input"
                  placeholder="Motif de la contestation"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
                <button className="btn-danger w-full" type="submit" disabled={busy}>
                  Confirmer la contestation
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="rounded-md bg-gray-50 p-3 text-sm">
            <p className="font-medium">{STATUS_LABELS[timesheet.status] ?? timesheet.status}</p>
            {timesheet.validatedByName && (
              <p className="mt-1 text-gray-500">
                Par {timesheet.validatedByName} le {timesheet.validatedAt ? new Date(timesheet.validatedAt).toLocaleString('fr-FR') : ''}
              </p>
            )}
            {timesheet.rejectionReason && <p className="mt-1 text-red-700">Motif : {timesheet.rejectionReason}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
