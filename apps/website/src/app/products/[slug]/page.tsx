import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { Badge, SectionHeading } from '@hitech/ui';
import { getProduct, getProducts, getRelatedProducts } from '@/services/catalog';
import { getCategory } from '@/data/categories';
import { Breadcrumbs, JsonLd, TextLink } from '@/components/common';
import { ProductVisual } from '@/components/product-visual';
import { ProductCard } from '@/components/product-card';
import { pageMetadata } from '@/lib/metadata';
import { company } from '@/config/company';

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return getProducts().map(product => ({ slug: product.slug })); }
// Unknown slugs reach the explicit notFound() guard below.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProduct((await params).slug);
  return product ? pageMetadata(product.name, `${product.shortDescription} Request a quotation from ${company.name}.`, `/products/${product.slug}`) : { title: 'Product not found', robots: { index: false } };
}
export default async function ProductPage({ params }: Props) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  const category = getCategory(product.category)!;
  const related = getRelatedProducts(product);
  return <div className="container"><Breadcrumbs items={[{label:'Products',href:'/products'},{label:category.shortName,href:`/products?category=${category.id}`},{label:product.name}]} /><div className="product-detail"><div><ProductVisual product={product} large /><p className="caption-note">Illustrative category image. Contact us for exact product photographs.</p></div><div><Badge>{category.name}</Badge><h1>{product.name}</h1><p className="product-detail-description">{product.description}</p><dl className="product-specs"><div><dt>Product reference</dt><dd>{product.id}</dd></div><div><dt>Category</dt><dd>{category.name}</dd></div>{product.brand && <div><dt>Brand</dt><dd>{product.brand}</dd></div>}{product.subcategory && <div><dt>Range</dt><dd>{product.subcategory}</dd></div>}{product.packSize && <div><dt>Pack size</dt><dd>{product.packSize}</dd></div>}{product.specifications.map(spec => <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl><div className="product-note"><strong>Let’s confirm the details.</strong>Contact our team for available brands, specifications and pack sizes. Please include any required model or instrument compatibility in your enquiry.</div><Link className="button button-primary" href={`/contact?product=${encodeURIComponent(product.name)}`}>Request a Quote <ArrowUpRight size={18} aria-hidden="true" /></Link><p className="caption-note">Quotation based supply. No online payment is required.</p></div></div><div className="assistance-box"><div><h2>Need help with your requirement?</h2><p>Share your product list and quantities with our team.</p></div><TextLink href={`/contact?product=${encodeURIComponent(product.name)}`}>Enquire about this product</TextLink></div>{related.length > 0 && <section className="section"><div className="section-top"><SectionHeading eyebrow="CONTINUE EXPLORING" title="Related products" /><TextLink href={`/products?category=${category.id}`}>View this category</TextLink></div><div className="product-grid">{related.map(item => <ProductCard key={item.id} product={item} />)}</div></section>}{!related.length && <div className="h-16" />}<JsonLd data={{ '@context':'https://schema.org', '@type':'Product', name:product.name, description:product.shortDescription, sku:product.id, category:category.name, url:`${company.url}/products/${product.slug}`, ...(product.brand ? {brand:{'@type':'Brand',name:product.brand}} : {}), ...(product.image ? {image:`${company.url}${product.image}`} : {}) }} /></div>;
}
