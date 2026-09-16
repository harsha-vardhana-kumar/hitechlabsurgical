import { Suspense } from 'react';
import { Breadcrumbs, PageIntro } from '@/components/common';
import { ContactDetails } from '@/components/footer';
import { QuoteForm } from '@/components/quote-form';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('Contact & Request a Quote', 'Tell Hitech Lab & Surgical Solutions about your laboratory and diagnostic supply requirements. Prepare a product quotation enquiry for your organisation.', '/contact');
export default function ContactPage() {
  return <><div className="page-banner"><div className="container"><Breadcrumbs items={[{label:'Contact'}]} /><PageIntro eyebrow="LET’S TALK PROCUREMENT" title="Tell us what you’re looking for.">A single product, routine supplies or a complete requirement list. Start your enquiry with the details that matter to your facility.</PageIntro></div></div><div className="container contact-layout"><aside className="contact-aside"><h2>A clearer path from requirement to quotation.</h2><p>Include your organisation, product names and quantities. Preferred brands or instrument models help us understand your requirement.</p><ol className="contact-steps"><li><span>01</span><div><h3>Share your requirements</h3><p>Tell us which products and quantities you need.</p></div></li><li><span>02</span><div><h3>Confirm the details</h3><p>Brands, pack sizes and specifications are checked during quotation.</p></div></li><li><span>03</span><div><h3>Plan your procurement</h3><p>Discuss availability and fulfilment before confirming an order.</p></div></li></ol><ContactDetails /></aside><Suspense fallback={<div role="status">Loading enquiry form…</div>}><QuoteForm /></Suspense></div></>;
}
