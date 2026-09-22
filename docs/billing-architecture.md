# Billing architecture

`apps/billing` is an independent Next.js App Router application in the existing npm
workspace. Its routes, data, styling and dependencies are separate from
`apps/website`. No public website files are changed. Shared package names and the
approved branding are reused; billing operations do not enter the public catalogue
service or enquiry flow.

## Boundaries

| Layer | Responsibility |
| --- | --- |
| `src/app` | Layout, metadata, route dispatch and error/404 boundaries |
| `src/components` | Accessible forms, navigation, tables and document views |
| `src/domain` | Types, integer arithmetic, date ranges, numbering, permissions and selectors |
| `src/services` | Business commands, document/PDF generation and reports |
| `src/repositories` | Workspace persistence contract and IndexedDB demo adapter |
| `src/data` | Explicit sample workspace and approved catalogue snapshot |

Components execute commands through `BillingService` and `WorkspaceProvider`.
They do not write directly to browser storage. `WorkspaceRepository` exposes
`load`, `transact` and `subscribe`. `DemoAuthAdapter` supplies the demo session;
central permission checks exist to define the intended application boundary.
Client-side roles are not a production security control.

## Transactions and stock

The demo stores one versioned workspace in IndexedDB. Every command reads, validates,
modifies and writes it in one read/write transaction. A thrown validation error
aborts the transaction, including earlier stock changes in that command. Commands
must be synchronous inside this transaction. Revisions and BroadcastChannel
notifications keep open tabs updated without overwriting newer state with an older
load. There is no cross-device synchronization.

Stock is derived from signed ledger movements, not a separately editable balance.
Finalized sales consume stock; received purchases add it. Returns, adjustments and
cancellations append their corresponding movements. Expired and quarantined
batches are unavailable for sale. Automatic batch selection uses earliest expiry
first. Source-linked returns preserve the original price/tax treatment and enforce
quantity limits, including repeated product lines and their batch allocations.

Finalization snapshots party, business, line and tax information. Editing a master
record later does not rewrite a posted document. Drafts remain editable. Cancellation
and payment voiding preserve history; referenced records are archived rather than
deleted. A paid document must have its payment voided before cancellation. Stock
reversal still cannot make stock negative.

## Money and numbering

Stored amounts use integer paise, quantities use integer milliunits, and percentage
rates use basis points. BigInt intermediate arithmetic avoids floating-point drift;
the serialized workspace contains safe integers, not BigInt values. Validation
rejects unsafe magnitudes and malformed decimal input.

The calculation service applies line discounts and allocates document discounts
proportionally with largest-remainder reconciliation. It supports inclusive or
exclusive GST, intra-state CGST plus SGST/UTGST, inter-state IGST, and paise/rupee
rounding. Unknown state codes leave jurisdiction unresolved and prevent taxable
posting. Totals, payments and balances share the same calculation functions.

Numbers are reserved when a draft is first saved. Each document kind has a prefix,
counter, padding and optional financial-year segment. Financial-year reset requires
that segment. Allocation skips existing numbers, including cancelled documents,
and uses the same atomic transaction as draft creation. This provides browser-local
consistency, not a shared production sequence.

## Documents and reporting

Saved HTML previews and PDF content use the same document data. PDFs embed local
Manrope fonts and vector Hitech artwork. Text remains selectable; table headers
repeat, ordinary rows stay together and unusually long descriptions continue onto
another page. Notes and terms wrap across pages. Unconfigured banking/contact
details are omitted, not fabricated. A signature label is plain text, not a digital
signature.

Reports derive from non-cancelled transactions and ledger movements. Returns net
against sales/purchases; voided payments do not count. CSV cells are escaped and
formula-like text is neutralized. Inventory reports describe current stock, while
financial reports honor their date filters; each report explains its scope.

## Future production integration

Replace the local repository/auth adapters with a server API and authenticated
session, retaining the domain contracts and UI. An AWS implementation could use
Cognito for identity, API Gateway/Lambda for commands and a transactional database.
This change provisions none of these services.

The server must own tenant isolation, role authorization, input validation, document
number allocation, idempotency, concurrent stock updates and immutable audit records.
Do not accept a client-supplied role or workspace snapshot as authoritative. Add
versioned migrations, backups and tested recovery before storing business records.
Define the accounting/tax requirements with the business, including refund/credit
allocation and any required filing integrations, before calling this production
billing software.
