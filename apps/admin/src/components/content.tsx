"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Save,
  Eye,
  CloudUpload,
  ArrowLeft,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import type { ContentPage } from "@hitech/types/admin";
import { safeUrl } from "@hitech/validation";
import { useWorkspace, useDraft } from "./provider";
import {
  PageHeader,
  Panel,
  Field,
  Status,
  ErrorSummary,
  Modal,
  Empty,
} from "./ui";
import { SeoFields } from "./seo-fields";
import { Access } from "./access";
export default function Content({ id }: { id?: string }) {
  return (
    <Access permission="content.manage">
      <ContentView id={id} />
    </Access>
  );
}
function ContentView({ id }: { id?: string }) {
  const { workspace: w } = useWorkspace();
  if (id) {
    const p = w.pages.find((p) => p.id === id);
    return p ? (
      <ContentEditor key={p.id} initial={p} />
    ) : (
      <Empty title="Page not found" />
    );
  }
  return (
    <>
      <PageHeader
        title="Pages & content"
        description="Focused, structured fields for the most important parts of your website."
      />
      <div className="content-grid">
        {w.pages.map((p) => (
          <Link key={p.id} href={`/content/${p.id}`} className="content-card">
            <div className="content-card-top">
              <span className="soft-icon">
                <FileText size={21} />
              </span>
              <ArrowUpRight size={19} />
            </div>
            <h2>{p.title}</h2>
            <p>{p.path === "footer" ? "Shared website footer" : p.path}</p>
            <div>
              <Status
                value={
                  p.revision === p.publishedRevision ? "Published" : "Draft"
                }
              />
              <span>
                {p.published
                  ? "Published snapshot retained"
                  : "Not published in demo"}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <p className="page-note">
        Content editing changes text fields only. It does not rebuild the
        website layout or modify the live website.
      </p>
    </>
  );
}
function ContentEditor({ initial }: { initial: ContentPage }) {
  const { workspace: w, run, allowed, notify, busy } = useWorkspace();
  const { value: p, setValue, dirty, clean } = useDraft(initial);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const set = <K extends keyof ContentPage>(key: K, value: ContentPage[K]) =>
    setValue({ ...p, [key]: value });
  const save = async () => {
    try {
      await run({ type: "page.save", page: p, expectedRevision: p.revision });
      clean({ ...p, revision: p.revision + 1 });
      notify("Content draft saved. Live website unchanged.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  };
  const publish = async () => {
    try {
      await run({
        type: "page.publish",
        id: p.id,
        expectedRevision: p.revision,
      });
      notify("Content published to the demo snapshot.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed.");
    }
  };
  return (
    <>
      <Link className="back-link" href="/content">
        <ArrowLeft size={15} />
        All content
      </Link>
      <PageHeader
        title={p.title}
        description="Structured, plain-text content. Your website design stays intact."
        actions={
          <>
            <button
              className="button secondary"
              onClick={() => setPreview(true)}
            >
              <Eye size={16} />
              Preview
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void save()}
            >
              <Save size={16} />
              Save draft
            </button>
            {allowed("products.publish") && (
              <button
                className="button"
                disabled={busy || dirty}
                onClick={() => void publish()}
              >
                <CloudUpload size={16} />
                Publish
              </button>
            )}
          </>
        }
      />
      <ErrorSummary message={error} />
      <div className="editor-grid">
        <div>
          <Panel title="Page content">
            <div className="form-grid">
              <Field label="Page title *" wide>
                <input
                  value={p.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </Field>
              <Field label={p.id === "home" ? "Hero heading" : "Heading"} wide>
                <input
                  value={p.heading}
                  maxLength={200}
                  onChange={(e) => set("heading", e.target.value)}
                />
              </Field>
              <Field
                label={p.id === "home" ? "Hero description" : "Description"}
                wide
              >
                <textarea
                  value={p.description}
                  maxLength={1200}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              <Field
                label="Supporting content"
                hint="Plain text. Paragraphs are preserved; HTML is not allowed."
                wide
              >
                <textarea
                  className="long-text"
                  value={p.body}
                  maxLength={15000}
                  onChange={(e) => set("body", e.target.value)}
                />
              </Field>
              <Field label="CTA label">
                <input
                  value={p.ctaLabel}
                  maxLength={80}
                  onChange={(e) => set("ctaLabel", e.target.value)}
                />
              </Field>
              <Field label="CTA link">
                <input
                  value={p.ctaLink}
                  placeholder="/products"
                  onChange={(e) => set("ctaLink", e.target.value)}
                />
              </Field>
            </div>
          </Panel>
          {p.id === "home" && (
            <Panel title="Homepage selections">
              <Field
                label="Featured categories"
                hint="Hold Ctrl/Command to select multiple categories."
              >
                <select
                  multiple
                  value={p.featuredCategoryIds}
                  onChange={(e) =>
                    set(
                      "featuredCategoryIds",
                      Array.from(e.target.selectedOptions).map((o) => o.value),
                    )
                  }
                >
                  {w.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Link href="/featured" className="text-link">
                Manage featured products →
              </Link>
              <div className="form-grid">
                <Field label="Procurement CTA heading" wide>
                  <input
                    value={p.procurementHeading}
                    onChange={(e) => set("procurementHeading", e.target.value)}
                  />
                </Field>
                <Field label="Procurement CTA description" wide>
                  <textarea
                    value={p.procurementDescription}
                    onChange={(e) =>
                      set("procurementDescription", e.target.value)
                    }
                  />
                </Field>
              </div>
            </Panel>
          )}
          <Panel title="Page SEO">
            <SeoFields value={p.seo} onChange={(s) => set("seo", s)} />
          </Panel>
        </div>
        <aside>
          <Panel title="Publishing">
            <p className="small-text muted">
              This is an independent admin preview. Publishing updates the local
              demo snapshot, not the live site.
            </p>
            <div className="editor-status">
              <Status
                value={
                  w.pages.find((x) => x.id === p.id)?.published
                    ? "Published"
                    : "Draft"
                }
              />
              {dirty && <span>Unsaved changes</span>}
            </div>
          </Panel>
        </aside>
      </div>
      {preview && (
        <Modal
          title={`${p.title} preview`}
          onClose={() => setPreview(false)}
          wide
        >
          <p className="callout">
            Content preview only. The production website layout is unchanged.
          </p>
          <div className="page-preview">
            <span className="eyebrow">{w.settings.business.tradeName}</span>
            <h2>{p.heading}</h2>
            <p>{p.description}</p>
            {p.ctaLabel && (
              <button disabled className="button">
                {p.ctaLabel}
              </button>
            )}
            <small>{safeUrl(p.ctaLink, true) ? p.ctaLink : ""}</small>
            <div className="preserve-lines">{p.body}</div>
            {p.id === "home" && (
              <>
                <h3>Featured categories</h3>
                <div className="preview-tags">
                  {p.featuredCategoryIds.map((id) => (
                    <span key={id}>
                      {w.categories.find((c) => c.id === id)?.name}
                    </span>
                  ))}
                </div>
                <h3>{p.procurementHeading}</h3>
                <p>{p.procurementDescription}</p>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
