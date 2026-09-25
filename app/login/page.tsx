'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Field, Input, Label } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { ErrorAlert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import { brandLogoUrl } from '@/lib/theme';

export default function LoginPage() {
  const { login, theme } = useAuth();
  const logoUrl = brandLogoUrl(theme.logoUrl);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in');
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
        <p className="mt-1 mb-6 text-sm text-slate-500">Rome Business School Nigeria</p>

        {error && <ErrorAlert message={error} />}

        <form onSubmit={onSubmit}>
          <Field>
            <Label htmlFor="email" required>Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="password" required>Password</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
