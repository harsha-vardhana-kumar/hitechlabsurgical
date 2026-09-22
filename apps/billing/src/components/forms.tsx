"use client";
import { useState } from "react";
import { parseFixed } from "../domain/money";
import { ValidationError } from "../domain/validation";
import { useUnsaved, useWorkspace } from "./provider";
import { ErrorSummary, Field } from "./ui";
export interface FormField<T> {
  key: keyof T & string;
  label: string;
  type?:
    | "text"
    | "email"
    | "date"
    | "textarea"
    | "checkbox"
    | "money"
    | "quantity"
    | "percent"
    | "integer"
    | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  full?: boolean;
  disabled?: boolean;
}
function asString(value: unknown, type?: FormField<object>["type"]) {
  if (type === "money" || type === "percent")
    return String(Number(value) / 100);
  if (type === "quantity") return String(Number(value) / 1000);
  return String(value ?? "");
}
export function RecordForm<T extends object>({
  initial,
  fields,
  onSave,
  submitLabel = "Save changes",
}: {
  initial: T;
  fields: FormField<T>[];
  onSave(values: T): Promise<unknown>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        fields.map((f) => [f.key, asString(initial[f.key], f.type)]),
      ),
    ),
    [dirty, setDirty] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState("");
  const { busy } = useWorkspace();
  useUnsaved(dirty);
  return (
    <form
      className="record-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setErrors({});
        setError("");
        try {
          const parsed = { ...initial } as Record<string, unknown>;
          const issues: Record<string, string> = {};
          for (const f of fields) {
            const raw = values[f.key] || "";
            try {
              if (f.required && !raw.trim())
                throw new Error("This field is required.");
              parsed[f.key] =
                f.type === "money"
                  ? parseFixed(raw, 2)
                  : f.type === "percent"
                    ? parseFixed(raw, 2)
                    : f.type === "quantity"
                      ? parseFixed(raw, 3)
                      : f.type === "integer"
                        ? /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw))
                          ? Number(raw)
                          : (() => {
                              throw new Error(
                                "Enter a non-negative whole number.",
                              );
                            })()
                        : f.type === "checkbox"
                          ? raw === "true"
                          : raw.trim();
            } catch (e) {
              issues[f.key] =
                e instanceof Error ? e.message : "Check this field.";
            }
          }
          if (Object.keys(issues).length) throw new ValidationError(issues);
          await onSave(parsed as T);
          setDirty(false);
        } catch (e) {
          if (e instanceof ValidationError) setErrors(e.issues);
          setError(e instanceof Error ? e.message : "Unable to save.");
        }
      }}
    >
      <ErrorSummary message={error} />
      <div className="form-grid">
        {fields.map((f) => {
          const props = {
            name: f.key,
            disabled: busy || f.disabled,
            required: f.required,
            "aria-invalid": !!errors[f.key],
            value: values[f.key] || "",
            onChange: (
              e: React.ChangeEvent<
                HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
              >,
            ) => {
              setValues((v) => ({
                ...v,
                [f.key]:
                  e.target.type === "checkbox"
                    ? String((e.target as HTMLInputElement).checked)
                    : e.target.value,
              }));
              setDirty(true);
            },
          };
          return (
            <div
              key={f.key}
              className={f.full || f.type === "textarea" ? "full-width" : ""}
            >
              <Field label={f.label} hint={f.hint} error={errors[f.key]}>
                {f.type === "textarea" ? (
                  <textarea {...props} rows={3} />
                ) : f.type === "select" ? (
                  <select {...props}>
                    <option value="">Select…</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "checkbox" ? (
                  <input
                    {...props}
                    type="checkbox"
                    checked={values[f.key] === "true"}
                  />
                ) : (
                  <input
                    {...props}
                    type={
                      ["date", "email"].includes(f.type || "") ? f.type : "text"
                    }
                    inputMode={
                      ["money", "quantity", "percent", "integer"].includes(
                        f.type || "",
                      )
                        ? "decimal"
                        : undefined
                    }
                  />
                )}
              </Field>
            </div>
          );
        })}
      </div>
      <div className="form-actions">
        <span className="muted">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <button disabled={busy} type="submit">
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
export const options = (values: string[]) =>
  values.map((value) => ({ value, label: value }));
