import type {
  AdminProduct,
  AdminCategory,
  Seo,
  Enquiry,
} from "@hitech/types/admin";
import { uniqueId } from "@hitech/utils";
export function blankSeo(): Seo {
  return {
    title: "",
    description: "",
    canonical: "",
    ogTitle: "",
    ogDescription: "",
    ogImageId: "",
    index: true,
    follow: true,
  };
}
export function blankProduct(): AdminProduct {
  return {
    id: uniqueId("product"),
    name: "",
    slug: "",
    categoryId: "",
    subcategory: "",
    shortDescription: "",
    description: "",
    imageId: "",
    additionalImageIds: [],
    brand: "",
    model: "",
    packSize: "",
    specifications: [],
    catalogueNumber: "",
    sku: "",
    featured: false,
    visible: true,
    sortOrder: 0,
    keywords: [],
    seo: blankSeo(),
    status: "Draft",
    needsReview: false,
    reviewNotes: "",
    internalNotes: "",
    revision: 0,
    updatedAt: "",
  };
}
export function blankCategory(): AdminCategory {
  return {
    id: uniqueId("category"),
    name: "",
    slug: "",
    description: "",
    imageId: "",
    active: true,
    sortOrder: 0,
    seo: blankSeo(),
    revision: 0,
    updatedAt: "",
  };
}
export function blankEnquiry(kind: "quote" | "contact"): Enquiry {
  return {
    id: uniqueId("enquiry"),
    kind,
    name: "",
    organisation: "",
    email: "",
    phone: "",
    city: "",
    productId: "",
    productName: "",
    quantity: "",
    message: "",
    submittedAt: "",
    status: "New",
    assignedTo: "",
    internalNotes: "",
    demo: true,
    revision: 0,
  };
}
