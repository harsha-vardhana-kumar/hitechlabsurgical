import type { BillingDocument, Workspace } from "../domain/types";
import { credited, outstanding, paid, totals } from "../domain/selectors";
import { money } from "../domain/dates";
export function documentContent(w: Workspace, d: BillingDocument) {
  const business = d.businessSnapshot || w.settings,
    party = d.partySnapshot || w.parties.find((p) => p.id === d.partyId),
    total = totals(d);
  const summary: [string, string][] = [["Subtotal", money(total.subtotal)]];
  if (total.discount) summary.push(["Discount", `−${money(total.discount)}`]);
  summary.push(["Taxable value", money(total.taxable)]);
  if (total.cgst || total.sgst)
    summary.push(
      ["CGST", money(total.cgst)],
      [d.taxPolicy.stateTaxLabel, money(total.sgst)],
    );
  if (total.igst) summary.push(["IGST", money(total.igst)]);
  if (total.unallocatedTax)
    summary.push(["GST · state required", money(total.unallocatedTax)]);
  if (total.roundOff) summary.push(["Round off", money(total.roundOff)]);
  summary.push(["Grand total", money(total.grandTotal)]);
  if (["invoice", "purchase-bill"].includes(d.kind)) {
    if (credited(w, d.id))
      summary.push(["Credits / returns", money(credited(w, d.id))]);
    summary.push(
      ["Paid", money(paid(w, d.id))],
      ["Balance due", money(outstanding(w, d))],
    );
  }
  const bank: [string, string][] = [
    ["Bank", business.bankName],
    ["Account name", business.accountName],
    ["Account number", business.accountNumber],
    ["IFSC", business.ifsc],
    ["Branch", business.branch],
    ["UPI", business.upi],
  ];
  return {
    business,
    party,
    total,
    summary,
    bank: bank.filter(([, value]) => value),
    businessLines: [
      business.legalName,
      business.address,
      [business.city, business.state, business.pincode]
        .filter(Boolean)
        .join(", "),
      [business.phone, business.email].filter(Boolean).join(" · "),
      business.gstin ? `GSTIN: ${business.gstin}` : "",
    ].filter(Boolean),
  };
}
