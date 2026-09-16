'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Brand } from './brand';

const navigation = [{ href: '/', name: 'Home' }, { href: '/products', name: 'Products' }, { href: '/about', name: 'About Us' }, { href: '/industries', name: 'Industries' }, { href: '/contact', name: 'Contact' }];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const active = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  return <header className="site-header" onKeyDown={event => { if (event.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); } }}>
    <div className="container header-inner">
      <Brand />
      <nav className="desktop-nav" aria-label="Main navigation">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined}>{item.name}</Link>)}</nav>
      <Link className="button button-primary header-quote" href="/contact">Request a Quote <ArrowUpRight size={17} aria-hidden="true" /></Link>
      <button className="menu-toggle" type="button" ref={toggle} aria-controls="mobile-navigation" aria-expanded={open} aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    </div>
    <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation" hidden={!open}>
      {navigation.map(item => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined} onClick={() => setOpen(false)}>{item.name}<ArrowUpRight size={16} aria-hidden="true" /></Link>)}
      <Link className="button button-primary" href="/contact" onClick={() => setOpen(false)}>Request a Quote</Link>
    </nav>
  </header>;
}
