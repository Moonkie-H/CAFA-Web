# Design System — c.a.f.a Atelier 央艺

Derived from ium.jp, big.dk and sanaa.co.jp. Everything here becomes
`src/styles/tokens.css`. Nothing in the codebase uses a value that isn't below.

---

## 1. What the references actually do

**ium.jp** — near-white ground, ink-black text, one type family, one weight, and type set
*small*: the works index runs at about 13 px with roughly 22 px row rhythm. Density reads as
confidence. The page has no containers, no cards, no borders — structure comes purely from
alignment to a grid. Detail pages set metadata at ~11 px against full-bleed media.

**big.dk** — a single centred media column roughly 310 px wide on desktop with enormous
surrounding whitespace, right-aligned labels in the left gutter. Uppercase, letter-spaced
secondary text — we take the spacing and the size and leave the uppercasing to whoever
types the words, for the reason in §3. Black and white only; all colour comes from the
photography.

**sanaa.co.jp** — an almost empty page. The lesson isn't a technique, it's a budget: the
homepage gets a logo, a short list of links, and nothing else.

**The synthesis for c.a.f.a:** ium's index-as-interface and metadata discipline, big.dk's
scroll cadence and gutter labelling, SANAA's emptiness on the homepage only.

---

## 2. Colour

Monochrome plus one warm paper tint. No accent colour — the work supplies all colour.

One exception, and it is written down here so it stays one: `--c-mark`, the highlighter
yellow drawn through a label on hover. It is not an accent colour in the sense this rule
forbids, because it never colours anything — it is never text, never a border, never at
rest. It is a mark left *on* the paper, which is why its value is the colour a marker
leaves on `--c-paper` rather than a brand hue.

What bounds it is not a surface but a job: **it marks a label that goes somewhere.** The
header nav, the locale switch beside it, and the prev/next pair that closes a work page —
those three, and one primitive draws all of them (`components/primitives/Mark`). It never
marks a heading, a caption, a run of prose or a link inside one, and it is never on
anything at rest. The moment it appears on something that is not a navigation label, that
is the moment to delete it.

```css
:root {
  --c-paper:        #F7F6F2;  /* page ground, warm off-white */
  --c-paper-raised: #FFFFFF;  /* media wells, rare */
  --c-ink:          #14140F;  /* primary text */
  --c-ink-70:       rgb(20 20 15 / 0.70);  /* secondary text, metadata */
  --c-ink-62:       rgb(20 20 15 / 0.62);  /* tertiary: status, numbers */
  --c-ink-16:       rgb(20 20 15 / 0.16);  /* hairlines */
  --dim:            0.28;                  /* and the same number as an opacity */
  --c-ink-dim:      rgb(20 20 15 / var(--dim));  /* list colour while hover backdrop is active */
  --c-inverse:      #F7F6F2;               /* text over media */
  --c-focus:        #14140F;               /* focus ring */
  --c-scrim:        rgb(20 20 15 / 0.35);  /* over-media legibility */
  --c-veil:         rgb(247 246 242 / 0.55); /* paper over the hover backdrop */
  --c-mark:         #F3E24E;               /* the hover stroke on a nav label, §7 */
  --tint-l:         0.92;                  /* the index row band: lightness, §7 */
  --tint-c:         0.038;                 /*                     and chroma    */
  --c-tint-none:    oklch(var(--tint-l) 0.008 95);  /* a cover with no hue to give */
}
```

The last three are not a second exception to the rule above, they are the rule being
taken literally. `--tint-l` and `--tint-c` are a band's lightness and chroma with no hue
of their own; the hue arrives per row from the photograph the row is about, measured on
upload and carried in the bundle beside the width and the height. Nothing in the system
holds a colour — the work supplies it, which is what §2 asked for in the first place.

Fixing L and C rather than sampling them is what makes it safe to put text on. Contrast
over the band is one measurement instead of a property of whichever photograph the
atelier uploaded — `--c-ink` at 14.4:1 and `--c-ink-62`, the tightest thing on the row,
at 4.7:1, **at every hue on the circle**. A black cover cannot produce a black band,
because the lightness was never the photograph's to give.

`--tint-c` is measured, not chosen: 0.038 is the widest chroma at which all 360 hues stay
inside sRGB at `--tint-l`. Past it the browser gamut-maps by cutting chroma, and it cuts
different amounts at different hues — blues muted, yellows untouched — so the constant
the contrast figures rest on would quietly stop being constant.

Contrast check, measured rather than estimated — the first three figures written here were
all wrong, and the tertiary one was wrong in a way that failed WCAG AA:

| Token | Over `--c-paper` | |
|---|---|---|
| `--c-ink` | 17.1:1 | was written as ~15:1 |
| `--c-ink-70` | 6.6:1 | was written as ~10:1 |
| `--c-ink-62` | 5.0:1 | **was 45% at 2.9:1, not the ~6:1 claimed — it failed §10 of the constitution wherever it set text, which was everywhere: row numbers, years, statuses, gutter labels, the private row, the footer address** |
| `--c-ink-16` | 1.3:1 | hairlines, never text |
| `--c-ink-dim` | 1.9:1 | see below |
| `--c-ink` over `--c-mark` | 13.3:1 | the label sits at full ink while the stroke is under it |

0.62 is the lightest alpha that clears 4.5:1 on this paper. There is no room for a fourth
step: below 0.60 nothing passes, so the ink scale is three text values and a hairline, and
any further hierarchy has to come from size and position instead of colour.

`--c-ink-dim` is the exception, and it is deliberate. It is the hover state of the works
index — DESIGN-SYSTEM §7's inversion, where the siblings of the row under the pointer step
back. It is transient, it is only reachable with a fine pointer, and the resting state of
every row is full `--c-ink`. WCAG 1.4.3 applies to the default presentation, which passes.

`--c-veil` was added during build: `--c-scrim` darkens media so *pale* text can sit on it,
and the works index needs the opposite — ink rows sitting over an arbitrary photograph. At
55% paper the worst case, a solid black cover, still measures 5.2:1 for `--c-ink`, so the
rule in §10 of the constitution holds whatever image the atelier drops in. It is set as low
as that measurement allows, because the point of the backdrop is that the photograph is
felt.

---

## 3. Typography

**Latin:** a neutral grotesque. `Neue Haas Grotesk` / `Söhne` if licensed; free equivalent
`Inter` with `font-feature-settings: "cv05" 1, "ss03" 1` to reduce its quirks, or
`Suisse Int'l` if budget allows. One family. Weights **400 and 500 only** — the references
never go bolder.

**中文:** `Source Han Sans` / `Noto Sans SC` at weights 400 and 500. Subset aggressively —
a full CJK face is 8–20 MB. Build a subset from the actual strings in
`content/dictionaries/zh.ts` and the work titles; that lands under 200 KB. Load it with
`unicode-range` so Latin never triggers the CJK file.

Metric-matched fallback stack so the font swap doesn't shift layout:

```css
--font-sans: 'Inter var', 'Noto Sans SC', ui-sans-serif, system-ui, 'Helvetica Neue', sans-serif;
```

### Type roles

Every piece of text uses one of these six. `Text.tsx` takes `role` as a prop; there is no
seventh role and no ad-hoc `font-size` anywhere.

| Role | Size | Line height | Tracking | Weight | Used for |
|---|---|---|---|---|---|
| `display` | `clamp(2.25rem, 1.4rem + 3.6vw, 4.5rem)` | 1.02 | −0.02em | 400 | Work title on detail |
| `title` | `clamp(1.25rem, 1.05rem + 0.9vw, 1.75rem)` | 1.15 | −0.012em | 400 | Section heads, programme names |
| `body` | `clamp(0.9375rem, 0.9rem + 0.2vw, 1.0625rem)` | 1.62 | 0 | 400 | Prose, and the home statement |
| `index` | `0.8125rem` (13px) | 1.7 | 0 | 400 | The works list rows — fixed, not fluid |
| `meta` | `0.6875rem` (11px) | 1.55 | 0.01em | 400 | Credits, status, captions |
| `label` | `0.6875rem` (11px) | 1 | 0.09em | 500 | Nav, gutter labels, buttons |

The home statement moved from `label` to `body`, and it is the one row of this table
that has changed since it was written. Setting it in the nav's type said the first screen
was one line of the same small type the bar is — true while it *was* one line. It is prose
the studio breaks where it likes now, and 11px with 0.09em of tracking makes a caption of
a statement rather than a statement. It keeps `body`'s size and tracking and takes its own
leading, `--type-statement-leading`, because paragraph leading opens hand-broken lines into
unrelated ones; that token is a single property on a single page, not a seventh role.

`index` and `meta` stay fixed rather than fluid: at these sizes fluid scaling either breaks
the 44 px touch floor on mobile or bloats absurdly at 2560 px. They step once at the `sm`
breakpoint instead (`index` → 14 px, `meta` → 12 px on touch).

These three sizes sit below the 14 px floor in §9 of the constitution. That was a genuine
contradiction between the two documents, and it is resolved in §9's favour of the design:
the carve-out is written there, it names these three roles and no others, and it is
conditional on them clearing the contrast rule in §10.

CJK adjustment: Chinese needs more leading and no negative tracking. `:lang(zh)` raises
`line-height` by 0.12 on every role and zeroes `letter-spacing` on `display`/`title`.

**No role applies a `text-transform`, and `label` is the one that had to lose it.** It was
set in capitals to borrow big.dk's gutter labelling, and the borrowing was one step too
literal: every string a label renders — a nav item, a section heading — is typed into
CAFA-Admin, so the transform made the page disagree with the record and gave
the studio no way to write a lower-case title, or a name that is only capitalised in one
place. Case is content. The tracking and the size are what make a label read as one; those
stay, and anything meant to be shouted is typed that way.

---

## 4. Space

An 8 px base with a fluid multiplier. Nine steps, no more.

```css
--space-3xs: 0.25rem;   /*  4 */
--space-2xs: 0.5rem;    /*  8 */
--space-xs:  0.75rem;   /* 12 */
--space-s:   1rem;      /* 16 */
--space-m:   1.5rem;    /* 24 */
--space-l:   clamp(2rem,   1.6rem + 1.6vw,  3rem);      /* 32→48  */
--space-xl:  clamp(3.5rem, 2.6rem + 3.6vw,  6.5rem);    /* 56→104 */
--space-2xl: clamp(6rem,   4.2rem + 7.2vw, 11rem);      /* 96→176 */
--space-3xl: clamp(9rem,   6rem  + 12vw,  18rem);       /* 144→288 — between major sections */

--space-header: 4.5rem;      /* fixed header height; sticky offsets reference this */
--space-gutter: clamp(1.25rem, 0.6rem + 2.6vw, 3.5rem);  /* page edge padding */

--space-pin: calc(var(--space-header) + var(--space-xl));  /* resting line of a pinned column */
```

`--space-pin`, not `--space-header`, is what a `position: sticky` column offsets by. The
difference is the whole point: a column offset by the header height alone is not yet at
that offset when the page is at rest — `<main>` has already pushed it `--space-xl` lower —
so it slides up by that much on the first scroll and only then catches. Offset by
`--space-pin` it is already on its line, and it does not move at all. The left column of a
work is not a thing that moves; the media beside it is.

The whitespace *is* the design. When a section feels wrong, the answer is almost always
`--space-2xl` or `--space-3xl` above it, not a border or a background change.

---

## 5. Grid

A 12-column grid, `--space-gutter` at the edges, `--space-m` between columns, max content
width `1680px` centred.

```css
--grid-cols: 12;
--grid-gap: var(--space-m);
--grid-max: 1680px;
--measure: 68ch;   /* the prose limit in the table below, as a token */
```

Standard placements:

| Surface | Placement |
|---|---|
| Home statement | cols 1–12, centred on both axes, max 68 characters |
| Works index rows | number 1, title 2–5, discipline 6–8, year/status 11–12 (right-aligned) |
| Work detail | meta cols 1–4 (sticky), media cols 6–12 |
| Programmes | label cols 1–2, body cols 4–9 (big.dk gutter-label pattern) |
| Prose (about) | cols 4–9, max 68 characters |

Breakpoints — four, used only for layout reflow:

```css
--bp-sm:  480px;
--bp-md:  768px;    /* index collapses 4 cols → 2; hover layer off */
--bp-lg: 1024px;    /* detail becomes two-column and sticky */
--bp-xl: 1440px;
```

Above 1920 px nothing grows except whitespace — `--grid-max` caps it, matching big.dk's
behaviour on wide displays.

Components that appear at more than one width use container queries, not these.

---

## 6. Motion

Two easings. Four durations. Nothing else exists.

```css
--ease-out:  cubic-bezier(0.22, 1, 0.36, 1);      /* entrances, reveals */
--ease-io:   cubic-bezier(0.65, 0, 0.35, 1);      /* state changes, hover */

--dur-fast:   140ms;   /* colour/opacity on hover of small text */
--dur-base:   280ms;   /* most transitions */
--dur-slow:   560ms;   /* scroll reveals */
--dur-scene:  700ms;   /* hover backdrop crossfade — the longest permitted value */

--stagger-step: 70ms;  /* max 3 steps */
```

### Navigation and scroll

Added when the site became one continuous surface rather than a set of pages. **No new
duration was introduced** — that would have broken the four-value rule on its first real
test. A route change is `--dur-fast` of overlap plus `--dur-slow`, which is 700 ms, which is
`--dur-scene`.

```css
--page-recede: 0.94;   /* where the outgoing view settles */
--page-arrive: 1.03;   /* where the incoming view starts */
--morph-soften: 5px;   /* blur at the midpoint of a shared-element morph */

--vt-header: site-header;   /* shared-element identities. A view-transition-name has  */
--vt-cover:  work-cover;    /* to match across two stylesheets, so it is not a literal */

--drift: 3.5%;         /* how far media travels across one view() pass */
--recede-scale: 0.94;  /* what a block shrinks to as it leaves the top */
--recede-fade: 0.35;   /* and how far it dims — never to nothing */
```

Why the numbers are this small: the outgoing page moves 6%, media drifts 3.5%. The reference
sites feel expensive because almost nothing travels far. A 0.85 page scale and a 15% drift
would read as a slideshow template, and the difference between the two is entirely in these
two decimals.

`--page-recede` and `--recede-scale` are the same number, and that is the point — scrolling a
section off the top and navigating away from a page are the same gesture at the same
magnitude, so the site has one vocabulary rather than two.

Two rules that survive contact with the new mechanisms:

- **A scroll-linked animation is `linear`.** Easing something bound to the scrollbar makes
  the page feel like it is resisting the pointer. `--ease-out` is for things with a beginning
  and an end.
- **Reduced motion still means final state, immediately.** It now takes three declarations
  rather than one, because a `*` selector does not reach a view-transition pseudo-element and
  a zero duration does not stop a position-driven animation. Each is written beside the thing
  it cancels; none of them is a check inside a component.

Rules that make it feel like the references rather than a template:

- **Nothing overshoots.** `--ease-out` decelerates to a stop. No spring, no bounce, no
  `cubic-bezier` with a value above 1 in the y-axis except the tail of `--ease-out`.
- **Travel is short.** 18 px, not 60. big.dk's calm comes from elements barely moving.
- **Opacity does most of the work.** If in doubt, fade and don't translate.
- Only `transform`, `opacity`, `filter`, `clip-path` are ever animated.
- One reveal per element, ever — `unobserve` on first intersection.
- Everything above collapses to zero under `prefers-reduced-motion: reduce`.

---

## 7. Component states

```css
--focus-ring: 0 0 0 2px var(--c-paper), 0 0 0 4px var(--c-focus);
--hairline: 1px solid var(--c-ink-16);
--radius: 0;   /* yes, zero. Every corner in this design is square. */
--tap-min: 2.75rem;  /* 44px. The interactive target floor from §9 of the constitution;
                        no step on the space scale sits at 44px, so it gets its own. */
```

- **Links in prose:** underline at 1px with `text-underline-offset: 0.22em`; on hover the
  underline goes to `--c-ink-45`, the text stays. No colour change.
- **Index rows:** the *backdrop* changes, the other rows dim to `--c-ink-dim` over
  `--dur-base`, and the hovered row stays at `--c-ink`. That inversion — dimming the
  siblings rather than highlighting the target — is the ium move, and it is still what
  does most of the work.
  Under it, the hovered row takes a band: `oklch(var(--tint-l) var(--tint-c) H)` where `H`
  is the dominant hue of that work's cover, over `--dur-base`. It overruns the first and
  last column by `--space-2xs` for the reason `--mark-reach` overruns a word — flush edges
  read as a table cell selected. It is opaque on purpose: this row is sitting over a
  full-bleed photograph behind `--c-veil`, where §2 can only promise 5.2:1 for the worst
  cover that might arrive, and the band replaces that with the constant above. A cover with
  no hue — monochrome, or not yet measured — gets `--c-tint-none`, the same band at the
  paper's own warmth. Hover and `:focus-visible` both; nothing on touch, where the row
  already carries its cover inline and has the work's colour on it without a band. Never on
  a private row, which is not a link and does not go anywhere.
  The band is not `--c-mark` and must not drift into it: the mark is one fixed pigment on a
  label, this is a ground with no colour of its own.
- **Nav:** `label` role, `--c-ink-70` at rest, `--c-ink` on hover, `--dur-fast` — and,
  behind the word, a chisel-nib stroke in `--c-mark` swept across it over `--dur-base`.
  It is a mark, not a shape around the label, and four things are what make that true:
  it overshoots the word by `--mark-bleed` above and below and `--mark-reach` at each
  end; it leans `--mark-tilt` off level; its ends are raked `--mark-rake` across its own
  height rather than cut straight down; and the ink thins to `--mark-dry` toward the
  bottom edge. The rake is the one that carries it — a parallelogram reads as drawn, a
  rectangle as applied — and at 11px it and the fade are the only two of the four that
  still register. One `clip-path` polygon does both the shape and the sweep, so the wipe
  edge *is* the nib and arrives at the angle it will rest at. Hover and `:focus-visible`
  both, so the keyboard sees what the pointer sees; nothing on touch. Every measurement is
  in `em`, so the same gesture serves the `label` role in the bar and the `index` role in
  the pager. It is `components/primitives/Mark`, drawn by whichever control it sits in;
  the three that draw it are the nav, the locale switch — but never its current locale —
  and the work pager's prev/next.
- **Fields:** the contact card holds the only two on the site, and they are ruled lines
  rather than wells. Transparent, no border but a `--hairline` under them, no placeholder —
  the label is a real `<label>` above the control, so it is still there once there is
  something written against it. On focus the rule alone goes to `--c-ink` over `--dur-fast`.
  A boxed input would break §8.2 and §8.3 at once, and on a card that is already a sheet of
  paper the honest form of a place to write is a line to write on. Their type is
  `--type-field-size`, which is not a seventh role: it is a 16px floor under the body size,
  and it exists because iOS Safari zooms the viewport at a focused field under 16px.
- **Submit:** a `label` role under the same underline, `--c-ink-70` to `--c-ink` over
  `--dur-fast` — the nav's treatment, never `--c-mark`. The highlighter marks a label that
  goes somewhere, and submitting is not navigating; §2's bound is the job, not the surface.
  In flight it takes `--c-ink-62` and stops being pressable; the word changes, the layout
  does not.
- **What the card answers with:** one `index`-role line under the form at `--c-ink-70` — the
  note at the top of the card is the same size, because both are the card talking rather
  than labelling. It is a live region that is empty until there is something to say and
  takes no room while it is, so nothing is held open under the button from first paint. The
  one thing under it that goes somewhere — the offer of a mail-client draft after a failure
  — carries the address's underline and its hover, because it is a link and everything else
  there is prose.
- **Focus:** `--focus-ring` on `:focus-visible` only, never suppressed.
- **Disabled / private:** `--c-ink-45`, `cursor: default`, not a link at all.

---

## 8. The rules that produce the taste

Keep these visible during review:

1. Two type sizes on screen at once is usually correct. Four is usually a mistake.
2. No borders where whitespace can do the job. The only permitted rule is `--hairline`
   between index rows, and even that is optional.
3. No box has a background different from the page unless it contains media.
4. Metadata is small, grey, and left exactly where it was on the previous page. Consistency
   of position across pages is what makes a site feel authored rather than assembled.
5. Images are never cropped to a fixed aspect ratio globally — each keeps its own, and the
   column width is what's constant. This is why the reference sites feel like a portfolio
   and a grid of uniform thumbnails feels like a template.
6. The homepage should survive deleting half of it. Try it before shipping.
