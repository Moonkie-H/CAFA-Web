# c.a.f.a Atelier 央艺 — Repo Constitution

Read this before every change. These are rules, not suggestions. If a request conflicts
with a rule here, say so and propose the compliant alternative instead of silently
breaking the rule.

## 1. What this is

A static, frontend-only marketing and portfolio site for an art / design / architecture
portfolio-education atelier. **This repository ships no server runtime, no API routes and
no client-side data fetching.** The build output is HTML, CSS and JS on a CDN.

The content lives in a database — Cloudflare D1, behind CAFA-Admin — and the photographs
live in an R2 bucket. Neither is reached at runtime. `scripts/fetch-content.mjs` pulls the
published content once, before `next build`, and writes it to
`src/content/bundle.generated.json`; everything downstream of that file is exactly as
static as it was when the content was six checked-in JSON files.

**This distinction is the whole architecture, so be exact about it.** Fetching at build
time costs nothing. Fetching in the browser would put three serial round trips ahead of
the LCP image and leave intrinsic dimensions unavailable until after first paint, which
breaks §7's LCP and CLS budgets structurally rather than marginally. If a change would
move a content read from build time to runtime, that is not a refactor — it is a different
site, and §7 stops being achievable. Say so instead of doing it.

Stack, fixed:

- Next.js (App Router) with `output: 'export'`
- TypeScript, `strict: true`
- Plain CSS Modules + CSS custom properties. No Tailwind, no CSS-in-JS runtime.
- `motion` (the `m` + `LazyMotion` subset only) for the handful of animations CSS cannot do
- Content fetched at build time from CAFA-Admin; images served from R2, either transformed
  on delivery by Cloudflare or, where the zone cannot, at the widths the admin wrote at
  upload. There is no image build step here and no `sharp` anywhere.
- Locales: `zh` (default, served at `/`), `en` (served at `/en`)

Do not add a dependency without an explicit instruction. If you believe one is needed,
stop and ask, naming the exact bytes it adds.

## 2. Design references (what "good" means here)

- **ium.jp** — the index-as-interface. A dense, quiet list of works; hovering a row
  fills the viewport behind it with that work's image while the list dims. Detail pages
  are a sticky left metadata column against a scrolling right media column.
- **big.dk** — the scroll feel. A centred vertical feed, generous rhythm, media that
  settles into place as it enters view. Motion is calm and mechanical, never bouncy.
- **sanaa.co.jp** — the homepage. Almost nothing on screen. Confidence through absence.

The taste rule: **the design is the restraint.** When unsure between adding and removing,
remove. No gradients, no shadows, no rounded corners, no accent colours, no icons that
aren't content, no hero copy that explains what the visitor can already see.

## 3. Layering — the rule that matters most

```
app/  →  components/composites/  →  components/{primitives,motion}/  →  lib/, styles/tokens

services/  →  (nothing)          build time only; nothing above imports it
```

Dependencies point **down only**. A lower layer never imports from a higher one.

- **`app/` (routes)** — assembles. A page file may: read content via `lib/content`, choose
  which composites to render, and pass props. A page file may **not**: contain literal
  display strings, contain CSS beyond a page-level layout module, contain conditional
  rendering logic more than one level deep, or define a component inline.
  **Pages only ever call existing components.** If a page needs something that doesn't
  exist, build the component first, in `components/`, then call it.
- **`components/composites/`** — knows the domain (a work, a programme, a mentor). Built
  *from* primitives. Receives data as props; never imports `lib/content` itself.
- **`components/primitives/`** — knows nothing about this business. `Text`, `Media`,
  `Grid`, `Field`. Could be lifted into another project unchanged.
- **`components/motion/`** — behaviour wrappers only (`Reveal`, `StickyColumn`,
  `HoverMediaLayer`). They render `children`; they never style content.
- **`lib/`** — pure functions and typed content loaders. No JSX, no DOM.
- **`services/`** — the contract with CAFA-Admin, and the only place that knows the
  admin exists: what the build reads from it (`content-api.mts`) and what the build
  publishes back for it to poll (`build-info.mts`). **It runs at build time, under
  Node, called from `scripts/`.** It is not a layer of the app — nothing in `app/`,
  `components/` or `lib/` may import it, and a page that did would be the runtime fetch
  §1 exists to forbid. It sits in `src/` rather than in `scripts/` so that `next build`
  type-checks the shape the admin promises; as plain `.mjs` it was checked by nobody.

## 4. Hardcoding is a defect

Every one of these is a bug, not a style preference:

- A display string in a `.tsx` file. All copy lives in the content bundle, keyed by locale,
  and is edited in CAFA-Admin. A string you would have to redeploy to change is a defect.
- A colour, size, duration or easing as a literal. All values come from `styles/tokens.css`
  via `var(--…)`. The only permitted raw numbers in CSS are `0`, `1`, `100%`, and values
  inside a `clamp()` that is itself defining a token.
- A route path written as a string in a component. Routes come from `lib/routes.ts`.
- An image dimension, aspect ratio or alt text typed into a component. Dimensions are
  measured when the photograph is uploaded and travel in the bundle; alt text is a
  required field on the content record.
- A work, programme, mentor or nav item spelled out in JSX. It comes from the bundle.

**And the one thing that is deliberately *not* content: the pages.** The site has four —
home, works, programmes, about — and each is a route file with its own layout, its own
choreography and its own view transitions. A fifth page is a design and the motion that
goes with it, not a row somebody adds on a Tuesday, and an editor free to reorder the
blocks on About can only produce a rhythm nobody drew. So the *set* of pages is code, the
composition of each is code, and every **word** on them is content: `SitePages` in
lib/types is what the studio fills in, and the nav bar is those pages' own titles rather
than a second list of labels that could disagree with them.

Test: **adding a work, a programme or a mentor must require nothing but the admin UI — no
commit, no deploy, nothing touched in this repository at all.** The same goes for deleting
one, reordering them, and for changing any word on any page. Adding a *page* is a change
here, and is meant to be. If the first part isn't true, the architecture is wrong — fix
it.

## 5. YAGNI

Build what the current page needs and nothing else.

- **Rule of three.** Do not abstract until the third real use. Two similar blocks stay
  duplicated; the third one earns a component.
- No config option, prop, variant or theme that nothing currently uses. No `size="xl"`
  because it might be handy.
- No state manager, no data-fetching library, no i18n library, no form library, no
  animation library beyond the one named above, no icon package, no UI kit.
- No barrel files (`index.ts` re-exports). Import from the real path.
- No `utils.ts` / `helpers.ts` catch-alls. A function lives in a file named for what it does.
- No test scaffolding, storybook, or CI beyond the deploy workflow unless asked.

## 6. And its counterweight: don't shatter the codebase

YAGNI is not a licence for one-file-per-symbol.

- One component per file, but **a component's types, styles-adjacent constants and small
  private subcomponents live in that same file.** A composite is typically 60–150 lines.
- A file under ~30 lines that is imported by exactly one other file should probably be
  inlined into it.
- A folder with one file in it should not be a folder.
- Prefer ~25 well-named files over 200 fragments. Navigability is a performance feature
  for humans.

## 7. Performance budgets — enforced, not aspirational

Measured on the deployed build, mobile emulation, 4× CPU throttle, Slow 4G:

| Metric | Budget |
|---|---|
| LCP | < 1.8 s |
| CLS | < 0.02 |
| INP | < 200 ms |
| JS transferred, any route | < 110 KB gzip |
| Lighthouse Performance / A11y / Best Practices / SEO | ≥ 95 each |

Rules that keep this true:

- **Server Components by default.** `'use client'` only on a component that genuinely needs
  state, effects or event handlers — and push it as far down the tree as possible. A page
  is never a client component.
- **Never animate anything but `transform`, `opacity`, `filter` and `clip-path`.** Animating
  `width`, `height`, `top`, `left`, `margin` or `background-color` is a defect.
- Every image and video element declares intrinsic `width`/`height` (or an
  `aspect-ratio` box). CLS from media is unacceptable.
- Images: one `srcset` + `sizes` on every one — no exceptions, and a single full-size
  candidate is not a `srcset`. Where the zone can transform, the ladder is Cloudflare's,
  with `format=auto` negotiating AVIF or WebP per request from the `Accept` header; where
  it cannot (`mediaTransform: false`, which is where the live zone is), the ladder was
  written into R2 at upload by the admin and the bundle names its widths. `lib/media.ts`
  is the one place that knows which. `loading="lazy"` and `decoding="async"` except the
  LCP image, which is eager with `fetchPriority="high"`. Every `<img>` carries intrinsic
  `width`/`height` from the bundle — that is what the CLS budget rests on, so it is not
  optional.
- Fonts: self-hosted `woff2`, subset, `font-display: swap`, preloaded, with a metric-matched
  fallback in the `font-family` stack so the swap doesn't shift layout.
- No scroll or resize handler without `passive: true`; prefer `IntersectionObserver`,
  `ResizeObserver` and CSS scroll-driven animations over listeners. Any handler that must
  exist is `requestAnimationFrame`-throttled and does its DOM reads and writes in separate
  phases.
- No layout-thrashing loops: never read `getBoundingClientRect()` inside a write phase.

## 8. Motion

- One easing vocabulary and one duration scale, both tokens. Nothing bouncy, nothing
  elastic, nothing longer than 700 ms.
- Default technique, in order of preference: (1) CSS transition triggered by a class an
  `IntersectionObserver` adds, (2) CSS scroll-driven animation (`animation-timeline: view()`)
  where supported, with (1) as the fallback, (3) `motion` only for shared-element and
  hover-image transitions that the first two cannot express.
- **`prefers-reduced-motion: reduce` disables all of it.** Not "reduces" — content appears
  in its final state immediately. This is a single mechanism in one place, not a check
  sprinkled across components.
- Smooth-scroll (Lenis) is desktop-pointer-only, off on touch, off under reduced motion.
  Native momentum scrolling on mobile beats anything we write.

## 9. Responsive & device

- Fluid by default: `clamp()` on type and spacing against the token scale. Breakpoints are
  an escape hatch for layout changes, not the primary tool.
- **Container queries** for components that appear in more than one column width. A
  component should respond to its container, not the viewport.
- `dvh`/`svh`, never `vh`. Respect `env(safe-area-inset-*)`.
- Hover effects live inside `@media (hover: hover) and (pointer: fine)`. The ium hover-image
  interaction must have a defined touch behaviour — decide it, don't inherit it.
- Interactive targets ≥ 44 × 44 px, from `--tap-min`.
- Text never below 14 px, **except the `index`, `meta` and `label` roles**, which are 13 px,
  11 px and 11 px. This is a carve-out, not a loophole, and it exists because the density
  *is* the design: ium sets its works index at about 13 px and its detail metadata at about
  11 px, and big.dk's gutter labels are smaller still. Setting those three at 14 px does not
  make a restrained site — it makes a different, louder one.
  The carve-out is bounded:
  - It covers exactly those three roles. `body` and everything above it never goes below
    14 px, and no component invents a size outside the six roles in DESIGN-SYSTEM.md §3.
    The studio's own `--type-scale` is not an exception to this: it multiplies all six
    together and never goes below 1, so it can move the whole scale up and can neither
    invent a size off it nor take these three under the floor.
  - `index` and `meta` step up once below `--bp-sm` (to 14 px and 12 px) so a phone still
    clears the touch floor above.
  - Small never also means pale. Every one of these roles is held to the 4.5:1 rule in §10
    — which is what caught `--c-ink-45` at 2.9:1 and retired it.
- Verify at 320, 390, 768, 1024, 1440, 1920 and 2560 px before calling anything done. The
  reference failure mode we are avoiding: a beautiful left column and a permanently empty
  right half of the screen.

## 10. Accessibility

Non-negotiable and cheap if done from the start.

- Semantic landmarks, one `h1` per page, headings in order.
- Visible `:focus-visible` ring on every interactive element, using a token.
- Skip-to-content link.
- `alt` is a **required, non-optional field** on the image type in the content schema, so it
  cannot be forgotten. Decorative images use `alt=""` explicitly.
- Keyboard parity: anything reachable by hover must be reachable by Tab.
- Colour contrast ≥ 4.5:1 for body text. "It's an art site" is not an exemption.

## 11. Definition of done

Before you report a task complete:

1. `npm run build` succeeds with zero TypeScript errors and zero ESLint warnings.
2. No `any`, no `@ts-ignore`, no `console.log`, no commented-out code, no TODO left behind.
3. No dead exports and no unused files. If you replaced something, delete the old one.
4. Checked at 390 px and 1440 px minimum.
5. Keyboard-navigated the new surface once.
6. Re-read sections 3, 4 and 5 against your diff. Hardcoded strings and pages that grew
   their own components are the two failures that recur — look for them specifically.
