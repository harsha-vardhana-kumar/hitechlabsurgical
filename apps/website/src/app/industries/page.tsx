import { Microscope, Hospital, Stethoscope, Dna, GraduationCap, Pill } from 'lucide-react';
import { Breadcrumbs, PageIntro, QuoteCta, TextLink } from '@/components/common';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('Industries We Serve', 'Laboratory supply procurement for diagnostic laboratories, hospitals, clinics, research, education and pharmaceutical organisations.', '/industries');
const industries = [
  { name:'Diagnostic laboratories', icon:Microscope, text:'Source routine consumables, clinical chemistry reagents, testing supplies and sample collection products for your laboratory requirements.', category:'clinical-chemistry' },
  { name:'Hospitals & healthcare institutions', icon:Hospital, text:'Bring laboratory, collection and selected medical supply requirements together in one institutional procurement enquiry.', category:'sample-collection' },
  { name:'Clinics', icon:Stethoscope, text:'Discuss collection containers, consumables and testing supply requirements suited to your facility’s approved workflows.', category:'sample-collection' },
  { name:'Research institutions', icon:Dna, text:'Enquire about laboratory instruments, pipettes, glassware and everyday consumables for research workspaces.', category:'laboratory-equipment' },
  { name:'Colleges & universities', icon:GraduationCap, text:'Plan laboratory equipment and consumable procurement for teaching laboratories and practical learning spaces.', category:'lab-consumables' },
  { name:'Pharmaceutical & life sciences', icon:Pill, text:'Share your laboratory consumable, reagent and accessory requirements for quotation against your approved specifications.', category:'diagnostic-reagents' },
];
export default function IndustriesPage() {
  return <><div className="page-banner"><div className="container"><Breadcrumbs items={[{label:'Industries'}]} /><PageIntro eyebrow="INDUSTRIES WE SERVE" title="Supporting the places where progress happens.">Every facility works differently. We bring a clear, practical approach to laboratory and diagnostic procurement across disciplines.</PageIntro></div></div><section className="container industry-cards" aria-label="Industries served">{industries.map(item => <article className="industry-card" key={item.name}><item.icon size={34} strokeWidth={1.4} aria-hidden="true" /><h2>{item.name}</h2><p>{item.text}</p><TextLink href={`/products?category=${item.category}`}>Explore relevant products</TextLink></article>)}</section><QuoteCta /><div className="h-16" /></>;
}
