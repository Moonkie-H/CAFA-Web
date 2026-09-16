import Link from 'next/link';

import { Text } from '@/components/primitives/Text';
import { scenes, sceneAttrs } from '@/lib/choreography';
import { cx } from '@/lib/class-names';
import { routes } from '@/lib/routes';
import type { Locale, Work } from '@/lib/types';

import styles from './WorkPager.module.css';

interface WorkPagerProps {
  locale: Locale;
  previous: Work | null;
  next: Work | null;
  labels: { previous: string; next: string };
  navLabel: string;
  className?: string;
}

export function WorkPager({
  locale,
  previous,
  next,
  labels,
  navLabel,
  className,
}: WorkPagerProps) {
  return (
    // The way out of a work and nothing else. It used to carry the site's footer
    // note between its two links and suppress the real footer, which made the
    // one page on the site whose ending did not look like every other page's:
    // five lines of address collapsed onto one, squeezed between two links that
    // had a third of the room they were drawn for. The footer is the footer
    // everywhere now, and this is two links.
    <nav
      aria-label={navLabel}
      className={cx(styles.pager, className)}
      {...sceneAttrs(scenes.workPager)}
    >
      <Step locale={locale} work={previous} label={labels.previous} />
      <Step locale={locale} work={next} label={labels.next} align="end" />
    </nav>
  );
}

/**
 * Renders an empty cell rather than nothing when there is no neighbour, so the
 * remaining link stays on the side it belongs to. The ends do not wrap.
 */
function Step({
  locale,
  work,
  label,
  align,
}: {
  locale: Locale;
  work: Work | null;
  label: string;
  align?: 'end';
}) {
  if (work === null) return <div />;

  return (
    <Link
      href={routes.work(locale, work.slug)}
      className={styles.step}
      data-align={align}
      rel={align === 'end' ? 'next' : 'prev'}
    >
      <Text role="label" as="span" className={styles.label}>
        {label}
      </Text>
      <Text role="index" as="span">
        {work.title[locale]}
      </Text>
    </Link>
  );
}
