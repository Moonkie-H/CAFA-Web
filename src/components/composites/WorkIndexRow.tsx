import Link from 'next/link';
import type { ReactNode } from 'react';

import { Focus } from '@/components/motion/Focus';
import { MediaFrame } from '@/components/primitives/MediaFrame';
import { Text } from '@/components/primitives/Text';
import { scenes } from '@/lib/choreography';
import { cx } from '@/lib/class-names';
import type { ImageEntry } from '@/lib/media';
import { routes } from '@/lib/routes';
import type { Locale, WorkListing } from '@/lib/types';
import { vtName } from '@/lib/vt-names';

import styles from './WorkIndexRow.module.css';

interface WorkIndexRowProps {
  work: WorkListing;
  locale: Locale;
  statusLabel: string;
  /** null for a private work, which publishes no cover. */
  cover: ImageEntry | null;
  /**
   * The first row that has a cover. On a touch device that cover is in the
   * initial viewport and is the LCP element, so it is fetched eagerly; on a
   * pointer device it is the one image the hover backdrop is most likely to
   * want first, so the fetch is not wasted there either.
   */
  priority?: boolean;
  /**
   * Whether this row's inline cover is the one a navigation should carry. Only
   * ever true where there is no hover backdrop — on a pointer device the inline
   * cover is display: none and the backdrop holds the name instead.
   */
  morphing?: boolean;
  /** Reports which cover the backdrop should show; null on leaving the row. */
  onPreview: (slug: string | null) => void;
  /** Reports the row a press has committed to. See WorkIndex. */
  onChoose: (slug: string) => void;
}

export function WorkIndexRow({
  work,
  locale,
  statusLabel,
  cover,
  priority,
  morphing,
  onPreview,
  onChoose,
}: WorkIndexRowProps) {
  /*
   * The hue the row's band takes, or null for a private work, a monochrome
   * photograph, or a cover the admin has not measured — all three of which get
   * the neutral band rather than a special case. Published as a custom property
   * because it is a value, not a state: the colour is composed in the
   * stylesheet out of it and two tokens, so this file never names one.
   */
  const tint = cover?.tint ?? null;

  const contents = (
    <RowContents
      work={work}
      locale={locale}
      statusLabel={statusLabel}
      cover={cover}
      priority={priority}
      morphing={morphing}
    />
  );

  return (
    // The <li> is a child of the batch on the list (WorkIndex): it assembles as
    // the list scrolls in — MOTION.md §5.5 — rather than each row revealing on
    // its own timeline. That is why there is no per-row wrapper here.
    <li className={styles.row}>
      {work.status === 'private' ? (
        // DESIGN-SYSTEM.md §7: not a link at all, rather than a disabled one.
        <span className={styles.link} data-private="">
          {contents}
        </span>
      ) : (
        <Link
          href={routes.work(locale, work.slug)}
          className={styles.link}
          data-tinted={tint === null ? undefined : ''}
          style={tint === null ? undefined : { '--tint-h': tint }}
          onPointerEnter={() => onPreview(work.slug)}
          onPointerLeave={() => onPreview(null)}
          onPointerDown={() => onChoose(work.slug)}
          onFocus={() => onPreview(work.slug)}
          onBlur={() => onPreview(null)}
        >
          {contents}
        </Link>
      )}
    </li>
  );
}

/** Private in this file: the two branches above differ only in their wrapper. */
function RowContents({
  work,
  locale,
  statusLabel,
  cover,
  priority,
  morphing,
}: Omit<WorkIndexRowProps, 'onPreview' | 'onChoose'>): ReactNode {
  return (
    <>
      {cover !== null && (
        // Shown only where there is no hover backdrop, hidden by CSS elsewhere,
        // and lazy — so a pointer device never fetches it.
        //
        // The focus curve goes on a wrapper rather than on the <picture>, and it
        // has to: the picture may be carrying a per-slug view-transition-name,
        // and a named element that is also running a scroll-driven transform is
        // captured mid-scale — the morph would then start from whatever size the
        // scroll happened to leave it at. Separating them means the row's cover
        // scales as it passes *and* hands a clean rectangle to the navigation.
        //
        // .cover moves to the wrapper with the grid placement it carries, so the
        // scene is the grid child and the display: none that hides this whole
        // branch on a pointer device still hides all of it.
        <Focus depth={scenes.worksRowCover.depth} className={styles.cover}>
          <MediaFrame
            entry={cover}
            frame={work.cover.frame}
            alt={work.cover.alt === '' ? '' : work.cover.alt[locale]}
            sizes="(min-width: 768px) 46vw, 92vw"
            priority={priority}
            className={morphing === true ? styles.morphing : undefined}
            // The per-slug morph name, only on the row a press has committed to.
            // The `cover` class it needs comes with .morphing in the module.
            style={morphing === true ? { viewTransitionName: vtName.cover(work.slug) } : undefined}
          />
        </Focus>
      )}
      <span className={styles.line}>
        {/* On the chosen row the number carries the per-slug rail name, so it
            travels into its slot in the compressed column while the rest of the
            row crossfades away — MOTION.md §7, "the clicked entry travels". */}
        <Text
          role="meta"
          as="span"
          className={cx(styles.number, morphing === true && styles.railEntry)}
          style={
            morphing === true ? { viewTransitionName: vtName.railEntry(work.slug) } : undefined
          }
        >
          {String(work.index).padStart(3, '0')}
        </Text>
        <Text role="index" as="span" className={styles.title}>
          {work.title[locale]}
        </Text>
        <span className={styles.discipline}>
          {work.discipline.map((discipline) => (
            <Text key={discipline.en} role="meta" as="span">
              {discipline[locale]}
            </Text>
          ))}
        </span>
        <span className={styles.status}>
          <Text role="meta" as="span">
            {work.year}
          </Text>
          <Text role="meta" as="span">
            {statusLabel}
          </Text>
        </span>
      </span>
    </>
  );
}
