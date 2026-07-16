'use client';

import { useRef, useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';
import { INTERIM_TIMESHEET_STATUS_BADGE, INTERIM_TIMESHEET_STATUS_LABELS } from '@/lib/interim-labels';

interface Assignment {
  id: string;
  mission: { clientName: string; siteName: string };
}

interface Timesheet {
  id: string;
  date: string;
  hours: number;
  status: string;
  siteQrVerified: boolean;
  selfieUrl: string | null;
  assignment: { mission: { clientName: string; siteName: string } };
}

export default function MyInterimTimesheetsPage() {
  const { data: assignments } = useSWR<Assignment[]>('/interim/missions/me', fetcher);
  const { data: timesheets, mutate } = useSWR<Timesheet[]>('/interim/timesheets/me', fetcher);

  const [assignmentId, setAssignmentId] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState(8);
  const [siteQrToken, setSiteQrToken] = useState('');
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function captureLocation() {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ id: string }>('/interim/timesheets/me', {
        assignmentId,
        date,
        hours,
        latitude: coords?.lat,
        longitude: coords?.lng,
        siteQrToken: siteQrToken || undefined,
      });
      setLastCreatedId(res.id);
      setDate('');
      setSiteQrToken('');
      setCoords(null);
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadSelfie(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !lastCreatedId) return;
    await api.upload(`/interim/timesheets/${lastCreatedId}/selfie`, file);
    mutate();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Mes pointages intérim</h1>

      <form onSubmit={submit} className="card grid grid-cols-2 gap-3">
        <select className="input col-span-2" value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} required>
          <option value="">Mission…</option>
          {assignments?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.mission.clientName} — {a.mission.siteName}
            </option>
          ))}
        </select>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <input
          className="input"
          type="number"
          step="0.5"
          placeholder="Heures"
          value={hours}
          onChange={(e) => setHours(parseFloat(e.target.value))}
          required
        />
        <input
          className="input col-span-2"
          placeholder="Code QR scanné sur site (affiché sur le panneau du site)"
          value={siteQrToken}
          onChange={(e) => setSiteQrToken(e.target.value)}
        />
        <div className="col-span-2 flex items-center gap-3">
          <button type="button" className="btn-secondary" onClick={captureLocation} disabled={locating}>
            {locating ? 'Localisation…' : coords ? 'Position capturée ✓' : 'Capturer ma position GPS'}
          </button>
        </div>
        {error && <div className="col-span-2 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <button className="btn col-span-2" type="submit" disabled={submitting}>
          Soumettre le pointage
        </button>
      </form>

      {lastCreatedId && (
        <div className="card space-y-2">
          <p className="text-sm text-gray-600">Ajouter un selfie au dernier pointage soumis (optionnel) :</p>
          <input ref={fileInputRef} type="file" accept="image/*" capture="user" onChange={uploadSelfie} className="text-sm" />
        </div>
      )}

      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>Mission</th>
              <th>Date</th>
              <th>Heures</th>
              <th>QR site</th>
              <th>Selfie</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {timesheets?.map((t) => (
              <tr key={t.id}>
                <td>
                  {t.assignment.mission.clientName} — {t.assignment.mission.siteName}
                </td>
                <td>{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                <td>{t.hours}h</td>
                <td>{t.siteQrVerified ? '✓' : '—'}</td>
                <td>{t.selfieUrl ? '✓' : '—'}</td>
                <td>
                  <span className={`badge ${INTERIM_TIMESHEET_STATUS_BADGE[t.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {INTERIM_TIMESHEET_STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </td>
              </tr>
            ))}
            {timesheets?.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  Aucun pointage soumis.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
