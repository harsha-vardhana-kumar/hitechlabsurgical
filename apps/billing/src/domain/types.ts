export type ID = string;
export type DocumentKind =
  | "quotation"
  | "invoice"
  | "purchase-order"
  | "purchase-bill"
  | "credit-note"
  | "purchase-return";
export type DocumentStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "converted"
  | "issued"
  | "partially-received"
  | "received"
  | "cancelled";
export type UserRole = "Owner" | "Admin" | "Accounts" | "Sales" | "Viewer";
export type Permission =
  | "view"
  | "documents.create"
  | "documents.edit"
  | "documents.finalize"
  | "payments.record"
  | "inventory.manage"
  | "reports.view"
  | "settings.manage"
  | "parties.manage";
export interface Session {
  id: string;
  name: string;
  role: UserRole;
  demo: boolean;
}
export interface Party {
  id: ID;
  kind: "customer" | "supplier";
  name: string;
  organization: string;
  contactPerson: string;
  type: string;
  phone: string;
  email: string;
  gstin: string;
  billingAddress: string;
  shippingAddress: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  country: string;
  creditLimitPaise: number;
  paymentTerms: number;
  notes: string;
  active: boolean;
  createdAt: string;
}
export interface Product {
  id: ID;
  name: string;
  sku: string;
  category: string;
  subcategory: string;
  brand: string;
  hsn: string;
  unit: string;
  purchasePaise: number;
  salePaise: number;
  taxBps: number;
  reorderMilli: number;
  batchTracking: boolean;
  expiryTracking: boolean;
  active: boolean;
  notes: string;
  manufacturer: string;
  model: string;
  packSize: string;
  catalogueNumber: string;
  barcode: string;
}
export interface ProductBatch {
  id: ID;
  productId: ID;
  lot: string;
  manufactured: string;
  expires: string;
  costPaise: number;
  salePaise: number;
  status: "active" | "quarantined";
}
export type MovementType =
  | "opening"
  | "purchase"
  | "sale"
  | "sales-return"
  | "purchase-return"
  | "adjustment"
  | "reversal";
export interface StockMovement {
  id: ID;
  productId: ID;
  batchId: ID;
  quantityMilli: number;
  type: MovementType;
  date: string;
  documentId: ID;
  reason: string;
  actor: string;
}
export interface LineItem {
  id: ID;
  productId: ID;
  name: string;
  description: string;
  hsn: string;
  unit: string;
  quantityMilli: number;
  ratePaise: number;
  discountBps: number;
  taxBps: number;
  batchId: ID;
  sourceItemId: ID;
  receivedMilli: number;
}
export type Rounding = "paise" | "rupee";
export interface TaxPolicy {
  enabled: boolean;
  inclusive: boolean;
  businessState: string;
  placeOfSupply: string;
  rounding: Rounding;
  stateTaxLabel: "SGST" | "UTGST";
}
export interface LineTotal {
  subtotal: number;
  discount: number;
  documentDiscount: number;
  taxable: number;
  tax: number;
  total: number;
}
export interface Totals {
  lines: LineTotal[];
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  cgst: number;
  sgst: number;
  igst: number;
  unallocatedTax: number;
  roundOff: number;
  grandTotal: number;
  jurisdiction: "none" | "intra" | "inter" | "unresolved";
}
export interface Numbering {
  prefix: string;
  next: number;
  padding: number;
  includeFY: boolean;
  resetFY: boolean;
  period: string;
}
export interface BusinessSettings {
  name: string;
  legalName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  country: string;
  gstin: string;
  pan: string;
  website: string;
  logo: string;
  gstEnabled: boolean;
  defaultTaxBps: number;
  inclusive: boolean;
  rounding: Rounding;
  stateTaxLabel: "SGST" | "UTGST";
  financialYearStart: number;
  nearExpiryDays: number;
  numbering: Record<DocumentKind, Numbering>;
  invoiceTerms: string;
  quotationTerms: string;
  footer: string;
  notes: string;
  signature: string;
  transportEnabled: boolean;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upi: string;
  paymentMethods: string[];
  expenseCategories: string[];
}
export interface BillingDocument {
  id: ID;
  kind: DocumentKind;
  number: string;
  date: string;
  dueDate: string;
  partyId: ID;
  billingAddress: string;
  shippingAddress: string;
  placeOfSupply: string;
  reference: string;
  salesperson: string;
  paymentTerms: string;
  deliveryReference: string;
  notes: string;
  terms: string;
  items: LineItem[];
  discountPaise: number;
  taxPolicy: TaxPolicy;
  status: DocumentStatus;
  sourceId: ID;
  createdAt: string;
  postedAt: string;
  totals?: Totals;
  partySnapshot?: Party;
  businessSnapshot?: BusinessSettings;
}
export interface Payment {
  id: ID;
  direction: "received" | "made";
  documentId: ID;
  partyId: ID;
  date: string;
  amountPaise: number;
  method: string;
  reference: string;
  notes: string;
  voided: boolean;
}
export interface Expense {
  id: ID;
  date: string;
  category: string;
  vendor: string;
  amountPaise: number;
  taxPaise: number;
  method: string;
  reference: string;
  notes: string;
  attachmentName: string;
  archived: boolean;
}
export interface AuditEvent {
  id: ID;
  at: string;
  actor: string;
  action: string;
  entityId: ID;
  detail: string;
}
export interface Workspace {
  version: 1;
  revision: number;
  settings: BusinessSettings;
  parties: Party[];
  products: Product[];
  batches: ProductBatch[];
  documents: BillingDocument[];
  payments: Payment[];
  expenses: Expense[];
  movements: StockMovement[];
  audit: AuditEvent[];
}
export const documentLabels: Record<DocumentKind, string> = {
  quotation: "Quotation",
  invoice: "Invoice",
  "purchase-order": "Purchase order",
  "purchase-bill": "Purchase bill",
  "credit-note": "Credit note",
  "purchase-return": "Purchase return",
};
export const documentPaths: Record<DocumentKind, string> = {
  quotation: "/sales/quotations",
  invoice: "/sales/invoices",
  "purchase-order": "/purchases/orders",
  "purchase-bill": "/purchases/bills",
  "credit-note": "/sales/credit-notes",
  "purchase-return": "/purchases/returns",
};
