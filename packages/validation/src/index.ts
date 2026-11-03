import type {
  AdminProduct,
  AdminCategory,
  Seo,
  Settings,
  ContentPage,
  Enquiry,
  MediaAsset,
} from "@hitech/types/admin";
import type { BusinessProfile } from "@hitech/types/business";
export class ValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join(" "));
    this.name = "ValidationError";
  }
}
export function invariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new ValidationError([message]);
}
function object(
  value: unknown,
  name: string,
): asserts value is Record<string, unknown> {
  invariant(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${name} must be an object.`,
  );
}
function text(
  value: unknown,
  name: string,
  max = 500,
  required = false,
): asserts value is string {
  invariant(typeof value === "string", `${name} must be text.`);
  invariant(value.length <= max, `${name} must be ${max} characters or fewer.`);
  invariant(!required || value.trim().length > 0, `${name} is required.`);
  invariant(
    !/<\/?[a-z][^>]*>/i.test(value) &&
      !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value),
    `${name} must be plain text without HTML or control characters.`,
  );
}
function boolean(value: unknown, name: string) {
  invariant(typeof value === "boolean", `${name} must be true or false.`);
}
function strings(value: unknown, name: string, max = 40) {
  invariant(
    Array.isArray(value) && value.length <= max,
    `${name} must contain at most ${max} entries.`,
  );
  value.forEach((v) => text(v, name, 200));
}
export function safeUrl(value: string, allowPath = false) {
  if (allowPath && /^\/(?!\/)[a-zA-Z0-9/?#=&_%.,~\-]*$/.test(value))
    return true;
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !/[\s\\]/.test(value)
    );
  } catch {
    return false;
  }
}
export function validSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 80 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}
export function validateSeo(seo: Seo) {
  object(seo, "SEO");
  text(seo.title, "Meta title", 120);
  text(seo.description, "Meta description", 320);
  text(seo.ogTitle, "Open Graph title", 120);
  text(seo.ogDescription, "Open Graph description", 320);
  text(seo.canonical, "Canonical URL", 500);
  text(seo.ogImageId, "Open Graph image", 200);
  invariant(
    !seo.canonical || safeUrl(seo.canonical),
    "Canonical URL must be an absolute HTTPS URL.",
  );
  boolean(seo.index, "Robots index");
  boolean(seo.follow, "Robots follow");
}
export function validateProduct(product: AdminProduct, publish = false) {
  object(product, "Product");
  text(product.id, "Product ID", 200, true);
  text(product.name, "Product name", 150, true);
  invariant(
    validSlug(product.slug),
    "Slug must use lowercase letters, numbers and single hyphens (maximum 80 characters).",
  );
  for (const key of [
    "categoryId",
    "subcategory",
    "imageId",
    "brand",
    "model",
    "packSize",
    "catalogueNumber",
    "sku",
  ] as const)
    text(product[key], key, 200);
  text(product.shortDescription, "Short description", 400);
  text(product.description, "Full description", 12000);
  text(product.internalNotes, "Internal notes", 5000);
  text(product.reviewNotes, "Review notes", 3000);
  strings(product.additionalImageIds, "Additional images", 12);
  strings(product.keywords, "Search keywords");
  boolean(product.featured, "Featured");
  boolean(product.visible, "Visibility");
  boolean(product.needsReview, "Review flag");
  invariant(
    Number.isInteger(product.sortOrder) &&
      product.sortOrder >= 0 &&
      product.sortOrder <= 100000,
    "Sort order must be a whole number from 0 to 100000.",
  );
  invariant(
    ["Draft", "Review", "Published", "Archived"].includes(product.status),
    "Invalid product status.",
  );
  invariant(
    Array.isArray(product.specifications) &&
      product.specifications.length <= 60,
    "Maximum 60 specifications.",
  );
  product.specifications.forEach((s) => {
    object(s, "Specification");
    text(s.label, "Specification label", 120, true);
    text(s.value, "Specification value", 600, true);
  });
  validateSeo(product.seo);
  if (publish) {
    const issues: string[] = [];
    if (!product.categoryId)
      issues.push("Select an active published category.");
    if (!product.shortDescription.trim())
      issues.push("Add a short description.");
    if (!product.description.trim()) issues.push("Add a full description.");
    if (!product.imageId) issues.push("Add a product image with alt text.");
    if (!product.seo.title.trim() || !product.seo.description.trim())
      issues.push("Add an SEO title and description.");
    if (product.needsReview)
      issues.push(
        "Resolve the product spelling/specification review flag before publishing.",
      );
    if (!product.visible)
      issues.push("Enable website visibility before publishing.");
    if (product.status === "Archived")
      issues.push(
        "Save a draft to restore an archived product before publishing.",
      );
    if (issues.length) throw new ValidationError(issues);
  }
}
export function validateCategory(c: AdminCategory, publish = false) {
  object(c, "Category");
  text(c.id, "Category ID", 200, true);
  text(c.name, "Category name", 120, true);
  invariant(validSlug(c.slug), "Enter a valid lowercase category slug.");
  text(c.description, "Category description", 1000, publish);
  text(c.imageId, "Category image", 200);
  boolean(c.active, "Active");
  validateSeo(c.seo);
  invariant(
    Number.isInteger(c.sortOrder) && c.sortOrder >= 0 && c.sortOrder <= 100000,
    "Category order must be a whole number from 0 to 100000.",
  );
  if (publish) invariant(c.active, "Enable the category before publishing.");
}
export function validateBusiness(b: BusinessProfile) {
  object(b, "Business profile");
  for (const k of [
    "legalName",
    "tradeName",
    "gstin",
    "state",
    "stateCode",
    "addressLine1",
    "addressLine2",
    "city",
    "district",
    "pincode",
    "phone1",
    "phone2",
    "email",
    "whatsapp",
    "website",
    "pan",
  ] as const)
    text(
      b[k],
      k,
      300,
      ["legalName", "tradeName", "state", "stateCode"].includes(k),
    );
  invariant(/^\d{2}$/.test(b.stateCode), "State code must be two digits.");
  invariant(
    !b.gstin || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(b.gstin),
    "GSTIN must use the 15-character GST format.",
  );
  invariant(
    !b.gstin || b.gstin.startsWith(b.stateCode),
    "GSTIN state prefix must match the business state code.",
  );
  invariant(
    !b.pan || /^[A-Z]{5}\d{4}[A-Z]$/.test(b.pan),
    "PAN format is invalid.",
  );
  invariant(
    !b.pan || !b.gstin || b.gstin.slice(2, 12) === b.pan,
    "PAN must match the GSTIN.",
  );
  invariant(
    !b.pincode || /^\d{6}$/.test(b.pincode),
    "Pincode must contain six digits.",
  );
  invariant(
    !b.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email),
    "Enter a valid email address.",
  );
  for (const p of [b.phone1, b.phone2, b.whatsapp])
    invariant(
      !p || /^\+?[1-9]\d{9,14}$/.test(p),
      "Phone numbers must have 10–15 digits, with an optional + prefix.",
    );
  invariant(!b.website || safeUrl(b.website), "Website must be an HTTPS URL.");
}
export function validateSettings(s: Settings) {
  object(s, "Settings");
  validateBusiness(s.business);
  object(s.site, "Site settings");
  text(s.site.siteName, "Site name", 150, true);
  text(s.site.websiteUrl, "Website URL", 500, true);
  invariant(safeUrl(s.site.websiteUrl), "Website URL must use HTTPS.");
  validateSeo(s.site.defaultSeo);
  strings(s.site.homepageFeaturedIds, "Featured products", 30);
  invariant(
    new Set(s.site.homepageFeaturedIds).size ===
      s.site.homepageFeaturedIds.length,
    "Homepage selections must be unique.",
  );
  for (const k of [
    "showFeatured",
    "publicContacts",
    "analyticsEnabled",
  ] as const)
    boolean(s.site[k], k);
  text(s.site.analyticsMeasurementId, "Analytics measurement ID", 50);
  text(s.site.logoId, "Logo ID", 200);
  text(s.site.faviconId, "Favicon ID", 200);
  invariant(
    !s.site.analyticsMeasurementId ||
      /^G-[A-Z0-9]+$/.test(s.site.analyticsMeasurementId),
    "GA4 measurement ID must use G- followed by uppercase letters/numbers.",
  );
  invariant(
    !s.site.analyticsEnabled || !!s.site.analyticsMeasurementId,
    "Enter a measurement ID before enabling analytics metadata.",
  );
}
export function validatePage(p: ContentPage, publish = false) {
  object(p, "Content");
  text(p.id, "Page ID", 200, true);
  text(p.title, "Page title", 150, true);
  text(p.heading, "Heading", 200, publish);
  text(p.description, "Description", 1200);
  text(p.body, "Body", 15000);
  text(p.ctaLabel, "CTA label", 80);
  text(p.ctaLink, "CTA link", 500);
  invariant(
    !p.ctaLink || safeUrl(p.ctaLink, true),
    "CTA link must be a safe relative path or HTTPS URL.",
  );
  invariant(
    !!p.ctaLabel === !!p.ctaLink,
    "CTA label and link must be supplied together.",
  );
  text(p.procurementHeading, "Procurement heading", 200);
  text(p.procurementDescription, "Procurement description", 1200);
  strings(p.featuredCategoryIds, "Featured categories", 20);
  validateSeo(p.seo);
  if (publish)
    invariant(
      !!p.seo.title.trim() && !!p.seo.description.trim(),
      "Add an SEO title and description before publishing this page.",
    );
}
export function validateEnquiry(e: Enquiry) {
  object(e, "Enquiry");
  text(e.name, "Name", 150, true);
  text(e.organisation, "Organisation", 200);
  text(e.email, "Email", 254);
  text(e.phone, "Phone", 30);
  text(e.city, "City", 150);
  text(e.productId, "Product ID", 200);
  text(e.productName, "Product name", 150);
  text(e.quantity, "Quantity", 80);
  text(e.message, "Message", 5000, true);
  text(e.internalNotes, "Internal notes", 5000);
  text(e.assignedTo, "Assignee", 200);
  invariant(
    !e.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email),
    "Enter a valid email address.",
  );
  invariant(
    !e.phone || /^\+?[1-9]\d{9,14}$/.test(e.phone),
    "Enter a valid phone number.",
  );
  invariant(
    e.kind === "quote" || e.kind === "contact",
    "Invalid enquiry kind.",
  );
}
export const uploadPolicy = {
  maxBytes: 5 * 1024 * 1024,
  maxDimension: 8192,
  minDimension: 32,
  types: ["image/png", "image/jpeg", "image/webp"] as readonly string[],
};
export function validateUpload(
  file: { name: string; type: string; size: number },
  dimensions?: { width: number; height: number },
) {
  invariant(
    uploadPolicy.types.includes(file.type),
    "Upload a PNG, JPEG or WebP image. SVG and executable uploads are not allowed.",
  );
  invariant(
    file.size > 0 && file.size <= uploadPolicy.maxBytes,
    "Image must be between 1 byte and 5 MB.",
  );
  invariant(
    /\.(png|jpe?g|webp)$/i.test(file.name) &&
      !/\.(exe|js|html|svg|php)(\.|$)/i.test(file.name),
    "Image filename is not allowed.",
  );
  invariant(
    file.name.length <= 150 && !/[<>\\/\u0000-\u001F]/.test(file.name),
    "Use a simple image filename under 150 characters.",
  );
  if (dimensions)
    for (const size of [dimensions.width, dimensions.height])
      invariant(
        Number.isInteger(size) &&
          size >= uploadPolicy.minDimension &&
          size <= uploadPolicy.maxDimension,
        "Image dimensions must be between 32 and 8192 pixels.",
      );
}
/** Reuse in the server upload finalizer; never trust filename or Content-Type alone. */
export function validateUploadBytes(bytes: Uint8Array, mime: string) {
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  invariant(
    (mime === "image/png" && png) ||
      (mime === "image/jpeg" && jpeg) ||
      (mime === "image/webp" && webp),
    "Image file signature does not match its type.",
  );
}
export function validateMedia(m: MediaAsset) {
  object(m, "Media");
  text(m.id, "Media ID", 200, true);
  text(m.fileName, "File name", 150, true);
  text(m.alt, "Alt text", 300);
  text(m.caption, "Caption", 1000);
}
