# Website verification

Checked on 16 September 2026 using Node.js 24.19.0 and npm 11.9.0.
GitHub Actions is configured to repeat the checks on Node.js 22.

## Installation and build

- Removed installed dependencies and generated Next.js output, then installed
  successfully with `npm ci --prefix ../..` from `apps/website`.
- `npm run lint`: passed with zero lint warnings.
- `npm run typecheck`: passed.
- `npm test`: six tests passed, covering catalogue integrity, review flags,
  combined filtering, related products, validation and the unsent preview draft.
- Production builds passed from both the repository root and `apps/website`.
  All 55 product detail pages were generated at build time.
- `npm audit --omit=dev --audit-level=high`: zero reported vulnerabilities.
- `npm start`: verified using the generated standalone server with copied public
  assets and static chunks. No application errors were logged in the final smoke check.

The development-only ESLint deprecation notice is explained in the README.
The verification environment also injects an npm `http-proxy` configuration warning;
it is not part of this repository's npm configuration.

## Routes, assets and metadata

- All 62 content pages returned HTTP 200: seven main/legal pages plus 55 products.
- Checked 29 public or generated asset URLs, including the font, favicon, touch icon,
  image fallback, optimized images, CSS and JavaScript.
- Checked one H1 and the expected production-domain canonical on each content page.
- Product pages include structured data; internal page links resolve to known routes.
- The sitemap contains 60 indexable page URLs. Preview robots disallows indexing.
- Unknown routes and unknown products return HTTP 404. Temporary QA files are absent.
- Rechecked the final missing-product handling, optimized hero image, favicon,
  representative product page and standalone startup after the last fixes.

## Browser and responsive review

- Visually reviewed home, catalogue, product details, about, industries, enquiry
  and interim legal layouts on desktop and mobile.
- Measured home, catalogue and enquiry layouts at 320, 375, 430, 768, 1024, 1440
  and 1920 pixels. Measured the remaining page layouts at 320 and 1440 pixels.
  No horizontal overflow was found.
- Exercised mobile navigation and Escape-to-close, combined product search/category
  filters, empty results, clearing filters and product-specific enquiry links.
- Exercised required-field validation, a valid synthetic enquiry, draft download
  and editing the draft. The form explicitly confirms that nothing has been sent.
- Reviewed browser console output. Corrected image-loading and navigation-scroll
  warnings; no React hydration error was observed. An unrelated browser-extension
  metadata error was excluded from application findings.

These are local implementation checks, not a Lighthouse certification or a claim
about live Core Web Vitals. Vercel deployment, DNS and real enquiry delivery require
their respective service connections and approved business details.
