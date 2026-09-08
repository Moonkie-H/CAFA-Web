import type { CSSProperties } from 'react';

import { cx } from '@/lib/class-names';
import { variants, type ImageEntry } from '@/lib/media';
import type { ImageFraming } from '@/lib/types';

import styles from './MediaFrame.module.css';

interface MediaFrameProps {
  entry: ImageEntry;
  /**
   * How the studio asked for this photograph to be drawn here. Its default —
   * the photograph's own shape, whole, centred — is every photograph on the
   * site until somebody says otherwise, and produces exactly the markup and
   * layout this component produced before frames existed.
   */
  frame: ImageFraming;
  /** Already resolved to a locale. Empty string only for decorative images. */
  alt: string;
  /**
   * Required, deliberately: an omitted `sizes` makes the browser assume 100vw
   * and is the single commonest cause of over-downloading.
   *
   * It describes the width of the *frame*, which is the caller's business,
   * because the caller is the one that knows how wide its column is. How much
   * of the photograph that frame shows is this component's business, and is
   * why the string reaching the `<img>` is not always the one passed in — see
   * `drawnWidth`.
   */
  sizes: string;
  /** The one image above the fold on a given page. Everything else stays lazy. */
  priority?: boolean;
  className?: string;
  /** So a caller can set a per-slug view-transition-name (the touch cover morph). */
  style?: CSSProperties;
}

/**
 * The only <picture> in the codebase.
 *
 * It has no <source> children any more. It used to carry two — AVIF and WebP,
 * each with its own srcset — because the build emitted both and the browser had
 * to choose. `format=auto` moves that choice to the edge, which picks from the
 * Accept header and caches per format, so one srcset now says everything two
 * used to.
 *
 * The <picture> itself stays. globals.css gives it `display: block` at element
 * specificity on purpose (see MediaFrame.module.css), and WorkIndexRow depends
 * on being able to beat that from its own module. Replacing it with a bare
 * <img> would quietly move that fight to a different element.
 *
 * It takes a resolved entry rather than an ImageRef so a client component can
 * render one without importing the content bundle.
 *
 * **It is also the whole of the frame.** The five values on `frame` become four
 * custom properties here and are spent as `aspect-ratio`, `object-fit`,
 * `object-position` and `scale` in the stylesheet next door — so a photograph
 * is cropped by CSS, never by a file, and no page has to know that a frame is
 * in play. Two consequences worth stating, because both are budgets:
 *
 *  - **CLS is unchanged.** The box's shape is `--frame-ratio`, which is either
 *    the studio's number or the intrinsic ratio the admin measured. Either way
 *    it is known before a byte of the photograph arrives, which is exactly what
 *    the `width`/`height` attributes bought before.
 *  - **The `srcset` still tells the truth.** A cropped or zoomed photograph is
 *    drawn wider than its frame — sometimes much wider — and a `sizes` that
 *    named the frame would hand a phone a candidate at a third of the pixels it
 *    is about to display. So `sizes` is restated against how wide the picture
 *    is actually drawn.
 */
export function MediaFrame({
  entry,
  frame,
  alt,
  sizes,
  priority = false,
  className,
  style,
}: MediaFrameProps) {
  const ladder = variants(entry);
  const largest = ladder.at(-1);
  if (largest === undefined) throw new Error(`No variants for "${entry.src}"`);

  // Null is the photograph's own shape, and stating it as a number rather than
  // leaving the box unshaped is what keeps one code path: the frame always has
  // a ratio, and for most photographs it is the one they were taken at.
  const ratio = frame.ratio ?? entry.width / entry.height;
  const focus = `${frame.x}% ${frame.y}%`;

  return (
    <picture
      className={cx(styles.frame, className)}
      // The caller's own style last: today that is only a view-transition-name,
      // and a caller that did want to override a frame value should win.
      style={{
        '--frame-ratio': ratio,
        '--frame-fit': frame.fit,
        '--frame-focus': focus,
        '--frame-zoom': frame.zoom,
        ...style,
      }}
    >
      {/* --frame-ratio gives the browser the box, so there is no wrapper and no
          CLS. width/height stay: they are the intrinsic size, which is what a
          browser with no CSS yet uses and what makes the ratio above honest. */}
      <img
        src={largest.src}
        srcSet={ladder.map((variant) => `${variant.src} ${variant.width}w`).join(', ')}
        sizes={scaledSizes(sizes, drawnWidth(entry, frame, ratio))}
        width={entry.width}
        height={entry.height}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
      />
    </picture>
  );
}

/**
 * How wide the photograph is drawn, as a multiple of its frame's width.
 *
 * The arithmetic the browser is about to do, done here so the `srcset` can be
 * planned against it. `cover` scales the picture until nothing of the frame is
 * empty: a 3:1 panorama in a square frame is drawn three times as wide as the
 * frame, and three quarters of it is cropped away. `contain` does the opposite
 * — a portrait in a wide frame is drawn *narrower* than the frame, and asking
 * for the frame's width would be over-downloading rather than under.
 *
 * 1 whenever the photograph is drawn at exactly its frame's width, which is
 * every unframed photograph on the site.
 */
function drawnWidth(entry: ImageEntry, frame: ImageFraming, ratio: number): number {
  const own = entry.width / entry.height;
  const fitted = frame.fit === 'cover' ? Math.max(1, own / ratio) : Math.min(1, own / ratio);
  return fitted * frame.zoom;
}

/**
 * The caller's `sizes`, restated for a photograph not drawn at its frame's
 * width.
 *
 * Every entry in a `sizes` list is an optional media condition followed by one
 * length, and only the length is ours to change — the conditions are about the
 * viewport and mean what they meant. So each length is wrapped in a `calc()`
 * and multiplied, which is a transformation `sizes` is defined to accept and
 * which leaves `(min-width: 1024px)` untouched.
 *
 * Returned unchanged when the factor is within a per cent or two of 1, because
 * a `calc()` that multiplies by 1.01 is noise in the HTML that can never change
 * which candidate the browser picks.
 */
function scaledSizes(sizes: string, factor: number): string {
  if (Math.abs(factor - 1) < 0.02) return sizes;
  const times = factor.toFixed(2);

  return sizes
    .split(',')
    .map((entry) => {
      const source = entry.trim();
      const at = lengthStart(source);
      return `${source.slice(0, at)}calc(${source.slice(at)} * ${times})`;
    })
    .join(', ');
}

/**
 * Where a source-size entry stops being a media condition and starts being a
 * length.
 *
 * Read backwards, because the length is the last thing in the entry and the
 * condition can be any number of parenthesised groups joined by `and`. The
 * first whitespace found outside any parentheses is the join between the two —
 * and counting depth is what stops it splitting `calc(50vw - 1rem)` down the
 * middle. An entry that is only a length, which is most of them, has no such
 * whitespace and starts at zero.
 */
function lengthStart(entry: string): number {
  let depth = 0;

  for (let at = entry.length - 1; at >= 0; at -= 1) {
    const char = entry.charAt(at);
    if (char === ')') depth += 1;
    else if (char === '(') depth -= 1;
    else if (depth === 0 && /\s/.test(char)) return at + 1;
  }

  return 0;
}
