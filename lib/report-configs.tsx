import type { ReactNode } from 'react';
import type { Asset, AssetValuationItem, AssetValuationReport, StockBalance, StockCountLineRecord, VerificationScanRecord } from './types';

export interface ReportColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
}

export interface ReportConfig<T = unknown, S = unknown> {
  title: string;
  description: string;
  path: string;
  /** Extra querystring params to send, e.g. a fixed groupBy for the summary report. */
  query?: Record<string, string>;
  /** groupBy selector shown above the table, for the assets-summary report. */
  groupBySelector?: boolean;
  columns: ReportColumn<T>[];
  /** For reports whose endpoint returns `{ items, summary }` instead of a flat array — shown as a
   *  stats bar above the table. */
  summaryColumns?: ReportColumn<S>[];
}

interface AssetSummaryRow {
  key: string;
  label: string;
  count: number;
}

interface ConsumptionRow {
  departmentId: string;
  departmentName: string;
  totalBaseUnitQuantity: string;
}

interface UpcomingMaintenanceRow {
  id: string;
  nextMaintenanceDate: string;
  asset: { assetTag: string; name: string };
}

interface RepeatedFaultRow {
  assetId: string;
  assetTag: string;
  assetName: string;
  count: number;
}

// Each report's row shape is genuinely different (Asset, StockBalance, summary buckets, ...);
// the map is looked up dynamically by route param, so a single existential element type is needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const REPORT_CONFIGS: Record<string, ReportConfig<any, any>> = {
  'assets-register': {
    title: 'Complete Asset Register',
    description: 'Every asset in scope, with category, location and custodian.',
    path: '/reports/assets/register',
    columns: [
      { header: 'Asset Tag', render: (a: Asset) => a.assetTag },
      { header: 'Name', render: (a: Asset) => a.name },
      { header: 'Category', render: (a: Asset) => a.category?.name ?? '—' },
      { header: 'Location', render: (a: Asset) => a.currentLocation?.name ?? '—' },
      {
        header: 'Custodian',
        render: (a: Asset) => (a.currentCustodian ? `${a.currentCustodian.firstName} ${a.currentCustodian.lastName}` : '—'),
      },
      { header: 'Status', render: (a: Asset) => a.status.replace('_', ' ') },
      { header: 'Condition', render: (a: Asset) => a.condition },
    ],
  },
  'assets-summary': {
    title: 'Assets Summary',
    description: 'Asset counts grouped by a chosen dimension.',
    path: '/reports/assets/summary',
    groupBySelector: true,
    columns: [
      { header: 'Group', render: (r: AssetSummaryRow) => r.label },
      { header: 'Count', render: (r: AssetSummaryRow) => r.count },
    ],
  },
  'unassigned-assets': {
    title: 'Unassigned Assets',
    description: 'Assets currently sitting in a store with no custodian.',
    path: '/reports/assets/unassigned',
    columns: [
      { header: 'Asset Tag', render: (a: Asset) => a.assetTag },
      { header: 'Name', render: (a: Asset) => a.name },
      { header: 'Category', render: (a: Asset) => a.category?.name ?? '—' },
      { header: 'Location', render: (a: Asset) => a.currentLocation?.name ?? '—' },
    ],
  },
  'stock-balances': {
    title: 'Stock Balances Report',
    description: 'Current stock on hand by item and location.',
    path: '/reports/stock/balances',
    columns: [
      { header: 'Item', render: (b: StockBalance) => b.item?.name ?? b.itemId },
      { header: 'Location', render: (b: StockBalance) => b.location?.name ?? '—' },
      { header: 'Quantity', render: (b: StockBalance) => `${b.quantityOnHand} ${b.item?.baseUnit?.code ?? ''}` },
    ],
  },
  'low-stock': {
    title: 'Low Stock Items',
    description: 'Items currently below their configured minimum/reorder level.',
    path: '/reports/stock/low-stock',
    columns: [
      { header: 'Item', render: (b: StockBalance) => b.item?.name ?? b.itemId },
      { header: 'Location', render: (b: StockBalance) => b.location?.name ?? '—' },
      { header: 'On hand', render: (b: StockBalance) => `${b.quantityOnHand} ${b.item?.baseUnit?.code ?? ''}` },
      { header: 'Min level', render: (b: StockBalance) => `${b.item?.minStockLevel} ${b.item?.baseUnit?.code ?? ''}` },
    ],
  },
  'consumption-by-department': {
    title: 'Stock Consumption by Department',
    description: 'Total quantity issued to each department (base units).',
    path: '/reports/stock/consumption-by-department',
    columns: [
      { header: 'Department', render: (r: ConsumptionRow) => r.departmentName },
      { header: 'Total issued', render: (r: ConsumptionRow) => r.totalBaseUnitQuantity },
    ],
  },
  'warranty-expiring': {
    title: 'Assets Nearing Warranty Expiry',
    description: 'Assets whose warranty ends within the next 90 days.',
    path: '/reports/assets/warranty-expiring',
    columns: [
      { header: 'Asset Tag', render: (a: Asset) => a.assetTag },
      { header: 'Name', render: (a: Asset) => a.name },
      { header: 'Location', render: (a: Asset) => a.currentLocation?.name ?? '—' },
      { header: 'Warranty ends', render: (a: Asset) => a.warrantyEndDate ?? '—' },
    ],
  },
  'due-verification': {
    title: 'Assets Due for Verification',
    description: 'Assets still pending a scan in an active verification campaign.',
    path: '/reports/assets/due-verification',
    columns: [
      { header: 'Asset Tag', render: (s: VerificationScanRecord) => s.asset?.assetTag ?? '—' },
      { header: 'Name', render: (s: VerificationScanRecord) => s.asset?.name ?? '—' },
      { header: 'Campaign', render: (s: VerificationScanRecord) => s.campaign?.name ?? '—' },
    ],
  },
  'missing-assets': {
    title: 'Missing Assets',
    description: 'Assets most recently reported not found during a verification scan.',
    path: '/reports/assets/missing',
    columns: [
      { header: 'Asset Tag', render: (s: VerificationScanRecord) => s.asset?.assetTag ?? '—' },
      { header: 'Name', render: (s: VerificationScanRecord) => s.asset?.name ?? '—' },
      { header: 'Campaign', render: (s: VerificationScanRecord) => s.campaign?.name ?? '—' },
      { header: 'Reported', render: (s: VerificationScanRecord) => (s.scannedAt ? new Date(s.scannedAt).toLocaleDateString() : '—') },
    ],
  },
  'upcoming-maintenance': {
    title: 'Upcoming Maintenance',
    description: 'Assets with maintenance due within the next 30 days.',
    path: '/reports/maintenance/upcoming',
    columns: [
      { header: 'Asset Tag', render: (r: UpcomingMaintenanceRow) => r.asset.assetTag },
      { header: 'Name', render: (r: UpcomingMaintenanceRow) => r.asset.name },
      { header: 'Due', render: (r: UpcomingMaintenanceRow) => new Date(r.nextMaintenanceDate).toLocaleDateString() },
    ],
  },
  'repeated-faults': {
    title: 'Repeated Faults',
    description: 'Assets with 3 or more maintenance requests in the last 180 days.',
    path: '/reports/maintenance/repeated-faults',
    columns: [
      { header: 'Asset Tag', render: (r: RepeatedFaultRow) => r.assetTag },
      { header: 'Name', render: (r: RepeatedFaultRow) => r.assetName },
      { header: 'Fault count', render: (r: RepeatedFaultRow) => r.count },
    ],
  },
  'stock-count-discrepancies': {
    title: 'Stock Count Discrepancies',
    description: 'Counted items whose physical quantity differed from the system balance.',
    path: '/reports/stock-counts/discrepancies',
    columns: [
      { header: 'Item', render: (l: StockCountLineRecord) => l.item?.name ?? l.itemId },
      { header: 'System qty', render: (l: StockCountLineRecord) => l.systemQuantity },
      { header: 'Physical qty', render: (l: StockCountLineRecord) => l.physicalQuantity ?? '—' },
      { header: 'Variance', render: (l: StockCountLineRecord) => l.variance ?? '—' },
      { header: 'Posted', render: (l: StockCountLineRecord) => (l.adjustmentMovementId ? 'Yes' : 'No') },
    ],
  },
  'asset-valuation': {
    title: 'Asset Valuation',
    description: 'Depreciation and net book value for every asset in scope.',
    path: '/reports/assets/valuation',
    columns: [
      { header: 'Asset Tag', render: (r: AssetValuationItem) => r.assetTag },
      { header: 'Name', render: (r: AssetValuationItem) => r.name },
      { header: 'Category', render: (r: AssetValuationItem) => r.category },
      { header: 'Method', render: (r: AssetValuationItem) => r.method?.replace('_', ' ') ?? '—' },
      { header: 'Purchase Cost', render: (r: AssetValuationItem) => r.purchaseCost ?? '—' },
      { header: 'Accum. Depreciation', render: (r: AssetValuationItem) => r.accumulatedDepreciation ?? '—' },
      { header: 'Net Book Value', render: (r: AssetValuationItem) => r.netBookValue ?? '—' },
    ],
    summaryColumns: [
      { header: 'Total Purchase Cost', render: (s: AssetValuationReport['summary']) => s.totalPurchaseCost },
      { header: 'Total Accum. Depreciation', render: (s: AssetValuationReport['summary']) => s.totalAccumulatedDepreciation },
      { header: 'Total Net Book Value', render: (s: AssetValuationReport['summary']) => s.totalNetBookValue },
    ],
  },
};

export const ASSET_GROUP_BY_OPTIONS = ['branch', 'department', 'location', 'staff', 'category', 'condition', 'status'];
