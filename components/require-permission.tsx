'use client';

import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';

/** UX-only gate — hides actions the user's role shouldn't see. Real enforcement is the
 *  backend's RolesGuard; never trust this component alone for authorization. */
export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const { can } = usePermissions();
  if (!can(permission)) return null;
  return <>{children}</>;
}
