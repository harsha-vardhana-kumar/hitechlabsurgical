# Pre-AWS code release checklist

This gate applies to the three independently built preview applications. The authoritative result for a revision is its **Application checks** run on the pull request or on main. A release checkpoint requires a passing run for that revision.

| Gate | Evidence required |
| --- | --- |
| Clean installation | `npm ci` from the root lockfile on a clean checkout. CI uses Node 22. |
| Static checks | Repository ESLint with zero warnings, three Next.js TypeScript checks and a separate TypeScript check for the browser suite. |
| Financial and application tests | 84 total. Six public website cases, 39 billing cases and 39 Admin domain/adapter cases. |
| Independent production builds | `npm run build`, `npm run build:billing` and `npm run build:admin` finish and generate three standalone servers. |
| Website | Six browser scenarios check primary pages at five widths, mobile navigation, images, favicon, canonical and social metadata, a downloadable unsent quote draft, every sitemap route including 55 products, and a genuine 404. |
| Billing | Three browser scenarios check the sales/payment/stock/purchasing lifecycle, batch expiry, actual PDF downloads, print output, dirty-form navigation and the main modules. |
| Admin | Eleven browser scenarios cover the six release workflows, permissions, unsaved navigation and eight viewport widths. |
| UI stability | Tests assert browser exceptions, console errors, missing resources and unintended overflow on the covered routes. Use the CI browser report or failure traces for diagnosis. |
| Source and privacy | CI checks tracked files for credential signatures and prohibited artifacts. Only sample contacts and commercial values ship. Public projection tests reject internal, tax and commercial fields. |
| Shared configuration | New Admin and billing workspaces source verified business fields centrally. Tests protect the website's public entry point and the fields emitted at publish. |
| Deployment boundary | Each app includes its own Vercel preview configuration. Production-mode Admin and billing stop at setup until authenticated adapters exist. |
| Handover | Architecture, validation, future AWS services, client inputs and independent preview roots have dedicated documentation. |

## Release verification

- Chromium exercised the six Admin workflows and all specified widths. The website checks inspected all 55 product detail URLs and downloaded an unsent enquiry draft. Billing verified actual browser download events and parsed its quotation and invoice PDFs.
- The axe-core WCAG 2/2.1 A and AA rules reported zero violations on ten sampled desktop routes. These included the Admin dashboard, product and category editors, quote inbox, page metadata and contact settings, the billing dashboard and quotation editor, and the website homepage and contact form.
- The tracked-source guard and an independent Secretlint recommended-preset scan reported zero credential findings. The public build's static chunks and rendered app output were checked for the legal name and GSTIN. Both identifiers were absent.
- Standalone Admin and billing servers started with `HITECH_WORKSPACE_STAGE=production` returned the setup-required state. Neither initialized a demo workspace on the protected route.

## Reproduce

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:browser
```

Linux CI uses `npx playwright install --with-deps chromium`. The browser tests launch all three built apps on local ports 3217–3219, create fresh browser contexts and make no cloud writes. HTML reports, temporary downloads, traces and screenshots are excluded from Git. CI stores browser results for seven days. The optional test-only `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can point to an existing compatible Chromium executable.

A clean launch of billing or Admin without environment variables uses isolated, browser-local demo storage. Set the server-only `HITECH_WORKSPACE_STAGE` to `production` to verify the setup-required state. Unrecognized stage names also disable the demo. Private server credentials are never placed in a `NEXT_PUBLIC_*` variable.

## Scope of the freeze

The public website retains its existing catalogue, layout and enquiry-draft behavior. Its catalogue image links have an accessible label that includes the visible image caption. The Admin public snapshot can be inspected and exported locally. Switching to real authentication, a shared database, uploads, enquiry delivery or central audit storage belongs to the next phase. Physical printer output and client approval of remaining business inputs are separate from the code gate.

[Pull request and check history](https://github.com/harsha-vardhana-kumar/hitechlabsurgical/pull/1) · [Main branch checks](https://github.com/harsha-vardhana-kumar/hitechlabsurgical/actions/workflows/ci.yml?query=branch%3Amain) · [Admin validation](admin-validation.md) · [Billing validation](billing-validation.md) · [Client inputs](client-inputs.md) · [Future AWS readiness](aws-readiness.md)
