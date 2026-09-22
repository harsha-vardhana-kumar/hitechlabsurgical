import type {
  BillingDocument,
  BusinessSettings,
  Party,
  Product,
} from "./types";
import { validDate } from "./dates";
import { calculate } from "./money";
export class ValidationError extends Error {
  constructor(public issues: Record<string, string>) {
    super(Object.values(issues)[0] || "Check the highlighted fields.");
    this.name = "ValidationError";
  }
}
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function finish(issues: Record<string, string>) {
  if (Object.keys(issues).length) throw new ValidationError(issues);
}
export function validateParty(p: Party) {
  const e: Record<string, string> = {};
  if (!p.name.trim()) e.name = "Enter a name.";
  if (p.email && !email.test(p.email)) e.email = "Enter a valid email address.";
  if (p.phone && !/^[+\d\s()-]{7,20}$/.test(p.phone))
    e.phone = "Enter a valid phone number.";
  if (p.stateCode && !/^\d{2}$/.test(p.stateCode))
    e.stateCode = "Use a two-digit state / UT code.";
  if (
    p.gstin &&
    (!/^\d{2}[A-Z0-9]{13}$/.test(p.gstin) ||
      (p.stateCode && p.gstin.slice(0, 2) !== p.stateCode))
  )
    e.gstin = "Check the 15-character GSTIN and matching state code.";
  if (p.pincode && !/^\d{6}$/.test(p.pincode))
    e.pincode = "Use a six-digit pincode.";
  if (!Number.isSafeInteger(p.creditLimitPaise) || p.creditLimitPaise < 0)
    e.creditLimitPaise = "Enter a non-negative credit limit.";
  if (
    !Number.isInteger(p.paymentTerms) ||
    p.paymentTerms < 0 ||
    p.paymentTerms > 3650
  )
    e.paymentTerms = "Enter payment terms between 0 and 3650 days.";
  finish(e);
}
export function validateProduct(p: Product) {
  const e: Record<string, string> = {};
  if (!p.name.trim()) e.name = "Enter a product name.";
  if (!p.sku.trim()) e.sku = "Enter a unique item code.";
  if (!p.unit.trim()) e.unit = "Enter a unit.";
  for (const f of [
    "purchasePaise",
    "salePaise",
    "taxBps",
    "reorderMilli",
  ] as const)
    if (!Number.isSafeInteger(p[f]) || p[f] < 0)
      e[f] = "Enter a non-negative value.";
  if (p.taxBps > 10000) e.taxBps = "Tax cannot exceed 100%.";
  if (p.expiryTracking && !p.batchTracking)
    e.expiryTracking = "Enable batch tracking to track expiry.";
  finish(e);
}
export function validateDocument(d: BillingDocument) {
  const e: Record<string, string> = {};
  if (!d.partyId) e.partyId = "Select a customer or supplier.";
  if (!validDate(d.date)) e.date = "Enter a valid document date.";
  if (d.dueDate && (!validDate(d.dueDate) || d.dueDate < d.date))
    e.dueDate = "This date must be on or after the document date.";
  if (d.placeOfSupply && !/^\d{2}$/.test(d.placeOfSupply))
    e.placeOfSupply = "Use a two-digit state / UT code.";
  if (!d.items.length) e.items = "Add at least one product.";
  for (const l of d.items)
    if (!l.productId || !l.name.trim() || !l.unit.trim())
      e.items = "Select a product and unit for each line.";
  if (d.items.length) {
    try {
      calculate(d.items, d.discountPaise, d.taxPolicy);
    } catch (err) {
      e.items = err instanceof Error ? err.message : "Check line items.";
    }
  }
  finish(e);
}
export function validateSettings(s: BusinessSettings) {
  const e: Record<string, string> = {};
  if (!s.name.trim()) e.name = "Enter a business display name.";
  if (s.email && !email.test(s.email)) e.email = "Enter a valid email address.";
  if (s.stateCode && !/^\d{2}$/.test(s.stateCode))
    e.stateCode = "Use a two-digit state / UT code.";
  if (
    s.gstin &&
    (!/^\d{2}[A-Z0-9]{13}$/.test(s.gstin) ||
      (s.stateCode && s.gstin.slice(0, 2) !== s.stateCode))
  )
    e.gstin = "Check GSTIN and its matching state code.";
  if (s.pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(s.pan))
    e.pan = "Check the PAN format.";
  if (s.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(s.ifsc))
    e.ifsc = "Check the IFSC format.";
  if (
    !Number.isInteger(s.financialYearStart) ||
    s.financialYearStart < 1 ||
    s.financialYearStart > 12
  )
    e.financialYearStart = "Choose a month from 1 to 12.";
  if (
    !Number.isInteger(s.nearExpiryDays) ||
    s.nearExpiryDays < 1 ||
    s.nearExpiryDays > 730
  )
    e.nearExpiryDays = "Choose a threshold from 1 to 730 days.";
  if (
    !Number.isInteger(s.defaultTaxBps) ||
    s.defaultTaxBps < 0 ||
    s.defaultTaxBps > 10000
  )
    e.defaultTaxBps = "Choose a tax rate between 0 and 100%.";
  for (const [kind, r] of Object.entries(s.numbering))
    if (
      !/^[A-Za-z0-9/-]{1,12}$/.test(r.prefix) ||
      !Number.isSafeInteger(r.next) ||
      r.next < 1 ||
      !Number.isInteger(r.padding) ||
      r.padding < 1 ||
      r.padding > 8
    )
      e.numbering = `Check ${kind} numbering.`;
  if (!s.paymentMethods.length || !s.expenseCategories.length)
    e.paymentMethods = "Keep at least one payment method and expense category.";
  finish(e);
}
