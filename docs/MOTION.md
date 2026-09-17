# Motion Plan — the canvas

The brief: the site should not read as a sequence of pages. It should read as one
continuous surface that the viewer moves across. Clicking a menu item does not swap a
document — the menu compresses, slides aside, and the thing it pointed at arrives in the
space it left. Scrolling is not a reveal-once event — every surface on the site is tied to
the scroll position, moving continuously the whole time it is on screen.

This document is the plan. It is ordered: phase 0 must land before anything else, because
the current transition machinery actively fights the thing we are building.

**Decisions taken (2026-07-29):** the works index compresses into a **persistent left rail**
that survives onto the detail page — option A, specced in §7. Real photography is coming;
motion values are tuned generically for now and re-tuned against real plates later.

**Decision taken (2026-08-02, later):** **contact stops being a page.** `/{locale}/contact`
is deleted and the nav item opens a card pinned over whatever page you are already on,
which the reader can then pick up and put anywhere. The reasoning is §5.5b, rewritten:
this document had already called the contact card "the one block on the site that is an
*object* rather than a region of it", and then made it a page anyway — so the object had
to be *travelled to*, and the figure that put it down could only run on arrival. As an
overlay the same figure runs wherever you are, and the object can be moved, which is what
an object on a board does. Two things go with the page: the `panel` part role, which had
no second user and therefore nothing to pair against, and the `sway` effect, which had no
second surface. Both are recorded below rather than quietly deleted.

**Decisions taken (2026-08-02):** the section pages catch up with the works pages. Three
things, all of them things this document already asked for and none of which had been built:
Programmes becomes a **stack** (§5.3), About carries the **studio filmstrip** (§5.2), and a
listing's entries are **named parts of their own** so a list unzips on a route change instead
of sliding as one sheet (§3). The gap they were closing is worth stating plainly, because it
is the same one §0.5 named at the start: Works had eight figures and five scenes, and the
section pages had `lateral` and two ranged entrances. The vocabulary was not missing — `pin`,
`pin-scrub`, `pan`, `split` and `recede` were all specced here and unused. What was missing
was surfaces that used it.

---

## 0. What is wrong now, precisely

Not opinions — five defects, each with a mechanism.

### 0.1 The page is snapshotted whole, and the snapshot is stretched

`styles/motion.css:42`

```css
::view-transition-group(.page) { animation: none; }
```

Removing the group animation does not "pin" the group. It leaves the group at the **new**
element's geometry for the whole transition, while `::view-transition-old(.page)` is a
bitmap captured at the **old** element's geometry. `::view-transition-old` defaults to
`object-fit: fill`. So the outgoing page is scaled to whatever the incoming page's box is.

The works index is roughly 2 200 px tall. A work detail page is roughly 5 500 px. Every
click therefore squashes the outgoing snapshot to ~40% of its height while fading it. That
is the "the page is slightly different" artifact — and it is exactly the squashed-rubber
failure the comment above that rule says it is avoiding.

It is also expensive: we ask the compositor for a 5 500 px-tall texture of the entire
document on every navigation.

**Fix:** stop naming the page. Name parts. Phase 2.

### 0.2 The images drop down

Two vertically-opposed animations are stacked on the same element in
`components/composites/MediaSequence.tsx:37-41`:

```jsx
<Reveal>          {/* translate3d(0, 18px, 0) → 0,  range: entry 0% → entry 80% */}
  <Parallax>      {/* translateY(+3.5%) → -3.5%,   range: (unset) → cover 0% → cover 100% */}
```

`Parallax` never declares an `animation-range` (`Parallax.module.css:30`), so it inherits
the default `cover 0% cover 100%`. At `cover 0%` the drift is at `+3.5%` — below rest. The
`Reveal` starts at `+18px` — also below rest. For a 600 px plate the image therefore enters
about **39 px below where it belongs**, inside a frame that is `overflow: clip`, and rises
out of it. That is the drop.

It is worse on back-navigation, which is 0.3.

### 0.3 Back-navigation replays every entrance from scroll 0

Next's App Router restores scroll position *after* React commits. Scroll-driven timelines
resolve at paint. So for at least one frame after a back navigation the document is at
`scrollY = 0`, every below-fold `Reveal` resolves to its `from` state, and then scroll jumps.
Everything drops at once.

The `@supports not` fallback branch is worse still: `Reveal` renders `data-reveal="pending"`
on mount (`Reveal.tsx:58`), so on any remount an element the reader had already scrolled past
starts at `opacity: 0` again and waits for an observer.

**Fix, and it is a rule not a patch: entrance animations run on forward navigation only.**
Going back is a restoration, not a performance. Phase 1 carries the flag that makes this
expressible. Note that scrubbed animations are exempt — they have no entrance, which is one
more reason to prefer them.

### 0.4 `chosen` is never cleared

`WorkIndex.tsx:37` — the comment says "deliberately never cleared." On a hybrid device (a
touchscreen laptop satisfies `hover: hover and pointer: fine` for its mouse while still
firing touch pointer events) the row's inline cover can hold `view-transition-name:
work-cover` at the same moment the hover backdrop claims it. Duplicate view-transition-names
make the browser **abort the entire transition** — a hard cut, with no warning in the UI.
Clear it when the transition settles, and add a dev-only uniqueness assertion.

### 0.5 And the real problem: there is no vocabulary

Three behaviours exist — `Reveal`, `Recede`, `Parallax`. `Reveal` is applied identically in
six places with no variant, no direction, no awareness of what it wraps or where the viewer
came from. There is nothing to compose, so every surface looks the same. Everything below is
about building the vocabulary; phase 0 only clears the ground.

---

## 1. The model

Four ideas carry the whole system. Everything after this is an application of one of them.

**One — navigations have an intent.** A route change knows semantically what it is: entering
a work from the index, stepping sideways through the pager, coming back out, moving laterally
along the nav bar, switching locale. That intent is written to `<html>` *before* the
transition starts, and all choreography is keyed off it. This is what ends "one animation
everywhere": a single named element gets seven different exits depending on the figure.

**Two — the browser interpolates parts, not pages.** Every meaningful element carries a
`view-transition-name`. A transition is then a set of simultaneous, individually-timed
element moves. Watching things you can still see travel to new positions is the entire
illusion.

**Three — everything on the site is scroll-triggered.** Not "some things animate on scroll."
Every surface declares a trigger and an effect. Any element can drive animation on any other
element; sections can pin and scrub. This is §5 and it is the largest part of the work.

**Four — scroll is also continuous state.** Position, direction and velocity live as custom
properties on `:root`, so effects can respond to *how* you are scrolling, not just where you
are. This is what separates a moving page from a physical one.

---

## 2. Phase 1 — navigation intent (the spine)

New files:

- `src/lib/nav-intent.ts` — pure. Classifies `(fromPath, toPath)` into a figure and a
  direction. No DOM, no React.
- `src/components/motion/NavStage.tsx` — `'use client'`, mounted once in the locale layout.
  ~70 lines.

Figures, and this is the full set:

| figure | from → to | direction source |
|---|---|---|
| `enter-work` | index → work | — |
| `exit-work` | work → index | — |
| `step-work` | work → work (pager or rail) | sign of the two works' `index` fields |
| `lateral` | any nav-bar page → another | order of items in `content/site.ts` |
| `descend` | home → anything | — |
| `ascend` | anything → home | — |
| `locale` | zh ↔ en, same page | — |
| `restore` | popstate, any direction | — |

`NavStage` writes `data-figure`, `data-dir` (`1`/`-1`) and `data-restoring` on
`document.documentElement` inside the click / `popstate` handler, i.e. **before** React begins
the transition. CSS reads them. Nothing else is JS.

It also owns scroll restoration: `history.scrollRestoration = 'manual'`, a `Map` of history
key → `scrollY`, applied synchronously before the transition begins so no timeline ever
resolves against a stale scroll position. This is the fix for 0.3.

Cost: ~1.4 KB gz. It ships no animation code at all.

---

## 3. Phase 2 — named parts

Delete the page-level `<ViewTransition default="page">`. Replace with a name registry,
`src/lib/vt-names.ts`, so a name is written once and read from two stylesheets (the current
`--vt-cover` token approach, generalised):

| name | element | role in the figure |
|---|---|---|
| `stage` | the page grid | the surface itself; shifts and scales |
| `rail` | the works rail | full-width list ⇄ compressed left rail |
| `rail-{slug}` | each rail entry | the clicked entry travels; siblings unzip away |
| `cover-{slug}` | hover backdrop ⇄ detail hero | the existing morph, now per-slug |
| `heading` | page `h1` | |
| `intro` | the block that says what the page is | Programmes' lead line, About's prose |
| `listing` | the page's main body of repeated things | programme list, About's project grid |
| `meta` | sticky metadata column | |
| `pager` | prev/next | |
| `chrome-nav` | header nav list | |
| `item-{key}` | one entry *inside* a listing — a programme, a project card | the list unzips |

`item-{key}` is the one that made the section-page figures ensembles rather than slides, and
it is the same insight as `rail-{slug}` one level down. A `listing` on its own is a single
sheet: a figure can only move it as a block, so leaving Programmes and leaving About were
literally the same animation. Named, the entries are hoisted out of the listing's snapshot
and travel one at a time — the sheet goes as a sheet and the things printed on it go in
order, which is `enter-work`'s unzip arriving on the pages that had nothing.

They are keyed, never positional. `item-3` on two pages would *pair*, and the browser would
morph a programme entry into a project card because they happened to be third. Keyed, they
are always only-children, which is what every figure here actually wants. The stagger rides
on three step classes alongside (`step-1`…`step-3`), because a `::view-transition-*`
pseudo-element can be selected by name and class and by nothing else — there is no
`:nth-child` on the far side of a snapshot. The step is published as a *number*
(`--item-step`) rather than as a delay, so a figure overriding an item's move with the
`animation` shorthand cannot silently reset the stagger; it multiplies the number out again.

`intro` and `listing` are named by **role, not by page**, and that is the whole reason the
section-to-section figures have anything to do. Programmes' intro and About's prose share
one identity, so the browser knows they occupy the same slot on the board and a lateral
move is an *exchange in a known position* rather than two unrelated fades. Before they
existed a section page named exactly one element — its heading — so every figure between
two section pages had a single sheet to slide and nothing to slide it against. They all
looked the same because they were the same.

They share the `part` view-transition-class, so what is true of both (hold your own
height, hinge about your bottom edge) is written once in `base.css`. A third role should
be resisted: a role only one page uses is a part with nothing to pair against, and the
pairs are where the figures come from.

There *was* a third, `panel` — "a self-contained card that is the page" — and contact was
its only user, which is the rule in the paragraph above catching one of its own. Every
figure had to name it explicitly alongside `intro` (`lateral.css`, `descend-ascend.css`,
`locale.css` each carried the extra selector) and every one of those rules did exactly
what the `intro` rule beside it did, because a part with no partner has no exchange to
make. It went with the route. The card is now `components/motion/PinnedNote`, an overlay
in the top layer, which no route change can reach and none needs to.

Per-slug names are the unlock. Today both the index and the detail page use one shared
`work-cover`, so only the cover can morph. With `rail-{slug}` and `cover-{slug}` the pager can
morph work→work, and the index can move *one* entry while the rest do something else.

### The signature move, `enter-work`, written out

The one the whole site is judged on. Every number below becomes a token.

```
t=0        pointer rests on row 007. cover-the-long-table fills the viewport
           behind the list under a 62% paper veil. (This exists today.)

0–140ms    the thirteen unclicked rows unzip. Each one translateX(-2rem) and
           fades, delayed by --stagger-step × min(|rowIndex − clickedIndex|, 6).
           The list peels away *from the row you chose*, not top-to-bottom.
           This is the "menu shrinks and goes off to the side" figure.

60–620ms   rail-007 travels left and up into the detail page's title slot. Its
           year and status columns are separate names and leave faster, so the
           row sheds detail as it goes rather than shrinking as a block.

80–760ms   cover-the-long-table morphs from full-bleed to the media column's
           first slot. The veil dissolves over the same interval — the photo
           comes up to strength rather than snapping. morph-soften blur peaks
           at 40%, resolves to 0 at both ends. (This part exists and is good.)

200–760ms  rail — the index reduced to a column of work numbers — scales in
           from the left edge and pins. The index is still on screen. This is
           the single detail that makes the navigation read as one canvas
           instead of two pages.

240–760ms  meta column rises 24px and fades in. pager last, from below.
```

`exit-work` is this sequence reversed, which is why the back button will stop feeling like a
different animation. `step-work` keeps `rail` and `meta` pinned and moves only the media and
the title, in the direction of `data-dir` — so the pager feels like paging, not navigating.

Roughly 40 named keyframe sets across the eight figures, living in `styles/motion/` split by
figure (`enter-work.css`, `lateral.css`, …) and imported once, because `::view-transition-*`
is document-scoped and cannot live in a CSS Module.

---

## 4. Phase 3 — scroll as continuous state

`src/components/motion/ScrollField.tsx` — `'use client'`, mounted once, ~60 lines, ~0.8 KB gz.

One `passive` scroll listener that does nothing but set a dirty flag. One rAF loop that reads
`scrollY` only (never `getBoundingClientRect`), and writes, in a single batched write phase:

- `--scroll-v` — smoothed signed velocity, clamped to ±1
- `--px` / `--py` — pointer position, same loop, desktop only

It publishes what something reads, and only that. `--scroll-dir` and `--scroll-p` were on this
list and are struck out: a custom property on `:root` is inherited by every element in the
document, so writing one no rule consumes buys a document-wide style invalidation per frame and
nothing else. Document progress is `animation-timeline: scroll(root)` in CSS (§5.4's `progress`
trigger), which needs no JavaScript at all, and an entrance picks `rise` or `fall` in its scene
rather than reading the reader's direction. Either can come back the moment a rule wants it —
but it comes back with the rule, not ahead of it.

The loop parks itself after 200 ms of stillness, so it costs nothing at rest.

What it buys, all in CSS, no further JS: media shears imperceptibly with velocity
(`scaleY(calc(1 + var(--scroll-v) * 0.02))`); hairlines strengthen while moving and settle
when still.

This list once included "the sticky meta column lags the scroll direction by a few pixels".
It is struck out and must not be built. A pinned column is the fixed thing a work is read
against — the reason `--space-pin` exists is so it does not move even the once, when it
catches. Lagging it would put the movement back by hand. Velocity belongs to the media.

---

## 5. Phase 4 — the trigger system

**This is the core of the request and the largest phase.** Every surface on the site is tied
to the scroll position. Nothing is static.

### 5.1 The mechanism — any element drives any other

The capability that makes a trigger system possible, rather than just "elements animate as
they enter," is **named timelines**. An element declares a timeline; a completely different
element consumes it:

```css
/* the trigger — declares a timeline from its own position in the scrollport */
.plate {
  view-timeline-name: --plate;
  view-timeline-axis: block;
}

/* the scope — makes the name visible to elements that are not descendants */
.work-page { timeline-scope: --plate; }

/* the target — a different element entirely, in a different column */
.meta-panel {
  animation: dim linear both;
  animation-timeline: --plate;
  animation-range: entry 40% exit 60%;
}
```

That is `ScrollTrigger.create({ trigger: '.plate', animation: tl, scrub: true, start: 'top
80%', end: 'bottom 20%' })` — with no JS, and running off the main thread. `timeline-scope`
is the piece that turns scroll-driven animation from a per-element effect into a real trigger
system, and it is the single most important CSS feature in this plan.

### 5.2 Pinning with scrub

ScrollTrigger's `pin: true` + `scrub: true`, natively: a tall track buys scroll distance, a
sticky child holds still inside it, and the `contain` range is exactly the pinned duration.

```css
.track   { block-size: 300svh; view-timeline-name: --pin; }
.pinned  { position: sticky; inset-block-start: 0; block-size: 100svh; }
.pinned > * {
  animation: whatever linear both;
  animation-timeline: --pin;
  animation-range: contain 0% contain 100%;
}
```

`contain` is the span during which the track fully covers the viewport — i.e. precisely the
frames where the sticky child is stuck. Three hundred viewport-heights of track is three
hundred viewport-heights of scrub. Everything ScrollTrigger's pinning does, except that the
browser does it on the compositor.

The one number the sketch gets wrong is `300svh`. A pinned scene's track is how much scroll
the figure costs, and where the thing being panned is a *list somebody edits* — the mentors
are rows in the admin — a fixed track spends the same two screens on four plates as on
twelve, so the pan gets faster with every person added. The filmstrip therefore states its
own: one screen for the pin, plus `--strip-plate-scroll` per plate, which is
`MentorStrip.module.css`'s `.section` and the only thing that component sets inline (the
count). `--pin-track` stays as the default for a pinned scene whose content is fixed.

Horizontal-under-vertical falls straight out of it:

```css
@keyframes pan-track { to { transform: translate3d(min(0px, 100cqi - 100%), 0, 0); } }
```

`min()` because the distance is only a distance while the strip is longer than its window.
A strip that already fits has a *positive* `100cqi - 100%`, and the keyframe that reveals
the far end of a long one would push a short one off to the right.

And none of it below `--bp-md`. A pin with a pan is a reading turned on its side, and a
window one plate wide is not a window: the figure becomes screens of vertical scrolling
spent moving content sideways past a frame the width of a single portrait. So `triggers.css`
builds `pin` and `pin-scrub` only from that width up — no track, no sticky window, no
`--pin` — and the component lays its content out down the page instead, which is the same
decision §9 makes under reduced motion, one width earlier.

### 5.3 The trigger vocabulary

Eight kinds, defined once in `styles/motion/triggers.css`, applied by a single
`<ScrollScene kind="…">` component that does nothing but set attributes (server component —
zero bytes).

| kind | ScrollTrigger equivalent | mechanism |
|---|---|---|
| `scrub` | `scrub: true` | `animation-timeline: view()`, `linear` |
| `enter` | `toggleActions: play …` | `view()` + `animation-range: entry`, non-linear ease |
| `pin` | `pin: true` | sticky child in a tall track; --bp-md up |
| `pin-scrub` | `pin` + `scrub` | above, `contain` range; --bp-md up |
| `stack` | `pin` down a list | per-entry track, sticky child, parts staggered on one timeline |
| `link` | `trigger: A, animate B` | `view-timeline-name` + `timeline-scope` |
| `progress` | document-level | `animation-timeline: scroll(root)` |
| `batch` | `ScrollTrigger.batch` | one shared timeline, staggered `animation-delay` |
| `snap` | `snap:` | `scroll-snap-type` on the section |

### 5.4 The effect vocabulary

Effects ride on triggers. Each is one keyframe set plus a `depth` parameter (0–3) that scales
its magnitude, so one file yields four behaviours.

| effect | what moves | notes |
|---|---|---|
| `focus` | scale 0.88 → 1 → 0.88 | peak at `cover 50%`; §6 |
| `drift` | internal pan ±2.5% | inside a clipped frame |
| `rise` / `fall` | translate ±Y | two effects, chosen by the scene — see §4 |
| `slide` | translate ±X | four directions, direction from `data-dir` |
| `unmask` | `clip-path` wipe | four directions; compositable |
| `split` | staggered type, masked from the leading edge | per *paragraph*, not per line — see below |
| `tilt` | `rotate3d`, ≤1.5° | perspective on the section |
| `shear` | `scaleY` from `--scroll-v` | the velocity term; §4 |
| `dim` | opacity → `--dim` | for things losing attention |
| `pan` | horizontal translate | under vertical scroll, §5.2; **takes no depth** |
| `swap` | cross-dissolve two plates | while pinned |
| `recede` | scale + dim on exit | exists; also what `stack` uses to hand off |

Two of these came out of the table differently from how they went in, and both are worth
recording rather than quietly correcting:

**`split` is per paragraph.** CSS cannot address a line box, so "per-line type, staggered"
has no honest implementation — the unit is the element the copy is authored in. The stagger
therefore comes from the *trigger* (`batch`, which ranges its children along one timeline)
rather than from `nth-child` delays inside a block, which is also why it composes with
anything else in this table instead of being a special case.

**`pan` takes no depth, and that is the exception that proves the rule.** Every other
magnitude here is a taste decision scaled 0–3. This one is a measurement: a filmstrip must
travel exactly far enough that its last frame lands on the far edge of its window, and a
quarter of that distance is not a subtler pan, it is four photographs the reader never sees.
It reads `100cqi` off the pinned frame instead — which is also why `pin`/`pin-scrub` make
that frame a container.

Eight kinds × twelve effects × four depths is the range being asked for, out of about
fourteen files. The combinations are data in `src/lib/choreography.ts`, not hand-written CSS
per surface.

### 5.5 Coverage audit — nothing is static

The rule is that every surface names a trigger. This table is the acceptance test.

| surface | trigger | effect |
|---|---|---|
| header hairline / nav | `progress` | `dim` on velocity; strengthens while moving |
| scroll rule (the margin) | `progress` | each line swells to full length and full ink as the reader reaches it; §5.5d |
| home — opening statement | `pin-scrub` | `unmask` per line while pinned, then `recede` |
| home — featured plate | `scrub` | `focus` d3 + `drift` d3 |
| works index — rows | `batch` | `slide` d1 assembling: number → title → disciplines |
| works index — row cover | `scrub` | `focus` d1 (touch only; a pointer device has the backdrop) |
| works index — hover backdrop | pointer | `drift` against `--px/--py` |
| works rail (detail) | `link` to media column | active number tracks the centred plate |
| work detail — media | `scrub` | `focus` d2 + `drift` d2 + `shear` |
| work detail — meta panel | `link` to media | `dim` while a plate is centred |
| work detail — pager | `progress` | `rise` over the last 15% |
| programmes — each entry | `stack` | the entry's parts `slide` d2 in as it rises; `recede` as it hands off |
| about — mentor filmstrip | `pin-scrub` + `pan` | horizontal filmstrip under vertical scroll; a column on a phone |
| about — the strip's rule | the same `--pin` | the margin rule turned on its side, drawn for the pin and no longer; §5.5d |
| about — prose | `batch` | `split` d1 per paragraph |
| about — project grid | `batch` | `rise` d1, staggered by column |
| about — project cover | `scrub` | `focus` d1, nested inside the card |
| contact | — | not a surface; an overlay pinned over one. §5.5b |
| footer | `progress` | `rise` at document end — on the pages that draw it; the works pages close on their own rule and the footer stands down |

The contact row used to read `scrub` + `sway` d1 — a card pinned at its top edge, turning
a fraction of a degree as the page moved under it — and it is the one row this table has
lost rather than retuned. A scroll-driven timeline describes an element's pass through the
scrollport, and an overlay in the top layer does not have one: it does not move with the
document, so there is nothing for `view()` to resolve against. `sway` had no second
surface, so it went with the row rather than staying as vocabulary nothing speaks. If a
hanging thing ever returns to the flow of a page, four lines bring it back.

### 5.5a Ranged triggers and symmetric effects — a defect class

Four rows above changed after the vocabulary met real markup, and two of them were
fixing the same bug rather than changing our minds. Worth stating as a rule, because it
will otherwise be reintroduced:

**A symmetric effect must not ride a ranged trigger.** `focus` and `drift` go down, up and
back down again; `enter` and `batch` bind an animation to a *slice* of the pass
(`entry 0% → entry 50%`) with `animation-fill-mode: both`. So the curve completes during
the entrance and then holds its final keyframe — which for `focus` is the dimmed, shrunk
one. "About's grid: batch + focus d1" therefore left every card on that page permanently at
0.9 scale and 55% opacity once it had scrolled in. It looked like a loading state that
never resolved.

Effects that end where they started (`rise`, `fall`, `slide`, `unmask`) are safe on any
trigger. `focus` and `drift` belong on `scrub`, which runs the whole `cover 0% → 100%`
pass, or nowhere.

The fix is also the better design, which is usually the sign it is the right one: the
card assembles (`batch` + `rise`) and the portrait inside it focuses (`scrub` + `focus`),
each on its own element. That is the nesting §5.4 was built for, and it is what the
original "focus d1, staggered by column" was reaching for.

### 5.5b Where the pinned scenes catch, and why it is not zero

`pin`, `pin-scrub` and `stack` all park content at the top of the viewport, and §5.2's
sketch pinned it at `0`. That sketch predates the chrome. The header on this site is
`position: sticky` at the top of every page, so a scene pinned at `0` parks its content
*underneath* it. `pin`/`pin-scrub` therefore catch at `--space-header` and size their child
`calc(100svh - var(--space-header))` — the two have to move together, because the offset
decides where the child catches and the block-size decides that its bottom edge lands on the
viewport's. `stack` catches at `--space-pin`, the same rest position the work detail's
metadata column uses, because a stacked entry and a pinned column are the same promise.

### 5.5c The reduced-motion trap the effect vocabulary does not cover

`prefers-reduced-motion` cancelling a *scrubbed* animation is not enough for a scene that is
also *scaffolding*. A pinned scene is a screen of content parked behind a tall empty track;
cancel the pan and leave the pin, and the reader gets three viewport-heights of nothing and
four photographs they can never reach. So the reduced-motion rules come in two halves, in
two files, and both are required: `effects.css` cancels the animations, `triggers.css`
collapses the tracks, releases the sticky and un-clips the window. What the released content
then *does* with the room is the component's decision — it is the only thing that knows
whether its overflow was a strip, a column or a caption. It is also the same arrangement a
phone gets, where `triggers.css` never built the scene at all, and the same one a browser
with no scroll timeline gets (§5.6), so the component states it once for all three — which
is why `MentorStrip.module.css` builds the plates in flow by default and the strip only
inside the `@supports` and the two media conditions the pan needs. The filmstrip wraps into
a gallery; it deliberately does not become a horizontal scroller, which would be a scroll
container a keyboard cannot always reach, offered to exactly the readers least served by
having to work for the content.

The same trap has a second mouth: `effects.css` cancelled `[data-scene]` and `[data-scene] >
*`, and both `pin-scrub` and `stack` drive an element *two* levels down. The selector list is
written out per kind for that reason. Add a kind, add its line.

### 5.5d The scroll rule — a `progress` scene with no element of its own

Every other row in the audit is a surface the page already had. This one is chrome: a column
of hairlines in the left gutter, fixed to the viewport, that says where in the page the
reader is. `components/motion/ScrollTicks`.

The figure is one sentence: **the lines never move, only their length does.** A line stands
to its full length and full ink as the reader arrives at the part of the document it stands
for, and settles back to a fifth of that as they pass — so what travels down the margin is a
swell, not a bar filling up. The longer lines it passes over are the page's key points, one
per programme, marked with `data-stop` on the block itself. That attribute is the whole
contract: a page that marks nothing gets no column, which is why this can sit in the layout
and still be drawn on the programmes index alone. The works index and a work's own page have
the rail, which already answers the question. About is a read rather than a list, and a
column counting off three section boundaries there is chrome measuring nothing — the thing
it would be indicating is a page you scroll through once.

Mechanically it is `progress` — `animation-timeline: scroll(root)` — taken to its limit:
*twenty-eight* animations on one timeline, each ranged over the slice of the document its
line answers to, `animation-range` computed per line and set inline. There is no scroll
handler and no per-frame JavaScript at all; the ranges of the first and last few lines fall
outside 0–100% on purpose, so the top of the column is already lit when the page is at the
top. The one thing CSS cannot answer is *where a key point is*, because that is a
measurement — taken once after layout and again on any change of the document's height, by a
`ResizeObserver`, and never while the page is moving. It is measured on the block rather
than on its heading because the heading of a stacked entry is inside the sticky child: its
box reports the scroll position, not the layout.

And a key point is one *of* those twenty-eight lines, never a twenty-ninth element laid over
them. The measured fraction is rounded to the nearest line and then thrown away — two blocks
that round to the same line walk apart to the nearest free one, since a key point that isn't
drawn is a worse error than one drawn a line off — so the ruler keeps one even rhythm and a
key point differs from its neighbours in exactly one property: how far it rests. Placing a
mark at its raw fraction instead is the version that looks broken, and it is worth naming
because it is the obvious implementation: the mark lands a hair off the line beside it, at a
spacing shared with nothing, and the eye reads two rulers that disagree rather than one rule
with some long lines in it.

Three decisions rather than three omissions. It is not drawn below `--bp-lg`, where the
gutter that bounds its length is too narrow to hold it — the same width `WorkRail` stops at,
for the same reason. It is not drawn under `prefers-reduced-motion`: cancelling the swell
leaves a column of identical dashes, and a thing whose entire content is its travel has
nothing to say standing still. And it is not drawn at the top of a page. An indicator of
where the reader is, present before the reader has gone anywhere, is reporting a position
nobody has taken — it arrives with the page as part of the furniture rather than as an
answer to a question, which is what made it read as odd on the programmes index. So the
column itself is a twenty-ninth animation on the same `scroll(root)`: absent through the
first `--tick-wake-start` of travel, fully there by `--tick-wake-end`, both distances rather
than fractions of the document, because "a bit of scroll" is a fixed amount of the reader's
movement and not a proportion of a page they cannot see the length of. It is scrubbed like
everything else here, so scrolling back to the top takes it away again — the figure the
header rule already runs (`SiteHeader.module.css`), which fades its hairline in over the
first `--space-xl`.

**The same instrument, turned on its side.** The filmstrip is the site's one horizontal
reading, and horizontal travel under vertical scroll is precisely the motion a reader has no
built-in indicator for — the scrollbar is measuring the page, not the row. So a band of the
same hairlines lies under the plates, growing upward instead of outward, and it appears as
the section takes the screen and leaves with it: chrome for the length of one figure and
nothing on either side of it. It lives in `MentorStrip` rather than in `ScrollTicks`, and
that is not duplication deferred until the rule of three — the two share a figure and share
neither a mechanism nor a subject. The margin rule measures the *document*, on
`scroll(root)`, and has to find its key points by measuring the DOM because only the DOM
knows where a programme sits; this one measures the *pin*, which is already a timeline, so
every line is one `contain`-ranged animation on `--pin`, there are no key points to find, and
it renders on the server and ships nothing at all.

The one piece of machinery it needed is in `triggers.css`: a `pin-scrub` window drives every
child it has, so a second child would have panned off the edge along with the strip it was
measuring. `[data-still]` marks a child as furniture — positioned against the window rather
than carried across it — which states a convention `MentorStrip` had until now been keeping
by only ever rendering one child.

### 5.5b `pin` — the one figure that is not attached to a route at all

The contact card is the only block on this site that is an *object* — a card with edges,
on the paper, rather than a region of it — and an object should be put down the same way
however you arrived at it. That sentence was here before the card was built, and for a
while it lived in `styles/motion/pin.css`: a figure attached to the `panel` part,
overriding whichever navigation figure had brought it, winning on source order because
`index.css` imported it last.

Every part of that arrangement was working around the same mistake. A route change was
the only thing that could trigger it, so the object could only be put down by *going to
it*; the override existed because a navigation figure was going to move the card anyway;
the source-order dependency existed because the override tied on specificity. Take the
route away and all three go with it.

So contact is not a page. `components/motion/PinnedNote` is a `popover` in the top layer,
opened by the nav item from wherever the reader already is, and the figure runs on
`:popover-open` instead of on `:root[data-figure]`. The move is unchanged — held above the
board at `--part-lift`, leaning back through `--pin-tilt`, down onto the tack — and three
things it could not have as a page fall out of it:

- **It can be moved.** The reader picks the card up, it straightens off its tack and
  lifts, and it goes wherever they put it. Held in a ref and published as two custom
  properties, one write per frame, no React state and no DOM read after the press.
- **The lean is static.** A card on one pin hangs a few degrees off level — `--pin-lean` —
  and that is appearance rather than motion, so reduced motion leaves it alone while
  cancelling everything else here.
- **It outlives navigation.** The popover is mounted in the locale layout, not in a page,
  so it survives a route change with the card still open and still where it was put.

The drag is mouse-only. That is the `pointer: fine` decision §9 asks to be taken rather
than inherited: dragging on touch means `touch-action: none`, which is a phone's scroll
handed over to a card covering most of its screen. On touch, and for a keyboard, the note
is a panel — which is what it is anyway, the drag being a way to move the card rather
than a way to reach anything in it.

The other half of "no JavaScript we do not need": the open, the close, Esc, light dismiss,
the invoker's `aria-expanded` and the tab order from the button into the panel are all the
platform's. The trigger is a plain `<button popovertarget>` in a server-rendered nav, so
there is no open-state in React anywhere and the header never becomes a client component.

### 5.6 Support and fallback

`animation-timeline`, `view-timeline-name` and `timeline-scope` are available in current
Chrome, Edge and Safari. **Firefox is not one of them** — as of this writing it ships all
three only behind `layout.css.scroll-driven-animations.enabled`, not on release (Mozilla
bug 1676779, still open). Everything above sits inside
`@supports (animation-timeline: view())`, which is therefore false on every release
Firefox, and the whole trigger vocabulary in triggers.css goes inert there — this is not a
rare edge case, it is a widely-used browser getting nothing.

The fallback is one shared `IntersectionObserver` (`components/motion/EnterFallback`) that
adds `data-seen`, giving `enter` behaviour and nothing else — no scrub, no pin, no link —
read by `styles/motion/fallback.css`, itself gated by `@supports not (animation-timeline:
view())` so it only ever parses where the trigger CSS cannot run. This is deliberate and
should not be extended into emulating scrub in JS: a main-thread handler per element is the
thing that makes scroll-animated sites feel bad. Firefox gets a calm site with one honest
entrance per surface; Chrome, Edge and Safari get the full figure.

Two kinds need no fallback at all, for opposite reasons. `scrub`'s effects (`focus`,
`drift`) rest at the *middle* of their curve, not an edge — a browser that cannot scrub
them is already showing the right picture doing nothing. `pin-scrub`'s fallback is
structural, not a reveal: `MentorStrip.module.css` builds the strip *only* inside the
`@supports`, so a browser with no scroll timeline never gets a row it cannot move — it gets
the plates wrapped in flow, which is the arrangement §5.5c already gives a phone and a
reduced-motion reader. One arrangement, one reason: there is no pan to carry them.

That replaced a plain, natively-scrollable `.window`, and the reason is §10 rather than
taste. A scroll container is not keyboard-focusable in Firefox, and Firefox is the entire
audience for this fallback — so every plate past the viewport edge was reachable by gesture
and by nothing else, on the one browser the fallback exists for. §5.5c had already refused
a horizontal scroller for the reduced-motion reader in the same words; the strip was only
ever the *default* arrangement rather than a chosen one, and a browser missing the feature
fell into it because nothing took it back out.

### 5.7 On GSAP

We are building the ScrollTrigger *behaviour*, natively. GSAP core plus ScrollTrigger is
~34 KB gz and runs every scrub on the main thread; the CSS above is 0 KB and runs on the
compositor. The features it would add that we genuinely cannot express are JS callbacks on
enter/leave, and multi-segment timelines with different easing per segment — neither of which
appears in §5.5. If a surface later needs one, that is the moment to reconsider, not now.

---

## 6. Phase 5 — the focus curve (media)

The behaviour described directly: biggest at the centre, shrinking away at both edges,
continuous. `src/components/motion/Focus.tsx` **replaces `Reveal`** on every media surface —
media stops having an entrance at all, which is what removes the back-navigation weirdness at
the root (there is no state to be in).

```css
@keyframes focus {
  from { transform: scale(var(--focus-min)); opacity: var(--focus-dim); filter: blur(var(--focus-blur)); }
  50%  { transform: scale(1);                opacity: 1;                filter: blur(0); }
  to   { transform: scale(var(--focus-min)); opacity: var(--focus-dim); filter: blur(var(--focus-blur)); }
}

.focus {
  animation: focus linear both;
  animation-range: cover 0% cover 100%;   /* explicit, unlike Parallax today */
  animation-timeline: view();
}
```

Peak at `cover 50%` is exactly the element centred in the viewport. The curve is symmetric,
so it looks identical scrolling up and down.

| depth | `--focus-min` | drift | blur | used by |
|---|---|---|---|---|
| 0 | 0.96 | ±1.2% | 0 | rail thumbnails, small portraits |
| 1 | 0.92 | ±2.0% | 1px | programme imagery, About's project covers |
| 2 | 0.88 | ±2.5% | 2px | work detail media column |
| 3 | 0.82 | ±3.5% | 3px | full-bleed plates |

Blur is desktop-only (`min-width: 1024px`), capped at the six elements that can be in view at
once, and is the first term to drop if the frame budget moves.

`Parallax` survives as the internal pan inside the focus frame, retuned and given its missing
explicit range.

---

## 7. Phase 6 — the rail (decision A)

The works index does not disappear when you open a work. It compresses.

**On `/works`** — the full-width list as today: number, title, disciplines, year, status, with
the hover backdrop behind it.

**On `/works/{slug}`** — the same component, `data-compressed`, rendered as a sticky left
column: just the numbers, `013 012 011 010 …`, with the active work's entry expanded to show
its title. Clicking any number is a `step-work` navigation. Above `--bp-lg` it is a
`position: sticky` full-height column at the far left; the metadata panel moves inboard to
make room.

**Below `--bp-lg` the rail is not rendered.** A rail on a 390 px screen costs width it cannot
afford, and the pager already answers the same question. This is a real decision, not an
omission.

**It is one component**, `WorkRail`, rendered by both routes and carrying the `rail`
view-transition-name in both. That is what lets the browser interpolate between the two
layouts instead of crossfading them — the list genuinely compresses, because it is the same
element in both states. This is the architectural change the "canvas" reading requires, and
it is why option A was the right call.

Its trigger (§5.5): `link`ed to the media column, so the active number tracks whichever plate
is centred as you scroll the work. The rail is a scroll position indicator and a navigation at
once.

### 7.1 The hover figure belongs to the rail too

The rail is the index compressed, so it hovers like the index. Resting on a number fills the
viewport behind the page with that work's cover — the same `HoverMediaLayer`, the same veil —
and the click that follows morphs that photograph into the next work's media column. Index →
work and work → work are then the same move, which is the whole argument for a persistent
rail: if the compressed index behaved differently from the full one, it would be a different
component wearing its name.

Three things make it work, and each is somewhere the naive version fails:

- **The figure does not change.** A rail click is still `step-work`. What turns the slide into
  a morph is only that the backdrop is already holding `cover-{next}` when the navigation
  starts, so that name is on both sides and the browser pairs it. `step-work.css` therefore
  slides `::view-transition-old(.cover):only-child` — a cover with no partner — and leaves a
  paired one to the morph in `base.css`. A pager click, which has no backdrop, is unchanged.
- **The active entry previews nothing.** Its cover is already this page's hero, and two
  elements holding `cover-{slug}` at once abort the transition rather than run it (§0.4).
- **The page behind steps back to `--preview-dim`, part by part.** Not one opacity on a
  container: a view-transition snapshot keeps an element's own opacity and drops its
  ancestors', so a part dimmed from above is captured at full strength and flashes back to
  full ink the instant you click. The hero, the metadata, the pager's links and the plates
  each carry it, at the one level in their subtree that is neither animated by a scene nor
  pinned by the reduced-motion rule.

---

## 8. Phase 7 — smooth scroll (last, and conditional)

A hand-rolled lerp scroll, ~1.2 KB, desktop fine-pointer only, off on touch, off under reduced
motion. It must drive real `scrollTo` rather than transforming a wrapper element — a
transformed wrapper breaks every timeline and every `position: sticky` in §5 and §7.

Built last and kept only if it measures clean. It reliably costs INP, and a laggy scroll is
worse than a plain one. Build, measure, decide.

---

## 9. Rules this bends, and the ones it does not

`CLAUDE.md` asks for conflicts to be named rather than broken silently. Named:

- **§5 YAGNI / rule of three — suspended for `components/motion/` and `styles/motion/`.** The
  motion layer is the product here; abstracting on the third use is the wrong threshold for a
  vocabulary that must be internally consistent from the first use.
- **§8 "nothing longer than 700 ms" — raised to 900 ms for `enter-work` and `exit-work` only.**
  A 760 ms move with a 140 ms stagger inside it needs the headroom or it reads as clipped.
  Every other figure stays under 700 ms. Scrubbed animations have no duration at all — they
  are position-driven — so the rule does not apply to §5.
- **§8 "one easing vocabulary" — kept.** This is what makes sixty animations read as one system
  rather than a mess. Two easings, plus one addition: `--ease-lead`, overshoot-free, for
  elements that must arrive ahead of their neighbours. Scrubbed animations stay `linear`,
  always — easing a scroll-linked animation makes the page feel like it is fighting the
  pointer.
- **§7 JS budget — held.** `NavStage` + `ScrollField` ≈ 2.5 KB gz; the trigger system ships
  zero. This is the argument for building it this way rather than reaching for GSAP.
- **New rule: the incoming half of a transition never carries a delay.** A delay on the
  *outgoing* half is free — the reader is still looking at a full-opacity page. A delay on
  the incoming half is dead air between the press and any visible response, and every
  figure here had inherited one of `--dur-fast`. 140 ms is well past the ~100 ms at which
  a pointer interaction stops feeling connected to its result, so every navigation on the
  site read as laggy, and was. The overlap the delay was buying is bought instead by
  running the two halves concurrently at different durations. Parts may still be
  staggered — that is choreography inside a move that has already visibly started.
- **And its corollary: nothing expensive runs in the click handler.** The dev-only
  duplicate-name audit was a `getComputedStyle` over every element in the document,
  called synchronously before the transition. It is now scheduled onto a macrotask, which
  still sees the outgoing DOM (React has not committed) and no longer sits between the
  press and the first frame.
- **§7 "only transform, opacity, filter, clip-path" — kept, without exception.** Not a style
  preference: animating layout properties drops the frame rate, and flow does not survive
  20 fps. Everything above is compositable.
- **§9/§10 — kept.** Keyboard parity for the hover figures, `prefers-reduced-motion` as one
  switch, contrast floors unchanged. Reduced motion must also cancel scroll-driven
  animations outright — a zero duration does not stop a position-driven timeline, which is a
  trap every scroll-driven module has to handle for itself: `effects.css` and the wrappers'
  own modules cancel with `animation: none !important` and a stated resting value, and
  `triggers.css` goes further for the pinned kinds — the track collapses and the sticky
  child lets go, because a scene whose figure is switched off must not keep the scroll it
  was going to spend.

Scope: ~34 new files, ~22 modified. Not 200 — the range comes from the trigger × effect ×
depth table, and 200 fragments would run slower and be impossible to keep coherent.

---

## 10. Order of work

| phase | contents | gate |
|---|---|---|
| 0 | the five defects in §0 | no visual regressions; back-nav is clean |
| 1 | `nav-intent`, `NavStage`, scroll restoration | `data-figure` correct for all 8 figures |
| 2 | named parts, the eight figures | `enter-work` reads as one continuous move |
| 3 | `ScrollField` | ≤1 rAF, parks at rest, no layout reads |
| 4 | trigger + effect vocabulary | §5.5 table fully covered |
| 5 | `Focus`, delete `Reveal` | no media has an entrance |
| 6 | `WorkRail` | rail interpolates between both layouts |
| 7 | smooth scroll | INP still under budget, or it is dropped |

Re-measure the §7 budgets after phases 2, 4 and 7. Phase 4 is the one most likely to move
them.
