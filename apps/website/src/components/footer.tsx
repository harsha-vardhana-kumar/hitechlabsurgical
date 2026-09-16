import Link from 'next/link';
import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import { Brand } from './brand';
import { company } from '@/config/company';

export function ContactDetails() {
  return <div className="contact-details">
    {company.phone && <a href={`tel:${company.phone.replace(/[^+\d]/g, '')}`}><Phone size={18} aria-hidden="true" />{company.phone}</a>}
    {company.email && <a href={`mailto:${company.email}`}><Mail size={18} aria-hidden="true" />{company.email}</a>}
    {company.address && <p><MapPin size={18} aria-hidden="true" />{company.address}</p>}
  </div>;
}

export function Footer() {
  return <footer className="site-footer"><div className="container">
    <div className="footer-grid">
      <div className="footer-brand"><Brand inverse /><p>Laboratory essentials.<br />Thoughtful procurement.<br />A dependable supply partner.</p></div>
      <div><h2>Explore</h2><nav aria-label="Footer navigation"><Link href="/">Home</Link><Link href="/products">Products</Link><Link href="/about">About Us</Link><Link href="/industries">Industries</Link><Link href="/contact">Contact</Link></nav></div>
      <div><h2>Product range</h2><nav aria-label="Product categories"><Link href="/products?category=laboratory-equipment">Laboratory equipment</Link><Link href="/products?category=lab-consumables">Lab consumables</Link><Link href="/products?category=diagnostic-reagents">Diagnostic reagents</Link><Link href="/products?category=sample-collection">Sample collection</Link><Link href="/products?category=hematology">Hematology</Link></nav></div>
      <div className="footer-enquiry"><h2>Let’s talk procurement</h2><p>Tell us what your facility needs.</p><Link className="footer-cta" href="/contact">Request a Quote <ArrowUpRight size={18} aria-hidden="true" /></Link><ContactDetails /></div>
    </div>
    <div className="footer-bottom"><p>© {new Date().getFullYear()} {company.name}</p><nav aria-label="Legal"><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms &amp; Conditions</Link></nav></div>
  </div></footer>;
}
