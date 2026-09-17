'use client';

import { useEffect, useRef, useState } from 'react';

import { HoverMediaLayer } from '@/components/motion/HoverMediaLayer';
import { scenes, sceneAttrs } from '@/lib/choreography';
import { durationMs } from '@/lib/css-duration';
import { variants, type ImageEntry } from '@/lib/media';
import type { Locale, WorkListing, WorkStatus } from '@/lib/types';
import { vtName } from '@/lib/vt-names';

import { WorkIndexRow } from './WorkIndexRow';
import styles from './WorkIndex.module.css';

interface WorkIndexProps {
  locale: Locale;
  works: readonly WorkListing[];
  /** Manifest entries keyed by slug. Resolved on the server so the client never
      receives the whole image manifest. Private works are absent. */
  covers: Record<string, ImageEntry>;
  statusLabels: Record<WorkStatus, string>;
  listLabel: string;
}

/**
 * The one substantial client component in the app. It holds a single piece of
 * state — which row is being previewed — and everything else is CSS reacting to
 * one data attribute. ARCHITECTURE.md §5.1.
 */
export function WorkIndex({ locale, works, covers, statusLabels, listLabel }: WorkIndexProps) {
  const [previewed, setPreviewed] = useState<string | null>(null);
  /**
   * The row a touch has committed to, which is not the same question as which
   * row is previewed. On a touch device `previewed` is already back to null by
   * the time the navigation starts — pointerleave fires when the finger lifts,
   * and the click that follows is what navigates — so the inline cover would
   * have lost its shared-element name before the browser took the snapshot.
   * Set on pointerdown; released one scene later.
   *
   * MOTION.md §0.4: it used to be "deliberately never cleared", but a name that
   * outlives its transition can end up on the page at the same moment the hover
   * backdrop claims the same identity on a hybrid device, and two elements
   * sharing a view-transition-name make the browser abort the whole transition.
   * A successful navigation unmounts this component and clears it; the timer is
   * the safety net for a gesture that does not navigate.
   */
  const [chosen, setChosen] = useState<string | null>(null);
  const releaseChosen = useRef<ReturnType<typeof setTimeout>>(undefined);
  const preloaded = useRef(false);

  useEffect(() => () => clearTimeout(releaseChosen.current), []);

  function choose(slug: string) {
    setChosen(slug);
    clearTimeout(releaseChosen.current);
    releaseChosen.current = setTimeout(() => setChosen(null), durationMs('--dur-scene', 700));
  }

  // The topmost row that publishes a cover: the LCP element on a touch device.
  const firstCover = works.find((work) => covers[work.slug] !== undefined)?.slug;

  /**
   * Covers are warmed when the pointer first reaches the list, not on load: a
   * visitor who never hovers never pays for them.
   */
  function preloadCovers() {
    if (preloaded.current) return;
    preloaded.current = true;

    const { connection } = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (connection?.saveData === true) return;

    for (const entry of Object.values(covers)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      // No `type`: the format is negotiated at the edge by `format=auto`, so
      // claiming AVIF here would be a promise this URL does not always keep.
      link.imageSrcset = variants(entry)
        .map((variant) => `${variant.src} ${variant.width}w`)
        .join(', ');
      link.imageSizes = '100vw';
      document.head.append(link);
    }
  }

  return (
    <div
      className={styles.index}
      onPointerEnter={(event) => {
        // A touch tap raises pointerenter too, and there is no backdrop to warm
        // on a touch device — its covers are already inline in the rows.
        if (event.pointerType === 'mouse') preloadCovers();
      }}
    >
      <HoverMediaLayer
        entry={previewed === null ? null : (covers[previewed] ?? null)}
        name={previewed === null ? undefined : vtName.cover(previewed)}
      />
      {/* data-previewing is a plain attribute, not a module class, so the rule
          that dims the siblings can live in WorkIndexRow.module.css next to the
          class it dims.

          data-page-close is a contract with SiteFooter rather than decoration:
          the rule under the last row is the rule that ends this page, so the
          site footer stands down instead of drawing a second one below it. */}
      <ul
        aria-label={listLabel}
        className={styles.list}
        data-page-close=""
        data-previewing={previewed === null ? undefined : ''}
        {...sceneAttrs(scenes.worksRows)}
      >
        {works.map((work) => (
          <WorkIndexRow
            key={work.slug}
            work={work}
            locale={locale}
            statusLabel={statusLabels[work.status]}
            cover={covers[work.slug] ?? null}
            priority={work.slug === firstCover}
            morphing={work.slug === chosen}
            onPreview={setPreviewed}
            onChoose={choose}
          />
        ))}
      </ul>
    </div>
  );
}
