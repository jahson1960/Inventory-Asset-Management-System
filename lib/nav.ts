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
    items: [{ label: 'Dashboard', href: '/dashboard' }],
  },
  {
    title: 'Approvals',
    items: [
      { label: 'My Approvals', href: '/approvals' },
      { label: 'Asset Requests', href: '/asset-requests' },
      { label: 'Inventory Requests', href: '/inventory-requests' },
      { label: 'Equipment Loans', href: '/loans' },
      { label: 'Asset Transfers', href: '/asset-transfers' },
      { label: 'Inventory Transfers', href: '/inventory-transfers' },
      { label: 'Maintenance', href: '/maintenance' },
    ],
  },
  {
    title: 'Assets',
    items: [
      { label: 'Asset Register', href: '/assets' },
      { label: 'Assignments', href: '/assignments' },
      { label: 'Scan Asset', href: '/scan' },
      { label: 'Verification Campaigns', href: '/verification', permission: 'nav.verification' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Item Catalogue', href: '/inventory' },
      { label: 'Stock Balances', href: '/stock/balances' },
      { label: 'Stock Movements', href: '/stock/movements' },
      { label: 'Issuance', href: '/issuance' },
      { label: 'Stock Counts', href: '/stock-counts', permission: 'nav.stockCounts' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Asset Register Report', href: '/reports/assets-register' },
      { label: 'Assets Summary', href: '/reports/assets-summary' },
      { label: 'Unassigned Assets', href: '/reports/unassigned-assets' },
      { label: 'Stock Balances Report', href: '/reports/stock-balances' },
      { label: 'Low Stock', href: '/reports/low-stock' },
      { label: 'Consumption by Department', href: '/reports/consumption-by-department' },
      { label: 'Warranty Expiring', href: '/reports/warranty-expiring' },
      { label: 'Due for Verification', href: '/reports/due-verification' },
      { label: 'Missing Assets', href: '/reports/missing-assets' },
      { label: 'Upcoming Maintenance', href: '/reports/upcoming-maintenance' },
      { label: 'Repeated Faults', href: '/reports/repeated-faults' },
      { label: 'Stock Count Discrepancies', href: '/reports/stock-count-discrepancies' },
      { label: 'Asset Valuation', href: '/reports/asset-valuation' },
    ],
  },
  {
    title: 'Organization',
    items: [
      { label: 'Staff', href: '/staff', permission: 'nav.staff' },
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
