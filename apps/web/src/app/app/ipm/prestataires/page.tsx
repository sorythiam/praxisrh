'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api-client';
import { IPM_CAP_CATEGORY_LABELS, fcfa } from '@/lib/ipm-labels';

interface Tariff {
  id: string;
  actCode: string;
  actLabel: string;
  tariffFcfa: number;
}

interface Provider {
  id: string;
  name: string;
  category: string;
  address?: string | null;
  phone?: string | null;
  tariffs: Tariff[];
}

interface Eligibility {
  cardNumber: string;
  effectiveCardStatus: string;
  coverageRatePercent: number;
  plafondsByCategory: { category: string; annualCapFcfa: number; consumedFcfa: number; remainingFcfa: number }[];
}

export default function PrestatairesPage() {
  const { data: providers, mutate } = useSWR<Provider[]>('/ipm/providers', fetcher);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actCode, setActCode] = useState('');
  const [actLabel, setActLabel] = useState('');
  const [tariffFcfa, setTariffFcfa] = useState(0);

  const [cardNumber, setCardNumber] = useState('');
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function createProvider(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/ipm/providers', { name, category, address: address || undefined, phone: phone || undefined });
      setShowForm(false);
      setName('');
      setCategory('');
      setAddress('');
      setPhone('');
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la création.');
    }
  }

  async function addTariff(providerId: string, e: React.FormEvent) {
    e.preventDefault();
    await api.post(`/ipm/providers/${providerId}/tariffs`, { actCode, actLabel, tariffFcfa });
    setActCode('');
    setActLabel('');
    setTariffFcfa(0);
    mutate();
  }

  async function checkEligibility(e: React.FormEvent) {
    e.preventDefault();
    setEligibility(null);
    setEligibilityError(null);
    setChecking(true);
    try {
      const res = await api.get<Eligibility>(`/ipm/providers/eligibility/${encodeURIComponent(cardNumber)}`);
      setEligibility(res);
    } catch (err) {
      setEligibilityError(err instanceof ApiError ? err.message : 'Erreur lors de la vérification.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold">Prestataires IPM</h1>

      <section className="card space-y-4">
        <h2 className="font-semibold">Vérification d'éligibilité (tiers-payant)</h2>
        <form onSubmit={checkEligibility} className="flex gap-3">
          <input
            className="input"
            placeholder="Numéro de carte (ex: IPM-12345678)"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            required
          />
          <button className="btn shrink-0" type="submit" disabled={checking}>
            Vérifier
          </button>
        </form>
        {eligibilityError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{eligibilityError}</div>}
        {eligibility && (
          <div className="space-y-3 rounded-md border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{eligibility.cardNumber}</span>
              <span
                className={`badge ${eligibility.effectiveCardStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {eligibility.effectiveCardStatus}
              </span>
            </div>
            <p className="text-sm text-gray-600">Taux de couverture : {eligibility.coverageRatePercent}%</p>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th>Plafond annuel</th>
                  <th>Consommé</th>
                  <th>Restant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {eligibility.plafondsByCategory.map((p) => (
                  <tr key={p.category}>
                    <td>{IPM_CAP_CATEGORY_LABELS[p.category] ?? p.category}</td>
                    <td>{fcfa(p.annualCapFcfa)}</td>
                    <td>{fcfa(p.consumedFcfa)}</td>
                    <td>{fcfa(p.remainingFcfa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Réseau de prestataires</h2>
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Annuler' : '+ Nouveau prestataire'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createProvider} className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} required />
            <input
              className="input"
              placeholder="Catégorie (ex: Clinique, Pharmacie)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
            <input className="input" placeholder="Adresse" value={address} onChange={(e) => setAddress(e.target.value)} />
            <input className="input" placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {error && <div className="col-span-2 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <button className="btn col-span-2" type="submit">
              Créer
            </button>
          </form>
        )}

        <div className="divide-y divide-gray-100">
          {providers?.map((p) => (
            <div key={p.id} className="py-3">
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
              >
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-gray-500">
                    {p.category} {p.address ? `— ${p.address}` : ''}
                  </div>
                </div>
                <span className="text-praxis-700">{expandedId === p.id ? 'Réduire' : 'Détails'}</span>
              </button>
              {expandedId === p.id && (
                <div className="mt-3 space-y-3 rounded-md bg-gray-50 p-4">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Code acte</th>
                        <th>Libellé</th>
                        <th>Tarif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {p.tariffs.map((t) => (
                        <tr key={t.id}>
                          <td>{t.actCode}</td>
                          <td>{t.actLabel}</td>
                          <td>{fcfa(t.tariffFcfa)}</td>
                        </tr>
                      ))}
                      {p.tariffs.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-gray-400">
                            Aucun tarif enregistré.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <form onSubmit={(e) => addTariff(p.id, e)} className="flex flex-wrap gap-3">
                    <input className="input w-32" placeholder="Code acte" value={actCode} onChange={(e) => setActCode(e.target.value)} required />
                    <input className="input" placeholder="Libellé" value={actLabel} onChange={(e) => setActLabel(e.target.value)} required />
                    <input
                      className="input w-32"
                      type="number"
                      placeholder="Tarif FCFA"
                      value={tariffFcfa}
                      onChange={(e) => setTariffFcfa(parseInt(e.target.value, 10))}
                      required
                    />
                    <button className="btn shrink-0" type="submit">
                      Ajouter tarif
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
          {providers?.length === 0 && <p className="py-6 text-center text-gray-400">Aucun prestataire enregistré.</p>}
        </div>
      </section>
    </div>
  );
}
