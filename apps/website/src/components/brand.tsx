import Image from 'next/image';
import Link from 'next/link';
import { Wordmark } from '@hitech/ui';
import { company } from '@/config/company';

export function Brand({ inverse = false }: { inverse?: boolean }) {
  const logo = inverse ? company.logo.dark : company.logo.light;
  return <Link className="brand" href="/" aria-label={`${company.name} home`}>
    {logo ? <Image src={logo} width={200} height={56} alt={company.name} /> : <Wordmark inverse={inverse} />}
  </Link>;
}
