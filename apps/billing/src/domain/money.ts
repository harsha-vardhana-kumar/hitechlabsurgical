import type { LineItem, TaxPolicy, Totals } from './types';
export function integer(value: number, name = 'Amount'): number { if (!Number.isSafeInteger(value)) throw new Error(`${name} is outside the supported precision range.`); return value; }
export function parseFixed(input: string, places = 2): number {
  const value = input.trim(); if (!new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(value)) throw new Error(`Enter a non-negative number with at most ${places} decimal places.`);
  const [whole, fraction = ''] = value.split('.'); return integer(Number(BigInt(whole) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places, '0'))));
}
export const inputMoney = (value: number) => (value / 100).toFixed(2);
export const inputQuantity = (value: number) => (value / 1000).toString();
export const inputPercent = (value: number) => (value / 100).toString();
export function divideRound(n: bigint, d: bigint): bigint { if (d <= 0n || n < 0n) throw new Error('Invalid decimal calculation.'); return (n + d / 2n) / d; }
export function jurisdiction(policy: TaxPolicy): Totals['jurisdiction'] {
  if (!policy.enabled) return 'none'; if (!/^\d{2}$/.test(policy.businessState) || !/^\d{2}$/.test(policy.placeOfSupply)) return 'unresolved'; return policy.businessState === policy.placeOfSupply ? 'intra' : 'inter';
}
export function calculate(items: readonly LineItem[], discountPaise: number, policy: TaxPolicy): Totals {
  if (!items.length) throw new Error('Add at least one line item.'); integer(discountPaise); if (discountPaise < 0) throw new Error('Document discount cannot be negative.');
  const base = items.map(item => {
    for (const v of [item.quantityMilli, item.ratePaise, item.discountBps, item.taxBps]) integer(v);
    if (item.quantityMilli <= 0 || item.ratePaise < 0) throw new Error('Each item needs a positive quantity and non-negative rate.');
    if (item.discountBps < 0 || item.discountBps > 10000 || item.taxBps < 0 || item.taxBps > 10000) throw new Error('Discount and tax rates must be between 0 and 100%.');
    const subtotal = divideRound(BigInt(item.quantityMilli) * BigInt(item.ratePaise), 1000n), discount = divideRound(subtotal * BigInt(item.discountBps), 10000n); return { subtotal, discount, net: subtotal - discount };
  });
  const net = base.reduce((s, x) => s + x.net, 0n), docDiscount = BigInt(discountPaise); if (docDiscount > net) throw new Error('Document discount cannot exceed the item value.');
  const allocation = base.map(x => net ? docDiscount * x.net / net : 0n); let remaining = docDiscount - allocation.reduce((s, x) => s + x, 0n);
  const ranking = base.map((x, i) => ({ i, remainder: net ? docDiscount * x.net % net : 0n })).sort((a, b) => a.remainder === b.remainder ? a.i - b.i : a.remainder > b.remainder ? -1 : 1);
  for (const { i } of ranking) { if (!remaining) break; allocation[i]++; remaining--; }
  const safe = (v: bigint) => integer(Number(v));
  const lines = base.map((l, i) => { const amount = l.net - allocation[i], rate = BigInt(policy.enabled ? items[i].taxBps : 0), taxable = policy.inclusive ? divideRound(amount * 10000n, 10000n + rate) : amount, tax = policy.inclusive ? amount - taxable : divideRound(taxable * rate, 10000n); return { subtotal: safe(l.subtotal), discount: safe(l.discount), documentDiscount: safe(allocation[i]), taxable: safe(taxable), tax: safe(tax), total: safe(taxable + tax) }; });
  const sum = (key: keyof typeof lines[number]) => safe(lines.reduce((s, l) => s + BigInt(l[key]), 0n));
  const tax = sum('tax'), total = sum('total'), region = jurisdiction(policy), rounded = policy.rounding === 'rupee' ? safe(divideRound(BigInt(total), 100n) * 100n) : total;
  const cgst = region === 'intra' ? safe((BigInt(tax) + 1n) / 2n) : 0;
  return { lines, subtotal: sum('subtotal'), discount: integer(sum('discount') + discountPaise), taxable: sum('taxable'), tax, cgst, sgst: region === 'intra' ? tax - cgst : 0, igst: region === 'inter' ? tax : 0, unallocatedTax: region === 'unresolved' ? tax : 0, roundOff: rounded - total, grandTotal: rounded, jurisdiction: region };
}
export function balance(total: number, paid: number, credits = 0): number { [total, paid, credits].forEach(v => integer(v)); if ([total, paid, credits].some(v => v < 0) || BigInt(paid) + BigInt(credits) > BigInt(total)) throw new Error('Payments or credits exceed the document total.'); return total - paid - credits; }
