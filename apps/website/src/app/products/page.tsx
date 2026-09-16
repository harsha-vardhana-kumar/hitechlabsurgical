import { Suspense } from 'react';
import { Breadcrumbs, PageIntro, QuoteCta } from '@/components/common';
import { CatalogExplorer } from '@/components/catalog-explorer';
import { getProducts } from '@/services/catalog';
import { pageMetadata } from '@/lib/metadata';
import { ProductCard } from '@/components/product-card';

export const metadata = pageMetadata('Product Catalogue', 'Browse laboratory equipment, consumables, diagnostic reagents, sample collection and surgical supplies. Search our catalogue and request a quotation.', '/products');
export default function ProductsPage() {
  return <><div className="page-banner"><div className="container"><Breadcrumbs items={[{label:'Products'}]} /><PageIntro eyebrow="THE HITECH CATALOGUE" title="The essentials behind your work.">Explore our laboratory and diagnostic supply range. Find what you need, then talk to us about the right specifications and quantities.</PageIntro></div></div><Suspense fallback={<div className="container catalog-layout"><aside className="catalog-sidebar"><h2>Product categories</h2><p className="section-description">Search and filters are loading.</p></aside><section aria-label="Product catalogue"><p className="catalog-count">{getProducts().length} products in our catalogue</p><div className="product-grid">{getProducts().map((product, index) => <ProductCard key={product.id} product={product} eager={index < 3} />)}</div></section></div>}><CatalogExplorer products={getProducts()} /></Suspense><QuoteCta /><div className="h-14" /></>;
}
