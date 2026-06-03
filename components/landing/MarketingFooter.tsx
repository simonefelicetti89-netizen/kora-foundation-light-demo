// MarketingFooter — shared footer for KORA marketing pages (/ and /pilot).

import Image from 'next/image';
import Link from 'next/link';
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
          <Image
            src="/kora/logo-dark.png"
            alt="KORA"
            width={90}
            height={28}
            style={{ height: 22, width: 'auto', opacity: 0.55 }}
          />
        </Link>
        <p className={styles.footMeth}>{meth}</p>
      </div>
    </footer>
  );
}
