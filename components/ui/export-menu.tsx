'use client';

import { useEffect, useRef, useState } from 'react';
import { exportToCsv, exportToExcel, type ExportColumn } from '@/lib/export-table';
import { Button } from './button';
import { DownloadIcon, ChevronDownIcon } from '@/components/icons/form-icons';

type ExportMenuProps<T> = {
  filename: string;
  columns: ExportColumn<T>[];
  disabled?: boolean;
} & ({ rows: T[]; fetchRows?: undefined } | { rows?: undefined; fetchRows: () => Promise<T[]> });

/** "Export ▾" button with CSV/Excel options, for the PageHeader action area of any list page.
 *  `columns` maps each row to its plain-text/number value (not JSX) — independent from whatever
 *  columns the table/card view itself renders, since those can include badges, links, etc.
 *
 *  Pass `rows` directly when the page already has the full dataset in memory (unpaginated lookup
 *  lists, or report pages that return everything matching the filters). Pass `fetchRows` instead
 *  on a paginated list, so Export pulls every matching row (not just the current page) on demand —
 *  it should issue the same request the page's own list uses, with the current filters but a page
 *  size large enough to cover the whole result set. */
export function ExportMenu<T>({ filename, columns, disabled, ...rowsSource }: ExportMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  async function runExport(format: 'csv' | 'excel') {
    setError(null);
    let rows: T[];
    if (rowsSource.fetchRows) {
      setExporting(true);
      try {
        rows = await rowsSource.fetchRows();
      } catch {
        setError('Failed to load data for export');
        setExporting(false);
        return;
      }
      setExporting(false);
    } else {
      rows = rowsSource.rows;
    }
    if (format === 'csv') exportToCsv(filename, rows, columns);
    else exportToExcel(filename, rows, columns);
    setOpen(false);
  }

  const noRows = rowsSource.rows !== undefined && rowsSource.rows.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} disabled={disabled || noRows}>
        <DownloadIcon className="h-4 w-4" />
        Export
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => runExport('csv')}
            disabled={exporting}
            className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            type="button"
            onClick={() => runExport('excel')}
            disabled={exporting}
            className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
          {error && <p className="px-3 py-1 text-[11px] text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
