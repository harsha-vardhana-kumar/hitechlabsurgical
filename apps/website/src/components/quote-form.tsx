'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { ArrowUpRight, Download, Info } from 'lucide-react';
import type { QuoteRequest, QuoteResult } from '@hitech/types';
import { emptyQuote, validateQuote, type QuoteErrors } from '@/lib/quote';
import { enquiryTransport } from '@/services/enquiries';

const fields: { name: keyof QuoteRequest; label: string; type?: string; placeholder: string; autoComplete?: string }[] = [
  {name:'fullName',label:'Full name',placeholder:'Your full name',autoComplete:'name'},
  {name:'organisation',label:'Organisation name',placeholder:'Laboratory or institution',autoComplete:'organization'},
  {name:'phone',label:'Phone',type:'tel',placeholder:'Your contact number',autoComplete:'tel'},
  {name:'email',label:'Email',type:'email',placeholder:'you@organisation.com',autoComplete:'email'},
  {name:'city',label:'City',placeholder:'Your city',autoComplete:'address-level2'},
  {name:'quantity',label:'Quantity',placeholder:'e.g. 10 boxes or 50 units'},
  {name:'product',label:'Product / product category',placeholder:'What are you looking for?'},
];

export function QuoteForm() {
  const params = useSearchParams();
  const selectedProduct = (params.get('product') || params.get('category') || '').slice(0,200);
  return <QuoteFormBody key={selectedProduct} initialProduct={selectedProduct} />;
}

function QuoteFormBody({ initialProduct }: { initialProduct: string }) {
  const [values, setValues] = useState<QuoteRequest>({...emptyQuote,product:initialProduct});
  const [errors, setErrors] = useState<QuoteErrors>({});
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const change = (name: keyof QuoteRequest, value: string) => {setValues(previous => ({...previous,[name]:value}));setErrors(previous => ({...previous,[name]:undefined}));};
  const download = () => {
    if (result?.status !== 'preview') return;
    const url = URL.createObjectURL(new Blob([result.summary], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'hitech-enquiry-draft.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  };
  return <form className="enquiry-form" ref={form} noValidate onSubmit={async event => {
    event.preventDefault(); const nextErrors = validateQuote(values); setErrors(nextErrors); setFailure('');
    if (Object.keys(nextErrors).length) { const first = Object.keys(nextErrors)[0]; form.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus(); return; }
    setSubmitting(true);
    try { setResult(await enquiryTransport.submit(values)); requestAnimationFrame(() => resultHeading.current?.focus()); }
    catch { setFailure('We could not prepare your enquiry. Your details are still here; please try again.'); }
    finally {setSubmitting(false);}
  }}>
    <div className="form-heading"><h2>Your requirements, in a few details.</h2><p>Fields marked with * are required.</p></div>
    <div className="preview-notice"><Info size={18} aria-hidden="true" /><p><strong>Enquiry preview</strong>This form prepares a draft for you to download. Online sending is not active yet, so your enquiry will not reach our team from this preview.</p></div>
    {result?.status === 'preview' ? <div className="quote-result"><h3 tabIndex={-1} ref={resultHeading}>Your enquiry draft is ready.</h3><p>Nothing has been sent. Download your draft to keep these requirements, or edit the details below.</p><pre className="quote-summary">{result.summary}</pre><div className="button-row"><button type="button" className="button button-primary" onClick={download}>Download enquiry draft <Download size={17} aria-hidden="true" /></button></div><button type="button" className="edit-quote" onClick={() => {setResult(null);requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('[name="fullName"]')?.focus());}}>Edit my details</button></div> : <><div className="form-grid">{fields.map(field => <div className={`form-field${field.name === 'product' ? ' form-field-full' : ''}`} key={field.name}><label htmlFor={`quote-${field.name}`}>{field.label} <span aria-hidden="true">*</span></label><input id={`quote-${field.name}`} name={field.name} type={field.type || 'text'} required maxLength={200} autoComplete={field.autoComplete} placeholder={field.placeholder} value={values[field.name]} onChange={event => change(field.name,event.target.value)} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `error-${field.name}` : undefined} />{errors[field.name] && <p id={`error-${field.name}`} className="field-error">{errors[field.name]}</p>}</div>)}<div className="form-field form-field-full"><label htmlFor="quote-message">Message <span>(optional)</span></label><textarea id="quote-message" name="message" maxLength={2000} value={values.message} placeholder="Tell us about preferred brands, specifications, pack sizes or other requirements. Please do not include patient information." onChange={event => change('message',event.target.value)} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'error-message' : undefined} />{errors.message && <p id="error-message" className="field-error">{errors.message}</p>}</div></div><p className="form-help">Your details stay in this page while you prepare your draft. Please read our <Link href="/privacy">privacy notice</Link>. Do not include patient records or medical information.</p>{failure && <p role="alert" className="form-error">{failure}</p>}<button type="submit" className="button button-primary form-submit" disabled={submitting}>{submitting ? 'Preparing your draft…' : 'Request a Quote'}<ArrowUpRight size={18} aria-hidden="true" /></button></>}
  </form>;
}
