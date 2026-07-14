'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';

export default function MyProfilePage() {
  const { data: person, mutate } = useSWR<any>('/rh/employees/me/profile', fetcher);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState('WAVE');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (person) {
      setEmail(person.email ?? '');
      setPhone(person.phone ?? '');
      setMobileMoneyProvider(person.mobileMoneyProvider ?? 'WAVE');
      setMobileMoneyNumber(person.mobileMoneyNumber ?? '');
    }
  }, [person]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await api.patch('/rh/employees/me/profile', { email, phone, mobileMoneyProvider, mobileMoneyNumber });
      setSuccess(true);
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la mise à jour.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!person) return <div className="text-gray-500">Chargement…</div>;

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Mon profil</h1>
      <p className="text-sm text-gray-500">
        {person.firstName} {person.lastName}
      </p>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label">Opérateur mobile money</label>
          <select className="input" value={mobileMoneyProvider} onChange={(e) => setMobileMoneyProvider(e.target.value)}>
            <option value="WAVE">Wave</option>
            <option value="ORANGE_MONEY">Orange Money</option>
          </select>
        </div>
        <div>
          <label className="label">Numéro mobile money</label>
          <input className="input" value={mobileMoneyNumber} onChange={(e) => setMobileMoneyNumber(e.target.value)} />
          <p className="mt-1 text-xs text-gray-500">C&apos;est ce numéro qui reçoit votre salaire.</p>
        </div>
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-md bg-praxis-50 p-3 text-sm text-praxis-700">Profil mis à jour.</div>}
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
}
