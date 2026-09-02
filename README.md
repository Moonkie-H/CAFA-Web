# CAFA-Template

The c.a.f.a atelier 央艺 site. A static export — HTML, CSS and JS on a CDN, with
no server runtime of its own.

The content is not in this repository. It lives in a Cloudflare D1 database
behind [CAFA-Admin](https://github.com/Adventnl/CAFA-Admin), where the studio
edits it, and the photographs live in an R2 bucket. Neither is reached at
runtime: `scripts/fetch-content.mjs` pulls the published content once, before
`next build`, and writes it to `src/content/bundle.generated.json`. Everything
downstream of that file is as static as it ever was.

Both halves of that conversation live in `src/services/`, which is the only
place in this repository that knows the admin exists — `content-api.mts` reads
the published bundle, and `build-info.mts` writes back the revision the build
used, which is what the admin polls to answer "is it live yet?". They run under
Node at build time; nothing in `app/`, `components/` or `lib/` imports them.

```
CAFA-Admin ──published revision──> prebuild ──> bundle.generated.json
                                                       │
                                            next build ▼  →  out/  →  CDN
```

That distinction is the architecture. Reading the content in the browser
instead would put three serial round trips ahead of the largest image on the
page and leave intrinsic dimensions unavailable until after first paint, which
breaks the LCP and CLS budgets in `CLAUDE.md` §7 structurally. Read
[CLAUDE.md](CLAUDE.md) before changing anything; it is a constitution rather
than a style guide.

## Building

```sh
npm install
npm run build
```

Nothing to configure. `scripts/fetch-content.mjs` reads
`https://admin.cafa-studio.com/api/content/published` by default, and that URL
is checked in rather than supplied by the deploy: it is public configuration —
the same URL a browser could read — and every arrangement that passed it in
from outside broke a deploy when it went missing. Cloudflare does not hand a
Worker's `vars` to `npm run build`, so `wrangler.jsonc` deliberately declares
none.

`CONTENT_API` overrides the endpoint, and is how the preview build points at
`/api/content/draft`; it sends `PREVIEW_TOKEN` with it, which is what unlocks
unpublished work for "View draft" in the admin.

```sh
CONTENT_API=https://admin.cafa-studio.com/api/content/draft PREVIEW_TOKEN=… npm run build
```

A build that cannot reach the admin fails rather than quietly shipping
yesterday's content. The one exception is a developer's machine on the default
endpoint, which falls back to the bundle already on disk so an offline checkout
that has fetched once still runs — CI never takes that path, and a build given
an explicit `CONTENT_API` never does either.

```sh
npm run dev        # fetch content, then next dev
npm run content    # just re-fetch the content
npm run build      # prebuild fetch → next build → 404 + build-info
npm run lint
```

`out/build-info.json` records the revision the build came from. The admin reads
it back from the deployed origin to answer "is it live yet" without needing any
Cloudflare API credentials.

## Documentation

| | |
|---|---|
| [CLAUDE.md](CLAUDE.md) | The rules. Layering, hardcoding, budgets, motion, a11y. |
| [docs/Architecture.md](docs/Architecture.md) | How it is put together and why. |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Colour, type, space, grid, motion tokens. |
| [docs/MOTION.md](docs/MOTION.md) | The motion system in full. |
