import bundle from '@/content/bundle.generated.json';

import { parseMedia, type MediaFacts } from './content-schema';

/**
 * Where the derivatives come from.
 *
 * There used to be a build step here: sharp walked media-source, wrote five
 * widths in two formats for each of seventy-one photographs, and recorded them
 * in a generated manifest. That worked because the originals were in the
 * repository and the incremental cache was on the same disk as the build.
 * Neither is true any more — the originals are in R2, and a fresh CI container
 * would re-encode every derivative from scratch on every build, which is AVIF
 * at roughly seven hundred images a time.
 *
 * So nothing is derived. Cloudflare transforms the original on delivery and
 * caches the result, `format=auto` picks AVIF or WebP from the Accept header,
 * and this file only has to know the intrinsic size of each original — which
 * the admin measured when it was uploaded, and which the content bundle
 * carries. The aspect box the CLS budget depends on is unchanged.
 *
 * Unless the zone cannot transform, which is a state a Free plan can be left in
 * and which nothing on the page would report. The bundle says which it is, and
 * `variants` is the one place that branches on the answer — into a ladder the
 * admin wrote at upload instead of one the edge derives on delivery. The two
 * produce the same `srcset`; only the URLs in it differ.
 */

/** What the admin measured, plus where the original lives. */
export interface ImageEntry extends MediaFacts {
  /** The R2 object key, e.g. "works/edible-house/01.jpg". */
  src: string;
}

export interface ImageVariant {
  src: string;
  width: number;
}

/** The same ladder the sharp pipeline emitted, for the same reasons. */
const WIDTHS = [480, 768, 1200, 1800, 2400];

/**
 * Roughly where `webp q78` sat. Transformations are not byte-identical to what
 * sharp produced and are not meant to be; this is the knob if a photograph ever
 * looks softer than the studio wants.
 */
const QUALITY = 78;

/** Checked at the same gate as everything else — a bad number here is CLS. */
const images = parseMedia(bundle.media);

const base = (() => {
  const value: unknown = bundle.mediaBase;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('content: bundle.mediaBase — expected a non-empty string');
  }
  return value.replace(/\/$/, '');
})();

/**
 * Whether this zone can transform, as the admin found it.
 *
 * Image Transformations are a zone setting on a paid plan, and a zone that does
 * not have them answers `/cdn-cgi/image/…` with something that is not an image
 * — so the whole site renders with every photograph broken, and nothing errors.
 * The admin cannot turn the setting on and cannot see it from here, so it tells
 * us instead: `mediaTransform: false` means ask for the originals.
 *
 * Absent reads as false, and that asymmetry is the point. The field arrived
 * after the first revisions were published, so a bundle without it is one that
 * predates the question rather than one answering yes — and of the two ways to
 * be wrong, full-size originals are a heavy page and `/cdn-cgi/image/` on a
 * zone that cannot serve it is no page at all. A value that is *present and not
 * a boolean* still fails the build.
 */
const transforms = (() => {
  // JSON imports are inferred from the current file's exact keys. Read through
  // the bundle contract so a deliberately optional key can also be absent.
  const value: unknown = (bundle as Record<string, unknown>).mediaTransform;
  if (value === undefined) return false;
  if (typeof value !== 'boolean') {
    throw new Error('content: bundle.mediaTransform — expected a boolean');
  }
  return value;
})();

/**
 * Throws rather than degrading: a record referencing a photograph the bundle
 * does not describe is a content error, and it should stop the build rather
 * than ship an <img> with no dimensions and a broken URL.
 */
export function getImage(src: string): ImageEntry {
  const entry = images[src];
  if (entry === undefined) {
    throw new Error(
      `No dimensions for "${src}". It is referenced by content but not in the media table.`,
    );
  }
  return { src, ...entry };
}

/**
 * The photograph's own URL against the media origin, named for its bytes.
 *
 * The `v` is the whole of the fix for a replaced photograph never appearing.
 * An object key is stable across a replacement — `pages/home/01.jpg` keeps its
 * name so the content record does not have to be rewritten — which meant the
 * URL this built was byte for byte the one every cache between R2 and the
 * reader already held an answer for, and the bucket serves an hour of freshness
 * with no purge behind it. The studio replaced a photograph and the site went
 * on showing the old one.
 *
 * So the URL now carries the digest the admin took of the bytes. Same bytes,
 * same URL, and nothing re-downloads; different bytes, a URL nothing has seen
 * before, and every cache misses on it exactly once. R2 ignores a query
 * parameter it was not asked about, so this costs the origin nothing.
 *
 * Null for a photograph uploaded before the admin recorded a version, which
 * asks for the bare URL — what this did before, for a photograph nobody has
 * replaced since.
 */
function sourceUrl(entry: ImageEntry): string {
  const url = `${base}/${entry.src}`;
  return entry.version === null ? url : `${url}?v=${entry.version}`;
}

/**
 * Where a photograph is actually fetched from at a given width.
 *
 * `fit=scale-down` is what stops a 900px original being served at 1200: it
 * never enlarges, so the ladder below matches `targetWidths()` in the pipeline
 * this replaced — every step under the original's own width, then the original.
 *
 * The version rides on the source half. Under `/cdn-cgi/image/` the source is a
 * URL like any other and its query reaches the origin, and the edge keys the
 * derivative on the whole request — so one digest busts the original and all
 * five transforms of it.
 */
function transformUrl(entry: ImageEntry, width: number): string {
  const options = `width=${width},quality=${QUALITY},format=auto,fit=scale-down`;
  return `/cdn-cgi/image/${options}/${sourceUrl(entry)}`;
}

/**
 * The same photograph, narrower, as a second object rather than a transform.
 *
 * What a zone that cannot transform has instead. The admin wrote this file at
 * upload — from the browser that had just decoded the photograph in order to
 * resize it, because a Worker has no decoder and there is no sharp in either
 * repository — and filed it under the original's key with a `derived/<width>/`
 * prefix. The key of the original is what the version belongs to, so the query
 * is the same one: replacing a photograph re-files every rung of its ladder,
 * and one digest busts all of them together.
 */
function storedUrl(entry: ImageEntry, width: number): string {
  const url = `${base}/derived/${width}/${entry.src}`;
  return entry.version === null ? url : `${url}?v=${entry.version}`;
}

/**
 * Every candidate for one photograph, narrowest first.
 *
 * Two ways to get the same ladder, and which one is used is the only thing
 * `mediaTransform` decides. With transforms the widths are asked for on
 * delivery; without them they were made at upload and this reads the list off
 * the bundle. Either way the site emits a real `srcset` — which is the point,
 * because for a while the second case emitted one candidate at 2400px and a
 * phone was handed the full-size original of every photograph on the page.
 * A page of those is where a mobile browser stops decoding and draws a broken
 * image, and that is exactly what it did.
 *
 * The original is always the last rung, and no candidate is ever declared wider
 * than the file behind it: a `srcset` that offers 1800w and hands over 1200
 * pixels is a lie the browser plans its `sizes` around.
 */
export function variants(entry: ImageEntry): ImageVariant[] {
  if (!transforms) {
    return [
      ...entry.widths.map((width) => ({ src: storedUrl(entry, width), width })),
      { src: sourceUrl(entry), width: entry.width },
    ];
  }

  const cap = Math.min(entry.width, WIDTHS[WIDTHS.length - 1] ?? entry.width);
  const steps = [...new Set([...WIDTHS.filter((width) => width < cap), cap])];
  return steps.map((width) => ({ src: transformUrl(entry, width), width }));
}
