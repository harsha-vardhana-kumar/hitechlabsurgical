# Website administration

## Entry points

The server layout gates the workspace by environment and sets no-index metadata. The App Router recognizes a finite route list. A client shell supplies the responsive sidebar, breadcrumb, keyboard search, notifications and demo role menu. Feature screens load on demand. Unknown routes and missing entities have recovery views.

| Module | Actions |
| --- | --- |
| Dashboard | Counts and work queues derived from current records, recent activity and enquiries. |
| Products | Search, filter, paginate, edit fields, upload/select images, mark for verification, preview, duplicate, submit for review, publish, unpublish and archive. |
| Categories and featured products | Edit category metadata, change its position, reassign dependants and curate homepage selections. |
| Media | Validate and upload raster images, change alt text/captions, follow usage references and protect referenced assets. |
| Quote and contact inboxes | Create explicitly fictional demo submissions, search and filter, assign a colleague, update status, add private notes and export. |
| Pages and SEO | Structured editors for Home, About, Industries, Contact and Footer. Metadata includes canonical, social preview and robots fields. |
| Settings and system | Editable confirmed identity and contact fields, brand, website and analytics metadata, role matrix, audit history and public snapshot inspection. |

## Data and publishing

UI commands pass through the workspace service and repository interfaces in `apps/admin/src/repositories/contracts.ts`. `DemoLocalAdapter` stores metadata and binary objects in IndexedDB. Transactions check expected revisions, validate inputs and persist the audit event with its mutation. Other open tabs can refresh using a broadcast notification. `MemoryAdapter` exercises the same commands in tests. The API contract adapter needs an explicitly supplied transport and verifier. The pre-AWS runtime has no configured production endpoint.

Products imported from the public catalogue begin as drafts. The initial categories mirror the catalogue and the four enquiries are fictional. Each publish freezes allowlisted fields and referenced media metadata. Saving a newer draft preserves its previous release. Visibility changes reach the public snapshot through an explicit publishing action. Archiving and unpublishing remove a product from the current public view while retaining the Admin record and historical enquiry references. A category with dependencies requires a valid replacement before deletion. Moving a category updates draft ranks. Publishing its rank moves the other released positions without promoting their text or images.

The public projection has its own contract. It excludes billing stock and prices, GSTIN, PAN, user roles, enquiries, internal notes and review notes. Browser uploads use temporary object URLs for display. A downloaded demo snapshot can contain a demo asset reference that resolves only inside its originating browser. The production contract must resolve a managed media object to a durable delivery URL before publication.

Uploads accept PNG, JPEG and WebP up to 5 MiB and 32–8192 pixels per dimension. Demo checks extension, MIME, file signature, dimensions and alt text. Bundled SVG brand artwork is trusted repository content. The upload UI rejects SVG and executable uploads.

## Roles

| Role | Granted actions |
| --- | --- |
| Owner | Full management including demo users and roles. |
| Admin | All Admin operations except user administration. |
| Content Manager | Dashboard, catalogue/category/media/content/SEO editing and activity. |
| Sales | Dashboard and enquiry follow-up. |
| Viewer | Dashboard. |

The role menu simulates these sessions for evaluation. Commands enforce their required permissions independently of the visible controls. The portable server handler accepts injected identity verification and transactional storage, and derives authority from the verified session. A later authenticated API must also filter every read and export by role.

[Validation](admin-validation.md) · [Verified business details and remaining inputs](client-inputs.md)
