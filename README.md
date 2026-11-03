# HITECH LIFE SCIENCE & SURGICALS

Public website, billing workspace and website administration for **hitechlabsurgical.com**. Each application builds and deploys independently from this npm workspace. The public catalogue contains 55 client-supplied products across 10 categories.

## Architecture

| Location | Responsibility |
| --- | --- |
| `apps/website` | The public Next.js website |
| `apps/billing` | Billing, purchasing, inventory, accounts and printable documents |
| `apps/admin` | Website catalogue, content, publishing, SEO, enquiries and settings |
| `packages/brand` | Approved logo files and brand tokens |
| `packages/validation` | Content, publishing, identity and file validation |
| `packages/utils` | Slugs, identifiers, dates and safe CSV export |
| `packages/ui` | Shared presentation primitives |
| `packages/config` | Central business details and indexing configuration |
| `packages/types` | Product, category and enquiry contracts |
| `docs` | Catalogue review notes, imagery provenance and handover |
| `tests` and `qa` | Website, financial and Admin logic tests and production Chromium workflows |
| `scripts` | Portable development and standalone production entrypoints |

In `apps/website`, `src/services/catalog.ts` is the public catalogue boundary. Product data lives in
`src/data/products.ts`, and categories in `src/data/categories.ts`; page components
do not own catalogue records. A future API can replace the repository behind the
service layer. Shared packages are transpiled by Next.js, with no separate build step.

## Requirements and setup

- Node.js 22 LTS recommended (`.nvmrc`); Node.js 24 is also supported by the engine range.
- npm 10 or newer. Use npm and the committed root `package-lock.json`.

Run from the repository root:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. No environment variables are required for preview.
If adding contact information, copy `apps/website/.env.example` to
`apps/website/.env.local`. Never commit the populated file.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm run check` runs lint, TypeScript, all unit/adapter tests and three production builds. After the builds, run `npx playwright install chromium` and `npm run test:browser` to execute the release workflows against the standalone servers. Linux CI installs Chromium system dependencies as well.
See [the release checklist](docs/production-readiness.md) for the current results and [the initial website verification](docs/verification.md) for the historical baseline.
The development wrapper also supports `npm run dev -- --port 3001` and both
`--host` and `--hostname`. It works on Windows, macOS and Linux.
`npm start` copies local images, fonts and static chunks into the standalone output
and launches its generated server. It listens on port 3000; set `PORT` to override.
Vercel handles its own server packaging and does not use this start command.

## Pages

- `/`: home, categories, featured products, procurement and industry sections.
- `/products`: search, category filtering, catalogue/A–Z ordering and empty states.
- `/products/[slug]`: 55 statically generated product pages with related products.
- `/about`, `/industries`, `/contact`.
- `/privacy`, `/terms`: explicitly identified interim preview notices.
- `/robots.txt`, `/sitemap.xml` and a custom 404.

Search and category selections are URL-backed and support direct links. Every
product quotation link preselects its product on the enquiry form.

## Enquiry preview: what it does

The current form validates the required fields and produces an **unsent draft**
that the visitor can download as a text file. Its notice and result explicitly
say that the business has not received an enquiry. Draft content stays in page
memory; it is not sent to a server, logged or persisted in browser storage.

`src/services/enquiries.ts` implements the shared `QuoteTransport` interface.
For launch, replace the preview adapter with an API integration, implement the
corresponding confirmed-success and error UI, and approve the privacy/terms content.
Use server-side validation, rate limiting and spam protection before collection.
AWS API Gateway/Lambda, SES or an approved CRM can sit behind this interface.
Do not put email credentials, CRM tokens or AWS secrets in public environment variables.

## Optional environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_COMPANY_PHONE` | Empty | Displays call links when supplied |
| `NEXT_PUBLIC_COMPANY_EMAIL` | Empty | Displays email links when supplied |
| `NEXT_PUBLIC_COMPANY_ADDRESS` | Empty | Displays the confirmed business address |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Empty | International digits; enables WhatsApp CTA |
| `NEXT_PUBLIC_ALLOW_INDEXING` | `false` | Set `true` only for the approved production domain |

These values are public and compiled into the website. Redeploy after changing them.
Vercel preview deployments remain `noindex` even if indexing is enabled for production.
Blank contact values render no fake contact details. The canonical origin is centrally
defined as `https://hitechlabsurgical.com` in `packages/config/src/index.ts`.

## Vercel previews

Create one Next.js project per app with Root Directories **apps/website**, **apps/billing** and **apps/admin**. All three use the shared root lockfile. The settings below show the website project. Use the corresponding root for the other two projects.

Import **harsha-vardhana-kumar/hitechlabsurgical** into Vercel and set:

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Root directory | **`apps/website`** |
| Include source files outside the Root Directory | **Enabled** (shared packages and root lockfile) |
| Install command | **`npm ci --prefix ../..`** |
| Build command | **`npm run build`** |
| Output directory | Default (`.next`); do not override |
| Node.js version | **22.x** |
| Production branch | `main` |
| Required environment variables | None |

Connect the Git repository in Vercel to enable automatic deployments after pushes.
GitHub source alone does not create a Vercel project. Keep indexing disabled during
client review. Once approved, add the domain, confirm DNS and TLS, configure the
business details and online enquiry transport, and enable production indexing.

For a repository-root working directory, `npm ci` and `npm run build` are sufficient.
For the exact Vercel app-directory install check, run `npm ci --prefix ../..` from
`apps/website` followed by `npm run build`.

## Branding and imagery

The isolated `Brand` component uses the custom H symbol with a laboratory flask
formed in its negative space, paired with bespoke HITECH lettering. Real vector
SVG artwork lives under `apps/website/public/brand`; all lettering is outlined,
so the logo requires no external font. `company.logo.light` / `company.logo.dark`
select the primary and white versions. A small uppercase descriptor supports the
wordmark. The favicon and touch icon omit the liquid detail for clarity at small sizes.
See `docs/brand.md` for variants, exact colors and usage guidance.

Three locally stored generated laboratory images are illustrative, not photographs
of the business premises or exact catalogue products. Product illustrations are
labelled in the UI. Replace `Product.image` and `imageAlt` with approved product
photographs when supplied. Broken sources fall back to a local placeholder.
See `docs/imagery.md` and `docs/asset-prompts.json` for provenance.

Manrope is self-hosted via `next/font/local`; its OFL licence is included beside the
font. Builds make no Google Fonts request. Icons are from Lucide.

## Catalogue approval

Uncertain entries retain the supplied wording and `needsReview: true` with internal
`reviewNotes`. No pack sizes, units, performance metrics, certifications or prices
have been invented. See `docs/catalogue-review.md` for remaining decisions.

## SEO and accessibility

The site includes page-specific titles/descriptions, production-domain canonicals,
Open Graph and Twitter text metadata, robots and sitemap routes, and factual
Organization, WebSite and Product JSON-LD. It deliberately omits offers, ratings and
review claims. Product structured data may not qualify for Google merchant rich
results without real offer data; that data must not be fabricated.

Semantic landmarks, visible focus states, a skip link, form labels, keyboard-accessible
navigation, an Escape-to-close mobile menu and reduced-motion support are included.
Images use Next.js optimisation, lazy loading and reserved layout dimensions.

## AWS portability and future applications

`output: 'standalone'` produces a portable Next.js server build. An AWS deployment
can use a Node.js container or a supported Next.js host with CloudFront in front.
S3 alone cannot serve this standalone output or Next's image optimisation endpoint.
A future static S3 export would require an explicit export/image-loader adaptation.
No AWS resources have been provisioned.

The Admin and billing demos use distinct browser databases. Admin exposes only published catalogue and public settings through an allowlisted projection. See the [architecture](docs/architecture.md) and [future AWS integration plan](docs/aws-readiness.md) for ownership and service boundaries.

## Billing workspace

Run `npm run dev:billing -- --port 3001` or `npm run build:billing` from the root.
Deploy billing as a separate Vercel project with Root Directory **`apps/billing`**;
keep the existing website project's Root Directory at **`apps/website`**.

The demo includes quotations, invoices, payments, purchases, stock/batches,
customers/suppliers, expenses, reports and branded PDF documents. It uses IndexedDB
and a fixed Demo Admin identity. Sample commercial values are artificial, records
stay in this browser, and recording a payment does not transfer money.

See [billing setup](apps/billing/README.md), [architecture](docs/billing-architecture.md),
[client inputs](docs/billing-client-inputs.md) and [validation](docs/billing-validation.md).

## Admin workspace

Run `npm run dev:admin -- --port 3002` or `npm run build:admin` from the root. The dashboard opens in a labelled Demo Admin session. Create a draft, preview it, then use Publishing status to inspect its public snapshot. GitHub CI runs the three production builds and the Chromium regression suite on pull requests and pushes to main.

[Admin setup](apps/admin/README.md) · [Admin architecture and permissions](docs/admin-architecture.md) · [Admin validation](docs/admin-validation.md) · [Release checklist](docs/production-readiness.md) · [Client inputs](docs/client-inputs.md)

## Dependency compatibility

Runtime versions and tooling are pinned by the lockfile. Next.js 16.3.5, React 19.3.0
and Tailwind 4.3.3 are used. TypeScript 6 is used because the current TypeScript ESLint
parser does not support TypeScript 7. ESLint 9.39.5 is retained because Next's import,
React and accessibility plugins do not yet declare ESLint 10 compatibility. npm may
emit ESLint's upstream deprecation notice; this is development-only and does not
affect the production bundle. Upgrade these together when their peer ranges agree.
