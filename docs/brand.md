# Hitech logo system

The mark combines a geometric **H** with a laboratory flask formed by the open
negative space in its crossbar. The client's supplied visual reference guided
this refinement: mirrored stems, matching angled upper terminals and a centered,
straight-sided vessel. A single shallow liquid curve sits inside the flask.
There are no bubbles, exterior swooshes, extra symbols or gradients.

The HITECH lettering retains its custom geometric paths and small terminal
chamfers, with stems reduced from 10 to 8.5 drawing units for a lighter finish.
The descriptor is **LAB & SURGICAL SOLUTIONS**, outlined from the website's
Manrope family at weight 500, with 0.95-unit tracking. Its 13.32-unit cap height
is about one quarter of HITECH's 54-unit cap height. A roughly 10-unit vertical
gap separates the lines; 26 units separate the symbol and wordmark. No installed
or externally loaded font is required to display the SVGs.
The existing Manrope OFL licence remains under `public/fonts`.

## Selected direction

Three directions were drawn and compared at large and small sizes:

| Direction | Assessment |
| --- | --- |
| H with integrated flask cutout | Selected: clearest laboratory meaning, recognizable H silhouette, strong in one color and at favicon sizes |
| H with connected scientific nodes | Readable, but the rounded nodes felt more generic and became visually busy when reduced |
| H with an angular precision connection | Strong typography and reduction, but conveyed technology more clearly than laboratory science |

Only the selected direction is included in the application assets.

## Colors

| Color | Hex | Use |
| --- | --- | --- |
| Deep navy | `#0B2B45` | Lettering, left side of the primary mark, monochrome version, favicon background |
| Scientific teal | `#087C80` | Right side of the primary mark and the subtle liquid shape |
| White | `#FFFFFF` | Reversed artwork on dark backgrounds |

These navy and teal values are the existing website colors. Navy/white contrast
is 14.53:1 and teal/white contrast is 4.99:1. The white logo has 14.53:1 contrast
against the site's navy. The mark does not depend on the two-color split to read.

## Artwork

All paths below are relative to `apps/website/public/brand`.

| File | Intended use |
| --- | --- |
| `hitech-logo.svg` | Primary horizontal logo on white or light backgrounds; used in the header |
| `hitech-logo-white.svg` | White primary logo on dark backgrounds; used in the footer |
| `hitech-logo-dark.svg` | Single-color navy primary logo for quotations, invoices and printing |
| `hitech-logo-compact.svg` | Icon plus HITECH without the descriptor |
| `hitech-logo-compact-white.svg` | White compact version for dark backgrounds |
| `hitech-mark.svg` | Standalone two-color symbol |
| `hitech-mark-white.svg` | Standalone white symbol |
| `hitech-mark-dark.svg` | Standalone monochrome navy symbol |
| `favicon.svg` | White symbol on a navy tile; liquid omitted for small-size clarity |
| `apple-touch-icon.png` | 180-pixel touch icon rendered from the vector favicon; not a logo master |

`dark` in the artwork filenames means dark ink. Use the `white` artwork on a
dark surface. The SVGs contain no raster images, external references or font data.
The primary is a flat two-color logo. White and navy monochrome artwork preserves
the same transparent flask geometry and liquid shape. The favicon removes only
the liquid detail, keeping the silhouette and flask counter identical. This
prevents the small gap beneath the liquid from closing at 16 pixels.

## Placement

Preserve each SVG's aspect ratio. Use the full logo at the website's existing
195-pixel desktop/tablet and 170-pixel mobile widths. Use the compact version or
mark alone when the descriptor would become too small to read.

Keep at least one symbol-stem width of clear space around the artwork in new
print or app placements. Use the monochrome version for single-ink reproduction.
Do not recolor the vessel cutout: it is transparent negative space.

The website's `Brand` component selects the primary/white SVG via central company
configuration. The enclosing logo slot retains its original dimensions: 195 × 52
pixels on desktop/tablet and 170 × 48 pixels on mobile. SVG dimensions reserve
space during loading. This refinement keeps the 392 × 96 viewBox and requires
no component, header sizing, alignment or stylesheet changes.

## Verification

Before/after browser measurements at 320, 375, 430, 768, 1024 and 1440-pixel frame
widths showed identical header, logo-slot, navigation, quote-button, menu-button,
footer-logo and footer-copy geometry, with no horizontal overflow. The browser's
native scrollbar occupied 15 pixels inside each frame.

Desktop, tablet and mobile logo placement and the white variant were visually
reviewed. The color mark, monochrome mark and simplified favicon were also
reviewed at actual 16, 24, 32 and 48-pixel sizes. Mobile menu opening and
Escape-to-close remained functional. Source
comparison confirmed that page layouts, content, product data, routes, form logic,
page titles/descriptions/canonicals, dependencies and application architecture were
unchanged. Only favicon and touch-icon references received a cache version so
returning browsers can pick up the new artwork.

`npm run lint`, `npm run typecheck`, all six existing tests and the production
build passed after integration. The final build generated all 55 product pages.
Production HTTP checks passed for every brand asset, both versioned icon URLs,
and representative home, catalogue, contact and product-detail routes. The
standalone server logged no application errors during those checks.
