import Link from 'next/link';
export default function NotFound() {return <div className="container not-found"><p className="eyebrow">PAGE NOT FOUND</p><h1>Let’s get you back to the essentials.</h1><p>The page or product you’re looking for could not be found.</p><Link href="/products" className="button button-primary">Browse products</Link></div>;}
