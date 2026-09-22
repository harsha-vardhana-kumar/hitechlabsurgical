# Billing client inputs

The app includes the approved Hitech name, domain and logo. All commercial sample
values are demonstrations. The following information is needed before preparing
real business documents or implementing the production service.

| Area | Confirmed inputs needed |
| --- | --- |
| Business identity | Legal entity name, registered/billing address, city, state/UT and code, pincode, phone, email, GSTIN and PAN where applicable |
| Tax/accounting | GST registration/treatment, HSN/SAC and rates, inclusive/exclusive pricing, SGST/UTGST treatment, rounding and financial-year start |
| Numbering | Prefix, padding, next unused number and year/reset policy for quotations, invoices, purchase orders, bills, credit notes and purchase returns |
| Product masters | Units, pack sizes, SKU/barcode, verified manufacturer/brand/model, catalogue number, purchase/sale rates, reorder level and active status |
| Opening inventory | Count and valuation date, quantity/cost per product, lots, manufacturing/expiry dates and quarantined stock |
| Customers/suppliers | Organization/contact details, billing/shipping addresses, state codes, GSTIN, credit limits, payment terms and opening balances |
| Document content | Approved quotation/invoice terms, notes, footer, transport fields and signatory label; confirm any future signature/stamp requirement |
| Payment details | Approved bank/account/IFSC/branch/UPI details and accepted payment methods |
| Operations | Expense categories, expiry alert window, returns/refunds policy and approval responsibilities |
| Access/deployment | User/role list, separate billing domain, Vercel project ownership and future authentication/API environment |

Do not infer legal/contact/banking details from the sample workspace. Catalogue
spelling and uncertain entries still require the review recorded in
[catalogue-review.md](catalogue-review.md). Billing demo prices and stock do not
change the public website's catalogue.

Use disposable sample records during review. JSON export is a demo snapshot;
automated backup, import/recovery, multi-device access and production accounting
opening balances are not implemented. Confirm those requirements as part of the
production adapter work.
