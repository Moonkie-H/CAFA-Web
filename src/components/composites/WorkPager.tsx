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
    // The way out of a work and nothing else, and the end of the page with it:
    // data-page-close is a contract with SiteFooter, not decoration — this block
    // draws the rule that closes a work, so the site footer stands down rather
    // than drawing a second one a screen below it.
    //
    // It used to carry the footer's note between its two links as well, which
    // left five lines of address collapsed onto one and squeezed between two
    // links that had a third of the room they were drawn for. The note is not
    // here in any form now; it is in the contact card, where it is asked for,
    // and this is two links.
    <nav
      aria-label={navLabel}
      className={cx(styles.pager, className)}
      data-page-close=""
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
