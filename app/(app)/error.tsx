'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/** Catches an unhandled render error anywhere under the authenticated app shell (sidebar, topbar,
 *  or any page) so one bad component doesn't white-screen the whole app — without this, Next.js
 *  has nothing local to fall back to and the user just sees a generic failed-to-load page. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-500">
          This page ran into an unexpected error. You can try again, or head back to the dashboard.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
          <Link href="/dashboard">
            <Button variant="secondary" className="w-full">
              Go to dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
