/**
 * The formatting the studio puts on a piece of prose, as the site reads it.
 *
 * This mirrors CAFA-Admin's `shared/content/rich-text.ts`, the same way
 * `types.ts` mirrors the shape of the records themselves — and it diverges from
 * it in two ways, both saying the same thing: **the admin writes this format and
 * the site only reads it.** So the half of that module which composes a value
 * back out of blocks is not here, and the two keyword arrays are not exported,
 * because what needs them by name is a toolbar with six buttons on it.
 *
 * Everything that *parses* a value is identical text, character for character,
 * because that is the half the two repositories have to agree on — and being
 * able to `diff` them and see nothing is what checks that they still do.
 *
 * It is a pure function over a string, so it belongs in `lib/`, and it runs
 * where every other content read runs: once, at build time, against the bundle.
 * Nothing here reaches the browser.
 *
 * **The formatting is stored inside the string it formats.** A summary is one
 * `LocalisedText` field in the bundle, exactly as it was — there is no new field
 * to fetch, no second request, and a revision published before this existed
 * parses to the same words with nothing marked on them. That is the point of
 * the format rather than an accident of it: the alternative was a shape change
 * on ten records, and §1's build-time read is not something to spend on bold.
 *
 * The grammar, in full:
 *
 *   - A value is **lines**, split on newline. A line is a block: it can be
 *     aligned and it can be set a step or two larger.
 *   - A line may open with a **directive** — `{center}`, `{large}`,
 *     `{right larger}` — naming its alignment, its size, or both.
 *   - Inside a line, `**this**` is bold and `*this*` is italic. `***both***`
 *     falls out of the two.
 *   - `\*`, `\{` and `\\` are the literal characters.
 *
 * And the two rules that make it safe to turn on over content nobody wrote for
 * it — which is every word on the site today:
 *
 *   - **An unrecognised directive is not a directive.** `{hello}` is the word
 *     "hello" in braces, because `hello` is not one of the six keywords. Only a
 *     brace group whose every word is a keyword is stripped.
 *   - **A delimiter only marks when it has something to mark.** An asterisk
 *     opens a run only when a non-space follows it *and* a closing asterisk
 *     with a non-space before it exists further along the line. So `2 * 3 * 4`
 *     is arithmetic, not an italic 3, and a lone asterisk is a lone asterisk.
 *
 * Which is why nothing here can fail the build. There is no malformed input:
 * every string is a valid one, and the worst a stray character can do is print
 * itself. A content gate that threw on an asterisk would be a studio locked out
 * of its own site by a footnote.
 */
const RICH_ALIGNS = ['left', 'center', 'right'] as const;

export type RichAlign = (typeof RICH_ALIGNS)[number];

/**
 * A size as a step, not a measurement.
 *
 * The same three words the site-wide type scale uses, and for the same reason:
 * the site has six type roles and they are what make its pages look like one
 * site. A field that could put a number of pixels on a paragraph could break
 * the contrast floor and the touch floor in a single edit. A step moves the
 * line to the *next role up* — the site's own next size — so a formatted page
 * still sets type in six sizes rather than in as many as there are paragraphs.
 *
 * No step down, for the third time in this codebase and the same reason: three
 * of the roles already sit on the smallest size the accessibility rules allow.
 */
const RICH_SIZES = ['normal', 'large', 'larger'] as const;

export type RichSize = (typeof RICH_SIZES)[number];

/** A stretch of text carrying the same two marks throughout. */
export interface RichRun {
  text: string;
  strong: boolean;
  emphasis: boolean;
}

export interface RichBlock {
  /**
   * How the line is aligned, or `null` for however the design lays it out.
   *
   * The distinction is load-bearing rather than fussy. The front page statement
   * is centred by the site's own stylesheet; if "not aligned" meant "aligned
   * left", turning this on would have silently un-centred a statement nobody
   * touched. `null` is what every existing line parses to and it overrides
   * nothing. `left` is what the studio pressing the left button writes, and it
   * does override — which is the point of pressing it.
   */
  align: RichAlign | null;
  size: RichSize;
  runs: RichRun[];
}

const ALIGNS: ReadonlySet<string> = new Set(RICH_ALIGNS);
const SIZES: ReadonlySet<string> = new Set(RICH_SIZES);

/** The three characters a backslash can take the meaning out of. */
const ESCAPABLE: ReadonlySet<string> = new Set(['\\', '*', '{']);

const DIRECTIVE = /^\{([a-z]+(?: [a-z]+)*)\}/;

interface Directive {
  align: RichAlign | null;
  size: RichSize;
  /** How many characters it took. Zero where there was none. */
  length: number;
}

const NO_DIRECTIVE: Directive = { align: null, size: 'normal', length: 0 };

/**
 * The brace group a line may open with — or nothing, which is most lines.
 *
 * Every word has to be a keyword, and no keyword twice, or the whole group is
 * ordinary text. That is what lets this be switched on over prose written years
 * before it existed without reading a single sentence differently.
 */
function readDirective(source: string): Directive {
  const found = DIRECTIVE.exec(source);
  if (found === null) return NO_DIRECTIVE;

  let align: RichAlign | null = null;
  let size: RichSize | null = null;
  for (const word of (found[1] ?? '').split(' ')) {
    if (align === null && ALIGNS.has(word)) align = word as RichAlign;
    else if (size === null && SIZES.has(word)) size = word as RichSize;
    else return NO_DIRECTIVE;
  }
  return { align, size: size ?? 'normal', length: found[0].length };
}

function isSpace(char: string | undefined): boolean {
  return char === undefined || /\s/.test(char);
}

/** A delimiter opens only when there is something on its right to mark. */
function opens(source: string, at: number, width: number): boolean {
  return !isSpace(source[at + width]);
}

/** ...and closes only when there is something on its left it has marked. */
function closes(source: string, at: number): boolean {
  return !isSpace(source[at - 1]);
}

/** Whether the run being opened here has somewhere to end. */
function hasCloser(source: string, from: number, marker: string): boolean {
  for (let at = from; at < source.length; at += 1) {
    if (source[at] === '\\') {
      at += 1;
      continue;
    }
    if (source.startsWith(marker, at) && closes(source, at)) return true;
  }
  return false;
}

function parseRuns(source: string): RichRun[] {
  const runs: RichRun[] = [];
  let text = '';
  let strong = false;
  let emphasis = false;

  const flush = () => {
    if (text !== '') runs.push({ text, strong, emphasis });
    text = '';
  };

  let at = 0;
  while (at < source.length) {
    const char = source[at] ?? '';

    if (char === '\\' && ESCAPABLE.has(source[at + 1] ?? '')) {
      text += source[at + 1];
      at += 2;
      continue;
    }

    if (char === '*') {
      const double = source.startsWith('**', at);
      const width = double ? 2 : 1;
      const marker = double ? '**' : '*';
      const turns = (double ? strong : emphasis)
        ? closes(source, at)
        : opens(source, at, width) && hasCloser(source, at + width, marker);
      if (turns) {
        flush();
        if (double) strong = !strong;
        else emphasis = !emphasis;
      } else {
        // Both of them, together. A `**` that cannot turn is a pair of literal
        // asterisks — letting it fall through one character at a time would
        // have the second half open an italic across the rest of the line,
        // which is how `**bold **x` used to come out half in italics.
        text += marker;
      }
      at += width;
      continue;
    }

    text += char;
    at += 1;
  }

  flush();
  return runs;
}

/** One value, as the lines it is made of. Never empty: `''` is one blank line. */
export function parseRichText(source: string): RichBlock[] {
  return source
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => {
      const directive = readDirective(line);
      return {
        align: directive.align,
        size: directive.size,
        runs: parseRuns(line.slice(directive.length)),
      };
    });
}
