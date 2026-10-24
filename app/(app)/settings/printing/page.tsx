'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import type { DisplaySettingsRecord, LabelPrintSettingsRecord, ConditionPrintSettingsRecord, CustomPrintSettingsRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { PageLoading } from '@/components/ui/spinner';
import { cn } from '@/lib/cn';
import { LabelPrintForm } from '@/components/settings/label-print-form';
import { ConditionPrintForm } from '@/components/settings/condition-print-form';
import { CustomPrintForm } from '@/components/settings/custom-print-form';

const TABS = [
  { key: 'label', label: 'Label Printing' },
  { key: 'condition', label: 'Condition Printing' },
  { key: 'custom', label: 'Custom Printing' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function PrintingSettingsPage() {
  const [tab, setTab] = useState<TabKey>('label');
  const { data: labelSettings, loading: labelLoading, refetch: refetchLabel } = useApi<LabelPrintSettingsRecord>('/settings/label-print');
  const { data: conditionSettings, loading: conditionLoading, refetch: refetchCondition } = useApi<ConditionPrintSettingsRecord>('/settings/condition-print');
  const { data: customSettings, loading: customLoading, refetch: refetchCustom } = useApi<CustomPrintSettingsRecord>('/settings/custom-print');
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');

  const loading =
    (tab === 'label' && labelLoading) || (tab === 'condition' && conditionLoading) || (tab === 'custom' && customLoading);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Printing"
        description="Configure the paper size, margins and styling used by each of the three print features: asset tag labels, condition labels, and custom free-text notes."
      />

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key ? 'border-gold text-navy' : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardBody>
          {loading ? (
            <PageLoading />
          ) : tab === 'label' ? (
            <LabelPrintForm
              key={labelSettings ? 'loaded' : 'loading'}
              settings={labelSettings}
              qrCodeEnabled={displaySettings?.qrCodeEnabled ?? false}
              onSaved={refetchLabel}
            />
          ) : tab === 'condition' ? (
            <ConditionPrintForm key={conditionSettings ? 'loaded' : 'loading'} settings={conditionSettings} onSaved={refetchCondition} />
          ) : (
            <CustomPrintForm key={customSettings ? 'loaded' : 'loading'} settings={customSettings} onSaved={refetchCustom} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
