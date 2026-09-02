import { Focus } from '@/components/motion/Focus';
import { Parallax } from '@/components/motion/Parallax';
import { itemClass } from '@/components/motion/Part';
import { Media } from '@/components/primitives/Media';
import { Text } from '@/components/primitives/Text';
import { scenes, sceneAttrs } from '@/lib/choreography';
import { cx } from '@/lib/class-names';
import type { Locale, Project } from '@/lib/types';
import { vtName } from '@/lib/vt-names';

import styles from './ProjectGrid.module.css';

/**
 * The three column counts the grid takes, restated in the one syntax that cannot
 * read a container query: one card across, then two, then three. The breakpoints
 * are the module's own --bp-sm and --bp-md, and `sizes` is measured against the
 * viewport where the grid is measured against its container — they agree because
 * this grid spans the page, and this is the line to revisit if it ever does not.
 */
const SIZES = '(min-width: 768px) 30vw, (min-width: 480px) 45vw, 92vw';

interface ProjectGridProps {
  projects: readonly Project[];
  locale: Locale;
  heading: string;
  className?: string;
}

/**
 * The projects at the foot of About: a picture, a name, and a line under it.
 *
 * This block used to be the works index read the other way round — the same
 * registry, drawn as covers instead of rows, under a heading that called them
 * projects. That was a shortcut with a reasonable story behind it ("the projects
 * are the evidence") and it was wrong in the way shortcuts usually are: the
 * studio could not put anything under that heading that was not a work, and
 * could not keep a work off it. Projects are their own records now, and this
 * draws those.
 *
 * So it is not WorkGrid renamed, and the difference is what a card *is*. A work
 * card was a link — it had a page to open, and a number, a year and a list of
 * disciplines to carry there. A project has none of that: what there is to know
 * about one is the photograph and the line beside it, and there is nowhere to go
 * afterwards. A `figure` rather than an `a`, and a caption rather than a row of
 * particulars.
 *
 * No projects is no section — heading included — rather than a heading over an
 * empty frame. The collection starts empty and the studio fills it in its own
 * time; a page that is shorter until then is the honest form of that.
 *
 * Server-rendered throughout. Nothing here holds state, so this ships nothing.
 */
export function ProjectGrid({ projects, locale, heading, className }: ProjectGridProps) {
  if (projects.length === 0) return null;

  return (
    // The `listing` part arrives as a class from the page — taken at the section
    // rather than at the grid, so the h2 travels with the cards it labels
    // instead of being left on the surface. Which block holds the role is the
    // page's question, not this component's: two elements sharing a
    // view-transition-name abort the transition, and only the page knows what
    // else is on it.
    <section className={cx(styles.section, className)}>
      <Text role="label" as="h2" className={styles.heading}>
        {heading}
      </Text>
      {/* The container, not the viewport, decides how many columns: the grid is
          the same component whether it sits full width or in a narrower one. It
          is also the batch — each card rises in as the grid scrolls in,
          staggered by column. MOTION.md §5.5. */}
      <ul className={styles.grid} {...sceneAttrs(scenes.projectCards)}>
        {projects.map((project, index) => (
          // Each card is an item: named, so a route change moves it on its own
          // rather than sliding the whole grid as one rectangle, and stepped, so
          // they arrive in sequence. Because the stagger runs in DOM order
          // across three columns, it reads as a diagonal. MOTION.md §3.
          <li
            key={project.slug}
            className={itemClass(index)}
            style={{ viewTransitionName: vtName.item(project.slug) }}
          >
            <figure className={styles.card}>
              {/* Focus outside, Parallax inside: the picture comes up to size as
                  it crosses the viewport while the image pans within its frame.
                  Two elements because they are two animations — §5.4 composes by
                  nesting, never by stacking both onto one element. The spacing
                  rides on the outer one so the card's rhythm does not depend on a
                  margin collapsing through a motion wrapper. */}
              <Focus depth={scenes.projectCardCover.depth} className={styles.picture}>
                <Parallax>
                  <Media image={project.image} locale={locale} sizes={SIZES} />
                </Parallax>
              </Focus>
              <figcaption>
                <Text role="index" as="h3">
                  {project.title[locale]}
                </Text>
                <Text role="meta" className={styles.summary}>
                  {project.summary[locale]}
                </Text>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
