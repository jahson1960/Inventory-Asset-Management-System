/** Every page that renders through `ExpandableList` and can be toggled between table/card view
 *  via Settings → Display. Keys are stored in `DisplaySettings.cardViewLists`. */
export const CARD_VIEW_LISTS: { key: string; label: string }[] = [
  { key: 'assets', label: 'Asset Register' },
  { key: 'inventory', label: 'Item Catalogue' },
  { key: 'staff', label: 'Staff' },
  { key: 'assetRequests', label: 'Asset Requests' },
  { key: 'inventoryRequests', label: 'Inventory Requests' },
  { key: 'loans', label: 'Equipment Loans' },
  { key: 'assetTransfers', label: 'Asset Transfers' },
  { key: 'inventoryTransfers', label: 'Inventory Transfers' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'approvals', label: 'My Approvals' },
  { key: 'assignments', label: 'Assignments' },
];
