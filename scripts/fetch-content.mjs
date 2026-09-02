/**
 * Fetches the published content from CAFA-Admin, before Next starts.
 *
 * This is the whole of "the site now reads from a database". The site is still
 * a static export with no server runtime and no client-side data fetching — the
 * content simply arrives over the wire at build time instead of sitting in six
 * files in this repository. Every performance budget in CLAUDE.md §7 is
 * unaffected, because by the time a browser is involved the HTML is already
 * built.
 *
 * The conversation with the admin lives in src/services/content-api.mts, where
 * the compiler can see it. What is left here is the part that is a command
 * rather than a contract: the environment, the disk, and the exit code.
 *
 * Runs as `prebuild`, and as part of `npm run dev`.
 *
 *   CONTENT_API    optional override of where to read. The published endpoint
 *                  below is the default, so a plain `npm run build` works in
 *                  any checkout and on any CI; the preview build points this
 *                  at /api/content/draft and sends PREVIEW_TOKEN with it.
 *   PREVIEW_TOKEN  optional; only the preview build has one.
 *
 * The default is checked in on purpose. It is public configuration — the same
 * URL a browser could read — and every attempt to supply it from outside has
 * failed the same way: Cloudflare's build step does not hand a Worker's
 * `vars` to `npm run build`, and a rule keyed on the CI's own branch variable
 * only moved the failure to whichever build did not match it. A deploy that
 * breaks because a value nobody edits went missing is a value that belongs in
 * the repository.
 *
 * A build that cannot reach the admin fails: quietly shipping yesterday's
 * content because a network call timed out is the one outcome worth refusing.
 * The single exception is a developer's own machine, where an unreachable
 * admin falls back to the bundle already on disk so an offline checkout that
 * has fetched once still runs. CI never takes that path — it has no bundle to
 * fall back on, and is held to the endpoint regardless.
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ContentApiError, describeBundle, readBundle } from '../src/services/content-api.mts';

const OUT = path.resolve(import.meta.dirname, '..', 'src', 'content', 'bundle.generated.json');

/** Where the published content is read from when nothing says otherwise. */
const PUBLISHED_API = 'https://admin.cafa-studio.com/api/content/published';

/** An explicit endpoint is a command; the default is a convenience. */
const CONFIGURED = process.env.CONTENT_API?.trim();
const API = CONFIGURED || PUBLISHED_API;
const TOKEN = process.env.PREVIEW_TOKEN;

/**
 * Whether an unreachable admin may fall back to the bundle on disk.
 *
 * Only on a developer's machine, and only when the endpoint is the default
 * one: a build that was *told* where to look fails instead, and so does every
 * automated build, which must take what the admin is publishing now or nothing.
 */
const mayReuseDisk =
  !CONFIGURED && !process.env.CI && !process.env.WORKERS_CI && !process.env.GITHUB_ACTIONS;

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

let bundle;
try {
  bundle = await readBundle({ endpoint: API, previewToken: TOKEN });
} catch (error) {
  if (!(error instanceof ContentApiError)) throw error;
  if (mayReuseDisk && (await exists(OUT))) {
    console.warn(`content: ${error.message}`);
    console.warn('content: offline, reusing the bundle already on disk');
    process.exit(0);
  }
  console.error(`content: ${error.message}`);
  process.exit(1);
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

console.info(`content: ${describeBundle(bundle)}`);
