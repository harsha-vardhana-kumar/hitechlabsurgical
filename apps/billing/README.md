# Hitech billing demo

A separate business operations workspace for Hitech Lab & Surgical Solutions.
The public website remains in `apps/website`. This app reuses the approved Hitech
brand assets without changing that website or its catalogue.

## Run locally

Use Node.js 22 and npm 10 or newer. From the repository root:

```bash
npm ci
npm run dev:billing -- --port 3001
```

Open `http://localhost:3001`. The first visit creates a clearly labelled sample
workspace in this browser. No credentials or environment variables are needed.
For a production build and local server:

```bash
npm run build:billing
npm run start --workspace @hitech/billing
```

The production server defaults to port 3000; set `PORT` to override it. It packages
the public assets and static chunks into Next.js standalone output. Root
`npm run dev`, `npm run build`, and `npm start` continue to target the website.

## Included workflows

- Dashboard with financial summaries, a sales trend, recent activity and alerts.
- Customers, suppliers and products with search, sorting, pagination and archive.
- Quotations, conversion to invoices, credit notes and customer payments.
- Purchase orders, partial receipts, purchase bills, returns and supplier payments.
- Stock movements, adjustments, reorder alerts, batches and expiry tracking.
- Expenses and 11 reports with date filters, CSV export and print layouts.
- Business, tax, document, numbering, banking and workspace settings.
- Branded A4 PDF documents with selectable text, embedded fonts and long-document
  pagination. Print layouts use the same saved document snapshots.

## Demo behavior and boundaries

**This is a functional browser-local demo, not a connected accounting service.**
`Demo Admin` is a fixed demonstration identity. There is no production login,
server authorization, multi-device synchronization or cloud backup. Records stay
in IndexedDB for this site/browser. Clearing site data removes them. Workspace
settings can export a JSON snapshot, restore sample data, or start an empty demo;
JSON import/restore is not implemented.

The 55 product names and categories come from the approved public catalogue.
Sample prices, stock, taxes, parties and transactions are explicitly demo data.
Unconfirmed legal identity, address, GSTIN, PAN, contact and banking fields are
blank. Configure them only with verified business information.

Payments record an amount against an invoice or bill; they do not move money.
Returns are source-linked, quantity-limited, and capped by the original outstanding
balance. Cash refunds, unapplied credits, advances, general ledger accounting,
GST filing, e-invoicing and e-way bills are outside this demo. The GST calculations
are configurable application logic and are not a claim of statutory compliance.

PDF generation is local. If an automatic download is suppressed by the browser,
use **Save prepared PDF** after generation. No email or messaging is sent.

## Separate Vercel project

Import the same repository as a **new billing project** with these settings:

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Root directory | `apps/billing` |
| Include source files outside Root Directory | Enabled |
| Install command | `npm ci --prefix ../..` |
| Build command | `npm run build` |
| Output directory | Default (`.next`) |
| Node.js version | 22.x |
| Production branch | `main` |
| Required environment variables | None for demo mode |

`vercel.json` supplies the install/build settings. Do not change the existing
website project's root directory. A GitHub push does not create the separate
Vercel project or connect its domain. No billing deployment or AWS resources have
been provisioned by this change. Billing pages always send `noindex, nofollow`.

Optional `NEXT_PUBLIC_BILLING_MODE=demo` is the default. Any other mode intentionally
shows an unavailable workspace until production adapters are implemented. The
commented API/Cognito settings in `.env.example` are future integration points;
setting them alone does not enable a backend. Never put secrets in public variables.

## Checks and handover

Run `npm run check` from the root for lint, both app type checks, all tests and both
production builds. See:

- [Architecture and production adapter boundary](../../docs/billing-architecture.md)
- [Required client inputs](../../docs/billing-client-inputs.md)
- [Validation record and remaining browser checks](../../docs/billing-validation.md)
