import { publicBusiness } from "@hitech/config/business";
import type {
  ProductFields,
  CategoryFields,
  PageFields,
  AdminWorkspace,
  PublishedSite,
  SiteSettings,
} from "@hitech/types/admin";
export function productFields(p: ProductFields): ProductFields {
  return {
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    subcategory: p.subcategory,
    shortDescription: p.shortDescription,
    description: p.description,
    imageId: p.imageId,
    additionalImageIds: [...p.additionalImageIds],
    brand: p.brand,
    model: p.model,
    packSize: p.packSize,
    specifications: p.specifications.map((s) => ({
      label: s.label,
      value: s.value,
    })),
    catalogueNumber: p.catalogueNumber,
    sku: p.sku,
    featured: p.featured,
    visible: p.visible,
    sortOrder: p.sortOrder,
    keywords: [...p.keywords],
    seo: seoFields(p.seo),
  };
}
export function seoFields(s: ProductFields["seo"]) {
  return {
    title: s.title,
    description: s.description,
    canonical: s.canonical,
    ogTitle: s.ogTitle,
    ogDescription: s.ogDescription,
    ogImageId: s.ogImageId,
    index: s.index,
    follow: s.follow,
  };
}
export function categoryFields(c: CategoryFields): CategoryFields {
  return {
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageId: c.imageId,
    sortOrder: c.sortOrder,
    active: c.active,
    seo: seoFields(c.seo),
  };
}
export function pageFields(p: PageFields): PageFields {
  return {
    title: p.title,
    heading: p.heading,
    description: p.description,
    body: p.body,
    ctaLabel: p.ctaLabel,
    ctaLink: p.ctaLink,
    procurementHeading: p.procurementHeading,
    procurementDescription: p.procurementDescription,
    featuredCategoryIds: [...p.featuredCategoryIds],
    seo: seoFields(p.seo),
  };
}
export function siteFields(s: SiteSettings): SiteSettings {
  return {
    siteName: s.siteName,
    websiteUrl: s.websiteUrl,
    defaultSeo: seoFields(s.defaultSeo),
    homepageFeaturedIds: [...s.homepageFeaturedIds],
    showFeatured: s.showFeatured,
    analyticsEnabled: s.analyticsEnabled,
    analyticsMeasurementId: s.analyticsMeasurementId,
    logoId: s.logoId,
    faviconId: s.faviconId,
    publicContacts: s.publicContacts,
  };
}
export function publishedSite(w: AdminWorkspace): PublishedSite {
  const products = w.products.flatMap((p) =>
    p.published && p.published.visible
      ? [
          {
            id: p.id,
            ...productFields(p.published),
            publishedAt: p.published.publishedAt,
          },
        ]
      : [],
  );
  const categories = w.categories.flatMap((c) =>
    c.published?.active ? [{ id: c.id, ...categoryFields(c.published) }] : [],
  );
  const pages = w.pages.flatMap((p) =>
    p.published ? [{ id: p.id, path: p.path, ...pageFields(p.published) }] : [],
  );
  const mediaIds = new Set([
    ...products.flatMap((p) => [
      p.imageId,
      ...p.additionalImageIds,
      p.seo.ogImageId,
    ]),
    ...categories.flatMap((c) => [c.imageId, c.seo.ogImageId]),
    ...pages.map((p) => p.seo.ogImageId),
    w.settings.published?.site.logoId,
    w.settings.published?.site.faviconId,
    w.settings.published?.site.defaultSeo.ogImageId,
  ]);
  return {
    schemaVersion: 1,
    environment: w.environment,
    products: products.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    ),
    categories: categories.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    ),
    pages,
    settings: w.settings.published
      ? {
          business: publicBusiness(w.settings.published.business),
          site: siteFields(w.settings.published.site),
        }
      : undefined,
    media: w.media
      .filter((m) => mediaIds.has(m.id) && m.published)
      .map((m) => ({
        id: m.id,
        url: m.published!.url,
        alt: m.published!.alt,
        caption: m.published!.caption,
        width: m.published!.width,
        height: m.published!.height,
      })),
  };
}
export function mediaUsage(w: AdminWorkspace, id: string): string[] {
  return [
    ...w.products
      .filter((p) =>
        [
          p.imageId,
          ...p.additionalImageIds,
          p.seo.ogImageId,
          p.published?.imageId,
          ...(p.published?.additionalImageIds || []),
          p.published?.seo.ogImageId,
        ].includes(id),
      )
      .map((p) => `Product: ${p.name}`),
    ...w.categories
      .filter((c) =>
        [
          c.imageId,
          c.seo.ogImageId,
          c.published?.imageId,
          c.published?.seo.ogImageId,
        ].includes(id),
      )
      .map((c) => `Category: ${c.name}`),
    ...w.pages
      .filter(
        (p) => p.seo.ogImageId === id || p.published?.seo.ogImageId === id,
      )
      .map((p) => `Page: ${p.title}`),
    ...([
      w.settings.site.logoId,
      w.settings.site.faviconId,
      w.settings.site.defaultSeo.ogImageId,
      w.settings.published?.site.logoId,
      w.settings.published?.site.faviconId,
      w.settings.published?.site.defaultSeo.ogImageId,
    ].includes(id)
      ? ["Website settings"]
      : []),
  ];
}
export function unpublished(w: AdminWorkspace) {
  return [
    ...w.products
      .filter(
        (p) => p.status !== "Archived" && p.revision !== p.publishedRevision,
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: "Product",
        href: `/products/${p.id}`,
      })),
    ...w.categories
      .filter((c) => c.revision !== c.publishedRevision)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: "Category",
        href: "/categories",
      })),
    ...w.pages
      .filter((p) => p.revision !== p.publishedRevision)
      .map((p) => ({
        id: p.id,
        name: p.title,
        type: "Content",
        href: `/content/${p.id}`,
      })),
    ...(w.settings.revision !== w.settings.publishedRevision
      ? [
          {
            id: "settings",
            name: "Business & website settings",
            type: "Settings",
            href: "/settings/business",
          },
        ]
      : []),
  ];
}
