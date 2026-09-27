import type { Role } from './types';

export interface NavItem {
  label: string;
  href: string;
  /** Dynamic, admin-editable visibility via the Roles & Permissions matrix. */
  permission?: string;
  /** Hardcoded visibility, bypassing the permission matrix entirely — reserved for the
   *  Roles & Permissions page itself, so an admin can never lock themselves out of it. */
  roles?: Role[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', permission: 'nav.dashboard' }],
  },
  {
    title: 'Approvals',
    items: [
      { label: 'Requests', href: '/approvals', permission: 'nav.requests' },
      { label: 'Asset Requests', href: '/asset-requests', permission: 'nav.assetRequests' },
      { label: 'Inventory Requests', href: '/inventory-requests', permission: 'nav.inventoryRequests' },
      { label: 'Equipment Loans', href: '/loans', permission: 'nav.loans' },
      { label: 'Asset Transfers', href: '/asset-transfers', permission: 'nav.assetTransfers' },
      { label: 'Inventory Transfers', href: '/inventory-transfers', permission: 'nav.inventoryTransfers' },
      { label: 'Maintenance', href: '/maintenance', permission: 'nav.maintenance' },
    ],
  },
  {
    title: 'Assets',
    items: [
      { label: 'Asset Register', href: '/assets', permission: 'nav.assetRegister' },
      { label: 'Assignments', href: '/assignments', permission: 'nav.assignments' },
      { label: 'Scan Asset', href: '/scan', permission: 'nav.scan' },
      { label: 'Verification Campaigns', href: '/verification', permission: 'nav.verification' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Item Catalogue', href: '/inventory', permission: 'nav.inventoryCatalogue' },
      { label: 'Stock Balances', href: '/stock/balances', permission: 'nav.stockBalances' },
      { label: 'Stock Movements', href: '/stock/movements', permission: 'nav.stockMovements' },
      { label: 'Issuance', href: '/issuance', permission: 'nav.issuance' },
      { label: 'Stock Counts', href: '/stock-counts', permission: 'nav.stockCounts' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Asset Register Report', href: '/reports/assets-register', permission: 'nav.reportsAssetRegister' },
      { label: 'Assets Summary', href: '/reports/assets-summary', permission: 'nav.reportsAssetsSummary' },
      { label: 'Unassigned Assets', href: '/reports/unassigned-assets', permission: 'nav.reportsUnassignedAssets' },
      { label: 'Stock Balances Report', href: '/reports/stock-balances', permission: 'nav.reportsStockBalances' },
      { label: 'Low Stock', href: '/reports/low-stock', permission: 'nav.reportsLowStock' },
      {
        label: 'Consumption by Department',
        href: '/reports/consumption-by-department',
        permission: 'nav.reportsConsumptionByDepartment',
      },
      { label: 'Warranty Expiring', href: '/reports/warranty-expiring', permission: 'nav.reportsWarrantyExpiring' },
      { label: 'Due for Verification', href: '/reports/due-verification', permission: 'nav.reportsDueVerification' },
      { label: 'Missing Assets', href: '/reports/missing-assets', permission: 'nav.reportsMissingAssets' },
      {
        label: 'Upcoming Maintenance',
        href: '/reports/upcoming-maintenance',
        permission: 'nav.reportsUpcomingMaintenance',
      },
      { label: 'Repeated Faults', href: '/reports/repeated-faults', permission: 'nav.reportsRepeatedFaults' },
      {
        label: 'Stock Count Discrepancies',
        href: '/reports/stock-count-discrepancies',
        permission: 'nav.reportsStockCountDiscrepancies',
      },
      { label: 'Asset Valuation', href: '/reports/asset-valuation', permission: 'nav.reportsAssetValuation' },
    ],
  },
  {
    title: 'Organization',
    items: [
      { label: 'Branches', href: '/branches', permission: 'nav.branches' },
      { label: 'Departments', href: '/departments', permission: 'nav.departments' },
      { label: 'Locations', href: '/locations', permission: 'nav.locations' },
      { label: 'Asset Categories', href: '/categories/assets', permission: 'nav.assetCategories' },
      { label: 'Inventory Categories', href: '/categories/inventory', permission: 'nav.inventoryCategories' },
      { label: 'Units of Measure', href: '/units-of-measure', permission: 'nav.unitsOfMeasure' },
      { label: 'Suppliers', href: '/suppliers', permission: 'nav.suppliers' },
      { label: 'Users', href: '/users', permission: 'nav.users' },
      { label: 'Audit Log', href: '/audit-log', permission: 'nav.auditLog' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Approval Workflows', href: '/settings/workflows', permission: 'nav.settingsWorkflows' },
      { label: 'Email (SMTP)', href: '/settings/email', permission: 'nav.settingsEmail' },
      { label: 'Email Templates', href: '/settings/email-templates', permission: 'nav.settingsEmailTemplates' },
      { label: 'Depreciation', href: '/settings/depreciation', permission: 'nav.settingsDepreciation' },
      { label: 'Display', href: '/settings/display', permission: 'nav.settingsDisplay' },
      { label: 'Roles & Permissions', href: '/settings/permissions', roles: ['SUPER_ADMIN'] },
    ],
  },
];

export function isNavItemVisible(item: NavItem, role: Role, can: (key: string) => boolean): boolean {
  if (item.permission) return can(item.permission);
  if (item.roles) return item.roles.includes(role);
  return true;
}
