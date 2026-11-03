'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="empty"><h1>This screen could not be loaded</h1><p>Your saved records are unchanged. Please try again.</p><button className="button" onClick={reset}>Try again</button></section>;}
