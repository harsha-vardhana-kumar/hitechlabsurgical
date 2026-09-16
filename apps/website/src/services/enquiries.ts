import type { QuoteTransport } from '@hitech/types';
import { formatQuote, validateQuote } from '../lib/quote';

// Safe Vercel-preview adapter: no network request, PII logging, or browser storage.
// Replace this transport with a server-backed API integration when approved.
export const enquiryTransport: QuoteTransport = {
  async submit(request) {
    if (Object.keys(validateQuote(request)).length) throw new Error('Please check the highlighted fields.');
    return { status: 'preview', summary: formatQuote(request) };
  },
};
