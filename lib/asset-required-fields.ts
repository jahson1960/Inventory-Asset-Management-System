/** Optional Asset fields an admin can mark compulsory via Settings → Display. */
export const ASSET_REQUIRED_FIELD_OPTIONS: { key: string; label: string }[] = [
  { key: 'purchaseCost', label: 'Purchase cost' },
  { key: 'warrantyStartDate', label: 'Warranty start' },
  { key: 'warrantyEndDate', label: 'Warranty end' },
  { key: 'warrantyProvider', label: 'Warranty provider' },
  { key: 'usefulLifeMonths', label: 'Useful life (months)' },
  { key: 'salvageValue', label: 'Salvage value' },
  { key: 'depreciationMethod', label: 'Depreciation method' },
];
