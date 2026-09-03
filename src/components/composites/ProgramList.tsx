import { itemClass } from '@/components/motion/Part';
import { Text } from '@/components/primitives/Text';
import { scenes, sceneAttrs } from '@/lib/choreography';
import { cx } from '@/lib/class-names';
import type { Locale, Program } from '@/lib/types';
import { vtName } from '@/lib/vt-names';

import styles from './ProgramList.module.css';

interface ProgramListProps {
  programs: readonly Program[];
  locale: Locale;
  className?: string;
}

/**
 * The big.dk gutter-label pattern: the name and its particulars sit small and
 * right-aligned in the gutter, the prose runs beside them, and a hairline opens
 * each entry. DESIGN-SYSTEM.md §5.
 *
 * It is a `stack` scene, which is the whole difference between this page and the
 * flat list it was. Each entry gets a track of its own, rises into the screen,
 * catches at the pinned offset, holds still while it is read, then dims and
 * lifts away as the next comes up into the place it left — MOTION.md §5.5's
 * "programmes: pin-scrub", applied down a list instead of to one section. There
 * are only four of them and each one asks something of the reader, which the
 * copy says out loud; giving each a screen is that sentence in motion rather
 * than a decoration on top of it.
 *
 * Below --bp-md the pin is dropped and this is a list in flow again (the trigger
 * holds it back). A deck that spends 140svh an entry is scroll a phone cannot
 * afford, and the entries still assemble as they arrive, so the figure survives
 * at the size the pin does not.
 */
export function ProgramList({ programs, locale, className }: ProgramListProps) {
  return (
    // The scene that drives its children, and — when PageSections has given this
    // section the role — the page's `listing` part, which arrives as a class. A
    // route change carries the sheet; the entries on it are named separately
    // below and travel one after another, which is what makes the list unzip
    // rather than slide as a block. MOTION.md §3.
    <ul className={cx(styles.list, className)} {...sceneAttrs(scenes.programmes)}>
      {programs.map((program, index) => (
        // The <li> is the track: it carries the timeline the entry inside it is
        // driven by, and it is never the sticky one — a stuck element's view
        // progress freezes over exactly the frames the figure needs to measure.
        //
        // It is also the entry's key point on the scroll rule (data-stop, read
        // by components/motion/ScrollTicks) — and for the same reason it is the
        // track that carries the timeline: the block inside it is pinned, so its
        // box says where the scroll is rather than where the entry lives.
        <li
          key={program.slug}
          className={itemClass(index)}
          data-stop=""
          style={{ viewTransitionName: vtName.item(program.slug) }}
        >
          <article className={styles.entry} data-stuck="">
            {/* Three children, and the count is load-bearing: the stack trigger
                staggers them a beat apart along the track's timeline, so the
                entry assembles as it rises instead of arriving already made. */}
            {/* `index` rather than `meta`: this is the running number, which is
                the role's whole reason for existing, and at 11px beside a
                heading it read as a footnote on the entry rather than as its
                number. 13px is what the works index sets the same figure at. */}
            <Text role="index" as="p" className={styles.index}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <div className={styles.gutter}>
              {/* And the name is a heading, not a gutter label. It was set in
                  `label` — 11px, tracked wide — which is the type the nav is
                  set in; on a page that gives each programme a whole screen,
                  the one thing naming that screen cannot be the smallest type
                  on it. `body` keeps it a quiet line and makes it a readable
                  one. Its particulars stay in `meta` underneath, so the
                  ranged-right gutter still reads as a group. */}
              <Text role="body" as="h2" className={styles.name}>
                {program.name[locale]}
              </Text>
              <Text role="meta" className={styles.particular}>
                {program.audience[locale]}
              </Text>
              <Text role="meta" className={styles.particular}>
                {program.duration[locale]}
              </Text>
            </div>
            <Text role="body" className={styles.summary}>
              {program.summary[locale]}
            </Text>
          </article>
        </li>
      ))}
    </ul>
  );
}
