"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Save,
  CloudUpload,
  Trash2,
} from "lucide-react";
import type { AdminCategory } from "@hitech/types/admin";
import { slugify } from "@hitech/utils";
import { useWorkspace, useDraft } from "./provider";
import {
  PageHeader,
  Panel,
  Status,
  DataTable,
  Field,
  ErrorSummary,
  Modal,
  Empty,
} from "./ui";
import { blankCategory } from "../domain/factories";
import { SeoFields } from "./seo-fields";
import { Access } from "./access";
export default function Categories({ id }: { id?: string }) {
  return (
    <Access permission="categories.manage">
      {id ? <CategoryEditor id={id} key={id} /> : <CategoryList />}
    </Access>
  );
}
function CategoryList() {
  const { workspace: w, run, notify, busy } = useWorkspace();
  const [error, setError] = useState("");
  const move = async (c: AdminCategory, direction: -1 | 1) => {
    try {
      await run({
        type: "category.move",
        id: c.id,
        direction,
        expectedRevision: c.revision,
      });
      notify(
        "Category order saved. Review the affected category drafts in Publishing status.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reorder.");
    }
  };
  return (
    <>
      <PageHeader
        title="Categories"
        description="Keep your catalogue organized with clear collections and display order."
        actions={
          <Link className="button" href="/categories/new">
            <Plus size={16} />
            Add category
          </Link>
        }
      />
      <ErrorSummary message={error} />
      <Panel>
        <DataTable
          initialSort="order"
          rows={w.categories}
          search={(c) => `${c.name} ${c.slug} ${c.description}`}
          columns={[
            {
              key: "name",
              title: "Category",
              primary: true,
              value: (c) => c.name,
              render: (c) => (
                <Link className="record-name" href={`/categories/${c.id}`}>
                  <strong>{c.name}</strong>
                  <small>/{c.slug}</small>
                </Link>
              ),
            },
            {
              key: "products",
              title: "Products",
              value: (c) =>
                w.products.filter((p) => p.categoryId === c.id).length,
            },
            {
              key: "status",
              title: "Status",
              value: (c) => (c.active ? "Active" : "Inactive"),
              render: (c) => (
                <div className="badge-stack">
                  <Status value={c.active ? "Active" : "Inactive"} />
                  <small>
                    {c.publishedRevision === c.revision
                      ? "Published"
                      : "Unpublished changes"}
                  </small>
                </div>
              ),
            },
            {
              key: "order",
              title: "Display order",
              value: (c) => c.sortOrder,
              render: (c) => (
                <div className="actions">
                  <button
                    aria-label={`Move ${c.name} up`}
                    disabled={
                      busy ||
                      [...w.categories].sort(
                        (a, b) =>
                          a.sortOrder - b.sortOrder ||
                          a.name.localeCompare(b.name),
                      )[0]?.id === c.id
                    }
                    className="icon-button"
                    onClick={() => void move(c, -1)}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <span>{c.sortOrder}</span>
                  <button
                    aria-label={`Move ${c.name} down`}
                    disabled={
                      busy ||
                      [...w.categories].sort(
                        (a, b) =>
                          b.sortOrder - a.sortOrder ||
                          b.name.localeCompare(a.name),
                      )[0]?.id === c.id
                    }
                    className="icon-button"
                    onClick={() => void move(c, 1)}
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              ),
            },
            {
              key: "edit",
              title: "Actions",
              value: (c) => c.id,
              render: (c) => (
                <Link className="text-link" href={`/categories/${c.id}`}>
                  Edit details →
                </Link>
              ),
            },
          ]}
        />
      </Panel>
    </>
  );
}
function CategoryEditor({ id }: { id: string }) {
  const { workspace } = useWorkspace();
  const [fresh] = useState(blankCategory);
  const initial =
    id === "new" ? fresh : workspace.categories.find((c) => c.id === id);
  return initial ? (
    <CategoryForm initial={initial} isNew={id === "new"} />
  ) : (
    <Empty title="Category not found" />
  );
}
function CategoryForm({
  initial,
  isNew,
}: {
  initial: AdminCategory;
  isNew: boolean;
}) {
  const { workspace: w, run, allowed, notify, busy, confirm } = useWorkspace();
  const { value: c, setValue, dirty, clean } = useDraft(initial);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [reassign, setReassign] = useState("");
  const router = useRouter();
  const saved = w.categories.find((x) => x.id === c.id);
  const set = <K extends keyof AdminCategory>(
    key: K,
    value: AdminCategory[K],
  ) => setValue({ ...c, [key]: value });
  const save = async () => {
    setError("");
    try {
      await run({
        type: "category.save",
        category: c,
        expectedRevision: c.revision,
      });
      clean({ ...c, revision: c.revision + 1 });
      notify("Category draft saved.");
      if (isNew) router.replace(`/categories/${c.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  };
  const publish = async () => {
    try {
      if (!saved) return;
      if (!c.active) {
        if (
          !(await confirm({
            title: "Unpublish category?",
            message:
              "The category will be removed from the published demo catalogue.",
            label: "Unpublish category",
          }))
        )
          return;
        await run({
          type: "category.unpublish",
          id: c.id,
          expectedRevision: c.revision,
          confirmed: true,
        });
        clean({ ...c, revision: c.revision + 1 });
        notify("Category unpublished.");
      } else {
        await run({
          type: "category.publish",
          id: c.id,
          expectedRevision: c.revision,
        });
        notify("Category published to the demo catalogue.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed.");
    }
  };
  const remove = async () => {
    try {
      await run({
        type: "category.delete",
        id: c.id,
        reassignId: reassign,
        confirmed: true,
      });
      setDeleting(false);
      clean(c);
      notify("Category deleted and references reassigned.");
      router.push("/categories");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion blocked.");
      setDeleting(false);
    }
  };
  return (
    <>
      <Link className="back-link" href="/categories">
        <ArrowLeft size={15} />
        All categories
      </Link>
      <PageHeader
        title={isNew ? "Add category" : c.name}
        description="Changes stay in draft until you publish this category."
        actions={
          <>
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
                disabled={!saved || dirty || busy}
                onClick={() => void publish()}
              >
                <CloudUpload size={16} />
                {c.active ? "Publish category" : "Unpublish category"}
              </button>
            )}
          </>
        }
      />
      <ErrorSummary message={error} />
      <div className="editor-grid">
        <div>
          <Panel title="Category details">
            <div className="form-grid">
              <Field label="Category name *">
                <input
                  value={c.name}
                  onChange={(e) =>
                    setValue({
                      ...c,
                      name: e.target.value,
                      ...(!saved && (!c.slug || c.slug === slugify(c.name))
                        ? { slug: slugify(e.target.value) }
                        : {}),
                    })
                  }
                />
              </Field>
              <Field label="Slug *">
                <input
                  value={c.slug}
                  onChange={(e) => set("slug", e.target.value)}
                />
              </Field>
              <Field label="Description" wide>
                <textarea
                  value={c.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              <Field label="Image">
                <select
                  value={c.imageId}
                  onChange={(e) => set("imageId", e.target.value)}
                >
                  <option value="">No image</option>
                  {w.media
                    .filter((m) => m.type === "image")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fileName}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Display order">
                <input
                  type="number"
                  min={0}
                  value={c.sortOrder}
                  onChange={(e) => set("sortOrder", Number(e.target.value))}
                />
              </Field>
              <label className="check">
                <input
                  type="checkbox"
                  checked={c.active}
                  onChange={(e) => set("active", e.target.checked)}
                />
                Active category
              </label>
            </div>
          </Panel>
          <Panel title="Category SEO">
            <SeoFields value={c.seo} onChange={(seo) => set("seo", seo)} />
          </Panel>
        </div>
        <aside>
          <Panel title="Publishing">
            <p className="small-text muted">
              A category must be active and published before new products can be
              published into it.
            </p>
            <div className="editor-status">
              <Status value={saved?.published ? "Published" : "Draft"} />
              {dirty && <span>Unsaved changes</span>}
            </div>
          </Panel>
          {saved && (
            <Panel title="Category removal">
              <p className="small-text muted">
                Products and page selections must be reassigned before deleting
                an in-use category. Published references require publishing
                permission.
              </p>
              <button
                className="button danger-outline"
                disabled={dirty}
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={15} />
                Delete category
              </button>
            </Panel>
          )}
        </aside>
      </div>
      {deleting && (
        <Modal title="Delete category" onClose={() => setDeleting(false)}>
          <p>
            All draft and published references to <strong>{c.name}</strong> must
            move to another active, published category.
          </p>
          <Field label="Reassign references to">
            <select
              value={reassign}
              onChange={(e) => setReassign(e.target.value)}
            >
              <option value="">Select replacement (required if in use)</option>
              {w.categories
                .filter((x) => x.id !== c.id && x.active && x.published?.active)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </Field>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(false)}
            >
              Cancel
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={() => void remove()}
            >
              Delete & reassign
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
