import type { QuoteRequest } from '@hitech/types';

export type QuoteErrors = Partial<Record<keyof QuoteRequest, string>>;
export const emptyQuote: QuoteRequest = { fullName: '', organisation: '', phone: '', email: '', city: '', product: '', quantity: '', message: '' };
export function validateQuote(values: QuoteRequest): QuoteErrors {
  const errors: QuoteErrors = {};
  const required: (keyof QuoteRequest)[] = ['fullName', 'organisation', 'phone', 'email', 'city', 'product', 'quantity'];
  for (const key of required) if (!values[key].trim()) errors[key] = 'Please complete this field.';
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (values.phone.trim() && (!/^[+\d\s().-]+$/.test(values.phone) || values.phone.replace(/\D/g, '').length < 7 || values.phone.replace(/\D/g, '').length > 15)) errors.phone = 'Enter a phone number with 7–15 digits.';
  for (const [key, value] of Object.entries(values)) if (value.length > (key === 'message' ? 2000 : 200)) errors[key as keyof QuoteRequest] = 'Please shorten this field.';
  if (/^-?\d+(\.\d+)?$/.test(values.quantity.trim()) && Number(values.quantity) <= 0) errors.quantity = 'Enter a quantity greater than zero.';
  return errors;
}

export function formatQuote(values: QuoteRequest) {
  return [
    'HITECH LAB & SURGICAL SOLUTIONS — ENQUIRY DRAFT',
    'This draft has not been sent. Product availability and specifications are subject to confirmation.',
    '', `Name: ${values.fullName.trim()}`, `Organisation: ${values.organisation.trim()}`,
    `Phone: ${values.phone.trim()}`, `Email: ${values.email.trim()}`, `City: ${values.city.trim()}`,
    `Product / category: ${values.product.trim()}`, `Quantity: ${values.quantity.trim()}`, '',
    `Message: ${values.message.trim() || 'Not provided'}`,
  ].join('\n');
}
