import Link from 'next/link';
import { ArrowRight, ArrowUpRight, ChevronRight, MessageCircle } from 'lucide-react';
import { company } from '@/config/company';
import type { ReactNode } from 'react';

export function QuoteCta() {
  return <section className="container procurement-wrap"><div className="procurement-cta"><div><p className="eyebrow">YOUR NEXT PROCUREMENT, SIMPLIFIED</p><h2>One conversation.<br />Your laboratory’s next step.</h2><p>From a single requirement to a full facility supply list,<br className="desktop-break" /> let’s put together a quotation that works for you.</p></div><div className="procurement-action"><Link className="button button-white" href="/contact">Request a Quote <ArrowUpRight size={19} aria-hidden="true" /></Link><span>For laboratories, healthcare &amp; research.</span></div></div></section>;
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return <nav aria-label="Breadcrumb" className="breadcrumbs"><ol><li><Link href="/">Home</Link></li>{items.map((item, i) => <li key={`${item.label}-${i}`}><ChevronRight size={14} aria-hidden="true" />{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>;
}

export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <div className="page-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{children}</p></div>;
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="text-link" href={href}>{children}<ArrowRight size={17} aria-hidden="true" /></Link>;
}

export function WhatsAppLink() {
  if (!company.whatsapp) return null;
  return <a className="whatsapp-link" href={`https://wa.me/${company.whatsapp}?text=${encodeURIComponent('Hello, I would like to enquire about laboratory supplies.')}`} target="_blank" rel="noopener noreferrer" aria-label="Enquire on WhatsApp (opens in a new tab)"><MessageCircle size={23} aria-hidden="true" /><span>Enquire</span></a>;
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
