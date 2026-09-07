import { Fragment, type ElementType, type ReactNode } from 'react';

import { cx } from '@/lib/class-names';
import { parseRichText, type RichBlock, type RichRun, type RichSize } from '@/lib/rich-text';

import { Text, type TextRole } from './Text';

import styles from './Prose.module.css';

/**
 * A field of prose the studio wrote, with the formatting it put on it.
 *
 * Text draws a string in one of the six roles. This draws a *value out of the
 * bundle*, which is the same thing plus four decisions the studio is allowed to
 * make about it: a bold word, an italic word, a line set larger, a line pushed
 * to the middle or the right. Anywhere the site sets a run of studio prose it
 * reaches for this instead of Text; anywhere it sets a title, a label, a year or
 * a name it still reaches for Text, because those are not prose and there is
 * nothing to format about them.
 *
 * It ships nothing. `lib/rich-text` runs at build time like every other read of
 * the bundle, and what reaches the browser is the markup it produced — no
 * parser, no client component, not a byte against §7's JS budget.
 *
 * **A size is a step to the next role, never a number.** `large` sets the line
 * in the role above the one this field is drawn in and `larger` two above, off
 * the ladder below. So a formatted page still sets type in the site's six sizes
 * rather than in as many sizes as it has paragraphs, and the studio cannot
 * arrive at nine pixels of body copy by pressing a button four times. That is
 * the same bargain `--type-scale` struck for the site as a whole, made again
 * one paragraph at a time.
 */
const LADDER: readonly TextRole[] = ['meta', 'index', 'body', 'title', 'display'];

const STEPS: Record<RichSize, number> = { normal: 0, large: 1, larger: 2 };

/**
 * The role a line is set in, `size` steps above the field's own.
 *
 * `label` enters the ladder at `meta`, which is the size it shares; it is off
 * the ladder itself because its tracking is a label's rather than a size's, and
 * a line stepped *up* from a label is prose rather than a label. Stepping past
 * the top is stepping to the top: there is no seventh role to invent.
 */
function stepped(role: TextRole, size: RichSize): TextRole {
  const from = LADDER.indexOf(role === 'label' ? 'meta' : role);
  return LADDER[Math.min(from + STEPS[size], LADDER.length - 1)] ?? role;
}

function marked(runs: readonly RichRun[]): ReactNode {
  return runs.map((run, at) => {
    let node: ReactNode = run.text;
    if (run.emphasis) node = <em>{node}</em>;
    if (run.strong) node = <strong>{node}</strong>;
    return <Fragment key={at}>{node}</Fragment>;
  });
}

/**
 * One line, as its own block box.
 *
 * A block rather than a `<br>` and a `white-space` rule, because a line is what
 * carries the alignment and the size — a browser cannot align half of a
 * paragraph. It also means the studio's line breaks survive everywhere rather
 * than only where a stylesheet remembered to ask for them, which is what the
 * contact card's address had been missing.
 *
 * No class where the studio chose nothing: an unaligned line inherits whatever
 * the page lays down, and the front page centres its statement in its own
 * stylesheet. `left` is a choice and does override it; absent is not.
 */
function Line({ role, block }: { role: TextRole; block: RichBlock }) {
  const className = cx(styles.line, block.align === null ? undefined : styles[block.align]);
  // A line with nothing on it is a line the studio left blank, and it has to
  // hold its height: an empty block box has none.
  const children = block.runs.length === 0 ? <br /> : marked(block.runs);

  if (block.size === 'normal') return <span className={className}>{children}</span>;
  return (
    <Text role={stepped(role, block.size)} as="span" className={className}>
      {children}
    </Text>
  );
}

interface ProseProps {
  /** The role the field is set in when the studio has stepped nothing. */
  role: TextRole;
  /** The value straight out of the bundle, formatting and all. */
  value: string;
  as?: ElementType;
  className?: string;
}

export function Prose({ role, value, as = 'p', className }: ProseProps) {
  const blocks = parseRichText(value);
  const [first] = blocks;
  // The overwhelming case — one line, formatted or not — draws exactly the
  // element Text drew before this existed, with no wrapper around the words.
  const bare =
    blocks.length === 1 && first !== undefined && first.align === null && first.size === 'normal';

  return (
    <Text role={role} as={as} className={cx(styles.prose, className)}>
      {bare && first !== undefined
        ? marked(first.runs)
        : blocks.map((block, at) => <Line key={at} role={role} block={block} />)}
    </Text>
  );
}
