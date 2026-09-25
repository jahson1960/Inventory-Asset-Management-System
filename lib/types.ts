export type Role = 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'CUSTODIAN' | 'STAFF' | 'AUDITOR' | 'APPROVER' | 'HOD';

export type LocationType = 'BUILDING' | 'FLOOR' | 'ROOM' | 'STORE';
export type AssetTrackingType = 'FIXED_ASSET' | 'CONTROLLED_EQUIPMENT';
export type AssetCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
export type AssetStatus = 'IN_STORE' | 'ASSIGNED' | 'UNDER_MAINTENANCE' | 'RETIRED' | 'DISPOSED' | 'LOST';
export type AdjustmentMovementType = 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE';

export type StockMovementType =
  | 'OPENING_BALANCE'
  | 'RECEIPT'
  | 'ISSUE'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'DAMAGE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';

// Phase 2 — workflow engine

export type WorkflowEntityType =
  | 'ASSET_REQUEST'
  | 'INVENTORY_REQUEST'
  | 'EQUIPMENT_LOAN'
  | 'ASSET_TRANSFER'
  | 'INVENTORY_TRANSFER'
  | 'MAINTENANCE_REQUEST';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'FULFILLED';
export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type ApprovalDecisionType = 'APPROVED' | 'REJECTED';

export interface ApprovalWorkflowStep {
  id: string;
  entityType: WorkflowEntityType;
  stepOrder: number;
  requiredRole: Role;
  isActive: boolean;
}

export interface ApprovalDecisionEntry {
  id: string;
  entityType: WorkflowEntityType;
  entityId: string;
  stepOrder: number;
  actorUserId: string;
  decision: ApprovalDecisionType;
  comments: string | null;
  decidedAt: string;
  actor?: { id: string; firstName: string; lastName: string; email: string; role: Role };
}

export interface PendingApprovalItem {
  entityType: WorkflowEntityType;
  entityId: string;
  currentStepOrder: number;
  requiredRole: Role;
  summary: string;
  createdAt: string;
  requestedByName: string | null;
  departmentName: string | null;
}

export interface AssetRequestRecord {
  id: string;
  requestedById: string;
  departmentId: string;
  branchId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  justification: string | null;
  estimatedCost: string | null;
  quantity: number;
  status: RequestStatus;
  currentStepOrder: number;
  fulfilledAssetId: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  requestedBy?: Staff;
  department?: Department;
  branch?: Branch;
  category?: AssetCategory | null;
  fulfilledAsset?: Asset | null;
}

export interface InventoryRequestRecord {
  id: string;
  requestedById: string;
  departmentId: string;
  itemId: string;
  locationId: string;
  quantityRequested: string;
  unitId: string;
  purpose: string | null;
  status: RequestStatus;
  currentStepOrder: number;
  issuanceId: string | null;
  createdAt: string;
  requestedBy?: Staff;
  department?: Department;
  item?: InventoryItem;
  location?: LocationNode;
  unit?: UnitOfMeasure;
}

export interface EquipmentLoanRequestRecord {
  id: string;
  assetId: string;
  requestedById: string;
  departmentId: string;
  purpose: string;
  expectedReturnDate: string;
  status: RequestStatus;
  currentStepOrder: number;
  createdAt: string;
  requestedBy?: Staff;
  department?: Department;
  asset?: Asset;
}

export interface AssetTransferRecord {
  id: string;
  assetId: string;
  fromLocationId: string;
  toLocationId: string;
  fromCustodianId: string | null;
  toCustodianId: string | null;
  reason: string;
  status: TransferStatus;
  currentStepOrder: number;
  initiatedById: string;
  receivingAcknowledged: boolean;
  completedAt: string | null;
  createdAt: string;
  asset?: Asset;
  fromLocation?: LocationNode;
  toLocation?: LocationNode;
  fromCustodian?: Staff | null;
  toCustodian?: Staff | null;
  initiatedBy?: { id: string; firstName: string; lastName: string };
}

export interface InventoryTransferRecord {
  id: string;
  itemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: string;
  unitId: string;
  reason: string | null;
  status: TransferStatus;
  currentStepOrder: number;
  initiatedById: string;
  completedAt: string | null;
  createdAt: string;
  item?: InventoryItem;
  fromLocation?: LocationNode;
  toLocation?: LocationNode;
  unit?: UnitOfMeasure;
  initiatedBy?: { id: string; firstName: string; lastName: string };
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface SmtpSettingsRecord {
  host: string | null;
  port: number | null;
  secure: boolean;
  username: string | null;
  fromEmail: string | null;
  fromName: string | null;
  isConfigured: boolean;
}

// Phase 4 — depreciation

export type DepreciationMethod = 'STRAIGHT_LINE' | 'REDUCING_BALANCE';

export interface DepreciationSettingsRecord {
  defaultMethod: DepreciationMethod;
  defaultDecliningBalanceRate: string | null;
}

export interface DepreciationResult {
  method: DepreciationMethod;
  monthsElapsed: number;
  accumulatedDepreciation: string;
  netBookValue: string;
}

export interface AssetValuationItem {
  assetId: string;
  assetTag: string;
  name: string;
  category: string;
  branch: string;
  purchaseCost: string | null;
  purchaseDate: string | null;
  method: DepreciationMethod | null;
  accumulatedDepreciation: string | null;
  netBookValue: string | null;
}

export interface AssetValuationReport {
  items: AssetValuationItem[];
  summary: {
    totalPurchaseCost: string | null;
    totalAccumulatedDepreciation: string | null;
    totalNetBookValue: string | null;
  };
}

// Phase 5 — grab-bag admin configurability

export interface DisplaySettingsRecord {
  purchaseCostVisibleRoles: Role[];
  assetRequiredFields: string[];
  signatureRequired: boolean;
  cardViewLists: string[];
  maxLogoSizeKb: number;
  maxFaviconSizeKb: number;
  maxSignatureSizeKb: number;
  estimatedCostVisibleRoles: Role[];
  estimatedCostEnabled: boolean;
  pageSize: number;
  scanEnabled: boolean;
  qrCodeEnabled: boolean;
  inlineCreateEnabled: boolean;
}

export interface ThemeSettingsRecord {
  navy: string;
  navyDark: string;
  gold: string;
  goldDark: string;
  goldLight: string;
  cream: string;
  creamDark: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  companyName: string | null;
}

export type PermissionRules = Record<string, Role[]>;

export interface IssuanceRecord {
  id: string;
  itemId: string;
  quantityIssued: string;
  enteredUnit?: UnitOfMeasure;
  issuedAt: string;
  requestedBy?: Staff;
}

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  branchId: string | null;
  departmentId: string | null;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface Department {
  id: string;
  branchId: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface LocationNode {
  id: string;
  branchId: string;
  parentId: string | null;
  type: LocationType;
  name: string;
  code: string | null;
  defaultCustodianId: string | null;
  isActive: boolean;
}

export interface AssetCategory {
  id: string;
  parentId: string | null;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
}

export interface InventoryCategory {
  id: string;
  parentId: string | null;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
}

export interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

export interface Staff {
  id: string;
  staffNumber: string;
  userId: string | null;
  branchId: string;
  departmentId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  isActive: boolean;
  branch?: Branch;
  department?: Department;
}

export interface Asset {
  id: string;
  assetTag: string;
  trackingType: AssetTrackingType;
  categoryId: string;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchaseCost: string | null;
  supplier: string | null;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  warrantyProvider: string | null;
  condition: AssetCondition;
  status: AssetStatus;
  currentLocationId: string;
  currentCustodianId: string | null;
  branchId: string;
  notes: string | null;
  usefulLifeMonths: number | null;
  depreciationMethod: DepreciationMethod | null;
  depreciationRate: string | null;
  salvageValue: string | null;
  category?: AssetCategory;
  currentLocation?: LocationNode;
  currentCustodian?: Staff | null;
  branch?: Branch;
  attachments?: AssetAttachment[];
  depreciation?: DepreciationResult | null;
}

export interface AssetAttachment {
  id: string;
  assetId: string;
  fileUrl: string;
  fileType: 'PHOTO' | 'DOCUMENT';
  label: string | null;
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  staffId: string;
  assignmentType: 'PERMANENT' | 'TEMPORARY';
  assignedAt: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  status: 'ACTIVE' | 'RETURN_PENDING' | 'RETURNED';
  returnRequestedAt: string | null;
  returnRequestNotes: string | null;
  returnedAt: string | null;
  notes: string | null;
  expectedReturnDate: string | null;
  purpose: string | null;
  conditionAtIssue: AssetCondition | null;
  conditionAtReturn: AssetCondition | null;
  returnRemarks: string | null;
  asset?: Asset;
  staff?: Staff;
  assignedBy?: { id: string; firstName: string; lastName: string; email: string };
}

export interface InventoryItemUnit {
  id: string;
  itemId: string;
  unitId: string;
  conversionFactor: string;
  isDefaultTransactionUnit: boolean;
  unit?: UnitOfMeasure;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  description: string | null;
  categoryId: string;
  brand: string | null;
  baseUnitId: string;
  barcode: string | null;
  preferredSupplier: string | null;
  unitCost: string | null;
  minStockLevel: string;
  maxStockLevel: string | null;
  primaryStoreLocationId: string | null;
  isActive: boolean;
  category?: InventoryCategory;
  baseUnit?: UnitOfMeasure;
  primaryStoreLocation?: LocationNode;
  units?: InventoryItemUnit[];
}

export interface StockBalance {
  id: string;
  itemId: string;
  locationId: string;
  quantityOnHand: string;
  updatedAt: string;
  item?: InventoryItem;
  location?: LocationNode;
}

export interface StockMovement {
  id: string;
  itemId: string;
  locationId: string;
  movementType: StockMovementType;
  quantityBaseUnit: string;
  enteredQuantity: string;
  enteredUnitId: string;
  occurredAt: string;
  notes: string | null;
  item?: InventoryItem;
  location?: LocationNode;
  enteredUnit?: UnitOfMeasure;
  performedBy?: { id: string; firstName: string; lastName: string };
}

export interface InventoryIssuance {
  id: string;
  itemId: string;
  locationId: string;
  requestedById: string;
  departmentId: string;
  quantityRequested: string;
  quantityIssued: string;
  enteredUnitId: string;
  purpose: string | null;
  status: string;
  recipientAcknowledged: boolean;
  issuedAt: string;
  item?: InventoryItem;
  location?: LocationNode;
  requestedBy?: Staff;
  department?: Department;
  enteredUnit?: UnitOfMeasure;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  branchId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorUser?: { id: string; firstName: string; lastName: string; email: string } | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Phase 3 — maintenance, verification, stock counts

export interface MaintenanceRequestRecord {
  id: string;
  assetId: string;
  reportedById: string;
  faultDescription: string;
  status: RequestStatus;
  currentStepOrder: number;
  technician: string | null;
  vendor: string | null;
  serviceDate: string | null;
  workPerformed: string | null;
  partsUsed: string | null;
  cost: string | null;
  nextMaintenanceDate: string | null;
  assetConditionAfter: AssetCondition | null;
  resolvedAt: string | null;
  createdAt: string;
  asset?: Asset;
  reportedBy?: Staff;
  resolvedBy?: { id: string; firstName: string; lastName: string } | null;
  attachments?: AssetAttachment[];
}

export type VerificationCampaignStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type VerificationOutcome = 'PENDING' | 'VERIFIED_OK' | 'DISCREPANCY';
export type DiscrepancyType =
  | 'NONE'
  | 'NOT_FOUND'
  | 'WRONG_LOCATION'
  | 'WRONG_CUSTODIAN'
  | 'DAMAGED'
  | 'UNLABELLED'
  | 'DUPLICATE_TAG';

export interface VerificationCampaignRecord {
  id: string;
  name: string;
  branchId: string;
  locationId: string | null;
  startDate: string;
  dueDate: string;
  status: VerificationCampaignStatus;
  createdAt: string;
  branch?: Branch;
  location?: LocationNode | null;
  createdBy?: { id: string; firstName: string; lastName: string };
  stats?: { total: number; verifiedOk: number; discrepancy: number; pending: number };
}

export interface VerificationScanRecord {
  id: string;
  campaignId: string;
  assetId: string;
  scannedById: string | null;
  scannedAt: string | null;
  outcome: VerificationOutcome;
  discrepancyType: DiscrepancyType;
  observedLocationId: string | null;
  observedCustodianId: string | null;
  observedCondition: AssetCondition | null;
  observedStatus: AssetStatus | null;
  notes: string | null;
  createdAt: string;
  asset?: Asset;
  campaign?: VerificationCampaignRecord;
  scannedBy?: { id: string; firstName: string; lastName: string } | null;
  observedLocation?: LocationNode | null;
  observedCustodian?: Staff | null;
}

export type StockCountStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface StockCountLineRecord {
  id: string;
  sessionId: string;
  itemId: string;
  systemQuantity: string;
  physicalQuantity: string | null;
  variance: string | null;
  countedAt: string | null;
  adjustmentMovementId: string | null;
  notes: string | null;
  item?: InventoryItem;
  countedBy?: { id: string; firstName: string; lastName: string } | null;
}

export interface StockCountSessionRecord {
  id: string;
  name: string;
  locationId: string;
  status: StockCountStatus;
  createdAt: string;
  location?: LocationNode;
  createdBy?: { id: string; firstName: string; lastName: string };
  lines?: StockCountLineRecord[];
}
