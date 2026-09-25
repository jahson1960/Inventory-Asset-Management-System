'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { PageLoading } from '@/components/ui/spinner';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    else if (!loading && user?.mustChangePassword) router.replace('/change-password');
  }, [loading, user, router]);

  if (loading || !user || user.mustChangePassword) return <PageLoading />;

  return (
    <ConfirmProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />
          <main className="flex-1 bg-cream p-4 md:p-6">{children}</main>
        </div>
      </div>
    </ConfirmProvider>
  );
}
