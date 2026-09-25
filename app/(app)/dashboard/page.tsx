'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import type {
  Asset,
  AssetAssignment,
  AssetValuationReport,
  MaintenanceRequestRecord,
  Paginated,
  StockBalance,
  StockCountLineRecord,
  VerificationCampaignRecord,
} from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { PageLoading } from '@/components/ui/spinner';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: assets, loading: assetsLoading } = useApi<Paginated<Asset>>('/assets', { pageSize: 1 });
  const { data: unassigned, loading: unassignedLoading } = useApi<Paginated<Asset>>('/assets', { unassigned: true, pageSize: 1 });
  const { data: activeAssignments, loading: assignmentsLoading } = useApi<Paginated<AssetAssignment>>('/assignments', {
    status: 'ACTIVE',
    pageSize: 1,
  });
  const { data: lowStock, loading: lowStockLoading } = useApi<StockBalance[]>('/stock/balances', { lowStock: true });
  const { data: maintenanceRequestsPage } = useApi<Paginated<MaintenanceRequestRecord>>('/maintenance-requests', { pageSize: 1000 });
  const maintenanceRequests = maintenanceRequestsPage?.items;
  const { data: warrantyExpiring } = useApi<Asset[]>('/reports/assets/warranty-expiring');
  const { data: campaignsPage } = useApi<Paginated<VerificationCampaignRecord>>('/verification-campaigns', { pageSize: 1000 });
  const campaigns = campaignsPage?.items;
  const { data: stockDiscrepancies } = useApi<StockCountLineRecord[]>('/reports/stock-counts/discrepancies');
  const { data: valuation } = useApi<AssetValuationReport>('/reports/assets/valuation');

  const loading = assetsLoading || unassignedLoading || assignmentsLoading || lowStockLoading;
  const pendingMaintenance = (maintenanceRequests ?? []).filter((m) => m.status === 'PENDING' || m.status === 'APPROVED').length;
  const activeCampaigns = (campaigns ?? []).filter((c) => c.status === 'ACTIVE');

  return (
    <div>
      <PageHeader title={`Welcome, ${user?.firstName ?? ''}`} description="Snapshot of assets and inventory in your scope." />

      {loading ? (
        <PageLoading />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiTile label="Total Assets" value={assets?.total ?? 0} href="/assets" />
            <KpiTile label="Unassigned Assets" value={unassigned?.total ?? 0} href="/reports/unassigned-assets" tone="amber" />
            <KpiTile label="Active Assignments" value={activeAssignments?.total ?? 0} href="/assignments" />
            <KpiTile label="Low Stock Items" value={lowStock?.length ?? 0} href="/reports/low-stock" tone="red" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiTile label="Pending Maintenance" value={pendingMaintenance} href="/maintenance" tone="amber" />
            <KpiTile
              label="Warranty Expiring Soon"
              value={warrantyExpiring?.length ?? 0}
              href="/reports/warranty-expiring"
              tone="amber"
            />
            <KpiTile label="Active Verification Campaigns" value={activeCampaigns.length} href="/verification" />
            <KpiTile
              label="Stock Count Discrepancies"
              value={stockDiscrepancies?.length ?? 0}
              href="/reports/stock-count-discrepancies"
              tone="red"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiTile
              label="Total Net Book Value"
              value={Number(valuation?.summary.totalNetBookValue ?? 0)}
              displayValue={`₦${Number(valuation?.summary.totalNetBookValue ?? 0).toLocaleString()}`}
              href="/reports/asset-valuation"
            />
          </div>
        </>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Quick actions</h2>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/assets/new" className="text-gold-dark hover:underline">
                  Register a new asset
                </Link>
              </li>
              <li>
                <Link href="/inventory/new" className="text-gold-dark hover:underline">
                  Add an inventory item
                </Link>
              </li>
              <li>
                <Link href="/issuance/new" className="text-gold-dark hover:underline">
                  Issue inventory to staff
                </Link>
              </li>
              <li>
                <Link href="/stock/balances" className="text-gold-dark hover:underline">
                  Receive stock
                </Link>
              </li>
              <li>
                <Link href="/maintenance/new" className="text-gold-dark hover:underline">
                  Report a fault
                </Link>
              </li>
              <li>
                <Link href="/scan" className="text-gold-dark hover:underline">
                  Scan an asset
                </Link>
              </li>
              <li>
                <Link href="/stock-counts/new" className="text-gold-dark hover:underline">
                  Start a stock count
                </Link>
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  displayValue,
  href,
  tone = 'default',
}: {
  label: string;
  value: number;
  displayValue?: string;
  href: string;
  tone?: 'default' | 'amber' | 'red';
}) {
  const valueClass = tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-red-600' : 'text-slate-900';
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardBody>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`mt-1 text-2xl font-semibold ${valueClass}`}>{displayValue ?? value}</p>
        </CardBody>
      </Card>
    </Link>
  );
}
