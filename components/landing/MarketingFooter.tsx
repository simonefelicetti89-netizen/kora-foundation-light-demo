// MarketingFooter — shared footer for KORA marketing pages (/ and /pilot).

import Link from 'next/link';
import { KoraLogo } from '@/components/brand/KoraLogo';
import styles from './marketing.module.css';

interface MarketingFooterProps {
  meth?: string;
}

const DEFAULT_METH =
  'KORA misura organizzazioni, non individui · pre_empirical_calibration · organization-level only · evidence-based';

export function MarketingFooter({ meth = DEFAULT_METH }: MarketingFooterProps) {
  return (
    <footer className={styles.foot}>
      <div className={styles.footInner}>
        <Link href="/" aria-label="KORA">
          <KoraLogo variant="on-light" className="h-[24px] w-auto opacity-60" />
        </Link>
        <p className={styles.footMeth}>{meth}</p>
      </div>
    </footer>
  );
}
