import type { BillingDocument, BusinessSettings, DocumentKind, Expense, LineItem, Party, Payment, Product, ProductBatch, Session, StockMovement, Workspace } from '../domain/types';
import { authorize } from '../domain/permissions';
import { validateDocument, validateParty, validateProduct, validateSettings, ValidationError } from '../domain/validation';
import { allocateNumber } from '../domain/numbering';
import { balance, calculate, divideRound, integer, jurisdiction } from '../domain/money';
import { addDays, today, validDate } from '../domain/dates';
import { credited, outstanding, paid, partyBalance, stock, totals } from '../domain/selectors';
export function uid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = Array.from(b, v => v.toString(16).padStart(2, '0')).join(''); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
function requireValue(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
export function audit(w: Workspace, s: Session, action: string, entityId: string, detail: string) { w.audit.unshift({ id: uid(), at: new Date().toISOString(), actor: s.name, action, entityId, detail }); }
export function blankParty(kind: Party['kind']): Party { return { id: '', kind, name: '', organization: '', contactPerson: '', type: '', phone: '', email: '', gstin: '', billingAddress: '', shippingAddress: '', city: '', state: '', stateCode: '', pincode: '', country: 'India', creditLimitPaise: 0, paymentTerms: 30, notes: '', active: true, createdAt: '' }; }
export function blankProduct(): Product { return { id: '', name: '', sku: '', category: '', subcategory: '', brand: '', hsn: '', unit: 'Nos', purchasePaise: 0, salePaise: 0, taxBps: 0, reorderMilli: 0, batchTracking: false, expiryTracking: false, active: true, notes: '', manufacturer: '', model: '', packSize: '', catalogueNumber: '', barcode: '' }; }
export function saveParty(w: Workspace, s: Session, input: Party) {
  authorize(s, 'parties.manage'); validateParty(input); const p = structuredClone(input); p.id ||= uid(); p.createdAt ||= new Date().toISOString(); const index = w.parties.findIndex(x => x.id === p.id);
  requireValue(index < 0 || w.parties[index].kind === p.kind, 'A contact cannot change its type.'); if (index < 0) w.parties.push(p); else w.parties[index] = p; audit(w, s, index < 0 ? 'Contact created' : 'Contact updated', p.id, p.name); return p.id;
}
export function saveProduct(w: Workspace, s: Session, input: Product, openingMilli = 0) {
  authorize(s, 'inventory.manage'); validateProduct(input); integer(openingMilli); requireValue(openingMilli >= 0, 'Opening stock cannot be negative.');
  requireValue(!w.products.some(p => p.id !== input.id && p.sku.toLowerCase() === input.sku.toLowerCase()), 'This item code is already in use.');
  const p = structuredClone(input); p.id ||= uid(); const index = w.products.findIndex(x => x.id === p.id);
  if (index >= 0 && w.movements.some(m => m.productId === p.id)) requireValue(p.batchTracking === w.products[index].batchTracking && p.unit === w.products[index].unit, 'An item with stock history cannot change unit or batch tracking. Create a separate item instead.');
  if (index < 0) w.products.push(p); else w.products[index] = p;
  if (index < 0 && openingMilli) { requireValue(!p.batchTracking, 'Add opening stock through a batch for a tracked product.'); movement(w, s, { productId: p.id, batchId: '', quantityMilli: openingMilli, type: 'opening', date: today(), documentId: '', reason: 'Opening stock entered at product creation' }); }
  audit(w, s, index < 0 ? 'Product created' : 'Product updated', p.id, p.name); return p.id;
}
export function movement(w: Workspace, s: Session, input: Omit<StockMovement, 'id' | 'actor'>) {
  const p = w.products.find(p => p.id === input.productId); requireValue(p, 'Product not found.'); integer(input.quantityMilli);
  requireValue(input.quantityMilli !== 0 && validDate(input.date) && input.reason.trim(), 'Enter a non-zero quantity, valid date and reason.');
  if (p.batchTracking) requireValue(w.batches.some(b => b.id === input.batchId && b.productId === p.id), 'Select a batch for this tracked product.'); else requireValue(!input.batchId, 'This product does not use batch tracking.');
  requireValue(integer(stock(w, p.id, p.batchTracking ? input.batchId : undefined) + input.quantityMilli) >= 0, 'This action would make stock negative. Check the available quantity.'); w.movements.push({ ...input, id: uid(), actor: s.name });
}
export function adjustStock(w: Workspace, s: Session, productId: string, batchId: string, quantityMilli: number, reason: string) { authorize(s, 'inventory.manage'); movement(w, s, { productId, batchId, quantityMilli, reason, type: 'adjustment', date: today(), documentId: '' }); audit(w, s, 'Stock adjusted', productId, `${quantityMilli / 1000}: ${reason}`); }
export function saveBatch(w: Workspace, s: Session, input: ProductBatch, openingMilli: number) {
  authorize(s, 'inventory.manage'); const p = w.products.find(p => p.id === input.productId); requireValue(p?.batchTracking, 'Select a product with batch tracking enabled.'); requireValue(input.lot.trim(), 'Enter the batch / lot number.');
  requireValue(!w.batches.some(b => b.id !== input.id && b.productId === input.productId && b.lot === input.lot), 'This batch number already exists for this product.');
  requireValue(!input.manufactured || validDate(input.manufactured), 'Enter a valid manufacturing date.'); requireValue(!input.expires || validDate(input.expires), 'Enter a valid expiry date.'); requireValue(!p.expiryTracking || input.expires, 'Enter an expiry date for this product.'); requireValue(!(input.manufactured && input.expires && input.expires < input.manufactured), 'Expiry cannot precede manufacturing.');
  [openingMilli, input.costPaise, input.salePaise].forEach(v => { integer(v); requireValue(v >= 0, 'Batch values cannot be negative.'); });
  const b = structuredClone(input); b.id ||= uid(); const index = w.batches.findIndex(x => x.id === b.id);
  if (index < 0) w.batches.push(b); else { requireValue(b.productId === w.batches[index].productId, 'An existing batch cannot move to another product.'); requireValue(!openingMilli, 'Use a stock adjustment for an existing batch.'); w.batches[index] = b; }
  if (openingMilli) movement(w, s, { productId: b.productId, batchId: b.id, quantityMilli: openingMilli, type: 'opening', date: today(), documentId: '', reason: `Opening batch ${b.lot}` }); audit(w, s, 'Batch saved', b.id, b.lot); return b.id;
}
export function blankDocument(w: Workspace, kind: DocumentKind): BillingDocument {
  const date = today(), s = w.settings;
  return { id: '', kind, number: '', date, dueDate: addDays(date, 30), partyId: '', billingAddress: '', shippingAddress: '', placeOfSupply: '', reference: '', salesperson: '', paymentTerms: '30 days', deliveryReference: '', notes: s.notes, terms: kind === 'quotation' ? s.quotationTerms : s.invoiceTerms, items: [], discountPaise: 0, status: 'draft', sourceId: '', createdAt: '', postedAt: '', taxPolicy: { enabled: s.gstEnabled, inclusive: s.inclusive, businessState: s.stateCode, placeOfSupply: '', rounding: s.rounding, stateTaxLabel: s.stateTaxLabel } };
}
export function productLine(p: Product, purchase = false): LineItem { return { id: uid(), productId: p.id, name: p.name, description: '', hsn: p.hsn, unit: p.unit, quantityMilli: 1000, ratePaise: purchase ? p.purchasePaise : p.salePaise, discountBps: 0, taxBps: p.taxBps, batchId: '', sourceItemId: '', receivedMilli: 0 }; }
export function saveDocument(w: Workspace, s: Session, input: BillingDocument): string {
  authorize(s, input.id ? 'documents.edit' : 'documents.create'); const d = structuredClone(input), old = w.documents.find(x => x.id === d.id);
  requireValue(!old || (old.status === 'draft' && !old.postedAt), 'Only drafts can be edited. Use cancellation or a credit note to correct a finalized document.'); requireValue(!old || (d.kind === old.kind && d.sourceId === old.sourceId), 'A document cannot change its type or source.');
  requireValue(new Set(d.items.map(i => i.id)).size === d.items.length && d.items.every(i => i.id), 'Every line must have a unique identifier.');
  const purchase = ['purchase-order', 'purchase-bill', 'purchase-return'].includes(d.kind), party = w.parties.find(p => p.id === d.partyId); requireValue(party?.active && party.kind === (purchase ? 'supplier' : 'customer'), 'Select an active customer or supplier.');
  for (const item of d.items) requireValue(w.products.some(p => p.id === item.productId && p.active && p.unit === item.unit), 'Choose active products and retain their configured stock unit. Unit conversions are not configured.');
  d.taxPolicy.placeOfSupply = d.placeOfSupply; validateDocument(d);
  if (old) { d.number = old.number; d.createdAt = old.createdAt; } else { d.id = uid(); d.number = allocateNumber(w, d.kind, d.date); d.createdAt = new Date().toISOString(); }
  d.status = 'draft'; d.postedAt = ''; delete d.totals; delete d.partySnapshot; delete d.businessSnapshot;
  const index = w.documents.findIndex(x => x.id === d.id); if (index < 0) w.documents.push(d); else w.documents[index] = d; audit(w, s, old ? 'Draft updated' : 'Document created', d.id, d.number); return d.id;
}
function sell(w: Workspace, s: Session, d: BillingDocument, line: LineItem, type: 'sale' | 'purchase-return') {
  const p = w.products.find(x => x.id === line.productId)!; requireValue(p.active, 'An inactive product cannot be sold.');
  if (!p.batchTracking || line.batchId) {
    if (p.batchTracking) { const b = w.batches.find(b => b.id === line.batchId && b.productId === p.id); requireValue(b && (type === 'purchase-return' || (b.status === 'active' && (!b.expires || b.expires >= today()))), 'Choose an active, unexpired batch.'); }
    movement(w, s, { productId: p.id, batchId: line.batchId, quantityMilli: -line.quantityMilli, type, documentId: d.id, date: d.date, reason: d.number }); return;
  }
  const batches = w.batches.filter(b => b.productId === p.id && b.status === 'active' && (!b.expires || b.expires >= today())).sort((a, b) => (a.expires || '9999').localeCompare(b.expires || '9999')); let remaining = line.quantityMilli;
  for (const batch of batches) { const quantityMilli = Math.min(remaining, stock(w, p.id, batch.id)); if (quantityMilli > 0) movement(w, s, { productId: p.id, batchId: batch.id, quantityMilli: -quantityMilli, type, documentId: d.id, date: d.date, reason: `${d.number} · earliest expiry first` }); remaining -= quantityMilli; if (!remaining) break; } requireValue(remaining === 0, `Insufficient unexpired stock for ${p.name}.`);
}
export function finalizeDocument(w: Workspace, s: Session, id: string) {
  authorize(s, 'documents.finalize'); const d = w.documents.find(x => x.id === id); requireValue(d && d.status === 'draft' && !d.postedAt, 'This document is already finalized or is not a draft.'); validateDocument(d);
  requireValue(jurisdiction(d.taxPolicy) !== 'unresolved', 'Configure the business state and place of supply before finalizing GST documents.'); requireValue(d.items.every(i => w.products.some(p => p.id === i.productId && p.active && p.unit === i.unit)), 'A product is inactive or its unit has changed. Review this draft.');
  const party = w.parties.find(p => p.id === d.partyId); requireValue(party?.active, 'The contact is inactive.'); d.totals = calculate(d.items, d.discountPaise, d.taxPolicy);
  if (d.kind === 'invoice' && party.creditLimitPaise) requireValue(partyBalance(w, party.id) + d.totals.grandTotal <= party.creditLimitPaise, 'This invoice exceeds the customer credit limit.');
  if (d.kind === 'purchase-bill') { requireValue(d.reference.trim(), 'Enter the supplier invoice number before receiving this bill.'); requireValue(!w.documents.some(x => x.id !== d.id && x.kind === d.kind && x.partyId === d.partyId && x.reference === d.reference && x.postedAt && x.status !== 'cancelled'), 'This supplier invoice number has already been received.'); }
  if (['credit-note', 'purchase-return'].includes(d.kind)) {
    const source = w.documents.find(x => x.id === d.sourceId); requireValue(source && source.postedAt && source.status !== 'cancelled' && source.kind === (d.kind === 'credit-note' ? 'invoice' : 'purchase-bill'), 'A return must reference a finalized source document.'); requireValue(d.partyId === source.partyId && JSON.stringify(d.taxPolicy) === JSON.stringify(source.taxPolicy), 'Return contact and tax settings must match the source document.'); let ceiling = 0;
    for (const line of d.items) {
      const index = source.items.findIndex(x => x.id === line.sourceItemId), original = source.items[index]; requireValue(original && original.productId === line.productId && original.ratePaise === line.ratePaise && original.taxBps === line.taxBps && original.discountBps === line.discountBps, 'Return item prices and tax must match the original document.'); if (d.kind === 'purchase-return') requireValue(line.batchId === original.batchId, 'Return the original purchased batch.');
      const returned = w.documents.filter(x => x.id !== d.id && x.sourceId === source.id && x.kind === d.kind && x.postedAt && x.status !== 'cancelled').flatMap(x => x.items).filter(x => x.sourceItemId === original.id).reduce((sum, x) => sum + x.quantityMilli, 0), current = d.items.filter(x => x.sourceItemId === original.id).reduce((sum, x) => sum + x.quantityMilli, 0);
      requireValue(returned + current <= original.quantityMilli, 'Return quantity exceeds the unreturned quantity.'); ceiling += Number(divideRound(BigInt(totals(source).lines[index].total) * BigInt(line.quantityMilli), BigInt(original.quantityMilli)));
    }
    requireValue(d.totals.grandTotal <= ceiling + Math.max(0, totals(source).roundOff), 'Return value exceeds the original discounted value. Adjust the document discount.'); requireValue(d.totals.grandTotal <= outstanding(w, source), 'This return exceeds the unpaid balance. Cash refunds and unapplied credits are not configured.');
    for (const line of d.items) {
      if (d.kind === 'purchase-return') sell(w, s, d, line, 'purchase-return'); else {
        let remaining = line.quantityMilli; const allocations = new Map<string, number>();
        for (const m of w.movements.filter(m => m.documentId === source.id && m.productId === line.productId && m.type === 'sale')) allocations.set(m.batchId, (allocations.get(m.batchId) || 0) - m.quantityMilli);
        const prior = w.documents.filter(x => x.kind === 'credit-note' && x.sourceId === source.id && x.postedAt && x.status !== 'cancelled').map(x => x.id); prior.push(d.id);
        for (const [batchId, sold] of allocations) { const used = w.movements.filter(r => prior.includes(r.documentId) && r.productId === line.productId && r.batchId === batchId && r.type === 'sales-return').reduce((sum, r) => sum + r.quantityMilli, 0), quantityMilli = Math.min(remaining, Math.max(0, sold - used)); if (quantityMilli) movement(w, s, { productId: line.productId, batchId, quantityMilli, type: 'sales-return', documentId: d.id, date: d.date, reason: d.number }); remaining -= quantityMilli; if (!remaining) break; } requireValue(!remaining, 'Returned quantity could not be matched to its original stock allocation.');
      }
    }
  }
  if (d.kind === 'invoice') for (const line of d.items) sell(w, s, d, line, 'sale');
  if (d.kind === 'purchase-bill') {
    const order = d.sourceId ? w.documents.find(x => x.id === d.sourceId) : undefined; if (d.sourceId) requireValue(order?.kind === 'purchase-order' && order.postedAt && order.status !== 'cancelled' && order.partyId === d.partyId, 'The source purchase order is unavailable.');
    for (const line of d.items) { if (order) { const original = order.items.find(x => x.id === line.sourceItemId && x.productId === line.productId); requireValue(original && original.receivedMilli + line.quantityMilli <= original.quantityMilli, 'Receipt exceeds the remaining purchase order quantity.'); original.receivedMilli += line.quantityMilli; } movement(w, s, { productId: line.productId, batchId: line.batchId, quantityMilli: line.quantityMilli, type: 'purchase', documentId: d.id, date: d.date, reason: d.number }); } if (order) order.status = order.items.every(i => i.receivedMilli === i.quantityMilli) ? 'received' : 'partially-received';
  }
  d.postedAt = new Date().toISOString(); d.status = d.kind === 'purchase-bill' ? 'received' : ['purchase-order', 'credit-note', 'purchase-return'].includes(d.kind) ? 'issued' : 'sent'; d.partySnapshot = structuredClone(party); d.businessSnapshot = structuredClone(w.settings); audit(w, s, 'Document finalized', d.id, d.number);
}
export function duplicateDocument(w: Workspace, s: Session, id: string, target?: DocumentKind) {
  authorize(s, 'documents.create'); const source = w.documents.find(d => d.id === id); requireValue(source, 'Document not found.'); const kind = target || source.kind;
  if (target === 'invoice') requireValue(source.kind === 'quotation' && !['cancelled', 'rejected', 'converted'].includes(source.status) && (!source.dueDate || source.dueDate >= today()), 'This quotation is no longer available for conversion.');
  if (target === 'purchase-bill') requireValue(source.kind === 'purchase-order' && source.postedAt && ['issued', 'partially-received'].includes(source.status), 'Issue the order before creating a receipt.');
  if (target && ['credit-note', 'purchase-return'].includes(target)) requireValue(source.postedAt && source.status !== 'cancelled', 'Finalize the original document first.');
  const d = { ...structuredClone(source), ...blankDocument(w, kind), partyId: source.partyId, billingAddress: source.billingAddress, shippingAddress: source.shippingAddress, placeOfSupply: source.placeOfSupply, reference: target === 'purchase-bill' ? '' : source.reference, salesperson: source.salesperson, paymentTerms: source.paymentTerms, notes: source.notes, terms: source.terms, taxPolicy: structuredClone(source.taxPolicy), discountPaise: source.discountPaise, sourceId: target ? source.id : '', items: source.items.filter(i => target !== 'purchase-bill' || i.receivedMilli < i.quantityMilli).map(i => ({ ...i, id: uid(), receivedMilli: 0, sourceItemId: target ? i.id : '', quantityMilli: target === 'purchase-bill' ? i.quantityMilli - i.receivedMilli : i.quantityMilli })) };
  if (target === 'purchase-bill' && source.status === 'partially-received') d.discountPaise = 0;
  const newId = saveDocument(w, s, d); if (target === 'invoice') { source.status = 'converted'; audit(w, s, 'Quotation converted', source.id, w.documents.find(x => x.id === newId)!.number); } return newId;
}
export function cancelDocument(w: Workspace, s: Session, id: string) {
  authorize(s, 'documents.finalize'); const d = w.documents.find(x => x.id === id); requireValue(d && !['cancelled', 'converted'].includes(d.status), 'This document cannot be cancelled.'); requireValue(!paid(w, id) && !credited(w, id), 'Void linked payments and cancel linked returns before cancellation.'); requireValue(!w.documents.some(x => x.sourceId === id && x.status !== 'cancelled'), 'Cancel the linked documents first.');
  for (const m of w.movements.filter(x => x.documentId === id && x.type !== 'reversal')) movement(w, s, { ...m, quantityMilli: -m.quantityMilli, type: 'reversal', date: today(), reason: `Cancellation of ${d.number}` });
  if (d.kind === 'purchase-bill' && d.sourceId && d.postedAt) { const order = w.documents.find(x => x.id === d.sourceId)!; for (const line of d.items) order.items.find(x => x.id === line.sourceItemId)!.receivedMilli -= line.quantityMilli; order.status = order.items.some(x => x.receivedMilli > 0) ? 'partially-received' : 'issued'; }
  if (d.kind === 'invoice' && d.sourceId) { const q = w.documents.find(x => x.id === d.sourceId); if (q?.kind === 'quotation' && q.status === 'converted') { q.status = q.postedAt ? 'sent' : 'draft'; audit(w, s, 'Quotation reopened', q.id, `Linked invoice ${d.number} cancelled`); } } d.status = 'cancelled'; audit(w, s, 'Document cancelled', id, d.number);
}
export function quotationStatus(w: Workspace, s: Session, id: string, value: 'accepted' | 'rejected') { authorize(s, 'documents.edit'); const d = w.documents.find(x => x.id === id); requireValue(d?.kind === 'quotation' && d.status === 'sent' && (!d.dueDate || d.dueDate >= today()), 'Only a current, sent quotation can be accepted or rejected.'); d.status = value; audit(w, s, `Quotation ${value}`, id, d.number); }
export function recordPayment(w: Workspace, s: Session, input: Omit<Payment, 'id' | 'voided'>) {
  authorize(s, 'payments.record'); const d = w.documents.find(x => x.id === input.documentId); requireValue(d && d.postedAt && d.status !== 'cancelled' && d.kind === (input.direction === 'received' ? 'invoice' : 'purchase-bill'), 'Choose a finalized invoice or purchase bill.');
  requireValue(input.partyId === d.partyId && validDate(input.date) && input.date >= d.date, 'Check the payment contact and date. Payment cannot precede its invoice.'); integer(input.amountPaise); requireValue(input.amountPaise > 0, 'Payment amount must be positive.'); requireValue(input.amountPaise <= outstanding(w, d), 'Payment exceeds the outstanding balance. Overpayments are not supported.'); requireValue(w.settings.paymentMethods.includes(input.method), 'Choose a configured payment method.'); balance(totals(d).grandTotal, paid(w, d.id) + input.amountPaise, credited(w, d.id)); const id = uid(); w.payments.push({ ...input, id, voided: false }); audit(w, s, 'Payment recorded', d.id, `${d.number} · ${input.amountPaise / 100}`); return id;
}
export function voidPayment(w: Workspace, s: Session, id: string) { authorize(s, 'payments.record'); const p = w.payments.find(x => x.id === id); requireValue(p && !p.voided, 'Payment is unavailable or already voided.'); p.voided = true; audit(w, s, 'Payment voided', p.documentId, p.reference || p.method); }
export function saveExpense(w: Workspace, s: Session, input: Expense) {
  authorize(s, 'payments.record'); requireValue(validDate(input.date) && input.vendor.trim(), 'Enter a valid date and vendor.'); integer(input.amountPaise); integer(input.taxPaise); requireValue(input.amountPaise > 0 && input.taxPaise >= 0, 'Enter a positive expense and non-negative tax.'); requireValue(w.settings.expenseCategories.includes(input.category) && w.settings.paymentMethods.includes(input.method), 'Choose a configured category and payment method.'); const e = structuredClone(input); e.id ||= uid(); const index = w.expenses.findIndex(x => x.id === e.id); if (index < 0) w.expenses.push(e); else w.expenses[index] = e; audit(w, s, e.archived ? 'Expense archived' : 'Expense saved', e.id, e.vendor); return e.id;
}
export function saveSettings(w: Workspace, s: Session, settings: BusinessSettings) { authorize(s, 'settings.manage'); validateSettings(settings); if (!['/brand/hitech-logo.svg', '/brand/hitech-logo-compact.svg'].includes(settings.logo)) throw new ValidationError({ logo: 'Choose an approved Hitech logo.' }); w.settings = structuredClone(settings); audit(w, s, 'Settings updated', 'settings', 'Business and document preferences'); }
