import Image from 'next/image';
import Link from 'next/link';
import { company } from '@/config/company';

export function Brand({ inverse = false }: { inverse?: boolean }) {
  const logo = inverse ? company.logo.dark : company.logo.light;
  return <Link className="brand" href="/" aria-label={`${company.name} home`}>
    <Image className="brand-image" src={logo} width={392} height={96} alt={company.name} unoptimized loading="eager" />
  </Link>;
}
