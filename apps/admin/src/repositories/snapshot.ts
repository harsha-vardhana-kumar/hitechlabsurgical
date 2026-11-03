import type { AdminWorkspace } from "@hitech/types/admin";
import {
  invariant,
  validateProduct,
  validateCategory,
  validateSettings,
  validatePage,
  validateEnquiry,
} from "@hitech/validation";
export function validateSnapshot(value: unknown): AdminWorkspace {
  invariant(
    value && typeof value === "object",
    "Workspace data cannot be read. Stored data has not been replaced.",
  );
  const w = value as AdminWorkspace;
  invariant(
    w.schemaVersion === 1 &&
      w.environment === "demo" &&
      Number.isInteger(w.revision),
    "Unsupported workspace version or environment. Stored data has not been replaced.",
  );
  for (const k of [
    "products",
    "categories",
    "media",
    "enquiries",
    "pages",
    "users",
    "activity",
    "publishing",
  ] as const)
    invariant(Array.isArray(w[k]), `Workspace ${k} data is invalid.`);
  w.products.forEach((p) => validateProduct(p));
  w.categories.forEach((c) => validateCategory(c));
  w.pages.forEach((p) => validatePage(p));
  w.enquiries.forEach(validateEnquiry);
  validateSettings(w.settings);
  return w;
}
