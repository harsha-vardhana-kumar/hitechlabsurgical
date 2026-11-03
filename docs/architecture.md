# Hitech application architecture

The GitHub repository is the release unit for source, shared contracts and CI. Each Next.js application has its own router, origin, build and deployment. No application imports another application's UI. Install once from the root npm lockfile.

| Application | Authority | Persistence in the pre-AWS release |
| --- | --- | --- |
| Website | Public discovery, product details, SEO and quote preparation | Build-time public catalogue. Quote requests remain unsent drafts in page memory until downloaded by the visitor. |
| Billing | Commercial SKUs, rates, GST, customers, suppliers, quotations, invoices, payments and the stock ledger | An isolated browser IndexedDB. Posting uses an atomic transaction and freezes business, party and line snapshots. |
| Admin | Public product descriptions, imagery, visibility, content, SEO, featured placement, enquiry follow-up and permitted shared settings | A separate browser IndexedDB. Publication creates a revisioned, explicitly projected demo snapshot. |

## Shared modules

| Workspace | Contract |
| --- | --- |
| `@hitech/brand` | Approved vector logo assets and brand tokens. Deployable logo copies keep each app independent. |
| `@hitech/config` | Public website identity and environment overrides. The separate `/business` entry holds verified legal and contact defaults. `/workspace-mode` enforces demo boundaries. |
| `@hitech/types` | Public catalogue and enquiry contracts, business profile and Admin command, role and publication types. |
| `@hitech/validation` | Admin record, content, SEO, settings, safe-URL and image checks. |
| `@hitech/utils` | Slug generation, stable identifiers, dates and spreadsheet-safe CSV exports. |
| `@hitech/ui` | Presentation primitives shared where their semantics fit the applications. |

The public configuration entry never imports private tax data. Admin publishes only the fields in the public projection. Billing and Admin initialize from the confirmed identity for a new workspace. Editing a browser demo does not amend another app's database, old issued documents, or the public build. A production shared-settings service will later distribute approved values to each consumer.

The approved public artwork and existing website use the legacy descriptor “Lab & Surgical Solutions”. The configured trade name for business records is HITECH LIFE SCIENCE & SURGICALS. Keep the current artwork until the client approves replacement vector files. All apps reuse the existing navy/teal palette and self-hosted Manrope.

Billing computes line values in integer paise, quantities in thousandths and percentages in basis points. Its central money module uses BigInt intermediate arithmetic, deterministic rounding and discount allocation. Stock and invoice totals never feed the public catalogue. Product IDs are sufficient to link a future catalogue integration.

[Admin architecture](admin-architecture.md) · [Billing architecture](billing-architecture.md) · [Future AWS integration](aws-readiness.md)
