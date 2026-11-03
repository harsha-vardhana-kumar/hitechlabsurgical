"use client";
import type { Seo } from "@hitech/types/admin";
import { Field } from "./ui";
import { useWorkspace } from "./provider";
export function SeoFields({
  value,
  onChange,
}: {
  value: Seo;
  onChange: (s: Seo) => void;
}) {
  const { workspace } = useWorkspace();
  const set = (k: keyof Seo, v: string | boolean) =>
    onChange({ ...value, [k]: v });
  return (
    <>
      <div className="form-grid">
        <Field
          label="Meta title"
          hint={`${value.title.length} characters · Aim for 30–60 characters.`}
          wide
        >
          <input
            value={value.title}
            maxLength={120}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>
        <Field
          label="Meta description"
          hint={`${value.description.length} characters · Aim for 120–160 characters.`}
          wide
        >
          <textarea
            value={value.description}
            maxLength={320}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Field
          label="Canonical URL"
          hint="Absolute HTTPS URL. Leave blank to use the page URL."
          wide
        >
          <input
            type="url"
            value={value.canonical}
            placeholder={`${workspace.settings.site.websiteUrl}/products/…`}
            onChange={(e) => set("canonical", e.target.value)}
          />
        </Field>
        <Field label="Open Graph title">
          <input
            value={value.ogTitle}
            maxLength={120}
            onChange={(e) => set("ogTitle", e.target.value)}
          />
        </Field>
        <Field label="Open Graph image">
          <select
            value={value.ogImageId}
            onChange={(e) => set("ogImageId", e.target.value)}
          >
            <option value="">Use default</option>
            {workspace.media.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fileName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Open Graph description" wide>
          <textarea
            value={value.ogDescription}
            maxLength={320}
            onChange={(e) => set("ogDescription", e.target.value)}
          />
        </Field>
        <label className="check">
          <input
            type="checkbox"
            checked={value.index}
            onChange={(e) => set("index", e.target.checked)}
          />
          Allow search indexing
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={value.follow}
            onChange={(e) => set("follow", e.target.checked)}
          />
          Allow following links
        </label>
      </div>
      <div className="seo-preview">
        <span className="section-label">Search preview · illustrative</span>
        <small>
          {value.canonical || `${workspace.settings.site.websiteUrl}/…`}
        </small>
        <h3>{value.title || "Add a page title"}</h3>
        <p>{value.description || "Add a clear description of this page."}</p>
      </div>
    </>
  );
}
