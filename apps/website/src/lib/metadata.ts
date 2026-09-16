import type { Metadata } from 'next';
import { company } from '@/config/company';

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const url = `${company.url}${path}`;
  return { title, description, alternates: { canonical: url },
    openGraph: { title: `${title} | ${company.name}`, description, url, siteName: company.name, locale: 'en_IN', type: 'website' },
    twitter: { card: 'summary', title: `${title} | ${company.name}`, description },
  };
}
