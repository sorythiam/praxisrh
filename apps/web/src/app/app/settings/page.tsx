'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Role } from '@praxis/shared';
import { api, ApiError, fetcher } from '@/lib/api-client';

const INVITABLE_ROLES = [Role.HR_ADMIN, Role.IPM_MANAGER, Role.INTERIM_MANAGER, Role.MANAGER];

export default function SettingsPage() {
  const { data: users, mutate: mutateUsers } = useSWR<any[]>('/users', fetcher);
  const { data: establishments, mutate: mutateEstablishments } = useSWR<any[]>('/establishments', fetcher);

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <section className="card">
        <h2 className="font-semibold">Établissements</h2>
        <EstablishmentForm onCreated={() => mutateEstablishments()} />
        <ul className="mt-4 divide-y divide-gray-100 text-sm">
          {establishments?.map((e) => (
            <li key={e.id} className="py-2">
              {e.name} {e.city && `— ${e.city}`}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="font-semibold">Utilisateurs internes</h2>
        <InviteForm onInvited={() => mutateUsers()} />
        <table className="table-base mt-4">
          <thead>
            <tr>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users?.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.isActive ? 'Actif' : 'Inactif'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function EstablishmentForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/establishments', { name, city });
      setName('');
      setCity('');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-end gap-3">
      <div>
        <label className="label">Nom</label>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Ville</label>
        <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <button className="btn" type="submit">
        Ajouter
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </form>
  );
}

function InviteForm({ onInvited }: { onInvited: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(Role.MANAGER);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/users/invite', { firstName, lastName, email, role });
      setFirstName('');
      setLastName('');
      setEmail('');
      onInvited();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-end gap-3">
      <div>
        <label className="label">Prénom</label>
        <input className="input" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </div>
      <div>
        <label className="label">Nom</label>
        <input className="input" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <div>
        <label className="label">Email</label>
        <input type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label">Rôle</label>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {INVITABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <button className="btn" type="submit">
        Inviter
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </form>
  );
}
