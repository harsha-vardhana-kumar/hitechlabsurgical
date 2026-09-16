export type CategoryId =
  | 'laboratory-equipment' | 'lab-consumables' | 'diagnostic-reagents'
  | 'rapid-test-kits' | 'sample-collection' | 'clinical-chemistry'
  | 'hematology' | 'urinalysis' | 'laboratory-accessories' | 'surgical-medical';

export interface Category {
  id: CategoryId;
  name: string;
  shortName: string;
  description: string;
  image: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: CategoryId;
  subcategory?: string;
  shortDescription: string;
  description: string;
  image: string | null;
  imageAlt?: string;
  brand?: string;
  packSize?: string;
  specifications: ReadonlyArray<{ label: string; value: string }>;
  featured: boolean;
  status: 'active' | 'hidden';
  needsReview: boolean;
  reviewNotes?: string;
  searchTerms: readonly string[];
}

export interface QuoteRequest {
  fullName: string;
  organisation: string;
  phone: string;
  email: string;
  city: string;
  product: string;
  quantity: string;
  message: string;
}

export type QuoteResult =
  | { status: 'preview'; summary: string }
  | { status: 'sent'; reference: string };

export interface QuoteTransport { submit(request: QuoteRequest): Promise<QuoteResult> }
