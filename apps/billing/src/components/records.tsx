"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Party, Product } from "../domain/types";
import { documentPaths } from "../domain/types";
import { money, formatDate } from "../domain/dates";
import {
  stock,
  availableStock,
  partyBalance,
  outstanding,
  status,
  totals,
} from "../domain/selectors";
import {
  blankParty,
  blankProduct,
  saveParty,
  saveProduct,
} from "../services/commands";
import { useWorkspace } from "./provider";
import { RecordForm, options, type FormField } from "./forms";
import {
  PageHeader,
  Panel,
  NewLink,
  DataTable,
  Badge,
  DetailGrid,
  Empty,
} from "./ui";
const partyFields: FormField<Party>[] = [
  { key: "name", label: "Display name", required: true },
  { key: "organization", label: "Organization" },
  { key: "contactPerson", label: "Contact person" },
  {
    key: "type",
    label: "Contact type",
    hint: "Laboratory, hospital, college, distributor…",
  },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email", type: "email" },
  { key: "gstin", label: "GSTIN" },
  {
    key: "stateCode",
    label: "State / UT code",
    hint: "Two-digit GST state code; leave blank until confirmed.",
  },
  { key: "billingAddress", label: "Billing address", type: "textarea" },
  { key: "shippingAddress", label: "Shipping address", type: "textarea" },
  { key: "city", label: "City" },
  { key: "state", label: "State / UT" },
  { key: "pincode", label: "Pincode" },
  { key: "country", label: "Country" },
  {
    key: "creditLimitPaise",
    label: "Credit limit (₹)",
    type: "money",
    hint: "0 means no limit in the demo.",
  },
  { key: "paymentTerms", label: "Payment terms (days)", type: "integer" },
  { key: "notes", label: "Internal notes", type: "textarea" },
];
export function Parties({
  kind,
  id,
  edit,
}: {
  kind: Party["kind"];
  id?: string;
  edit?: boolean;
}) {
  const { w, run, confirm } = useWorkspace(),
    router = useRouter(),
    [filter, setFilter] = useState("active"),
    [tab, setTab] = useState("Summary");
  const base = kind === "customer" ? "/customers" : "/suppliers",
    title = kind === "customer" ? "Customers" : "Suppliers",
    p = w.parties.find((p) => p.id === id && p.kind === kind);
  if (id === "new" || (edit && p))
    return (
      <>
        <PageHeader
          title={`${id === "new" ? "New" : "Edit"} ${kind}`}
          description="Keep contact and billing details together."
          actions={
            <Link
              className="button secondary"
              href={p ? `${base}/${p.id}` : base}
            >
              Cancel
            </Link>
          }
        />
        <Panel>
          <RecordForm
            initial={p || blankParty(kind)}
            fields={partyFields}
            onSave={async (values) => {
              const key = await run((w, s) => saveParty(w, s, values));
              router.push(`${base}/${key}`);
            }}
          />
        </Panel>
      </>
    );
  if (id && !p)
    return (
      <Empty
        title="Contact not found"
        action={<Link href={base}>Back to {title.toLowerCase()}</Link>}
      />
    );
  if (p) {
    const docs = w.documents.filter((d) => d.partyId === p.id),
      payments = w.payments.filter((x) => x.partyId === p.id);
    return (
      <>
        <PageHeader
          title={p.name}
          eyebrow={kind}
          description={p.organization}
          actions={
            <>
              <Link className="button secondary" href={`${base}/${p.id}/edit`}>
                Edit contact
              </Link>
              <button
                className="secondary"
                onClick={() =>
                  confirm(
                    p.active
                      ? "Archive this contact?"
                      : "Restore this contact?",
                    "Existing documents and payment history will remain available.",
                    () =>
                      run((w, s) =>
                        saveParty(w, s, { ...p, active: !p.active }),
                      ),
                  )
                }
              >
                {p.active ? "Archive" : "Restore"}
              </button>
            </>
          }
        />
        <div className="summary-cards">
          <Panel>
            <small>Outstanding balance</small>
            <strong>{money(partyBalance(w, p.id))}</strong>
          </Panel>
          <Panel>
            <small>Documents</small>
            <strong>{docs.length}</strong>
          </Panel>
          <Panel>
            <small>Contact status</small>
            <Badge>{p.active ? "active" : "archived"}</Badge>
          </Panel>
        </div>
        <div className="tabs">
          {["Summary", "Documents", "Payments", "Activity"].map((t) => (
            <button
              className={tab === t ? "selected" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <Panel>
          {tab === "Summary" ? (
            <DetailGrid
              entries={partyFields.map((f) => [
                f.label,
                f.key === "creditLimitPaise"
                  ? money(p.creditLimitPaise)
                  : String(p[f.key]),
              ])}
            />
          ) : tab === "Documents" ? (
            <DataTable
              rows={docs}
              search={(d) => d.number}
              columns={[
                {
                  key: "number",
                  title: "Document",
                  primary: true,
                  value: (d) => d.number,
                  render: (d) => (
                    <Link href={`${documentPaths[d.kind]}/${d.id}`}>
                      {d.number}
                      <small>{d.kind}</small>
                    </Link>
                  ),
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
                  value: (d) => totals(d).grandTotal,
                  render: (d) => money(totals(d).grandTotal),
                },
                {
                  key: "balance",
                  title: "Balance",
                  value: (d) => outstanding(w, d),
                  render: (d) => money(outstanding(w, d)),
                },
                {
                  key: "status",
                  title: "Status",
                  value: (d) => status(w, d),
                  render: (d) => <Badge>{status(w, d)}</Badge>,
                },
              ]}
            />
          ) : tab === "Payments" ? (
            <DataTable
              rows={payments}
              search={(p) => `${p.reference} ${p.method}`}
              columns={[
                {
                  key: "date",
                  title: "Date",
                  value: (p) => p.date,
                  render: (p) => formatDate(p.date),
                },
                {
                  key: "amount",
                  title: "Amount",
                  value: (p) => p.amountPaise,
                  render: (p) => money(p.amountPaise),
                },
                {
                  key: "method",
                  title: "Method",
                  value: (p) => p.method,
                  render: (p) => p.method,
                },
                {
                  key: "status",
                  title: "Status",
                  value: (p) => Number(p.voided),
                  render: (p) => (
                    <Badge>{p.voided ? "voided" : "recorded"}</Badge>
                  ),
                },
              ]}
            />
          ) : (
            <div className="activity">
              {w.audit
                .filter(
                  (a) =>
                    a.entityId === p.id ||
                    docs.some((d) => d.id === a.entityId),
                )
                .map((a) => (
                  <p key={a.id}>
                    <strong>{a.action}</strong>
                    <span>
                      {a.detail} · {a.actor} · {formatDate(a.at)}
                    </span>
                  </p>
                ))}
            </div>
          )}
        </Panel>
      </>
    );
  }
  return (
    <>
      <PageHeader
        title={title}
        eyebrow="Relationships"
        description={`Your ${title.toLowerCase()}, billing details and transaction history.`}
        actions={<NewLink href={`${base}/new`}>New {kind}</NewLink>}
      />
      <Panel>
        <DataTable
          rows={w.parties.filter(
            (p) =>
              p.kind === kind &&
              (filter === "all" || p.active === (filter === "active")),
          )}
          search={(p) =>
            `${p.name} ${p.organization} ${p.phone} ${p.email} ${p.gstin}`
          }
          toolbar={
            <select
              aria-label="Contact status filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {options(["active", "archived", "all"]).map((o) => (
                <option key={o.value}>{o.value}</option>
              ))}
            </select>
          }
          columns={[
            {
              key: "name",
              title: kind === "customer" ? "Customer" : "Supplier",
              primary: true,
              value: (p) => p.name,
              render: (p) => (
                <Link href={`${base}/${p.id}`}>
                  {p.name}
                  <small>{p.organization || p.type}</small>
                </Link>
              ),
            },
            {
              key: "phone",
              title: "Contact",
              value: (p) => p.phone,
              render: (p) => (
                <>
                  {p.phone || "—"}
                  <small>{p.email}</small>
                </>
              ),
            },
            {
              key: "city",
              title: "Location",
              value: (p) => p.city,
              render: (p) =>
                [p.city, p.state].filter(Boolean).join(", ") || "—",
            },
            {
              key: "balance",
              title: "Outstanding",
              align: "right",
              value: (p) => partyBalance(w, p.id),
              render: (p) => money(partyBalance(w, p.id)),
            },
            {
              key: "status",
              title: "Status",
              value: (p) => Number(p.active),
              render: (p) => <Badge>{p.active ? "active" : "archived"}</Badge>,
            },
          ]}
        />
      </Panel>
    </>
  );
}
const productFields: FormField<Product & { openingMilli: number }>[] = [
  { key: "name", label: "Product name", required: true },
  { key: "sku", label: "Item code / SKU", required: true },
  { key: "category", label: "Category" },
  { key: "subcategory", label: "Subcategory" },
  { key: "brand", label: "Brand" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "model", label: "Model" },
  { key: "catalogueNumber", label: "Catalogue number" },
  { key: "packSize", label: "Pack size" },
  { key: "barcode", label: "Barcode" },
  { key: "hsn", label: "HSN / SAC" },
  {
    key: "unit",
    label: "Stock unit",
    required: true,
    hint: "Use the same unit for purchases and sales. Unit conversion is not configured.",
  },
  { key: "purchasePaise", label: "Purchase rate (₹)", type: "money" },
  { key: "salePaise", label: "Selling rate (₹)", type: "money" },
  { key: "taxBps", label: "GST rate (%)", type: "percent" },
  { key: "reorderMilli", label: "Reorder level", type: "quantity" },
  { key: "batchTracking", label: "Track batches", type: "checkbox" },
  { key: "expiryTracking", label: "Track expiry dates", type: "checkbox" },
  {
    key: "openingMilli",
    label: "Opening stock",
    type: "quantity",
    hint: "For batch-tracked items, leave 0 and create a batch after saving.",
  },
  { key: "notes", label: "Notes", type: "textarea" },
];
export function Products({ id, edit }: { id?: string; edit?: boolean }) {
  const { w, run, confirm } = useWorkspace(),
    router = useRouter(),
    [filter, setFilter] = useState("active"),
    p = w.products.find((p) => p.id === id);
  if (id === "new" || (edit && p))
    return (
      <>
        <PageHeader
          title={`${p ? "Edit" : "New"} product`}
          description="Maintain catalogue, pricing and stock preferences."
          actions={
            <Link
              className="button secondary"
              href={p ? `/products/${p.id}` : "/products"}
            >
              Cancel
            </Link>
          }
        />
        <Panel>
          <RecordForm
            initial={{
              ...(p || { ...blankProduct(), taxBps: w.settings.defaultTaxBps }),
              openingMilli: 0,
            }}
            fields={productFields
              .filter((f) => !p || f.key !== "openingMilli")
              .map((f) =>
                p &&
                w.movements.some((m) => m.productId === p.id) &&
                ["unit", "batchTracking"].includes(f.key)
                  ? { ...f, disabled: true }
                  : f,
              )}
            onSave={async (values) => {
              const { openingMilli, ...product } = values;
              const key = await run((w, s) =>
                saveProduct(w, s, product, openingMilli),
              );
              router.push(`/products/${key}`);
            }}
          />
        </Panel>
      </>
    );
  if (id && !p)
    return (
      <Empty
        title="Product not found"
        action={<Link href="/products">Back to products</Link>}
      />
    );
  if (p)
    return (
      <>
        <PageHeader
          title={p.name}
          eyebrow={p.sku}
          description={[p.brand, p.category].filter(Boolean).join(" · ")}
          actions={
            <>
              <Link
                className="button secondary"
                href={`/products/${p.id}/edit`}
              >
                Edit product
              </Link>
              <button
                className="secondary"
                onClick={() =>
                  confirm(
                    p.active
                      ? "Archive this product?"
                      : "Restore this product?",
                    "Stock and document history remain available. Archived products cannot be added to new documents.",
                    () =>
                      run((w, s) =>
                        saveProduct(w, s, { ...p, active: !p.active }),
                      ),
                  )
                }
              >
                {p.active ? "Archive" : "Restore"}
              </button>
            </>
          }
        />
        <div className="summary-cards">
          <Panel>
            <small>Available / on hand</small>
            <strong>
              {availableStock(w, p.id) / 1000} / {stock(w, p.id) / 1000}{" "}
              <small>{p.unit}</small>
            </strong>
          </Panel>
          <Panel>
            <small>Selling rate</small>
            <strong>{money(p.salePaise)}</strong>
          </Panel>
          <Panel>
            <small>Reorder level</small>
            <strong>
              {p.reorderMilli / 1000} <small>{p.unit}</small>
            </strong>
          </Panel>
        </div>
        <Panel
          title="Product details"
          action={<Link href="/inventory/adjustments/new">Adjust stock →</Link>}
        >
          <DetailGrid
            entries={productFields
              .filter((f) => f.key !== "openingMilli")
              .map((f) => [
                f.label,
                ["purchasePaise", "salePaise"].includes(f.key)
                  ? money(p[f.key as "salePaise"])
                  : f.key === "taxBps"
                    ? `${p.taxBps / 100}%`
                    : f.key === "reorderMilli"
                      ? `${p.reorderMilli / 1000} ${p.unit}`
                      : typeof p[f.key as keyof Product] === "boolean"
                        ? p[f.key as keyof Product]
                          ? "Yes"
                          : "No"
                        : String(p[f.key as keyof Product]),
              ])}
          />
        </Panel>
        <Panel title="Stock history">
          <MovementTable productId={p.id} />
        </Panel>
      </>
    );
  return (
    <>
      <PageHeader
        title="Products"
        eyebrow="Catalogue"
        description="Products, commercial details and stock preferences."
        actions={<NewLink href="/products/new">New product</NewLink>}
      />
      <Panel>
        <DataTable
          rows={w.products.filter(
            (p) => filter === "all" || p.active === (filter === "active"),
          )}
          search={(p) => `${p.name} ${p.sku} ${p.category} ${p.brand}`}
          toolbar={
            <select
              aria-label="Product status filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["active", "archived", "all"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          }
          columns={[
            {
              key: "name",
              title: "Product",
              primary: true,
              value: (p) => p.name,
              render: (p) => (
                <Link href={`/products/${p.id}`}>
                  {p.name}
                  <small>{p.sku}</small>
                </Link>
              ),
            },
            {
              key: "category",
              title: "Category",
              value: (p) => p.category,
              render: (p) => p.category || "—",
            },
            {
              key: "rate",
              title: "Selling rate",
              align: "right",
              value: (p) => p.salePaise,
              render: (p) => money(p.salePaise),
            },
            {
              key: "stock",
              title: "Available stock",
              align: "right",
              value: (p) => availableStock(w, p.id),
              render: (p) => `${availableStock(w, p.id) / 1000} ${p.unit}`,
            },
            {
              key: "tracking",
              title: "Tracking",
              value: (p) => Number(p.batchTracking),
              render: (p) =>
                p.expiryTracking
                  ? "Batch & expiry"
                  : p.batchTracking
                    ? "Batch"
                    : "Quantity",
            },
            {
              key: "status",
              title: "Status",
              value: (p) => Number(p.active),
              render: (p) => <Badge>{p.active ? "active" : "archived"}</Badge>,
            },
          ]}
        />
      </Panel>
    </>
  );
}
export function MovementTable({
  productId,
  type,
}: {
  productId?: string;
  type?: string;
}) {
  const { w } = useWorkspace();
  return (
    <DataTable
      rows={w.movements
        .filter(
          (m) =>
            (!productId || m.productId === productId) &&
            (!type || m.type === type),
        )
        .toReversed()}
      search={(m) =>
        `${w.products.find((p) => p.id === m.productId)?.name} ${m.reason} ${m.type}`
      }
      columns={[
        {
          key: "date",
          title: "Date",
          value: (m) => m.date,
          render: (m) => formatDate(m.date),
        },
        {
          key: "product",
          title: "Product / lot",
          primary: true,
          value: (m) => m.productId,
          render: (m) => (
            <Link href={`/products/${m.productId}`}>
              {w.products.find((p) => p.id === m.productId)?.name}
              <small>{w.batches.find((b) => b.id === m.batchId)?.lot}</small>
            </Link>
          ),
        },
        {
          key: "type",
          title: "Movement",
          value: (m) => m.type,
          render: (m) => <Badge>{m.type}</Badge>,
        },
        {
          key: "qty",
          title: "Quantity",
          align: "right",
          value: (m) => m.quantityMilli,
          render: (m) => (
            <span className={m.quantityMilli < 0 ? "error-text" : "positive"}>
              {m.quantityMilli > 0 ? "+" : ""}
              {m.quantityMilli / 1000}
            </span>
          ),
        },
        {
          key: "reason",
          title: "Reason / reference",
          value: (m) => m.reason,
          render: (m) => m.reason,
        },
        {
          key: "actor",
          title: "By",
          value: (m) => m.actor,
          render: (m) => m.actor,
        },
      ]}
    />
  );
}
