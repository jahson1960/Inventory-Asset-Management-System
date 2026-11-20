import * as XLSX from 'xlsx';
import { api } from './api-client';
import type { Paginated } from './types';

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCsv<T>(filename: string, rows: T[], columns: ExportColumn<T>[]): void {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(c.value(row))).join(','));
  const csv = [header, ...lines].join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

const EXPORT_PAGE_SIZE = 1000; // the server-wide cap (PaginationQueryDto's @Max(1000))
const EXPORT_MAX_PAGES = 50; // safety cap — 50,000 rows, far beyond any real list here

/** Pulls every row matching a paginated list's current filters (not just its current page) so
 *  Export covers the whole filtered result set — same endpoint/query the page's list uses, with
 *  the page number dropped, paging through the server's max page size until everything matching
 *  the filters has been collected. */
export async function fetchAllForExport<T>(
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= EXPORT_MAX_PAGES; page++) {
    const result = await api.get<Paginated<T>>(path, { ...query, page, pageSize: EXPORT_PAGE_SIZE });
    items.push(...result.items);
    if (items.length >= result.total || result.items.length < EXPORT_PAGE_SIZE) break;
  }
  return items;
}

export function exportToExcel<T>(filename: string, rows: T[], columns: ExportColumn<T>[]): void {
  const aoa = [columns.map((c) => c.header), ...rows.map((row) => columns.map((c) => c.value(row) ?? ''))];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`,
  );
}
