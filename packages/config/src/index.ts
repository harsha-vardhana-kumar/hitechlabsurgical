export const company = {
  name: 'Hitech Lab & Surgical Solutions',
  shortName: 'HITECH',
  domain: 'hitechlabsurgical.com',
  url: 'https://hitechlabsurgical.com',
  description: 'Laboratory equipment, diagnostic products, consumables and scientific supplies for healthcare, research and educational institutions.',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE?.trim() || '',
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL?.trim() || '',
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS?.trim() || '',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '') || '',
  // Replace with an approved local SVG under /public/brand when supplied.
  logo: { light: '', dark: '' },
  allowIndexing: process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true' && process.env.VERCEL_ENV !== 'preview',
} as const;
