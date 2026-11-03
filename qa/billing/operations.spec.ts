import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

const buyer = "Fictional QA customer";
const supplier = "Fictional QA supplier";
const item = "Fictional QA stock item";
const sku = "DEMO-QA-STOCK";

function button(page: Page, name: string) {
  return page.getByRole("button", { name, exact: true });
}
async function confirmAction(page: Page, action: string) {
  await button(page, action).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(modal).not.toBeVisible();
}
async function createParty(page: Page, path: string, name: string) {
  await page.goto(path + "/new");
  await page.getByLabel("Display name").fill(name);
  await button(page, "Save changes").click();
  await expect(
    page.getByRole("heading", { level: 1, name, exact: true }),
  ).toBeVisible();
}
async function fillDocument(page: Page, purchase: boolean, quantity: string) {
  await page
    .getByRole("combobox", {
      name: purchase ? "Supplier" : "Customer",
      exact: true,
    })
    .selectOption({ label: purchase ? supplier : buyer });
  await button(page, "Add item").click();
  await page
    .getByRole("combobox", { name: "Product 1", exact: true })
    .selectOption({ label: item + " · " + sku });
  await page.getByLabel("Quantity 1", { exact: true }).fill(quantity);
  await button(page, "Save draft").click();
  await expect(page.locator(".document-status")).toHaveText("draft");
}
async function documentOutput(page: Page, kind: string) {
  const number = (
    await page.getByRole("heading", { level: 1 }).innerText()
  ).trim();
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    button(page, "Download PDF").click(),
  ]);
  expect(await file.failure()).toBeNull();
  expect(file.suggestedFilename()).toBe(number.replaceAll("/", "-") + ".pdf");
  const pdf = await PDFDocument.load(await readFile((await file.path())!));
  expect(pdf.getTitle()).toBe(kind + " " + number);
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  await page.evaluate(() =>
    window.addEventListener(
      "beforeprint",
      () => {
        document.documentElement.dataset.printRequested = "yes";
      },
      { once: true },
    ),
  );
  await button(page, "Print").click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-print-requested",
    "yes",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".document-paper")).toBeVisible();
  await expect(button(page, "Download PDF")).toBeHidden();
  const printed = await PDFDocument.load(
    await page.pdf({ preferCSSPageSize: true, printBackground: true }),
  );
  expect(printed.getPageCount()).toBeGreaterThanOrEqual(1);
  await page.emulateMedia({ media: "screen" });
}
test("quotation, invoice, partial and final payments, stock receipts and PDF output", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(r.status() + " " + r.url());
  });
  await createParty(page, "/customers", buyer);
  await createParty(page, "/suppliers", supplier);
  await page.goto("/products/new");
  await page.getByLabel("Product name").fill(item);
  await page.getByLabel("Item code / SKU").fill(sku);
  await page.getByLabel("Selling rate (₹)").fill("100.00");
  await page.getByLabel("Purchase rate (₹)").fill("60.00");
  await page.getByLabel("Opening stock").fill("8");
  await page.getByLabel("Reorder level").fill("5");
  await button(page, "Save changes").click();
  await expect(
    page.getByRole("heading", { level: 1, name: item }),
  ).toBeVisible();
  const productUrl = page.url();
  const stockPanel = page.locator(".summary-cards").getByText(/\d+ \/ \d+ Nos/);
  await expect(stockPanel).toContainText("8 / 8");
  await page.goto("/sales/quotations/new");
  await fillDocument(page, false, "4");
  await confirmAction(page, "Mark as sent");
  await expect(page.locator(".document-status")).toHaveText("sent");
  await documentOutput(page, "Quotation");
  await button(page, "Convert to invoice").click();
  await expect(
    page.getByRole("heading", { level: 1, name: /Edit .*invoice/i }),
  ).toBeVisible();
  await button(page, "Save draft").click();
  await confirmAction(page, "Finalize");
  await expect(
    page.getByRole("link", { name: "Record payment" }),
  ).toBeVisible();
  const invoiceUrl = page.url();
  await page.goto(productUrl);
  await expect(stockPanel).toContainText("4 / 4");
  await page.goto("/inventory/low-stock");
  await page.getByLabel("Search table").fill(sku);
  await expect(page.getByRole("row").filter({ hasText: item })).toContainText(
    "4 Nos",
  );
  await page.goto(invoiceUrl);
  for (const [amount, status] of [
    ["150.00", "partially paid"],
    ["250.00", "paid"],
  ]) {
    await page
      .getByRole("link", { name: "Record payment", exact: true })
      .click();
    await page.getByLabel("Amount (₹)").fill(amount);
    await button(page, "Record payment").click();
    await expect(page.locator(".document-status")).toHaveText(status);
  }
  await expect(
    page.locator(".document-totals").getByText("₹0.00").last(),
  ).toBeVisible();
  await documentOutput(page, "Invoice");
  await page.goto("/purchases/orders/new");
  await fillDocument(page, true, "10");
  await confirmAction(page, "Issue order");
  await button(page, "Receive items").click();
  await page.getByLabel("Supplier invoice number").fill("DEMO-QA-RECEIPT");
  await button(page, "Save draft").click();
  await confirmAction(page, "Receive & finalize");
  await page.goto(productUrl);
  await expect(stockPanel).toContainText("14 / 14");
  await page.goto("/inventory/low-stock");
  await page.getByLabel("Search table").fill(sku);
  await expect(page.getByRole("row").filter({ hasText: item })).toHaveCount(0);
  await page.goto("/inventory/batches");
  for (const [state, lot] of [
    ["near-expiry", "DEMO-LOT-13"],
    ["expired", "DEMO-LOT-14"],
  ]) {
    await page.getByLabel("Batch status filter").selectOption(state);
    const match = page.getByRole("row").filter({ hasText: lot });
    await expect(match).toContainText(state.replace("-", " "));
    await match.getByRole("link").first().click();
    await expect(
      page.getByRole("heading", { name: lot, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText(state.replace("-", " "), { exact: true }),
    ).toBeVisible();
    await page.goto("/inventory/batches");
  }
  expect(errors).toEqual([]);
});

test("billing preserves a dirty form on cancel and releases it on discard or save", async ({
  page,
}) => {
  await page.goto("/customers/new");
  await page.getByLabel("Display name").fill("Disposable test");
  const cancel = page.getByRole("link", { name: "Cancel", exact: true });
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.dismiss();
  });
  await cancel.click();
  await expect(page.getByLabel("Display name")).toHaveValue("Disposable test");
  const native = page.waitForEvent("dialog");
  await page.evaluate(() => {
    setTimeout(() => location.reload(), 0);
  });
  const unload = await native;
  expect(unload.type()).toBe("beforeunload");
  await unload.dismiss();
  page.once("dialog", (dialog) => dialog.accept());
  await cancel.click();
  await expect(page).toHaveURL(/\/customers$/);
  await createParty(page, "/customers", "Fictional saved record");
  const cleanDialogs: string[] = [];
  page.on("dialog", async (d) => {
    cleanDialogs.push(d.type());
    await d.accept();
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Fictional saved record", level: 1 }),
  ).toBeVisible();
  expect(cleanDialogs).toEqual([]);
});

test("billing primary modules load with a working workspace", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/dashboard",
    "/sales/quotations",
    "/sales/invoices",
    "/sales/payments",
    "/purchases/orders",
    "/purchases/bills",
    "/inventory",
    "/inventory/batches",
    "/customers",
    "/suppliers",
    "/expenses",
    "/reports",
    "/settings",
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Opening your workspace…")).toHaveCount(0);
    await expect(page.getByText("Workspace unavailable")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
