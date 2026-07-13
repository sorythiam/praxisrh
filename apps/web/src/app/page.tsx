import Link from 'next/link';

const MODULES = [
  {
    name: 'Praxis RH',
    tagline: 'Le SIRH complet, de bout en bout',
    points: [
      'Registre du personnel, contrats et signature électronique',
      'Planning, pointeuse offline-first, congés en self-service',
      'Paie consolidée, export, bulletins et versement mobile money',
      'Compte personnel pour chaque employé',
    ],
  },
  {
    name: 'Praxis IPM',
    tagline: "Digitalisation d'une Institution de Prévoyance Maladie",
    points: [
      'Adhérents et carte IPM à QR code',
      'Cotisations, tiers-payant et remboursements',
      'Contrôle médical et exports ICAMO',
    ],
  },
  {
    name: 'Pack Intérim',
    tagline: 'Module additionnel pour les agences de placement',
    points: [
      'Missions, affectations et marge par mission',
      'Pointage terrain renforcé et portail client',
      'Acomptes et pré-facturation automatique',
    ],
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-praxis-700">Praxis</span>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-praxis-700">
              Connexion
            </Link>
            <Link href="/subscribe" className="btn">
              Essai gratuit 7 jours
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          La plateforme RH & protection sociale pensée pour l&apos;Afrique de l&apos;Ouest
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Mobile money natif, WhatsApp comme canal de premier ordre, offline-first, et un moteur de règles
          conforme au droit du travail sénégalais. Trois modules souscriptibles indépendamment ou ensemble.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/subscribe" className="btn px-6 py-3 text-base">
            Créer mon espace entreprise
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">
            J&apos;ai déjà un compte
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {MODULES.map((m) => (
            <div key={m.name} className="card">
              <h2 className="text-lg font-semibold text-praxis-700">{m.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{m.tagline}</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                {m.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="text-praxis-500">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500">
        Praxis — hébergeable localement pour la conformité CDP Sénégal.
      </footer>
    </main>
  );
}
