import { expect, test } from "@playwright/test";

for (const width of [320, 375, 430, 768, 1440]) {
  test(`catalogue, site navigation and public assets at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    for (const route of [
      "/",
      "/products",
      "/products/hemometer",
      "/about",
      "/industries",
      "/contact",
      "/privacy",
      "/terms",
    ]) {
      expect((await page.goto(route))?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const canonical = new URL(
        (await page.locator('link[rel="canonical"]').getAttribute("href"))!,
      );
      expect(canonical.origin).toBe("https://hitechlabsurgical.com");
      expect(canonical.pathname).toBe(route);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        /\S/,
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        "content",
        /\S/,
      );
      const result = await page.evaluate(async () => {
        await document.fonts.ready;
        for (const image of document.images) image.loading = "eager";
        await Promise.all(
          Array.from(document.images, (image) =>
            image.decode().catch(() => undefined),
          ),
        );
        return {
          overflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
          broken: [...document.images]
            .filter((image) => !image.naturalWidth)
            .map((image) => image.src),
        };
      });
      expect(result, route).toEqual({ overflow: false, broken: [] });
    }
    if (width <= 430) {
      const toggle = page.getByRole("button", { name: "Open navigation" });
      await toggle.click();
      await page.keyboard.press("Escape");
      await expect(toggle).toBeFocused();
      await toggle.click();
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "Products", exact: true })
        .click();
    } else {
      await page.goto("/products");
    }
    await page.getByLabel("Search products").fill("Hemometer");
    await page
      .getByRole("link", { name: "Hemometer", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Hemometer" }),
    ).toBeVisible();
    await page
      .getByRole("main")
      .getByRole("link", { name: "Request a Quote", exact: true })
      .click();
    await expect(page.locator('input[name="product"]')).toHaveValue(
      "Hemometer",
    );
    const favicon = await page
      .locator('link[rel~="icon"]')
      .first()
      .getAttribute("href");
    expect((await page.request.get(favicon!)).ok()).toBeTruthy();
    expect(errors).toEqual([]);
  });
}

test("public quote stays an unsent draft and can be downloaded", async ({
  page,
}) => {
  await page.goto("/contact?product=Hemometer");
  const form = page.locator("form");
  await form.getByRole("button", { name: "Request a Quote" }).click();
  await expect(form.locator('input[name="fullName"]')).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  const fields = {
    fullName: "Sample buyer",
    organisation: "Fictional test lab",
    phone: "9000001234",
    email: "sample@example.test",
    city: "Demo city",
    quantity: "2",
  };
  for (const [name, value] of Object.entries(fields))
    await form.locator(`input[name="${name}"]`).fill(value);
  await form.getByRole("button", { name: "Request a Quote" }).click();
  await expect(
    form
      .getByText(
        /nothing has been sent|no enquiry has been sent|not been sent/i,
      )
      .first(),
  ).toBeVisible();
  const [draft] = await Promise.all([
    page.waitForEvent("download"),
    form.getByRole("button", { name: "Download enquiry draft" }).click(),
  ]);
  expect(draft.suggestedFilename()).toMatch(/\.txt$/);
  const xml = await (await page.request.get("/sitemap.xml")).text();
  const links = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(m[1]).pathname,
  );
  expect(links.filter((p) => p.startsWith("/products/"))).toHaveLength(55);
  for (const route of links)
    expect((await page.request.get(route)).status(), route).toBe(200);
  expect((await page.request.get("/missing-release-route")).status()).toBe(404);
});
