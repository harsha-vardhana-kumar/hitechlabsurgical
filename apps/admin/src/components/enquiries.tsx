"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Plus,
  Download,
  ArrowLeft,
  Save,
  MessageSquare,
  FlaskConical,
} from "lucide-react";
import type { Enquiry, EnquiryStatus } from "@hitech/types/admin";
import { toCsv, humanDate } from "@hitech/utils";
import { useWorkspace, useDraft } from "./provider";
import {
  PageHeader,
  Panel,
  Status,
  DataTable,
  Field,
  ErrorSummary,
  Empty,
} from "./ui";
import { enquiryTransitions } from "../services/commands";
import { blankEnquiry } from "../domain/factories";
import { Access } from "./access";
export default function Enquiries({
  kind,
  id,
}: {
  kind: "quote" | "contact";
  id?: string;
}) {
  return (
    <Access permission="enquiries.manage">
      {id === "new" ? (
        <NewEnquiry key={kind} kind={kind} />
      ) : id ? (
        <EnquiryDetail id={id} key={id} />
      ) : (
        <EnquiryList key={kind} kind={kind} />
      )}
    </Access>
  );
}
function EnquiryList({ kind }: { kind: "quote" | "contact" }) {
  const { workspace: w } = useWorkspace();
  const [status, setStatus] = useState("");
  const [assigned, setAssigned] = useState("");
  const [download, setDownload] = useState("");
  const route = kind === "quote" ? "quotes" : "contacts";
  const rows = w.enquiries.filter(
    (e) =>
      e.kind === kind &&
      (!status || e.status === status) &&
      (!assigned || e.assignedTo === assigned),
  );
  const prepare = () => {
    if (download) URL.revokeObjectURL(download);
    setDownload(
      URL.createObjectURL(
        new Blob(
          [
            toCsv(
              [
                "Reference",
                "Type",
                "Name",
                "Organisation",
                "Email",
                "Phone",
                "City",
                "Product",
                "Quantity",
                "Submitted",
                "Status",
                "Assigned to",
                "Message",
                "Internal notes",
                "Demo",
              ],
              rows.map((e) => [
                e.id,
                e.kind,
                e.name,
                e.organisation,
                e.email,
                e.phone,
                e.city,
                e.productName,
                e.quantity,
                e.submittedAt,
                e.status,
                w.users.find((u) => u.id === e.assignedTo)?.name || "",
                e.message,
                e.internalNotes,
                e.demo,
              ]),
            ),
          ],
          { type: "text/csv;charset=utf-8" },
        ),
      ),
    );
  };
  return (
    <>
      <PageHeader
        title={kind === "quote" ? "Quote requests" : "Contact enquiries"}
        description="Follow up, assign ownership, and keep internal notes in one place."
        actions={
          <>
            <button className="button secondary" onClick={prepare}>
              <Download size={15} />
              Prepare CSV
            </button>
            <Link className="button" href={`/enquiries/${route}/new`}>
              <Plus size={16} />
              Simulate enquiry
            </Link>
          </>
        }
      />
      <div className="callout">
        <FlaskConical size={18} />
        <p>
          Sample enquiries are fictional. There is no live connection to the
          public website form.
        </p>
      </div>
      {download && (
        <div className="selection-bar">
          <span>
            CSV prepared from the current filters, including internal notes.
          </span>
          <a
            className="button small secondary"
            href={download}
            download={`hitech-demo-${route}.csv`}
          >
            Save CSV
          </a>
        </div>
      )}
      <Panel>
        <DataTable
          rows={rows}
          search={(e) =>
            `${e.id} ${e.name} ${e.organisation} ${e.email} ${e.phone} ${e.productName} ${e.message} ${e.internalNotes}`
          }
          toolbar={
            <>
              <select
                aria-label="Enquiry status filter"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {Object.keys(enquiryTransitions).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                aria-label="Assignee filter"
                value={assigned}
                onChange={(e) => setAssigned(e.target.value)}
              >
                <option value="">All assignees</option>
                {w.users
                  .filter((u) => u.active)
                  .map((u) => (
                    <option value={u.id} key={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </>
          }
          columns={[
            {
              key: "name",
              title: "Enquiry",
              primary: true,
              value: (e) => e.organisation || e.name,
              render: (e) => (
                <Link
                  className="record-name"
                  href={`/enquiries/${route}/${e.id}`}
                >
                  <strong>{e.organisation || e.name}</strong>
                  <small>{e.name} · Sample</small>
                </Link>
              ),
            },
            {
              key: "product",
              title: "Product / subject",
              value: (e) => e.productName || "General enquiry",
            },
            {
              key: "status",
              title: "Status",
              value: (e) => e.status,
              render: (e) => <Status value={e.status} />,
            },
            {
              key: "assigned",
              title: "Assigned to",
              value: (e) =>
                w.users.find((u) => u.id === e.assignedTo)?.name ||
                "Unassigned",
            },
            {
              key: "date",
              title: "Submitted",
              value: (e) => e.submittedAt,
              render: (e) => humanDate(e.submittedAt),
            },
            {
              key: "open",
              title: "Actions",
              value: (e) => e.id,
              render: (e) => (
                <Link
                  className="text-link"
                  href={`/enquiries/${route}/${e.id}`}
                >
                  Open enquiry →
                </Link>
              ),
            },
          ]}
        />
      </Panel>
    </>
  );
}
function NewEnquiry({ kind }: { kind: "quote" | "contact" }) {
  const { workspace: w, run, notify, busy } = useWorkspace();
  const [fresh] = useState(() => blankEnquiry(kind));
  const { value: e, setValue, clean } = useDraft(fresh);
  const [error, setError] = useState("");
  const router = useRouter();
  const route = kind === "quote" ? "quotes" : "contacts";
  const set = <K extends keyof Enquiry>(key: K, value: Enquiry[K]) =>
    setValue({ ...e, [key]: value });
  const save = async () => {
    try {
      const id = await run({ type: "enquiry.createDemo", enquiry: e });
      clean(e);
      notify("Sample enquiry received in the demo inbox.");
      router.push(`/enquiries/${route}/${id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create enquiry.",
      );
    }
  };
  return (
    <>
      <Link className="back-link" href={`/enquiries/${route}`}>
        <ArrowLeft size={15} />
        Back to enquiries
      </Link>
      <PageHeader
        title="Simulate a website enquiry"
        description="Create a fictional request to test the admin follow-up workflow."
      />
      <ErrorSummary message={error} />
      <Panel title="Sample enquiry details">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="form-grid">
            {(
              [
                "name",
                "organisation",
                "email",
                "phone",
                "city",
                "quantity",
              ] as const
            ).map((key) => (
              <Field
                key={key}
                label={
                  {
                    name: "Name *",
                    organisation: "Organisation",
                    email: "Email",
                    phone: "Phone",
                    city: "City",
                    quantity: "Quantity / requirements",
                  }[key]
                }
              >
                <input
                  value={e[key]}
                  type={key === "email" ? "email" : "text"}
                  required={key === "name"}
                  onChange={(ev) => set(key, ev.target.value)}
                />
              </Field>
            ))}
            {kind === "quote" && (
              <Field label="Product" wide>
                <select
                  value={e.productId}
                  onChange={(ev) => set("productId", ev.target.value)}
                >
                  <option value="">General product request</option>
                  {w.products
                    .filter((p) => p.status !== "Archived")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            <Field label="Message *" wide>
              <textarea
                value={e.message}
                required
                maxLength={5000}
                onChange={(ev) => set("message", ev.target.value)}
              />
            </Field>
          </div>
          <div className="form-bottom">
            <span className="muted">Use fictional details only.</span>
            <button className="button" disabled={busy}>
              Create sample enquiry
            </button>
          </div>
        </form>
      </Panel>
    </>
  );
}
function EnquiryDetail({ id }: { id: string }) {
  const { workspace } = useWorkspace();
  const initial = workspace.enquiries.find((e) => e.id === id);
  return initial ? (
    <EnquiryForm initial={initial} />
  ) : (
    <Empty title="Enquiry not found" />
  );
}
function EnquiryForm({ initial }: { initial: Enquiry }) {
  const { workspace: w, run, notify, busy } = useWorkspace();
  const { value: e, setValue, dirty, clean } = useDraft(initial);
  const [error, setError] = useState("");
  const current = w.enquiries.find((x) => x.id === e.id)!;
  const options = [current.status, ...enquiryTransitions[current.status]];
  const product = w.products.find((p) => p.id === e.productId);
  const save = async () => {
    try {
      await run({
        type: "enquiry.update",
        id: e.id,
        status: e.status,
        assignedTo: e.assignedTo,
        internalNotes: e.internalNotes,
        expectedRevision: e.revision,
      });
      clean({ ...e, revision: e.revision + 1 });
      notify("Enquiry follow-up saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  };
  return (
    <>
      <Link
        className="back-link"
        href={`/enquiries/${e.kind === "quote" ? "quotes" : "contacts"}`}
      >
        <ArrowLeft size={15} />
        All enquiries
      </Link>
      <PageHeader
        title={e.organisation || e.name}
        description={`${e.kind === "quote" ? "Quote request" : "Contact enquiry"} · ${e.id} · Sample record`}
        actions={
          <button
            className="button"
            disabled={busy}
            onClick={() => void save()}
          >
            <Save size={16} />
            Save updates
          </button>
        }
      />
      <ErrorSummary message={error} />
      <div className="editor-grid">
        <div>
          <Panel
            title="Enquiry details"
            action={<Status value={current.status} />}
          >
            <dl className="detail-list">
              {[
                ["Contact", e.name],
                ["Organisation", e.organisation],
                ["Email", e.email],
                ["Phone", e.phone],
                ["City", e.city],
                ["Submitted", humanDate(e.submittedAt)],
                ["Product", e.productName],
                ["Quantity", e.quantity],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v || "Not provided"}</dd>
                </div>
              ))}
            </dl>
            {product?.status === "Archived" && (
              <p className="callout">
                This product is archived. The original enquiry reference has
                been preserved.
              </p>
            )}
          </Panel>
          <Panel title="Customer message">
            <div className="message-box">
              <MessageSquare size={20} />
              <p className="preserve-lines">{e.message}</p>
            </div>
          </Panel>
        </div>
        <aside>
          <Panel title="Follow-up">
            <div className="stack">
              <Field label="Status">
                <select
                  value={e.status}
                  onChange={(ev) =>
                    setValue({ ...e, status: ev.target.value as EnquiryStatus })
                  }
                >
                  {[...new Set([...options, e.status])].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Assigned to">
                <select
                  value={e.assignedTo}
                  onChange={(ev) =>
                    setValue({ ...e, assignedTo: ev.target.value })
                  }
                >
                  <option value="">Unassigned</option>
                  {w.users
                    .filter((u) => u.active)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field
                label="Internal notes"
                hint="Private to the admin workspace. Never included in public content."
              >
                <textarea
                  className="long-text"
                  value={e.internalNotes}
                  maxLength={5000}
                  onChange={(ev) =>
                    setValue({ ...e, internalNotes: ev.target.value })
                  }
                />
              </Field>
              <button
                className="button"
                disabled={busy}
                onClick={() => void save()}
              >
                Save updates
              </button>
              <span className="small-text muted">
                {dirty ? "Unsaved changes" : "Updates saved"}
              </span>
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}
