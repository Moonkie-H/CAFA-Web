import { Fragment, type ElementType, type ReactNode } from 'react';

import { cx } from '@/lib/class-names';
import { parseRichText, type RichLine, type RichRun } from '@/lib/rich-text';

import { Text, type TextRole } from './Text';

import styles from './Prose.module.css';

/**
 * A field of prose the studio wrote, with the formatting it put on it.
 *
 * Text draws a string in one of the six roles. This draws a *value out of the
 * bundle*, which is the same thing plus three decisions the studio is allowed
 * to make about it: a bold word, an italic word, and the size the whole field
 * is set at. Anywhere the site sets a run of studio prose it reaches for this
 * instead of Text; anywhere it sets a title, a label, a year or a name it still
 * reaches for Text, because those are not prose and there is nothing to format
 * about them.
 *
 * It ships nothing. `lib/rich-text` runs at build time like every other read of
 * the bundle, and what reaches the browser is the markup it produced — no
 * parser, no client component, not a byte against §7's JS budget.
 *
 * **The size is a number, and it is the field's.** It used to be a step to the
 * next of the six type roles, which was the right answer to a question the
 * studio was not asking: it wanted to say "28 pixels", and a control offering
 * "large" and "larger" made it guess which role each word landed on for a page
 * it could not see from the form. So the number it typed is the number the page
 * sets, as an inline `font-size` — from the bundle, exactly as an image's
 * intrinsic width is, and no more a hardcoded value under §4 than that is.
 *
 * What keeps that from being a hole in the type system is the *range*, and the
 * range lives in the grammar rather than here: `lib/rich-text` reads a number
 * between 14 and 120 as a size and anything outside it as ordinary text, so
 * nine-pixel body copy is not something this component has to refuse — it is
 * something no value can express. Where the studio has typed nothing, `size` is
 * null and the line is drawn in the role its page chose, which is what all the
 * prose on the site says today.
 *
 * The leading follows, because every role sets `line-height` unitless: a line
 * at 96 px gets 96 px of leading ratio rather than the ratio of the size it
 * would have had.
 */
function marked(runs: readonly RichRun[]): ReactNode {
  return runs.map((run, at) => {
    let node: ReactNode = run.text;
    if (run.emphasis) node = <em>{node}</em>;
    if (run.strong) node = <strong>{node}</strong>;
    return <Fragment key={at}>{node}</Fragment>;
  });
}

interface ProseProps {
  /** The role the field is set in when the studio has typed no size. */
  role: TextRole;
  /** The value straight out of the bundle, formatting and all. */
  value: string;
  as?: ElementType;
  className?: string;
}

export function Prose({ role, value, as = 'p', className }: ProseProps) {
  const { size, lines } = parseRichText(value);
  const [first] = lines;

  return (
    <Text
      role={role}
      as={as}
      className={cx(styles.prose, className)}
      style={size === null ? undefined : { fontSize: `${size}px` }}
    >
      {/* The overwhelming case — one line — draws exactly the element Text drew
          before this existed, with no wrapper around the words. Past that, each
          line is its own block box: a `<br>` and a `white-space` rule would not
          hold the studio's line breaks everywhere the way its own box does,
          which is what the contact card's address had been missing. */}
      {lines.length === 1 && first !== undefined
        ? marked(first)
        : lines.map((runs: RichLine, at) => (
            <span key={at} className={styles.line}>
              {/* A line with nothing on it is a line the studio left blank, and
                  it has to hold its height: an empty block box has none. */}
              {runs.length === 0 ? <br /> : marked(runs)}
            </span>
          ))}
    </Text>
  );
}
