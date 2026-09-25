'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { EmailTemplateRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Field, Input, Label, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';

const ALWAYS_AVAILABLE_PLACEHOLDERS = ['firstName', 'lastName', 'companyName', 'loginUrl'];

function groupByCategory(templates: EmailTemplateRecord[]): Array<[string, EmailTemplateRecord[]]> {
  const groups = new Map<string, EmailTemplateRecord[]>();
  for (const t of templates) {
    if (!groups.has(t.category)) groups.set(t.category, []);
    groups.get(t.category)!.push(t);
  }
  return Array.from(groups.entries());
}

export default function EmailTemplatesPage() {
  const { data: templates, loading, error, refetch } = useApi<EmailTemplateRecord[]>('/settings/email-templates');
  const [editing, setEditing] = useState<EmailTemplateRecord | null>(null);

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Email Templates"
        description="Standard emails sent automatically for account, request, approval, transfer and return events. Edit the wording or subject — placeholders like {{firstName}} are filled in automatically."
      />

      {error ? (
        <ErrorAlert message={error} />
      ) : (
        groupByCategory(templates ?? []).map(([category, items]) => (
          <Card key={category} className="mb-4">
            <CardHeader className="text-sm font-semibold text-slate-900">{category}</CardHeader>
            <CardBody className="divide-y divide-slate-100 p-0">
              {items.map((t) => (
                <div key={t.key} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.subject}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.isCustomized && <Badge tone="blue">Customized</Badge>}
                    <button
                      type="button"
                      onClick={() => setEditing(t)}
                      className="text-xs font-medium text-gold-dark hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        ))
      )}

      <TemplateEditModal
        key={editing?.key ?? 'none'}
        template={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refetch();
        }}
      />
    </div>
  );
}

function TemplateEditModal({
  template,
  onClose,
  onSaved,
}: {
  template: EmailTemplateRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [body, setBody] = useState(template?.body ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!template) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/settings/email-templates/${template.key}`, { subject, body });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  }

  async function onReset() {
    if (!template) return;
    const ok = await confirm({ title: 'Reset to the standard default?', message: 'Your customized wording will be discarded.' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.del(`/settings/email-templates/${template.key}`);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset template');
    } finally {
      setSubmitting(false);
    }
  }

  if (!template) return null;

  const allPlaceholders = [...ALWAYS_AVAILABLE_PLACEHOLDERS, ...template.placeholders];

  return (
    <Modal open={Boolean(template)} onClose={onClose} title={template.name}>
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        <Field>
          <Label htmlFor="subject" required>Subject</Label>
          <Input id="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor="body" required>Body</Label>
          <Textarea id="body" required rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <p className="mb-4 text-xs text-slate-500">
          Available placeholders:{' '}
          {allPlaceholders.map((p) => (
            <code key={p} className="mr-1 rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-700">
              {`{{${p}}}`}
            </code>
          ))}
        </p>
        <div className="flex justify-between">
          {template.isCustomized ? (
            <Button type="button" variant="secondary" disabled={submitting} onClick={onReset}>
              Reset to default
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
