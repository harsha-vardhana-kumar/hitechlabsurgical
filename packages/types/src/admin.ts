import type { BusinessProfile, PublicBusinessProfile } from "./business";
export type Role = "Owner" | "Admin" | "Content Manager" | "Sales" | "Viewer";
export type Permission =
  | "dashboard.view"
  | "products.manage"
  | "products.publish"
  | "categories.manage"
  | "media.manage"
  | "enquiries.manage"
  | "seo.manage"
  | "content.manage"
  | "settings.manage"
  | "users.manage"
  | "activity.view";
export interface Session {
  id: string;
  name: string;
  role: Role;
  demo: boolean;
}
export interface Seo {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImageId: string;
  index: boolean;
  follow: boolean;
}
export type ProductStatus = "Draft" | "Review" | "Published" | "Archived";
export interface ProductFields {
  name: string;
  slug: string;
  categoryId: string;
  subcategory: string;
  shortDescription: string;
  description: string;
  imageId: string;
  additionalImageIds: string[];
  brand: string;
  model: string;
  packSize: string;
  specifications: { label: string; value: string }[];
  catalogueNumber: string;
  sku: string;
  featured: boolean;
  visible: boolean;
  sortOrder: number;
  keywords: string[];
  seo: Seo;
}
/** Public whitelist: intentionally excludes review/internal notes and all commercial fields. */
export interface PublicProduct extends ProductFields {
  id: string;
  publishedAt: string;
}
export interface AdminProduct extends ProductFields {
  id: string;
  status: ProductStatus;
  needsReview: boolean;
  reviewNotes: string;
  internalNotes: string;
  revision: number;
  updatedAt: string;
  publishedRevision?: number;
  published?: PublicProduct;
}
export interface CategoryFields {
  name: string;
  slug: string;
  description: string;
  imageId: string;
  sortOrder: number;
  active: boolean;
  seo: Seo;
}
export interface AdminCategory extends CategoryFields {
  id: string;
  revision: number;
  updatedAt: string;
  publishedRevision?: number;
  published?: CategoryFields;
}
export interface MediaAsset {
  id: string;
  fileName: string;
  alt: string;
  caption: string;
  type: "image" | "logo";
  mime: string;
  bytes: number;
  width: number;
  height: number;
  storageKey: string;
  source: "bundled" | "demo-upload";
  url: string;
  uploadedAt: string;
  published?: {
    url: string;
    alt: string;
    caption: string;
    width: number;
    height: number;
  };
}
export type EnquiryStatus =
  "New" | "Contacted" | "In Progress" | "Quoted" | "Closed" | "Spam";
export interface Enquiry {
  id: string;
  kind: "quote" | "contact";
  name: string;
  organisation: string;
  email: string;
  phone: string;
  city: string;
  productId: string;
  productName: string;
  quantity: string;
  message: string;
  submittedAt: string;
  status: EnquiryStatus;
  assignedTo: string;
  internalNotes: string;
  demo: boolean;
  revision: number;
}
export interface PageFields {
  title: string;
  heading: string;
  description: string;
  body: string;
  ctaLabel: string;
  ctaLink: string;
  procurementHeading: string;
  procurementDescription: string;
  featuredCategoryIds: string[];
  seo: Seo;
}
export interface ContentPage extends PageFields {
  id: string;
  path: string;
  revision: number;
  updatedAt: string;
  publishedRevision?: number;
  published?: PageFields;
}
export interface SiteSettings {
  siteName: string;
  websiteUrl: string;
  defaultSeo: Seo;
  homepageFeaturedIds: string[];
  showFeatured: boolean;
  analyticsEnabled: boolean;
  analyticsMeasurementId: string;
  logoId: string;
  faviconId: string;
  publicContacts: boolean;
}
export interface Settings {
  business: BusinessProfile;
  site: SiteSettings;
  revision: number;
  publishedRevision?: number;
  published?: { business: PublicBusinessProfile; site: SiteSettings };
}
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  demo: boolean;
}
export interface Activity {
  id: string;
  actor: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
  metadata: Record<string, string | number | boolean>;
}
export interface PublishEvent {
  id: string;
  entity: string;
  entityId: string;
  name: string;
  actor: string;
  timestamp: string;
  action: "Published" | "Unpublished" | "Archived";
  demo: boolean;
}
export interface AdminWorkspace {
  schemaVersion: 1;
  environment: "demo" | "production";
  revision: number;
  products: AdminProduct[];
  categories: AdminCategory[];
  media: MediaAsset[];
  enquiries: Enquiry[];
  pages: ContentPage[];
  settings: Settings;
  users: AdminUser[];
  activity: Activity[];
  publishing: PublishEvent[];
}
export interface PublishedSite {
  schemaVersion: 1;
  environment: "demo" | "production";
  products: PublicProduct[];
  categories: (CategoryFields & { id: string })[];
  pages: (PageFields & { id: string; path: string })[];
  settings?: Settings["published"];
  media: Pick<
    MediaAsset,
    "id" | "url" | "alt" | "caption" | "width" | "height"
  >[];
}
/** Same commands travel over the future API. Actor identity never comes from a command. */
export type AdminCommand =
  | { type: "product.save"; product: AdminProduct; expectedRevision: number }
  | {
      type: "product.action";
      id: string;
      action: "review" | "publish" | "unpublish" | "archive" | "duplicate";
      expectedRevision: number;
      confirmed?: boolean;
    }
  | { type: "category.save"; category: AdminCategory; expectedRevision: number }
  | { type: "category.publish"; id: string; expectedRevision: number }
  | {
      type: "category.move";
      id: string;
      direction: -1 | 1;
      expectedRevision: number;
    }
  | {
      type: "category.unpublish";
      id: string;
      confirmed: boolean;
      expectedRevision: number;
    }
  | {
      type: "category.delete";
      id: string;
      reassignId?: string;
      confirmed: boolean;
    }
  | { type: "media.save"; media: MediaAsset }
  | { type: "media.delete"; id: string; confirmed: boolean }
  | { type: "enquiry.createDemo"; enquiry: Enquiry }
  | {
      type: "enquiry.update";
      id: string;
      status: EnquiryStatus;
      assignedTo: string;
      internalNotes: string;
      expectedRevision: number;
    }
  | { type: "page.save"; page: ContentPage; expectedRevision: number }
  | { type: "page.publish"; id: string; expectedRevision: number }
  | { type: "settings.save"; settings: Settings; expectedRevision: number }
  | { type: "settings.publish"; expectedRevision: number }
  | { type: "user.save"; user: AdminUser }
  | {
      type: "seo.save";
      entity: "product" | "page";
      id: string;
      seo: Seo;
      expectedRevision: number;
    };
