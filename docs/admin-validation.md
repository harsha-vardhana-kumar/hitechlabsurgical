# Admin validation

Run the suite from a clean checkout on Node 22 with the root lockfile. All tests use isolated demo data. Unit and adapter tests live in `tests/admin-*.test.ts`. Browser scenarios live in `qa/admin/workflows.spec.ts`. The release checklist links the CI evidence.

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:admin:browser
```

| Workflow | Observable assertions |
| --- | --- |
| Product to publication | Save an incomplete product, see a field error, fill the category, descriptions, image and SEO, inspect the preview, publish and reload. The downloadable public snapshot excludes its internal note. |
| Category order | Create and publish a category, assign a product, move it, save and release the new position. Unit tests enforce distinct draft and released positions, including manual rank collisions, and prevent unrelated draft content from being published. |
| Enquiry follow-up | Create a fictional quote request, assign it, change its status, save a private note, search the note and find the enquiry through a status filter. |
| Shared settings | Edit and publish a phone number, reload the public projection and verify the changed number and absence of tax identifiers. |
| Archive | Cancel once, then confirm archival. Check that the product leaves the published catalogue and that its original enquiry still shows its archived reference and note. |
| Invalid content | Save a homepage draft with a missing heading. Publishing must give a readable field error. The product and page command tests also assert successful rollback. |

The suite verifies protected navigation, permission-denied routes, demo role selection, keyboard search, focusable dialogs and cancel/discard behavior for dirty forms. It visits dashboard, tables, product and category editors, media, enquiries, contact settings, SEO and publishing at 320, 375, 430, 768, 1024, 1280, 1440 and 1920 pixels. It checks page and dialog overflow, image loading, route responses and browser errors. Chromium screenshots and traces belong to ignored test output, with temporary CI artifacts retained for seven days.

Domain coverage includes slugs, required fields, structured text and URL safety, image MIME/signature/dimension limits, stale writers, transaction rollback, review flags, public allowlists, role enforcement, settings, enquiry transitions, archive/reassignment safety and audit entries. The in-memory and mocked API checks use synthetic sessions and no production service.

[Release checklist](production-readiness.md)
