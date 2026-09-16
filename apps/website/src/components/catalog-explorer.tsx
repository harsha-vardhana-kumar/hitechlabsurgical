'use client';

import { useDeferredValue, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, SearchX, X } from 'lucide-react';
import type { Product } from '@hitech/types';
import { categories } from '@/data/categories';
import { filterProducts } from '@/services/catalog';
import { ProductCard } from './product-card';
import { TextLink } from './common';

export function CatalogExplorer({ products }: { products: readonly Product[] }) {
  const params = useSearchParams();
  const initialCategory = params.get('category') || 'all';
  const query = params.get('q') || '';
  const category = categories.some(item => item.id === initialCategory) ? initialCategory : 'all';
  const [sort, setSort] = useState('catalogue');
  const deferredQuery = useDeferredValue(query);
  const filtered = filterProducts(products, deferredQuery, category);
  if (sort === 'az') filtered.sort((a,b) => a.name.localeCompare(b.name));
  const updateUrl = (nextQuery: string, nextCategory: string) => {
    const next = new URLSearchParams();
    if (nextQuery.trim()) next.set('q', nextQuery.trim());
    if (nextCategory !== 'all') next.set('category', nextCategory);
    window.history.replaceState(null, '', `/products${next.size ? `?${next}` : ''}`);
  };
  const chooseCategory = (next: string) => { updateUrl(query, next); };
  const search = (next: string) => { updateUrl(next, category); };
  const clear = () => { setSort('catalogue'); updateUrl('', 'all'); };
  return <div className="container catalog-layout"><aside className="catalog-sidebar" aria-label="Filter products"><h2>Product categories</h2><div className="filter-list"><button type="button" className="category-filter" aria-pressed={category === 'all'} onClick={() => chooseCategory('all')}><span>All products</span><span>{products.length}</span></button>{categories.map(item => <button type="button" key={item.id} className="category-filter" aria-pressed={category === item.id} onClick={() => chooseCategory(item.id)}><span>{item.name}</span><span>{products.filter(product => product.category === item.id).length}</span></button>)}</div><div className="sidebar-help"><h3>Can’t find a product?</h3><p>Share your requirement. We’ll help you explore the options.</p><TextLink href="/contact">Ask our team</TextLink></div></aside>
    <section aria-label="Product catalogue results"><div className="catalog-tools"><div className="search-field"><Search size={19} aria-hidden="true" /><label htmlFor="product-search" className="sr-only">Search products</label><input type="search" id="product-search" placeholder="Search products, reagents, equipment…" value={query} onChange={event => search(event.target.value)} />{query && <button type="button" aria-label="Clear search" onClick={() => search('')}><X size={17} /></button>}</div><div className="mobile-filter"><label htmlFor="mobile-category" className="sr-only">Product category</label><select id="mobile-category" className="sort-field" value={category} onChange={event => chooseCategory(event.target.value)}><option value="all">All categories</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><label className="sr-only" htmlFor="product-sort">Sort products</label><select className="sort-field" id="product-sort" value={sort} onChange={event => setSort(event.target.value)}><option value="catalogue">Catalogue order</option><option value="az">Name: A to Z</option></select></div>
      <div className="catalog-count"><p role="status" aria-live="polite"><strong>{filtered.length}</strong> {filtered.length === 1 ? 'product' : 'products'}{category !== 'all' ? ` in ${categories.find(item => item.id === category)?.shortName}` : ' in our catalogue'}</p>{(query || category !== 'all') && <button type="button" onClick={clear}>Clear filters</button>}</div>
      {filtered.length ? <div className="product-grid">{filtered.map((product, index) => <ProductCard product={product} eager={index < 3} key={product.id} />)}</div> : <div className="empty-state"><SearchX size={33} aria-hidden="true" /><h2>No matching products</h2><p>Try a broader search or another category. You can also ask our team about a specific requirement.</p><button type="button" className="button button-primary" onClick={clear}>View all products</button></div>}
      <p className="catalog-info">Products are available by enquiry. Brands, specifications, pack sizes and availability are confirmed during quotation. Images are illustrative.</p>
    </section></div>;
}
