"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Download, Printer, Plus, Trash2 } from "lucide-react";
import type { BillingDocument, DocumentKind, LineItem } from "../domain/types";
import { documentLabels, documentPaths } from "../domain/types";
import { money, formatDate, addDays } from "../domain/dates";
import { parseFixed } from "../domain/money";
import { totals, status, outstanding } from "../domain/selectors";
import {
  blankDocument,
  productLine,
  saveDocument,
  duplicateDocument,
  finalizeDocument,
  cancelDocument,
  quotationStatus,
  uid,
} from "../services/commands";
import { useWorkspace, useUnsaved } from "./provider";
import {
  PageHeader,
  Panel,
  NewLink,
  DataTable,
  Badge,
  Empty,
  ErrorSummary,
  Field,
} from "./ui";
import { DocumentPreview } from "./document-preview";
export function DocumentTable({
  kind,
  recent = false,
}: {
  kind: DocumentKind;
  recent?: boolean;
}) {
  const { w } = useWorkspace(),
    [filter, setFilter] = useState("all");
  let rows = w.documents
    .filter(
      (d) => d.kind === kind && (filter === "all" || status(w, d) === filter),
    )
    .toReversed();
  if (recent) rows = rows.slice(0, 5);
  return (
    <DataTable
      rows={rows}
      search={(d) =>
        `${d.number} ${w.parties.find((p) => p.id === d.partyId)?.name} ${d.reference}`
      }
      toolbar={
        !recent && (
          <select
            value={filter}
            aria-label="Document status filter"
            onChange={(e) => setFilter(e.target.value)}
          >
            {[
              "all",
              "draft",
              "sent",
              "issued",
              "accepted",
              "rejected",
              "converted",
              "partially-received",
              "received",
              "partially-paid",
              "paid",
              "overdue",
              "expired",
              "cancelled",
            ].map((v) => (
              <option key={v} value={v}>
                {v.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        )
      }
      columns={[
        {
          key: "number",
          title: "Document",
          primary: true,
          value: (d) => d.number,
          render: (d) => (
            <Link href={`${documentPaths[kind]}/${d.id}`}>
              {d.number}
              <small>{d.reference}</small>
            </Link>
          ),
        },
        {
          key: "party",
          title: kind.startsWith("purchase") ? "Supplier" : "Customer",
          value: (d) =>
            d.partySnapshot?.name ||
            w.parties.find((p) => p.id === d.partyId)?.name ||
            "",
          render: (d) =>
            d.partySnapshot?.name ||
            w.parties.find((p) => p.id === d.partyId)?.name,
        },
        {
          key: "date",
          title: "Date",
          value: (d) => d.date,
          render: (d) => formatDate(d.date),
        },
        {
          key: "total",
          title: "Total",
          align: "right",
          value: (d) => totals(d).grandTotal,
          render: (d) => money(totals(d).grandTotal),
        },
        {
          key: "balance",
          title: "Balance",
          align: "right",
          value: (d) => outstanding(w, d),
          render: (d) =>
            ["invoice", "purchase-bill"].includes(kind)
              ? money(outstanding(w, d))
              : "—",
        },
        {
          key: "status",
          title: "Status",
          value: (d) => status(w, d),
          render: (d) => <Badge>{status(w, d)}</Badge>,
        },
      ]}
    />
  );
}
export function Documents({
  kind,
  id,
  edit,
}: {
  kind: DocumentKind;
  id?: string;
  edit?: boolean;
}) {
  const { w } = useWorkspace(),
    d = w.documents.find((d) => d.id === id && d.kind === kind),
    label = documentLabels[kind],
    base = documentPaths[kind];
  if (id === "new") {
    if (["credit-note", "purchase-return"].includes(kind))
      return (
        <>
          <PageHeader title={`New ${label.toLowerCase()}`} />
          <Panel>
            <Empty
              title="Start from the original document"
              detail={`Open a finalized ${kind === "credit-note" ? "invoice" : "purchase bill"} with an outstanding balance, then choose ${label.toLowerCase()}. Returns retain the original pricing, tax and stock history. Cash refunds and unapplied credits are not supported in this demo.`}
              action={
                <Link
                  className="button"
                  href={
                    documentPaths[
                      kind === "credit-note" ? "invoice" : "purchase-bill"
                    ]
                  }
                >
                  Choose original document
                </Link>
              }
            />
          </Panel>
        </>
      );
    return <DocumentEditor key={kind} initial={blankDocument(w, kind)} />;
  }
  if (id && !d)
    return (
      <Empty
        title="Document not found"
        action={<Link href={base}>Back to documents</Link>}
      />
    );
  if (d)
    return edit && d.status === "draft" ? (
      <DocumentEditor key={d.id} initial={d} />
    ) : (
      <DocumentDetail d={d} />
    );
  return (
    <>
      <PageHeader
        title={`${label}s`}
        eyebrow={kind.startsWith("purchase") ? "Purchases" : "Sales"}
        description={
          kind === "credit-note" || kind === "purchase-return"
            ? "Linked returns against unpaid balances. Cash refunds are not supported in the demo."
            : `Create, track and manage ${label.toLowerCase()}s.`
        }
        actions={
          <NewLink href={`${base}/new`}>New {label.toLowerCase()}</NewLink>
        }
      />
      <Panel>
        <DocumentTable kind={kind} />
      </Panel>
    </>
  );
}
type EditorLine = LineItem & {
  qty: string;
  rate: string;
  discount: string;
  tax: string;
};
const editorLine = (i: LineItem): EditorLine => ({
  ...i,
  qty: String(i.quantityMilli / 1000),
  rate: String(i.ratePaise / 100),
  discount: String(i.discountBps / 100),
  tax: String(i.taxBps / 100),
});
function parseLine(input: EditorLine): LineItem {
  const { qty, rate, discount, tax, ...line } = input;
  return {
    ...line,
    quantityMilli: parseFixed(qty, 3),
    ratePaise: parseFixed(rate, 2),
    discountBps: parseFixed(discount, 2),
    taxBps: parseFixed(tax, 2),
  };
}
function DocumentEditor({ initial }: { initial: BillingDocument }) {
  const { w, run, busy } = useWorkspace(),
    router = useRouter(),
    [d, setD] = useState(initial),
    [lines, setLines] = useState(initial.items.map(editorLine)),
    [discount, setDiscount] = useState(String(initial.discountPaise / 100)),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(false);
  const purchase = d.kind.startsWith("purchase"),
    isReturn = ["credit-note", "purchase-return"].includes(d.kind),
    base = documentPaths[d.kind];
  useUnsaved(dirty);
  function change<K extends keyof BillingDocument>(
    key: K,
    value: BillingDocument[K],
  ) {
    setD((v) => ({ ...v, [key]: value }));
    setDirty(true);
  }
  function changeLine(index: number, patch: Partial<EditorLine>) {
    setLines((values) =>
      values.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
    setDirty(true);
  }
  const build = (): BillingDocument => ({
    ...d,
    items: lines.map(parseLine),
    discountPaise: parseFixed(discount, 2),
    taxPolicy: {
      ...d.taxPolicy,
      businessState: isReturn
        ? d.taxPolicy.businessState
        : w.settings.stateCode,
      placeOfSupply: d.placeOfSupply,
    },
  });
  let parsed: BillingDocument | undefined,
    totalError = "";
  try {
    if (lines.length) {
      parsed = build();
      totals(parsed);
    }
  } catch (e) {
    parsed = undefined;
    totalError = e instanceof Error ? e.message : "Check line items.";
  }
  return (
    <>
      <PageHeader
        title={`${initial.id ? "Edit" : "New"} ${documentLabels[d.kind].toLowerCase()}`}
        eyebrow={d.number || "Draft"}
        description="Review quantities, tax and terms before finalizing."
        actions={
          <>
            <Link
              className="button secondary"
              href={initial.id ? `${base}/${initial.id}` : base}
            >
              Cancel
            </Link>
            <button
              className="secondary"
              disabled={!parsed}
              onClick={() => setPreview((v) => !v)}
            >
              {preview ? "Edit details" : "Preview"}
            </button>
          </>
        }
      />
      <ErrorSummary message={error} />
      {preview && parsed ? (
        <DocumentPreview w={w} d={parsed} />
      ) : (
        <form
          id="document-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              const id = await run(
                (w, s) => saveDocument(w, s, build()),
                "Draft saved",
              );
              setDirty(false);
              router.push(`${base}/${id}`);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Unable to save.");
            }
          }}
        >
          <Panel title="Document details">
            <div className="form-grid padded">
              <Field label={purchase ? "Supplier" : "Customer"}>
                <select
                  required
                  disabled={isReturn}
                  value={d.partyId}
                  onChange={(e) => {
                    const p = w.parties.find((p) => p.id === e.target.value);
                    if (p) {
                      setD((v) => ({
                        ...v,
                        partyId: p.id,
                        billingAddress: p.billingAddress,
                        shippingAddress: p.shippingAddress,
                        placeOfSupply: p.stateCode,
                        paymentTerms: `${p.paymentTerms} days`,
                        dueDate: addDays(v.date, p.paymentTerms),
                      }));
                      setDirty(true);
                    }
                  }}
                >
                  <option value="">
                    Select {purchase ? "supplier" : "customer"}…
                  </option>
                  {w.parties
                    .filter(
                      (p) =>
                        p.active &&
                        p.kind === (purchase ? "supplier" : "customer"),
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field
                label={
                  d.kind === "purchase-bill"
                    ? "Supplier invoice number"
                    : "Reference"
                }
              >
                <input
                  required={d.kind === "purchase-bill"}
                  value={d.reference}
                  onChange={(e) => change("reference", e.target.value)}
                />
              </Field>
              <Field label="Document date">
                <input
                  required
                  type="date"
                  value={d.date}
                  onChange={(e) => change("date", e.target.value)}
                />
              </Field>
              <Field
                label={d.kind === "quotation" ? "Valid until" : "Due date"}
              >
                <input
                  type="date"
                  min={d.date}
                  value={d.dueDate}
                  onChange={(e) => change("dueDate", e.target.value)}
                />
              </Field>
              <Field label="Place of supply (state / UT code)">
                <input
                  maxLength={2}
                  disabled={isReturn}
                  value={d.placeOfSupply}
                  onChange={(e) => change("placeOfSupply", e.target.value)}
                />
              </Field>
              <Field label="Payment terms">
                <input
                  value={d.paymentTerms}
                  onChange={(e) => change("paymentTerms", e.target.value)}
                />
              </Field>
              <Field label="Billing address">
                <textarea
                  rows={2}
                  value={d.billingAddress}
                  onChange={(e) => change("billingAddress", e.target.value)}
                />
              </Field>
              <Field label="Shipping address">
                <textarea
                  rows={2}
                  value={d.shippingAddress}
                  onChange={(e) => change("shippingAddress", e.target.value)}
                />
              </Field>
              <Field label="Salesperson">
                <input
                  value={d.salesperson}
                  onChange={(e) => change("salesperson", e.target.value)}
                />
              </Field>
              {w.settings.transportEnabled && (
                <Field label="Delivery / transport reference">
                  <input
                    value={d.deliveryReference}
                    onChange={(e) =>
                      change("deliveryReference", e.target.value)
                    }
                  />
                </Field>
              )}
            </div>
          </Panel>
          <Panel
            title="Line items"
            action={
              !isReturn && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setLines((v) => [
                      ...v,
                      editorLine({
                        id: uid(),
                        productId: "",
                        name: "",
                        description: "",
                        hsn: "",
                        unit: "",
                        quantityMilli: 1000,
                        ratePaise: 0,
                        discountBps: 0,
                        taxBps: 0,
                        batchId: "",
                        sourceItemId: "",
                        receivedMilli: 0,
                      }),
                    ]);
                    setDirty(true);
                  }}
                >
                  <Plus size={14} />
                  Add item
                </button>
              )
            }
          >
            {!lines.length && (
              <Empty
                title="Add products to this document"
                detail="Choose a product to fill its rate, unit and tax defaults."
              />
            )}
            {lines.map((line, index) => (
              <div className="line-editor" key={line.id}>
                <div className="line-primary">
                  <Field label={`Product ${index + 1}`}>
                    <select
                      required
                      disabled={isReturn}
                      value={line.productId}
                      onChange={(e) => {
                        const p = w.products.find(
                          (p) => p.id === e.target.value,
                        );
                        if (p)
                          changeLine(index, {
                            ...editorLine(productLine(p, purchase)),
                            id: line.id,
                            sourceItemId: line.sourceItemId,
                          });
                      }}
                    >
                      <option value="">Choose product…</option>
                      {w.products
                        .filter((p) => p.active)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {p.sku}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label={`Quantity ${index + 1}`}>
                    <input
                      required
                      inputMode="decimal"
                      value={line.qty}
                      onChange={(e) =>
                        changeLine(index, { qty: e.target.value })
                      }
                    />
                  </Field>
                  <Field label={`Rate ${index + 1} (₹)`}>
                    <input
                      required
                      disabled={isReturn}
                      inputMode="decimal"
                      value={line.rate}
                      onChange={(e) =>
                        changeLine(index, { rate: e.target.value })
                      }
                    />
                  </Field>
                  <Field label={`Discount ${index + 1} (%)`}>
                    <input
                      disabled={isReturn}
                      inputMode="decimal"
                      value={line.discount}
                      onChange={(e) =>
                        changeLine(index, { discount: e.target.value })
                      }
                    />
                  </Field>
                  <Field label={`GST ${index + 1} (%)`}>
                    <input
                      disabled={isReturn || !d.taxPolicy.enabled}
                      inputMode="decimal"
                      value={line.tax}
                      onChange={(e) =>
                        changeLine(index, { tax: e.target.value })
                      }
                    />
                  </Field>
                  <div className="line-amount">
                    <small>Amount</small>
                    <strong>
                      {parsed
                        ? money(totals(parsed).lines[index]?.total || 0)
                        : "—"}
                    </strong>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Remove item ${index + 1}`}
                    onClick={() => {
                      setLines((v) => v.filter((_, i) => i !== index));
                      setDirty(true);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <details>
                  <summary>
                    Item details{line.unit ? ` · ${line.unit}` : ""}
                    {line.receivedMilli
                      ? ` · received ${line.receivedMilli / 1000}`
                      : ""}
                  </summary>
                  <div className="form-grid">
                    <Field label={`Description ${index + 1}`}>
                      <input
                        value={line.description}
                        onChange={(e) =>
                          changeLine(index, { description: e.target.value })
                        }
                      />
                    </Field>
                    <Field label={`HSN ${index + 1}`}>
                      <input
                        value={line.hsn}
                        onChange={(e) =>
                          changeLine(index, { hsn: e.target.value })
                        }
                      />
                    </Field>
                    <Field
                      label={`Unit ${index + 1}`}
                      hint="Stock unit is fixed by the product."
                    >
                      <input readOnly value={line.unit} />
                    </Field>
                    {w.products.find((p) => p.id === line.productId)
                      ?.batchTracking && (
                      <Field
                        label={`Batch ${index + 1}`}
                        hint={
                          purchase
                            ? "Create a batch in Inventory before receiving stock."
                            : "Leave automatic to use earliest valid expiry first."
                        }
                      >
                        <select
                          value={line.batchId}
                          disabled={isReturn}
                          onChange={(e) =>
                            changeLine(index, { batchId: e.target.value })
                          }
                        >
                          <option value="">
                            {purchase
                              ? "Select batch…"
                              : "Automatic · earliest expiry"}
                          </option>
                          {w.batches
                            .filter((b) => b.productId === line.productId)
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.lot}
                                {b.expires ? ` · expires ${b.expires}` : ""}
                              </option>
                            ))}
                        </select>
                        <Link href="/inventory/batches/new" target="_blank">
                          Create batch ↗
                        </Link>
                      </Field>
                    )}
                  </div>
                </details>
              </div>
            ))}
          </Panel>
          <div className="document-editor-bottom">
            <Panel title="Notes & preferences">
              <div className="padded form-grid">
                <Field label="GST enabled">
                  <input
                    type="checkbox"
                    disabled={isReturn}
                    checked={d.taxPolicy.enabled}
                    onChange={(e) =>
                      change("taxPolicy", {
                        ...d.taxPolicy,
                        enabled: e.target.checked,
                      })
                    }
                  />
                </Field>
                <Field label="Rates include GST">
                  <input
                    type="checkbox"
                    disabled={isReturn}
                    checked={d.taxPolicy.inclusive}
                    onChange={(e) =>
                      change("taxPolicy", {
                        ...d.taxPolicy,
                        inclusive: e.target.checked,
                      })
                    }
                  />
                </Field>
                <Field label="Invoice-level discount (₹)">
                  <input
                    inputMode="decimal"
                    value={discount}
                    onChange={(e) => {
                      setDiscount(e.target.value);
                      setDirty(true);
                    }}
                  />
                </Field>
                <Field label="Rounding">
                  <select
                    disabled={isReturn}
                    value={d.taxPolicy.rounding}
                    onChange={(e) =>
                      change("taxPolicy", {
                        ...d.taxPolicy,
                        rounding: e.target.value as "paise" | "rupee",
                      })
                    }
                  >
                    <option value="paise">Nearest paise</option>
                    <option value="rupee">Nearest rupee</option>
                  </select>
                </Field>
                <div className="full-width">
                  <Field label="Notes">
                    <textarea
                      rows={3}
                      value={d.notes}
                      onChange={(e) => change("notes", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="full-width">
                  <Field label="Terms & conditions">
                    <textarea
                      rows={4}
                      value={d.terms}
                      onChange={(e) => change("terms", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </Panel>
            <Panel title="Summary">
              <div className="padded">
                <ErrorSummary message={totalError} />
                {parsed && <TotalsPanel d={parsed} />}
                {d.taxPolicy.enabled && !w.settings.stateCode && (
                  <p className="notice">
                    Set the business state in Settings before finalizing GST
                    documents.
                  </p>
                )}
                {isReturn && (
                  <p className="notice">
                    Review returned quantities and the document discount.
                    Credits cannot exceed the original value or outstanding
                    balance. Cash refunds are not supported.
                  </p>
                )}
              </div>
            </Panel>
          </div>
          <div className="form-actions">
            <span className="muted">
              {dirty ? "Unsaved changes" : "Draft details"}
            </span>
            <button disabled={busy || !lines.length}>
              {busy ? "Saving…" : "Save draft"}
            </button>
          </div>
        </form>
      )}
      {preview && (
        <button className="preview-return" onClick={() => setPreview(false)}>
          Return to editor to save
        </button>
      )}
    </>
  );
}
function TotalsPanel({ d }: { d: BillingDocument }) {
  const t = totals(d);
  return (
    <dl className="document-totals">
      {[
        ["Subtotal", t.subtotal],
        ["Discount", -t.discount],
        ["Taxable value", t.taxable],
        ["GST", t.tax],
        ["Round off", t.roundOff],
        ["Grand total", t.grandTotal],
      ].map(([label, value]) => (
        <div
          key={label}
          className={label === "Grand total" ? "grand-total" : ""}
        >
          <dt>{label}</dt>
          <dd>{money(Number(value))}</dd>
        </div>
      ))}
    </dl>
  );
}
function DocumentDetail({ d }: { d: BillingDocument }) {
  const { w, run, confirm, notify, busy } = useWorkspace(),
    router = useRouter(),
    [pdfBusy, setPdfBusy] = useState(false),
    [pdfUrl, setPdfUrl] = useState(""),
    base = documentPaths[d.kind],
    draft = d.status === "draft",
    currentStatus = status(w, d);
  const finalizeLabel =
    d.kind === "quotation"
      ? "Mark as sent"
      : d.kind === "purchase-order"
        ? "Issue order"
        : d.kind === "purchase-bill"
          ? "Receive & finalize"
          : "Finalize";
  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl],
  );
  async function convert(kind?: DocumentKind) {
    try {
      const id = await run(
        (w, s) => duplicateDocument(w, s, d.id, kind),
        "Draft created — review before finalizing",
      );
      router.push(`${documentPaths[kind || d.kind]}/${id}/edit`);
    } catch {
      /* Toast from command service. */
    }
  }
  async function pdf() {
    setPdfBusy(true);
    try {
      const { downloadDocumentPdf } = await import("../services/pdf");
      const url = await downloadDocumentPdf(w, d);
      setPdfUrl(url);
      notify(
        "PDF prepared. Use the download link if your browser did not save it automatically.",
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : "Unable to prepare PDF.");
    } finally {
      setPdfBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title={d.number}
        eyebrow={documentLabels[d.kind]}
        description={`${d.partySnapshot?.name || w.parties.find((p) => p.id === d.partyId)?.name || ""} · ${formatDate(d.date)}`}
        actions={
          <>
            <button className="secondary" onClick={() => window.print()}>
              <Printer size={15} />
              Print
            </button>
            <button
              className="secondary"
              disabled={pdfBusy}
              onClick={() => void pdf()}
            >
              <Download size={15} />
              {pdfBusy ? "Preparing PDF…" : "Download PDF"}
            </button>
            {draft && (
              <Link className="button secondary" href={`${base}/${d.id}/edit`}>
                Edit draft
              </Link>
            )}
          </>
        }
      />
      <div className="document-actions no-print">
        <Badge>{currentStatus}</Badge>
        <div className="actions">
          {draft && (
            <button
              disabled={busy}
              onClick={() =>
                confirm(
                  `${finalizeLabel}?`,
                  d.kind === "quotation"
                    ? "This records sent status only; no email is sent. The document will become read-only."
                    : "This locks the document and records any stock changes. Corrections require cancellation or a linked return.",
                  () =>
                    run(
                      (w, s) => finalizeDocument(w, s, d.id),
                      "Document finalized",
                    ),
                )
              }
            >
              {finalizeLabel}
            </button>
          )}
          {d.kind === "quotation" &&
            !["converted", "rejected", "cancelled", "expired"].includes(
              currentStatus,
            ) && (
              <button
                className="secondary"
                onClick={() => void convert("invoice")}
              >
                Convert to invoice
              </button>
            )}
          {d.kind === "quotation" && currentStatus === "sent" && (
            <>
              <button
                className="secondary"
                onClick={() =>
                  confirm(
                    "Mark quotation accepted?",
                    "Record the customer’s acceptance.",
                    () =>
                      run((w, s) => quotationStatus(w, s, d.id, "accepted")),
                  )
                }
              >
                Mark accepted
              </button>
              <button
                className="secondary"
                onClick={() =>
                  confirm(
                    "Mark quotation rejected?",
                    "This prevents conversion to an invoice.",
                    () =>
                      run((w, s) => quotationStatus(w, s, d.id, "rejected")),
                  )
                }
              >
                Mark rejected
              </button>
            </>
          )}
          {d.kind === "purchase-order" &&
            ["issued", "partially-received"].includes(d.status) && (
              <button onClick={() => void convert("purchase-bill")}>
                Receive items
              </button>
            )}
          {d.postedAt &&
            d.status !== "cancelled" &&
            ["invoice", "purchase-bill"].includes(d.kind) &&
            outstanding(w, d) > 0 && (
              <>
                <Link
                  className="button"
                  href={`/${d.kind === "invoice" ? "sales" : "purchases"}/payments/new?document=${d.id}`}
                >
                  Record payment
                </Link>
                <button
                  className="secondary"
                  onClick={() =>
                    void convert(
                      d.kind === "invoice" ? "credit-note" : "purchase-return",
                    )
                  }
                >
                  {d.kind === "invoice" ? "Create credit note" : "Return items"}
                </button>
              </>
            )}
          <button className="secondary" onClick={() => void convert()}>
            Duplicate
          </button>
          {!["converted", "cancelled"].includes(d.status) && (
            <button
              className="text-button danger-text"
              onClick={() =>
                confirm(
                  "Cancel this document?",
                  "The number remains reserved. Stock movements will be reversed if safe; linked payments or documents must be resolved first.",
                  () =>
                    run(
                      (w, s) => cancelDocument(w, s, d.id),
                      "Document cancelled",
                    ),
                )
              }
            >
              Cancel document
            </button>
          )}
        </div>
      </div>
      {pdfUrl && (
        <p className="notice no-print">
          <a href={pdfUrl} download={`${d.number.replaceAll("/", "-")}.pdf`}>
            Save prepared PDF
          </a>
        </p>
      )}
      {d.sourceId && (
        <p className="source-reference no-print">
          Linked to{" "}
          <Link
            href={`${documentPaths[w.documents.find((x) => x.id === d.sourceId)!.kind]}/${d.sourceId}`}
          >
            {w.documents.find((x) => x.id === d.sourceId)?.number}
          </Link>
        </p>
      )}
      <DocumentPreview w={w} d={d} />
      <Panel title="Activity" className="no-print">
        <div className="activity">
          {w.audit
            .filter((a) => a.entityId === d.id)
            .map((a) => (
              <p key={a.id}>
                <strong>{a.action}</strong>
                <span>
                  {a.detail} · {a.actor} · {formatDate(a.at)}
                </span>
              </p>
            ))}
        </div>
      </Panel>
    </>
  );
}
