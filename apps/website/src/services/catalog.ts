import { products } from '../data/products';
import { categories } from '../data/categories';
import type { Product } from '@hitech/types';

// The only catalogue access boundary. An API-backed repository can replace this.
export function getProducts() { return products.filter(product => product.status === 'active'); }
export function getProduct(slug: string) { return getProducts().find(product => product.slug === slug); }
export function getFeaturedProducts() { return getProducts().filter(product => product.featured).slice(0, 4); }
export function getRelatedProducts(product: Product) {
  return getProducts().filter(item => item.category === product.category && item.id !== product.id).slice(0, 3);
}
export function filterProducts(items: readonly Product[], query: string, category: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(product => {
    const categoryName = categories.find(item => item.id === product.category)?.name || '';
    const haystack = [product.name, product.shortDescription, product.subcategory, product.brand, categoryName, ...product.searchTerms].join(' ').toLocaleLowerCase();
    return (category === 'all' || product.category === category) && words.every(word => haystack.includes(word));
  });
}
