'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Product } from '@hitech/types';
import { getCategory } from '@/data/categories';

export function ProductVisual({ product, large = false, eager = false }: { product: Pick<Product, 'image' | 'imageAlt' | 'category' | 'name'>; large?: boolean; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const base = failed ? '/images/product-placeholder.svg' : product.image || getCategory(product.category)?.image || '/images/product-placeholder.svg';
  // Separate the above-fold illustration URL from lazy thumbnails of the same asset.
  const src = (large || eager) && !product.image && !failed ? `${base}?view=lead` : base;
  return <div className={`product-visual${large ? ' product-visual-large' : ''}`}>
    <Image src={src} alt={product.image && !failed ? product.imageAlt || product.name : `Illustrative ${getCategory(product.category)?.shortName.toLowerCase() || 'laboratory'} image; exact product photo available on enquiry`} fill sizes={large ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 25vw'} loading={large || eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} />
    {!product.image && <span className="image-caption">Illustrative image</span>}
  </div>;
}
