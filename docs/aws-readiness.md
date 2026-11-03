# Future AWS integration plan

This plan describes the phase after the pre-AWS code freeze. The current release runs without an AWS account, production data or credentials.

| Future service | Integration point and acceptance evidence |
| --- | --- |
| Cognito | Replace demo sessions. Verify signature, issuer, expiry, token type and audience/client at the API. Map groups to server roles. Test required MFA, password policy, revoked access, issuer mismatch and user deactivation. |
| API Gateway and Lambda | Adapt the portable command handler to authenticated requests. Apply server-side schemas, body limits, rate limiting, field-level read authorization, idempotency keys and optimistic concurrency. Public reads must use the published projection. |
| PostgreSQL/RDS or DynamoDB | Select the database after examining transaction boundaries and access patterns. Atomically persist a mutation, revision, audit record and publication. Preserve invoice snapshots, unique document numbers, stock movements and integer precision. Test retries, competing writers and backup restoration. |
| S3 and CloudFront | Quarantine uploads under private object keys. Authorize short-lived uploads, verify bytes server-side, enforce decode limits, re-encode/scan and attach approved immutable delivery keys. Use an approved hostname and invalidate only the affected publication. |
| SES | Receive validated and rate-limited requests server-side, durably store them, then enqueue notifications with retry/deduplication. Show a visitor a receipt only after verified persistence. |
| CloudWatch | Record correlation IDs, status, latency, failed authorizations, failed notifications, publication failures and stock transaction conflicts. Exclude messages, tax identifiers, contact details, tokens and document contents from logs. |

## Cutover criteria for a later change

1. Create separate development, staging and production identities, storage and configuration through a separately approved infrastructure change. Keep browser demo databases out of the migration path.
2. Exercise identity, read/write permissions, media checks, transactions and job retries using synthetic staging records. Reconcile the stock ledger and payment totals after retry and restore tests.
3. Obtain approval for product data, images, contact details, tax settings, legal documents and retention. Import a reviewed, versioned data set through validated APIs with a staging reconciliation report.
4. Pass the existing UI suites against the real staging adapters. Verify that disabling the backend causes a safe error and never loads demo fixtures.
5. Agree on backups, rollback, deployment ownership, monitoring and domain changes before a production cutover.

The frontend builds can move as portable standalone Next.js servers. Store binary assets separately and keep signing keys and service credentials on the server. No DNS or cloud migration step is part of the application freeze.
