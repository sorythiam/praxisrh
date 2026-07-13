'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { computeMonthlyPriceFcfa, MODULE_DEPENDENCIES, MODULE_LABELS, MODULE_PRICING, ModuleCode } from '@praxis/shared';
import { api, setToken, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

const ALL_MODULES = [ModuleCode.RH, ModuleCode.IPM, ModuleCode.INTERIM];

export default function SubscribePage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [modules, setModules] = useState<ModuleCode[]>([ModuleCode.RH]);
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const estimatedPriceFcfa = useMemo(
    () => computeMonthlyPriceFcfa(modules, { [ModuleCode.RH]: 10, [ModuleCode.IPM]: 10, [ModuleCode.INTERIM]: 10 }),
    [modules],
  );

  function toggleModule(code: ModuleCode) {
    setModules((prev) => {
      const has = prev.includes(code);
      if (has) {
        // Also remove dependents (Pack Intérim requires RH)
        const dependents = ALL_MODULES.filter((m) => MODULE_DEPENDENCIES[m]?.includes(code));
        return prev.filter((m) => m !== code && !dependents.includes(m));
      }
      return [...prev, code];
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ accessToken: string }>('/auth/subscribe', {
        companyName,
        sector,
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPhone,
        password,
        modules,
      });
      setToken(res.accessToken);
      await refresh();
      router.push('/app');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm text-praxis-700">
        ← Retour
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Créer votre espace Praxis</h1>
      <p className="mt-1 text-sm text-gray-500">Essai gratuit de 7 jours, sans engagement.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-8">
        <fieldset className="card space-y-4">
          <legend className="mb-2 text-base font-semibold">1. Modules souscrits</legend>
          {ALL_MODULES.map((code) => {
            const pricing = MODULE_PRICING[code];
            const deps = MODULE_DEPENDENCIES[code];
            const depsMissing = deps && !deps.every((d) => modules.includes(d));
            return (
              <label
                key={code}
                className={`flex items-start gap-3 rounded-md border p-3 ${depsMissing ? 'opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={modules.includes(code)}
                  disabled={depsMissing}
                  onChange={() => toggleModule(code)}
                />
                <div>
                  <div className="font-medium">{MODULE_LABELS[code]}</div>
                  <div className="text-xs text-gray-500">
                    {pricing.baseFcfaPerEstablishment.toLocaleString('fr-FR')} FCFA/mois par établissement +{' '}
                    {pricing.variableFcfaPerActivePerson.toLocaleString('fr-FR')} FCFA {pricing.variableLabel}
                  </div>
                  {deps && (
                    <div className="text-xs text-amber-600">
                      Requiert {deps.map((d) => MODULE_LABELS[d]).join(', ')}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
          <div className="rounded-md bg-praxis-50 p-3 text-sm">
            Estimation pour 10 personnes actives par module :{' '}
            <strong>{estimatedPriceFcfa.toLocaleString('fr-FR')} FCFA / mois</strong>
          </div>
        </fieldset>

        <fieldset className="card space-y-4">
          <legend className="mb-2 text-base font-semibold">2. Votre entreprise</legend>
          <div>
            <label className="label">Nom de l&apos;entreprise</label>
            <input className="input" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div>
            <label className="label">Secteur d&apos;activité</label>
            <input className="input" value={sector} onChange={(e) => setSector(e.target.value)} />
          </div>
        </fieldset>

        <fieldset className="card space-y-4">
          <legend className="mb-2 text-base font-semibold">3. Administrateur principal</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom</label>
              <input className="input" required value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} />
            </div>
            <div>
              <label className="label">Nom</label>
              <input className="input" required value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Téléphone (mobile money)</label>
            <input className="input" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} placeholder="+221 7X XXX XX XX" />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input type="password" className="input" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </fieldset>

        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <button type="submit" className="btn w-full py-3" disabled={submitting || modules.length === 0}>
          {submitting ? 'Création en cours…' : 'Démarrer mon essai gratuit'}
        </button>
      </form>
    </main>
  );
}
