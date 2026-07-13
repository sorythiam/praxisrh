'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@praxis/shared';
import { useAuth } from '@/lib/auth-context';

export default function AppIndexPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === Role.COMPANY_ADMIN || user.role === Role.HR_ADMIN) {
      router.replace('/app/dashboard');
    } else if (user.role === Role.MANAGER) {
      router.replace('/app/leave');
    } else {
      router.replace('/app/me/planning');
    }
  }, [user, loading, router]);

  return null;
}
