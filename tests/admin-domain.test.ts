import test from "node:test";
import assert from "node:assert/strict";
import type {
  AdminProduct,
  Session,
  Role,
  Permission,
} from "@hitech/types/admin";
import {
  validSlug,
  validateProduct,
  validateBusiness,
  validateUpload,
  validateUploadBytes,
  validatePage,
  validateSeo,
} from "@hitech/validation";
import { confirmedBusiness, publicBusiness } from "@hitech/config/business";
import { csvCell } from "@hitech/utils";
import { demoWorkspace } from "../apps/admin/src/data/demo";
import { blankProduct, blankEnquiry } from "../apps/admin/src/domain/factories";
import {
  publishedSite,
  mediaUsage,
} from "../apps/admin/src/domain/projections";
import { can } from "../apps/admin/src/domain/permissions";
import {
  execute,
  validateTransition,
} from "../apps/admin/src/services/commands";
import { MemoryAdapter } from "../apps/admin/src/repositories/memory";
import { validateSnapshot } from "../apps/admin/src/repositories/snapshot";
const owner: Session = {
  id: "demo-owner",
  name: "Demo Owner",
  role: "Owner",
  demo: true,
};
const admin: Session = {
  id: "demo-admin",
  name: "Demo Admin",
  role: "Admin",
  demo: true,
};
function product(overrides: Partial<AdminProduct> = {}): AdminProduct {
  return {
    ...blankProduct(),
    id: "test-product",
    name: "Sample catalogue product",
    slug: "sample-catalogue-product",
    categoryId: "laboratory-equipment",
    imageId: "media-laboratory",
    shortDescription: "Sample description for a test product.",
    description: "Fictional test content; no technical claims.",
    seo: {
      title: "Sample product | Hitech",
      description: "A sample product description for workflow validation.",
      canonical: "",
      ogTitle: "",
      ogDescription: "",
      ogImageId: "",
      index: true,
      follow: true,
    },
    ...overrides,
  };
}
function saved() {
  const w = demoWorkspace();
  execute(w, admin, {
    type: "product.save",
    product: product(),
    expectedRevision: 0,
  });
  return w;
}
test("slug validation rejects path traversal, scripts, duplicate hyphens and oversized values", () => {
  for (const value of ["a", "test-tubes", "erba-h360"])
    assert.ok(validSlug(value));
  for (const value of [
    "",
    "Test",
    "../a",
    "a--b",
    "-a",
    "a/one",
    "a".repeat(81),
  ])
    assert.equal(validSlug(value), false);
});
test("publishing requires complete content, media, SEO, visibility and resolved review flags", () => {
  validateProduct(product(), true);
  for (const override of [
    { name: "" },
    { shortDescription: "" },
    { description: "" },
    { imageId: "" },
    { categoryId: "" },
    { needsReview: true },
    { visible: false },
    { status: "Archived" as const },
  ])
    assert.throws(() => validateProduct(product(override), true));
});
test("plain-text fields and unsafe canonical/CTA URLs are rejected", () => {
  assert.throws(() =>
    validateProduct(product({ description: "<script>alert(1)</script>" })),
  );
  assert.throws(() =>
    validateSeo({ ...product().seo, canonical: "javascript:alert(1)" }),
  );
  const p = demoWorkspace().pages[0];
  for (const link of [
    "javascript:alert(1)",
    "//evil.test",
    "/\\evil.test",
    "data:text/html,hi",
  ])
    assert.throws(() => validatePage({ ...p, ctaLink: link }));
});
test("business defaults contain confirmed identity and no invented contacts or PAN", () => {
  validateBusiness({ ...confirmedBusiness });
  assert.equal(confirmedBusiness.gstin, "37DBHPM6856H1Z4");
  assert.equal(confirmedBusiness.tradeName, "HITECH LIFE SCIENCE & SURGICALS");
  assert.equal(confirmedBusiness.phone1, "8143274589");
  assert.equal(confirmedBusiness.phone2, "8019031114");
  for (const k of ["pan", "email", "pincode", "addressLine1"] as const)
    assert.equal(confirmedBusiness[k], "");
});
test("business validation checks GST state, phone, email, PAN and pincode", () => {
  for (const v of [
    { stateCode: "36" },
    { phone1: "123" },
    { email: "bad" },
    { pincode: "12345" },
    { pan: "AAAAA1234A" },
    { website: "http://unsafe.test" },
  ])
    assert.throws(() => validateBusiness({ ...confirmedBusiness, ...v }));
  validateBusiness({
    ...confirmedBusiness,
    phone1: "8143274589",
    phone2: "+918019031114",
  });
});
test("public business is an explicit allowlist without tax or arbitrary private fields", () => {
  const b = { ...confirmedBusiness, phone1: "8143274589", secret: "private" };
  const p = publicBusiness(b);
  assert.equal(p.phone1, "8143274589");
  assert.ok(
    !("gstin" in p) && !("pan" in p) && !("legalName" in p) && !("secret" in p),
  );
  assert.equal(publicBusiness(b, false).phone1, "");
});
test("role matrix separates content editing, publishing, sales and user administration", () => {
  const check = (role: Role, p: Permission) => can({ ...owner, role }, p);
  assert.ok(check("Owner", "users.manage"));
  assert.equal(check("Admin", "users.manage"), false);
  assert.ok(check("Content Manager", "products.manage"));
  assert.equal(check("Content Manager", "products.publish"), false);
  assert.ok(check("Sales", "enquiries.manage"));
  assert.equal(check("Sales", "settings.manage"), false);
  assert.equal(check("Viewer", "products.manage"), false);
});
test("permissions enforced at command boundary even when UI is bypassed", () => {
  assert.throws(
    () =>
      execute(
        demoWorkspace(),
        { ...owner, role: "Viewer" },
        { type: "product.save", product: product(), expectedRevision: 0 },
      ),
    /Permission denied/,
  );
  assert.throws(
    () =>
      execute(
        saved(),
        { ...owner, role: "Content Manager" },
        {
          type: "product.action",
          id: "test-product",
          action: "publish",
          expectedRevision: 1,
        },
      ),
    /Permission denied/,
  );
});
test("published product retains its original snapshot during draft edits", () => {
  const w = saved();
  execute(w, admin, {
    type: "product.action",
    id: "test-product",
    action: "publish",
    expectedRevision: 1,
  });
  const p = w.products.find((p) => p.id === "test-product")!;
  execute(w, admin, {
    type: "product.save",
    product: { ...p, name: "Edited draft", visible: false },
    expectedRevision: 1,
  });
  assert.equal(w.products.at(-1)?.status, "Draft");
  assert.equal(publishedSite(w).products[0].name, "Sample catalogue product");
  assert.equal(publishedSite(w).products[0].visible, true);
});
test("public projection excludes internal, review and injected commercial fields", () => {
  const w = demoWorkspace();
  const p = {
    ...product(),
    internalNotes: "private note",
    reviewNotes: "private review",
    salePrice: 100,
    stock: 23,
  };
  execute(w, admin, { type: "product.save", product: p, expectedRevision: 0 });
  execute(w, admin, {
    type: "product.action",
    id: p.id,
    action: "publish",
    expectedRevision: 1,
  });
  const json = JSON.stringify(publishedSite(w));
  for (const secret of [
    "private note",
    "private review",
    "salePrice",
    "stock",
    "internalNotes",
    "reviewNotes",
  ])
    assert.ok(!json.includes(secret));
});
test("publishing validates category publication and referenced media alt text", () => {
  const w = saved();
  w.categories[0].published = undefined;
  assert.throws(
    () =>
      execute(w, admin, {
        type: "product.action",
        id: "test-product",
        action: "publish",
        expectedRevision: 1,
      }),
    /category/,
  );
  w.categories[0].published = { ...w.categories[0] };
  w.media.find((m) => m.id === "media-laboratory")!.alt = "";
  assert.throws(
    () =>
      execute(w, admin, {
        type: "product.action",
        id: "test-product",
        action: "publish",
        expectedRevision: 1,
      }),
    /alt text/,
  );
});
test("draft media captions do not mutate published media until publishing", () => {
  const w = saved();
  execute(w, admin, {
    type: "product.action",
    id: "test-product",
    action: "publish",
    expectedRevision: 1,
  });
  const m = w.media.find((m) => m.id === "media-laboratory")!;
  const original = m.published!.alt;
  execute(w, admin, {
    type: "media.save",
    media: { ...m, alt: "New draft alt text" },
  });
  assert.equal(
    publishedSite(w).media.find((x) => x.id === m.id)!.alt,
    original,
  );
  execute(w, admin, {
    type: "product.action",
    id: "test-product",
    action: "publish",
    expectedRevision: 1,
  });
  assert.equal(
    publishedSite(w).media.find((x) => x.id === m.id)!.alt,
    "New draft alt text",
  );
});
test("draft and published slugs remain reserved across edits", () => {
  const w = saved();
  execute(w, admin, {
    type: "product.action",
    id: "test-product",
    action: "publish",
    expectedRevision: 1,
  });
  const p = w.products.at(-1)!;
  execute(w, admin, {
    type: "product.save",
    product: { ...p, slug: "new-draft-slug" },
    expectedRevision: 1,
  });
  assert.throws(
    () =>
      execute(w, admin, {
        type: "product.save",
        product: product({ id: "another" }),
        expectedRevision: 0,
      }),
    /reserved/,
  );
});
test("duplicate creates a new unique draft without published history", () => {
  const w = saved();
  execute(w, admin, {
    type: "product.action",
    id: "test-product",
    action: "publish",
    expectedRevision: 1,
  });
  const id = execute(w, admin, {
    type: "product.action",
    id: "test-product",
    action: "duplicate",
    expectedRevision: 1,
  });
  const copy = w.products.find((p) => p.id === id)!;
  assert.equal(copy.status, "Draft");
  assert.equal(copy.published, undefined);
  assert.notEqual(copy.slug, "sample-catalogue-product");
  assert.equal(copy.featured, false);
});
test("archive and unpublish require confirmation and retain enquiry history", () => {
  const w = saved();
  execute(w, admin, {
    type: "product.action",
    id: "test-product",
    action: "publish",
    expectedRevision: 1,
  });
  const e = {
    ...blankEnquiry("quote"),
    name: "Sample contact",
    message: "Sample request",
    productId: "test-product",
  };
  execute(w, admin, { type: "enquiry.createDemo", enquiry: e });
  assert.throws(
    () =>
      execute(w, admin, {
        type: "product.action",
        id: "test-product",
        action: "archive",
        expectedRevision: 1,
      }),
    /Confirm/,
  );
  execute(w, admin, {
    type: "product.action",
    id: "test-product",
    action: "archive",
    expectedRevision: 1,
    confirmed: true,
  });
  assert.equal(publishedSite(w).products.length, 0);
  assert.equal(w.enquiries[0].productName, "Sample catalogue product");
  assert.equal(w.enquiries[0].productId, "test-product");
  assert.ok(w.products.some((p) => p.id === "test-product"));
});
test("category deletion blocks orphaning and reassigns both draft and published references", () => {
  const w = saved();
  execute(w, admin, {
    type: "product.action",
    id: "test-product",
    action: "publish",
    expectedRevision: 1,
  });
  assert.throws(
    () =>
      execute(w, admin, {
        type: "category.delete",
        id: "laboratory-equipment",
        confirmed: true,
      }),
    /reassign/,
  );
  execute(w, admin, {
    type: "category.delete",
    id: "laboratory-equipment",
    confirmed: true,
    reassignId: "lab-consumables",
  });
  assert.equal(w.products.at(-1)?.categoryId, "lab-consumables");
  assert.equal(publishedSite(w).products[0].categoryId, "lab-consumables");
});
test("content manager cannot use category reassignment to bypass publish permission", () => {
  const w = saved();
  execute(w, admin, {
    type: "product.action",
    id: "test-product",
    action: "publish",
    expectedRevision: 1,
  });
  assert.throws(
    () =>
      execute(
        w,
        { ...owner, role: "Content Manager" },
        {
          type: "category.delete",
          id: "laboratory-equipment",
          reassignId: "lab-consumables",
          confirmed: true,
        },
      ),
    /Permission denied/,
  );
});
test("category reordering remains draft until published", () => {
  const w = demoWorkspace(),
    c = w.categories[0];
  execute(w, admin, {
    type: "category.save",
    category: { ...c, sortOrder: 8 },
    expectedRevision: 1,
  });
  assert.equal(w.categories[0].sortOrder, 8);
  assert.equal(w.categories[0].published!.sortOrder, 0);
  execute(w, admin, {
    type: "category.publish",
    id: c.id,
    expectedRevision: 2,
  });
  assert.equal(w.categories[0].published!.sortOrder, 8);
});
test("manual category positions, arrow moves and publication never produce tied positions", () => {
  const w = demoWorkspace();
  const item = w.categories.at(-1)!;
  const other = w.categories[0];
  const originalName = other.published!.name;
  execute(w, admin, {
    type: "category.save",
    category: { ...other, name: "Unreleased rename" },
    expectedRevision: other.revision,
  });
  execute(w, admin, {
    type: "category.save",
    category: { ...item, sortOrder: 0 },
    expectedRevision: item.revision,
  });
  const saved = w.categories.find((c) => c.id === item.id)!;
  execute(w, admin, {
    type: "category.move",
    id: saved.id,
    direction: 1,
    expectedRevision: saved.revision,
  });
  execute(w, admin, {
    type: "category.publish",
    id: saved.id,
    expectedRevision: saved.revision,
  });
  const release = publishedSite(w).categories;
  assert.equal(
    new Set(w.categories.map((c) => c.sortOrder)).size,
    w.categories.length,
  );
  assert.deepEqual(
    release.map((c) => c.sortOrder),
    release.map((_, index) => index),
  );
  assert.equal(release[1].id, item.id);
  assert.equal(release.find((c) => c.id === other.id)!.name, originalName);
});
test("enquiry transition validation permits follow-up and controlled reopening", () => {
  validateTransition("New", "Contacted");
  validateTransition("Contacted", "In Progress");
  validateTransition("In Progress", "Quoted");
  validateTransition("Quoted", "Closed");
  validateTransition("Closed", "In Progress");
  assert.throws(() => validateTransition("New", "Quoted"));
  assert.throws(() => validateTransition("Spam", "Quoted"));
});
test("enquiry notes, assignments and statuses update atomically and stay out of public data", () => {
  const w = demoWorkspace();
  execute(w, admin, {
    type: "enquiry.update",
    id: w.enquiries[0].id,
    status: "Contacted",
    assignedTo: "demo-sales",
    internalNotes: "PRIVATE FOLLOWUP",
    expectedRevision: 1,
  });
  assert.equal(w.enquiries[0].status, "Contacted");
  assert.equal(w.enquiries[0].assignedTo, "demo-sales");
  assert.ok(!JSON.stringify(publishedSite(w)).includes("PRIVATE FOLLOWUP"));
  assert.ok(w.activity.some((a) => a.action === "enquiry.update"));
});
test("settings edits are centralized but public snapshot changes only on publish", () => {
  const w = demoWorkspace();
  execute(w, admin, { type: "settings.publish", expectedRevision: 1 });
  execute(w, admin, {
    type: "settings.save",
    settings: {
      ...w.settings,
      business: { ...w.settings.business, phone1: "9000001234" },
    },
    expectedRevision: 1,
  });
  assert.equal(w.settings.business.phone1, "9000001234");
  assert.equal(w.settings.published!.business.phone1, confirmedBusiness.phone1);
  execute(w, admin, { type: "settings.publish", expectedRevision: 2 });
  assert.equal(publishedSite(w).settings!.business.phone1, "9000001234");
});
test("featured homepage publication blocks unpublished products", () => {
  const w = demoWorkspace();
  w.settings.site.homepageFeaturedIds = ["HL-004"];
  assert.throws(
    () => execute(w, admin, { type: "settings.publish", expectedRevision: 1 }),
    /Publish featured products/,
  );
});
test("draft page edits keep the prior publication intact", () => {
  const w = demoWorkspace();
  const p = w.pages[0];
  execute(w, admin, { type: "page.publish", id: p.id, expectedRevision: 1 });
  execute(w, admin, {
    type: "page.save",
    page: { ...p, heading: "Edited draft hero" },
    expectedRevision: 1,
  });
  assert.notEqual(w.pages[0].published!.heading, "Edited draft hero");
});
test("media reference tracking includes published snapshots after draft image changes", () => {
  const w = saved();
  execute(w, admin, {
    type: "product.action",
    id: "test-product",
    action: "publish",
    expectedRevision: 1,
  });
  w.products.at(-1)!.imageId = "media-reagents";
  assert.ok(
    mediaUsage(w, "media-laboratory").some((x) =>
      x.includes("Sample catalogue"),
    ),
  );
});
test("unvalidated creation and deletion of bundled media are rejected", () => {
  const w = demoWorkspace();
  assert.throws(
    () =>
      execute(w, admin, {
        type: "media.save",
        media: { ...w.media[0], id: "not-uploaded" },
      }),
    /validated media upload/,
  );
  assert.throws(
    () =>
      execute(w, admin, {
        type: "media.delete",
        id: w.media[0].id,
        confirmed: true,
      }),
    /bundled/,
  );
});
test("image upload validation checks types, filenames, bytes, signatures and dimensions", () => {
  validateUpload(
    { name: "test.png", type: "image/png", size: 100 },
    { width: 100, height: 100 },
  );
  validateUploadBytes(
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    "image/png",
  );
  for (const f of [
    { name: "x.svg", type: "image/svg+xml", size: 50 },
    { name: "x.exe.png", type: "image/png", size: 50 },
    { name: "x.png", type: "image/png", size: 6 * 1024 * 1024 },
  ])
    assert.throws(() => validateUpload(f));
  assert.throws(() =>
    validateUpload(
      { name: "x.jpg", type: "image/jpeg", size: 50 },
      { width: 9000, height: 20 },
    ),
  );
  assert.throws(() =>
    validateUploadBytes(
      new TextEncoder().encode("<script>bad</script>"),
      "image/png",
    ),
  );
});
test("repository rollback leaves original workspace and audit unchanged after an invalid command", async () => {
  const r = new MemoryAdapter(demoWorkspace());
  const before = await r.load();
  await assert.rejects(() =>
    r.dispatch(
      {
        type: "product.save",
        product: product({ name: "" }),
        expectedRevision: 0,
      },
      admin,
    ),
  );
  assert.deepEqual(await r.load(), before);
});
test("repository isolates references and rejects stale revisions", async () => {
  const r = new MemoryAdapter(saved());
  const a = await r.load(),
    b = await r.load();
  a.products.at(-1)!.name = "First editor";
  await r.dispatch(
    { type: "product.save", product: a.products.at(-1)!, expectedRevision: 1 },
    admin,
  );
  await assert.rejects(
    () =>
      r.dispatch(
        {
          type: "product.save",
          product: b.products.at(-1)!,
          expectedRevision: 1,
        },
        admin,
      ),
    /another tab/,
  );
  const loaded = await r.load();
  loaded.settings.business.tradeName = "mutated";
  assert.notEqual((await r.load()).settings.business.tradeName, "mutated");
});
test("corrupt or cross-environment storage is rejected without a silent demo reset", () => {
  assert.throws(() =>
    validateSnapshot({ ...demoWorkspace(), schemaVersion: 9 }),
  );
  assert.throws(() =>
    validateSnapshot({ ...demoWorkspace(), environment: "production" }),
  );
  assert.throws(() => validateSnapshot({ ...demoWorkspace(), products: null }));
});
test("last owner and own-role removal are blocked", () => {
  const w = demoWorkspace();
  const user = w.users[0];
  assert.throws(
    () =>
      execute(w, owner, {
        type: "user.save",
        user: { ...user, active: false },
      }),
    /own role/,
  );
  assert.throws(
    () =>
      execute(
        w,
        { ...owner, id: "other-owner" },
        { type: "user.save", user: { ...user, role: "Viewer" } },
      ),
    /active Owner/,
  );
});
test("CSV export neutralizes spreadsheet formula injection and escapes quotes", () => {
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(csvCell("ordinary"), '"ordinary"');
  assert.equal(csvCell("\t=1+1"), '"\'\t=1+1"');
});
