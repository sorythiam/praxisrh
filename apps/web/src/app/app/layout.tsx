'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Role } from '@praxis/shared';
import { useAuth } from '@/lib/auth-context';

const ADMIN_ROLES = [Role.COMPANY_ADMIN, Role.HR_ADMIN];

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/app' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm font-medium ${
        active ? 'bg-praxis-50 text-praxis-700' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Chargement…</div>;
  }

  const isAdmin = ADMIN_ROLES.includes(user.role);
  const isManager = user.role === Role.MANAGER;
  const isEmployeeLike = user.role === Role.EMPLOYEE || isManager;
  const isIpmManager = isAdmin || user.role === Role.IPM_MANAGER;
  const isInterimManager = isAdmin || user.role === Role.INTERIM_MANAGER;

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-white p-4">
        <div className="mb-6 px-3 text-lg font-bold text-praxis-700">Praxis</div>
        <nav className="space-y-1">
          {isAdmin && (
            <>
              <NavLink href="/app/dashboard">Tableau de bord</NavLink>
              <NavLink href="/app/employees">Employés</NavLink>
              <NavLink href="/app/planning">Planning</NavLink>
              <NavLink href="/app/leave">Congés</NavLink>
              <NavLink href="/app/payroll">Paie</NavLink>
              <NavLink href="/app/talents">Talents</NavLink>
              <NavLink href="/app/performance">Performance</NavLink>
              <NavLink href="/app/recruitment">Recrutement</NavLink>
              <NavLink href="/app/settings">Paramètres</NavLink>
            </>
          )}
          {isIpmManager && (
            <>
              <div className="mt-4 px-3 text-xs font-semibold uppercase text-gray-400">Praxis IPM</div>
              <NavLink href="/app/ipm">Tableau de bord</NavLink>
              <NavLink href="/app/ipm/adherents">Adhérents</NavLink>
              <NavLink href="/app/ipm/cotisations">Cotisations</NavLink>
              <NavLink href="/app/ipm/prestataires">Prestataires</NavLink>
              <NavLink href="/app/ipm/dossiers">Dossiers de remboursement</NavLink>
            </>
          )}
          {isInterimManager && (
            <>
              <div className="mt-4 px-3 text-xs font-semibold uppercase text-gray-400">Pack Intérim</div>
              <NavLink href="/app/interim/missions">Missions</NavLink>
              <NavLink href="/app/interim/timesheets">Pointages</NavLink>
              <NavLink href="/app/interim/incidents">Incidents &amp; liste noire</NavLink>
              <NavLink href="/app/interim/advances">Acomptes</NavLink>
              <NavLink href="/app/interim/billing">Facturation</NavLink>
            </>
          )}
          {isManager && (
            <>
              <NavLink href="/app/planning">Planning équipe</NavLink>
              <NavLink href="/app/leave">Congés à valider</NavLink>
            </>
          )}
          {isEmployeeLike && (
            <>
              <div className="mt-4 px-3 text-xs font-semibold uppercase text-gray-400">Mon espace</div>
              <NavLink href="/app/me/planning">Mon planning</NavLink>
              <NavLink href="/app/me/pointeuse">Pointeuse</NavLink>
              <NavLink href="/app/me/leave">Mes congés</NavLink>
              <NavLink href="/app/me/payslips">Mes bulletins</NavLink>
              <NavLink href="/app/me/talents">Mon évolution</NavLink>
              <NavLink href="/app/me/performance">Ma performance</NavLink>
              <NavLink href="/app/me/ipm">Ma couverture IPM</NavLink>
              <NavLink href="/app/me/interim">Mes missions intérim</NavLink>
              <NavLink href="/app/me/interim/timesheets">Mes pointages intérim</NavLink>
              <NavLink href="/app/me/interim/advances">Mes acomptes intérim</NavLink>
              <NavLink href="/app/me/profile">Mon profil</NavLink>
            </>
          )}
        </nav>
        <button onClick={logout} className="mt-8 w-full rounded-md px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100">
          Déconnexion
        </button>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
