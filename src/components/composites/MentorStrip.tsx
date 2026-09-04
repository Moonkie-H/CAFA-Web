import type { CSSProperties } from 'react';

import { Media } from '@/components/primitives/Media';
import { Text } from '@/components/primitives/Text';
import { scenes, sceneAttrs } from '@/lib/choreography';
import type { Locale, Mentor } from '@/lib/types';

import styles from './MentorStrip.module.css';

/**
 * --strip-plate-inline is max(15rem, 40vw), and 600px is exactly where those two
 * cross — so this is that token restated in the one syntax that cannot read it.
 */
const SIZES = '(min-width: 600px) 40vw, 15rem';

/** How many hairlines the strip's scroll rule is drawn with. */
const LINES = 28;
/** And how many of them either side of the pan are lifted to full length. */
const REACH = 3.5;

interface MentorStripProps {
  mentors: readonly Mentor[];
  locale: Locale;
  title: string;
  className?: string;
}

/**
 * The mentors, sideways. MOTION.md §5.2 and the §5.5 audit's "about — filmstrip:
 * pin-scrub + pan".
 *
 * The section holds the screen while the strip travels across it, so vertical
 * scrolling reads the faces from left to right. It is the one figure on the site
 * that changes the *axis* of the reading, which is why About gets it: the page
 * is otherwise a column of prose and a grid of projects, and a row of portraits
 * read across is the one thing on it that is a group rather than a list.
 *
 * A face without a name is decoration, so every plate carries one: the portrait,
 * then who it is, what they work in, and the line the studio wrote about them.
 * That caption is the whole difference between this and a contact sheet, and it
 * is why the plate is a <figure>.
 *
 * It is not Gallery. That one is a full-bleed vertical column of photographs,
 * one at a time with a lot of paper between them; this is a single row of
 * people read across a pinned window. They
 * share nothing — no images, no layout, no props, no motion — and the third use
 * is what earns an abstraction, not the second (CLAUDE.md §5).
 *
 * Everything moving is the pan on one element, plus the rule below it. No
 * 'use client': the pin, the travel and the fallbacks are all CSS, so this ships
 * nothing.
 */
export function MentorStrip({
  mentors,
  locale,
  title,
  className,
}: MentorStripProps) {
  return (
    // The section is the track and the window inside it is what sticks. No class
    // of its own, because everything a track has — its height, its timeline —
    // comes from the trigger; the only thing the page has to say about it is the
    // space above it. The window's *content* is the one thing the trigger drives,
    // which is why the rule beside it is marked [data-still]: furniture, held
    // against the window rather than carried across it (triggers.css).
    <section className={className} {...sceneAttrs(scenes.mentorStrip)}>
      <div className={styles.window} data-pinned="">
        <div className={styles.track}>
          {/* First on the strip rather than fixed above it: the label introduces
              the group and then leaves with it, which is what a chapter mark on
              a filmstrip does. It is also this section's heading in the outline,
              with each mentor's name an h3 under it. */}
          <Text role="label" as="h2" className={styles.title}>
            {title}
          </Text>
          {mentors.map((mentor) => (
            <figure key={mentor.slug} className={styles.plate}>
              <Media image={mentor.portrait} locale={locale} sizes={SIZES} />
              <figcaption className={styles.caption}>
                <Text role="index" as="h3">
                  {mentor.name[locale]}
                </Text>
                <Text role="meta" className={styles.discipline}>
                  {mentor.discipline[locale]}
                </Text>
                {/* The line the studio writes about each person, which until now
                    was a required field on the record with nowhere on the site
                    to appear. A face and a discipline is a contact sheet; the
                    sentence is what makes the plate a caption. */}
                <Text role="meta" className={styles.note}>
                  {mentor.note[locale]}
                </Text>
              </figcaption>
            </figure>
          ))}
        </div>
        <StripRule />
      </div>
    </section>
  );
}

/**
 * How far along the strip the pan has got — the margin's scroll rule
 * (components/motion/ScrollTicks) turned on its side and pointed at this one
 * figure instead of at the document.
 *
 * The strip is the site's one horizontal reading, and horizontal travel under
 * vertical scroll is exactly the motion a reader has no built-in indicator for:
 * the scrollbar is measuring the page, not the row. So the same instrument is
 * laid under the plates, where it appears as the section takes the screen and
 * leaves with it — chrome for the length of one figure, and nothing before or
 * after it.
 *
 * The figure is the vertical one's: the lines never move, only their length
 * does, so what crosses the band is a swell rather than a bar filling up. What
 * it *cannot* borrow is the measurement — and does not need to. ScrollTicks has
 * to find its key points in the layout because only the DOM knows where a
 * programme sits; here the quantity being drawn is the pin's own progress, which
 * is a timeline, so every line is one `contain`-ranged animation on `--pin` and
 * this renders once, on the server, and ships nothing.
 */
function StripRule() {
  return (
    // Decorative: it says what the plates moving under it already say, and it
    // cannot be reached or operated. [data-still] keeps the scene's `pan` off it.
    <div className={styles.rule} data-still="" aria-hidden="true">
      {Array.from({ length: LINES }, (_, line) => (
        <span key={line} className={styles.tick} style={lens(line / (LINES - 1))} />
      ))}
    </div>
  );
}

/**
 * The slice of the pinned span one line answers to: its own position along the
 * band, give or take the reach. The two at each end fall outside 0–100% on
 * purpose — the first line has to already stand at full length at the frame the
 * pan begins, so its range has to open before the pin does.
 */
function lens(at: number): CSSProperties {
  const reach = REACH / (LINES - 1);
  return {
    animationRangeStart: `contain ${percent(at - reach)}%`,
    animationRangeEnd: `contain ${percent(at + reach)}%`,
  };
}

function percent(fraction: number): string {
  return (fraction * 100).toFixed(3);
}
