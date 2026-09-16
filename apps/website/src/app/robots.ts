import type { MetadataRoute } from 'next';
import { company } from '@/config/company';
export default function robots(): MetadataRoute.Robots { return { rules: company.allowIndexing ? { userAgent:'*',allow:'/',disallow:['/privacy','/terms'] } : { userAgent:'*',disallow:'/' }, sitemap:`${company.url}/sitemap.xml`, host:company.url }; }
