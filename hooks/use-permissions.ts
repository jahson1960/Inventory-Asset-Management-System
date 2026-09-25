'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';

export function usePermissions() {
  const { user, permissions, permissionsLoaded } = useAuth();

  const can = useCallback(
    (key: string): boolean => {
      if (!user) return false;
      if (user.role === 'SUPER_ADMIN') return true;
      if (!permissionsLoaded) return false;
      return permissions[key]?.includes(user.role) ?? false;
    },
    [user, permissions, permissionsLoaded],
  );

  return { can, permissionsLoaded };
}
