import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Product } from '@hitech/types';
import { getCategory } from '@/data/categories';
import { ProductVisual } from './product-visual';

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  return <article className="product-card"><Link className="product-image-link" href={`/products/${product.slug}`} aria-label={`View ${product.name}`} tabIndex={-1}><ProductVisual product={product} eager={eager} /></Link>
    <div className="product-card-content"><p className="product-category">{getCategory(product.category)?.shortName}</p><h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3><p className="product-description">{product.shortDescription}</p><Link className="product-enquire" href={`/contact?product=${encodeURIComponent(product.name)}`}>Enquire about product <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
  </article>;
}
