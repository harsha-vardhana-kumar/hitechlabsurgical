import type { Category } from '@hitech/types';

export const categories: readonly Category[] = [
  { id: 'laboratory-equipment', name: 'Laboratory Equipment', shortName: 'Equipment', description: 'Essential instruments for everyday laboratory work.', image: '/images/laboratory.webp' },
  { id: 'lab-consumables', name: 'Lab Consumables', shortName: 'Consumables', description: 'The everyday essentials that keep your lab moving.', image: '/images/consumables.webp' },
  { id: 'diagnostic-reagents', name: 'Diagnostic Reagents', shortName: 'Diagnostic reagents', description: 'Explore serology, immunology and specialist testing supplies.', image: '/images/reagents.webp' },
  { id: 'rapid-test-kits', name: 'Rapid Test Kits', shortName: 'Test kits', description: 'Enquire about available testing formats and kits.', image: '/images/reagents.webp' },
  { id: 'sample-collection', name: 'Sample Collection Products', shortName: 'Sample collection', description: 'Containers and collection essentials for your facility.', image: '/images/consumables.webp' },
  { id: 'clinical-chemistry', name: 'Clinical Chemistry Products', shortName: 'Clinical chemistry', description: 'Reagents and supplies for clinical chemistry workflows.', image: '/images/reagents.webp' },
  { id: 'hematology', name: 'Hematology Products', shortName: 'Hematology', description: 'Hematology supplies, including the Erba H360 range.', image: '/images/reagents.webp' },
  { id: 'urinalysis', name: 'Urinalysis Products', shortName: 'Urinalysis', description: 'Enquire about urine testing supplies and formats.', image: '/images/consumables.webp' },
  { id: 'laboratory-accessories', name: 'Laboratory Accessories', shortName: 'Accessories', description: 'Practical stands and holders for your workspace.', image: '/images/consumables.webp' },
  { id: 'surgical-medical', name: 'Surgical & Medical Supplies', shortName: 'Surgical & medical', description: 'Selected instruments and medical supply enquiries.', image: '/images/laboratory.webp' },
];

export function getCategory(id: string) { return categories.find(category => category.id === id); }
