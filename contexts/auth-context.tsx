'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { setToken, getToken, clearToken } from '@/lib/auth-token';
import { applyTheme, DEFAULT_THEME } from '@/lib/theme';
import type { CurrentUser, PermissionRules, ThemeSettingsRecord } from '@/lib/types';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  permissions: PermissionRules;
  permissionsLoaded: boolean;
  theme: ThemeSettingsRecord;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
  refreshPermissions: () => Promise<void>;
  refreshTheme: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionRules>({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [theme, setTheme] = useState<ThemeSettingsRecord>(DEFAULT_THEME);
  const router = useRouter();

  const refreshPermissions = useCallback(async () => {
    try {
      const rules = await api.get<PermissionRules>('/permissions');
      setPermissions(rules);
    } catch (error) {
      if (!(error instanceof ApiError)) console.error(error);
    } finally {
      setPermissionsLoaded(true);
    }
  }, []);

  const refreshTheme = useCallback(async () => {
    try {
      const loaded = await api.get<ThemeSettingsRecord>('/settings/theme');
      setTheme(loaded);
      applyTheme(loaded);
    } catch (error) {
      if (!(error instanceof ApiError)) console.error(error);
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount; refreshTheme's own setState calls happen after its internal await, not
    // synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshTheme();
  }, [refreshTheme]);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      if (!getToken()) {
        setLoading(false);
        setPermissionsLoaded(true);
        return;
      }
      try {
        const [me] = await Promise.all([api.get<CurrentUser>('/auth/me'), refreshPermissions()]);
        if (!cancelled) setUser(me);
      } catch (error) {
        if (!(error instanceof ApiError)) console.error(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, [refreshPermissions]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.post<{ accessToken: string; user: CurrentUser }>('/auth/login', {
        email,
        password,
      });
      setToken(result.accessToken);
      setUser(result.user);
      if (result.user.mustChangePassword) {
        router.push('/change-password');
        return;
      }
      await refreshPermissions();
      router.push('/dashboard');
    },
    [router, refreshPermissions],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
      await refreshPermissions();
      router.push('/dashboard');
    },
    [router, refreshPermissions],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setPermissions({});
    setPermissionsLoaded(false);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        permissions,
        permissionsLoaded,
        theme,
        login,
        changePassword,
        logout,
        refreshPermissions,
        refreshTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
