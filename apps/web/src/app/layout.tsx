import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { ServiceWorkerRegister } from './sw-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'Praxis — SIRH & Protection Sociale',
  description: "Plateforme SaaS RH & Protection Sociale pour l'Afrique de l'Ouest",
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ServiceWorkerRegister />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
