'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { SmtpSettingsRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Label } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function EmailSettingsPage() {
  const { data: settings, loading, refetch } = useApi<SmtpSettingsRecord>('/settings/smtp');

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Email (SMTP)"
        description="Configure the SMTP server used to send email notifications."
        action={<Badge tone={settings?.isConfigured ? 'green' : 'amber'}>{settings?.isConfigured ? 'Configured' : 'Not configured'}</Badge>}
      />
      <Card>
        <CardBody>
          <SmtpForm settings={settings} onSaved={refetch} />
        </CardBody>
      </Card>
      {settings?.isConfigured && (
        <Card className="mt-4">
          <CardBody>
            <TestEmailForm />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function SmtpForm({ settings, onSaved }: { settings?: SmtpSettingsRecord; onSaved: () => void }) {
  const [host, setHost] = useState(settings?.host ?? '');
  const [port, setPort] = useState(settings?.port?.toString() ?? '587');
  const [secure, setSecure] = useState(settings?.secure ?? true);
  const [username, setUsername] = useState(settings?.username ?? '');
  const [password, setPassword] = useState('');
  const [fromEmail, setFromEmail] = useState(settings?.fromEmail ?? '');
  const [fromName, setFromName] = useState(settings?.fromName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Save these SMTP settings?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await api.put('/settings/smtp', {
        host,
        port: Number(port),
        secure,
        username: username || undefined,
        password: password || undefined,
        fromEmail,
        fromName: fromName || undefined,
      });
      setSaved(true);
      setPassword('');
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save SMTP settings');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <ErrorAlert message={error} />}
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="host" required>SMTP host</Label>
          <Input id="host" required value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.office365.com" />
        </Field>
        <Field>
          <Label htmlFor="port" required>Port</Label>
          <Input id="port" type="number" required value={port} onChange={(e) => setPort(e.target.value)} />
        </Field>
      </div>

      <label className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} />
        Use TLS/SSL
      </label>

      <Field>
        <Label htmlFor="username">Username</Label>
        <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
      </Field>

      <Field>
        <Label htmlFor="password">Password {settings?.isConfigured && '(leave blank to keep current)'}</Label>
        <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="fromEmail" required>From email</Label>
          <Input id="fromEmail" type="email" required value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor="fromName">From name</Label>
          <Input id="fromName" value={fromName} onChange={(e) => setFromName(e.target.value)} />
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}

function TestEmailForm() {
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Send a test email?', message: `A test message will be sent to ${to}.` });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post('/settings/smtp/test', { to });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send test email');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <p className="mb-2 text-sm font-semibold text-slate-900">Send a test email</p>
      {error && <ErrorAlert message={error} />}
      {success && <p className="mb-3 text-sm text-emerald-600">Test email sent successfully.</p>}
      <div className="flex items-end gap-2">
        <Field>
          <Label htmlFor="to" required>Recipient</Label>
          <Input id="to" type="email" required value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send test'}
        </Button>
      </div>
    </form>
  );
}
