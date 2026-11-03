import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function click(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).first().click();
}

function observeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("catalogue release, enquiry history and centralized settings through the production UI", async ({
  page,
}) => {
  const errors = observeErrors(page);
  await page.goto("/categories/new");
  await page.getByLabel("Category name *").fill("QA sample collection");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Fictional collection for the release walkthrough.");
  await page.getByLabel("Display order").fill("10");
  await click(page, "Save draft");
  await expect(
    page.getByRole("heading", { name: "QA sample collection", exact: true }),
  ).toBeVisible();
  const categoryUrl = page.url();
  await click(page, "Publish category");
  await expect(
    page.getByText("Category published to the demo catalogue."),
  ).toBeVisible();

  await page.goto("/media");
  await click(page, "Upload image");
  const upload = page.getByRole("dialog", { name: "Upload an image" });
  const fixture = await readFile(
    resolve("apps/admin/public/images/consumables.webp"),
  );
  await upload
    .getByLabel("Image file")
    .setInputFiles({
      name: "sample-qa-photo.webp",
      mimeType: "image/webp",
      buffer: fixture,
    });
  await upload
    .getByLabel(/^Alt text/)
    .fill("Illustrative sample for the catalogue walkthrough");
  await upload.getByRole("button", { name: "Upload image" }).click();
  await expect(upload).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: /sample-qa-photo.webp/ }),
  ).toBeVisible();

  await page.goto("/products/new");
  await page.getByLabel("Product name *").fill("QA sample catalogue product");
  await click(page, "Save draft");
  await expect(
    page.getByRole("heading", {
      name: "QA sample catalogue product",
      exact: true,
    }),
  ).toBeVisible();
  const productUrl = page.url();
  await click(page, "Publish");
  await expect(
    page.getByRole("alert").filter({ hasText: "Add a short description" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption({ label: "QA sample collection" });
  await page
    .getByLabel(/^Short description/)
    .fill("A fictional catalogue item for release testing.");
  await page
    .getByLabel(/^Full description/)
    .fill("This is a fictional example with no clinical claims.");
  await page
    .getByLabel("Primary product image")
    .selectOption({ label: "sample-qa-photo.webp" });
  await page
    .getByLabel(/^Meta title/)
    .fill("QA sample catalogue product | Hitech");
  await page
    .getByLabel(/^Meta description/)
    .fill("Review this fictional catalogue item for demonstration purposes.");
  await page
    .getByLabel(/^Private admin notes/)
    .fill("Private QA note - exclude from publication");
  await page.getByLabel("Featured product", { exact: true }).check();
  await click(page, "Preview");
  const preview = page.getByRole("dialog", { name: "Product preview" });
  await expect(
    preview.getByRole("heading", { name: "QA sample catalogue product" }),
  ).toBeVisible();
  await expect(
    preview.getByRole("img", {
      name: "Illustrative sample for the catalogue walkthrough",
    }),
  ).toBeVisible();
  await expect(preview).not.toContainText("Private QA note");
  await page.keyboard.press("Escape");
  await click(page, "Save draft");
  await click(page, "Publish");
  await expect(
    page.getByText("A published snapshot is retained"),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".editor-status").first()).toContainText(
    "Published",
  );
  await expect(
    page.getByRole("img", {
      name: "Illustrative sample for the catalogue walkthrough",
    }),
  ).toBeVisible();

  await page.goto("/categories");
  await page
    .getByRole("combobox", { name: "Rows per page" })
    .selectOption("25");
  await click(page, "Move QA sample collection up");
  const categoryRow = page
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: /QA sample collection/ }) });
  await expect(categoryRow).toContainText("Unpublished changes");
  await page.goto(categoryUrl);
  await expect(page.getByLabel("Display order")).toHaveValue("9");
  await click(page, "Publish category");
  await expect(
    page.getByText("Category published to the demo catalogue."),
  ).toBeVisible();

  await page.goto("/featured");
  await click(page, "Feature QA sample catalogue product on homepage");
  await click(page, "Save selection");
  await expect(
    page.getByText("Homepage selection saved.", { exact: false }),
  ).toBeVisible();
  await page.goto("/settings/contact");
  await page.getByLabel(/^Phone 1/).fill("9000001234");
  await click(page, "Save changes");
  await click(page, "Publish settings");
  await expect(
    page.getByText("Public-safe configuration published to the demo snapshot."),
  ).toBeVisible();
  await page.goto("/publishing");
  await expect(page.getByText("9000001234", { exact: true })).toBeVisible();
  await click(page, "Prepare public snapshot");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Save JSON" }).click();
  const download = await downloadPromise;
  const publicJson = await readFile((await download.path())!, "utf8");
  expect(publicJson).not.toContain("Private QA note");
  expect(publicJson).not.toContain("37DBHPM6856H1Z4");
  const snapshot = JSON.parse(publicJson);
  expect(snapshot.products).toHaveLength(1);
  expect(snapshot.settings.business.phone1).toEqual("9000001234");
  expect(snapshot.settings.site.homepageFeaturedIds).toEqual([
    snapshot.products[0].id,
  ]);

  await page.goto("/enquiries/quotes/new");
  await page.getByLabel("Name *", { exact: true }).fill("Fictional QA buyer");
  await page
    .getByLabel("Organisation", { exact: true })
    .fill("Demo workflow laboratory");
  await page
    .getByLabel("Product", { exact: true })
    .selectOption({ label: "QA sample catalogue product" });
  await page
    .getByLabel("Message *")
    .fill("Sample quotation request for workflow verification.");
  await click(page, "Create sample enquiry");
  await expect(
    page.getByRole("heading", { name: "Demo workflow laboratory" }),
  ).toBeVisible();
  const enquiryUrl = page.url();
  await page.getByLabel("Status", { exact: true }).selectOption("Contacted");
  await page
    .getByLabel("Assigned to", { exact: true })
    .selectOption({ label: "Demo Sales" });
  await page.getByLabel(/^Internal notes/).fill("QA followup marker 482");
  await click(page, "Save updates");
  await expect(page.getByText("Enquiry follow-up saved.")).toBeVisible();
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", { name: "Search workspace" });
  await search.getByLabel("Global search").fill("QA followup marker 482");
  await expect(
    search.getByRole("link", { name: /Demo workflow laboratory/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto(productUrl);
  await click(page, "Archive product");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep editing" })
    .click();
  await expect(page.locator(".editor-status").first()).toContainText(
    "Published",
  );
  await click(page, "Archive product");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Archive product" })
    .click();
  await expect(page).toHaveURL(/\/products$/);
  await page.goto(enquiryUrl);
  await expect(
    page.getByText("This product is archived.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel(/^Internal notes/)).toHaveValue(
    "QA followup marker 482",
  );
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
    "Contacted",
  );
  expect(errors).toEqual([]);
});

test("unsaved edits prompt for links, history and reload without warnings on a clean form", async ({
  page,
}) => {
  await page.goto("/products");
  await page.getByRole("link", { name: "Add product", exact: true }).click();
  await page.getByLabel("Product name *").fill("Unsaved test product");
  await page.getByRole("link", { name: "All products", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Leave without saving?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Product name *")).toHaveValue(
    "Unsaved test product",
  );
  await page.evaluate(() => history.back());
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Product name *")).toHaveValue(
    "Unsaved test product",
  );
  const native = page.waitForEvent("dialog");
  await page.evaluate(() => {
    setTimeout(() => location.reload(), 0);
  });
  const unload = await native;
  expect(unload.type()).toBe("beforeunload");
  await unload.dismiss();
  await page.getByRole("link", { name: "All products", exact: true }).click();
  await dialog.getByRole("button", { name: "Discard changes" }).click();
  await expect(page).toHaveURL(/\/products$/);
  await page.getByRole("link", { name: "Add product", exact: true }).click();
  await expect(page.getByLabel("Product name *")).toBeEmpty();
  await page.getByRole("link", { name: "All products", exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(dialog).toHaveCount(0);
});

test("role switching restricts route and search access; Owner can manage demo users", async ({
  page,
}) => {
  await page.goto("/");
  await click(page, "Open user menu");
  await page.getByRole("button", { name: /Demo Viewer Viewer/ }).click();
  await expect(
    page.getByRole("link", { name: "Products", exact: true }),
  ).toHaveCount(0);
  // Client navigation preserves the selected demo session. Reload intentionally starts as Demo Admin.
  await page.getByRole("link", { name: /Product images needed/ }).click();
  await expect(
    page.getByRole("heading", { name: "Permission required" }),
  ).toBeVisible();
  await click(page, "Open user menu");
  await page.getByRole("button", { name: /Demo Owner Owner/ }).click();
  await page.getByRole("link", { name: "Users & roles", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Permission matrix" }),
  ).toBeVisible();
  await click(page, "Add demo user");
  const editor = page.getByRole("dialog", { name: "Demo user" });
  await editor.getByLabel("Display name *").fill("Sample operations user");
  await editor.getByRole("button", { name: "Save demo user" }).click();
  await expect(
    page.getByText("Sample operations user", { exact: true }),
  ).toBeVisible();
});

for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
  test(`responsive pages, links and image assets at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = observeErrors(page);
    const failed: string[] = [];
    page.on("response", (r) => {
      if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
    });
    const routes = [
      ["/", "Your website, in focus."],
      ["/products", "Products"],
      ["/products/HL-001", "Hemometer"],
      ["/categories", "Categories"],
      ["/media", "Media library"],
      ["/enquiries/quotes/sample-enquiry-1", "Demo Central Laboratory"],
      ["/settings/contact", "Contact information"],
      ["/publishing", "Publishing status"],
    ];
    for (const [url, title] of routes) {
      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: title, exact: true, level: 1 }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const layout = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        actual: document.documentElement.scrollWidth,
        broken: Array.from(document.images)
          .filter((i) => i.complete && !i.naturalWidth)
          .map((i) => i.alt),
      }));
      expect(layout.actual, `${url} at ${width}px`).toBeLessThanOrEqual(
        layout.viewport,
      );
      expect(layout.broken).toEqual([]);
      if (url === "/" && width === 1440)
        await page.screenshot({ path: "test-results/admin-dashboard.png" });
    }
    if (width <= 768) {
      await click(page, "Open navigation");
      const nav = page.getByRole("dialog", { name: "Navigation" });
      await nav.getByRole("link", { name: "Products", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Products", level: 1 }),
      ).toBeVisible();
    }
    expect(failed).toEqual([]);
    expect(errors).toEqual([]);
  });
}
