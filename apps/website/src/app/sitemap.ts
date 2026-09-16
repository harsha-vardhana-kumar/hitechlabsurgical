import type { MetadataRoute } from 'next';
import { company } from '@/config/company';
import { getProducts } from '@/services/catalog';
export default function sitemap(): MetadataRoute.Sitemap { return [...['','/products','/about','/industries','/contact'].map(path => ({url:`${company.url}${path}`,changeFrequency:'monthly' as const,priority:path === '' ? 1 : .8})),...getProducts().map(product => ({url:`${company.url}/products/${product.slug}`,changeFrequency:'monthly' as const,priority:.6}))]; }
