import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { JsonLd, WhatsAppLink } from '@/components/common';
import { company } from '@/config/company';
import './globals.css';

const manrope = localFont({ src: '../../public/fonts/manrope-latin.woff2', variable: '--font-manrope', display: 'swap', weight: '200 800' });

export const metadata: Metadata = {
  metadataBase: new URL(company.url),
  title: { default: `${company.name} | Laboratory & Diagnostic Supplies`, template: `%s | ${company.name}` },
  description: company.description,
  robots: { index: company.allowIndexing, follow: company.allowIndexing },
  icons: { icon: '/brand/favicon.svg', shortcut: '/brand/favicon.svg', apple: '/brand/apple-touch-icon.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth" className={manrope.variable}><body>
    <a className="skip-link" href="#main">Skip to content</a><Header /><main id="main">{children}</main><Footer /><WhatsAppLink />
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Organization', '@id': `${company.url}/#organization`, name: company.name, url: company.url, description: company.description, ...(company.phone ? { telephone: company.phone } : {}), ...(company.email ? { email: company.email } : {}) }} />
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${company.url}/#website`, name: company.name, url: company.url, publisher: { '@id': `${company.url}/#organization` } }} />
  </body></html>;
}
