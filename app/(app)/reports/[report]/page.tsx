'use client';

import { use, useState } from 'react';
import { notFound } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { REPORT_CONFIGS, ASSET_GROUP_BY_OPTIONS } from '@/lib/report-configs';
import { exportToCsv } from '@/lib/csv-export';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';

export default function ReportPage({ params }: { params: Promise<{ report: string }> }) {
  const { report } = use(params);
  const config = REPORT_CONFIGS[report];
  const [groupBy, setGroupBy] = useState('status');

  if (!config) notFound();

  const { data, loading, error } = useApi<unknown>(config.path, config.groupBySelector ? { groupBy } : config.query);
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown[] } | undefined)?.items)
      ? (data as { items: unknown[] }).items
      : [];
  const summary = Array.isArray(data) ? undefined : (data as { summary?: unknown } | undefined)?.summary;

  function onExportCsv() {
    exportToCsv(
      report,
      rows,
      config.columns.map((col) => ({ header: col.header, value: (row: unknown) => String(col.render(row) ?? '') })),
    );
  }

  return (
    <div>
      <PageHeader
        title={config.title}
        description={config.description}
        action={
          rows.length > 0 && (
            <div className="no-print flex gap-2">
              <Button variant="secondary" size="sm" onClick={onExportCsv}>
                Export CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                Print / Save as PDF
              </Button>
            </div>
          )
        }
      />

      {config.groupBySelector && (
        <div className="no-print mb-4">
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="max-w-xs">
            {ASSET_GROUP_BY_OPTIONS.map((g) => (
              <option key={g} value={g}>
                Group by {g}
              </option>
            ))}
          </Select>
        </div>
      )}

      {config.summaryColumns && summary != null && (
        <div className="no-print mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {config.summaryColumns.map((col) => (
            <Card key={col.header}>
              <div className="p-3">
                <p className="text-xs font-medium text-slate-500">{col.header}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{col.render(summary)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        {loading ? (
          <PageLoading />
        ) : error ? (
          <div className="p-4">
            <ErrorAlert message={error} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState message="No data for this report." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                {config.columns.map((col) => (
                  <Th key={col.header}>{col.header}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row, idx) => (
                <Tr key={idx}>
                  {config.columns.map((col) => (
                    <Td key={col.header}>{col.render(row)}</Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
