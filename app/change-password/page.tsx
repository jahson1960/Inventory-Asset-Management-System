'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Field, Label } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { ErrorAlert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import { brandLogoUrl } from '@/lib/theme';
import { PageLoading } from '@/components/ui/spinner';

export default function ChangePasswordPage() {
  const { user, loading, changePassword, logout, theme } = useAuth();
  const logoUrl = brandLogoUrl(theme.logoUrl);
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return <PageLoading />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded, arbitrary origin/size
          <img src={logoUrl} alt="Logo" className="mb-4 max-h-14 max-w-full object-contain" />
        ) : (
          <h1 className="text-lg font-semibold text-slate-900">{theme.companyName || 'Asset & Inventory Management'}</h1>
        )}
        <p className="mt-1 mb-1 text-sm font-medium text-slate-900">Set a new password</p>
        <p className="mb-6 text-sm text-slate-500">
          {user.mustChangePassword
            ? 'You must choose a new password before continuing.'
            : 'Enter your current password and choose a new one.'}
        </p>

        {error && <ErrorAlert message={error} />}

        <form onSubmit={onSubmit}>
          <Field>
            <Label htmlFor="currentPassword" required>
              {user.mustChangePassword ? 'Temporary password' : 'Current password'}
            </Label>
            <PasswordInput
              id="currentPassword"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="newPassword" required>New password</Label>
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="confirmPassword" required>Confirm new password</Label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Saving…' : 'Set new password'}
          </Button>
        </form>

        {user.mustChangePassword && (
          <button
            type="button"
            onClick={logout}
            className="mt-4 w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Sign out instead
          </button>
        )}
      </div>
    </div>
  );
}
