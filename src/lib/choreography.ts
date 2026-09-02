/**
 * Which trigger and effect each surface gets. MOTION.md §5.4–5.5.
 *
 * The combinations are data, not hand-written CSS per surface: a component reads
 * one of these presets and hands it to <ScrollScene>, which sets the attributes
 * styles/motion/triggers.css and effects.css key off. That is why "give the
 * mentor grid a shallower focus" is an edit here, not a new stylesheet — and why
 * the §5.5 coverage audit can be read straight off this object.
 *
 * Depth 0–3 scales an effect's magnitude (§5.4); the focus curve reads it as one
 * of its four tuned steps (§6).
 */
export type SceneKind =
  | 'scrub'
  | 'enter'
  | 'progress'
  | 'batch'
  | 'pin'
  | 'pin-scrub'
  | 'stack'
  | 'snap';

export type SceneEffect =
  | 'focus'
  | 'drift'
  | 'rise'
  | 'fall'
  | 'slide'
  | 'split'
  | 'unmask'
  | 'pan'
  | 'tilt'
  | 'shear'
  | 'dim'
  | 'recede';

export type Depth = 0 | 1 | 2 | 3;

export interface Scene {
  kind: SceneKind;
  effect: SceneEffect;
  depth: Depth;
}

/**
 * One entry per surface in the §5.5 audit that the current DOM has. The plan's
 * more elaborate kinds — the home statement's pinned unmask, the works rail's
 * linked timeline — arrive with the structure they need (the rail is Phase 6);
 * where a surface here reads a lighter kind than the audit's ideal, it is because
 * that ideal wants markup this surface does not yet have, and `enter` is the
 * honest degradation until it does.
 */
export const scenes = {
  /** A gallery’s plates: biggest at centre, drifting. */
  galleryPlate: { kind: 'scrub', effect: 'focus', depth: 3 },
  /** Works index rows: assemble as the list scrolls in. */
  worksRows: { kind: 'batch', effect: 'slide', depth: 1 },
  /**
   * The cover inside a works-index row, where one is rendered at all (a touch
   * device; a pointer device shows the hover backdrop instead). Media, so it
   * gets what all media gets: the focus curve rather than an entrance.
   */
  worksRowCover: { kind: 'scrub', effect: 'focus', depth: 1 },
  /** Work detail media column: the focus curve, at column depth. */
  workMedia: { kind: 'scrub', effect: 'focus', depth: 2 },
  /** Work detail pager: rises in as the document nears its end. */
  workPager: { kind: 'progress', effect: 'rise', depth: 1 },
  /**
   * Programmes: the four entries take the screen one at a time.
   *
   * This used to be `enter` + `unmask` per entry, and the honest description of
   * that is a wipe — the page was a flat list with one reveal on it, which is
   * what §5.5 had settled for while the vocabulary was still `enter` and
   * `batch`. The audit's own row for this surface says `pin-scrub`, and a stack
   * is that figure applied down a list rather than to one section: each entry
   * rises, catches, is read, and steps back under the next.
   *
   * `slide`, at depth 2, is what the entry's own parts do as it comes up — the
   * number, the name and its particulars, the summary, each a beat behind the
   * last. The stagger is the whole effect: everything arriving at once is a
   * fade however far it travels.
   */
  programmes: { kind: 'stack', effect: 'slide', depth: 2 },
  /**
   * About, the mentors: six portraits on one strip, travelling sideways while
   * the section holds the screen. MOTION.md §5.2 and the §5.5 audit's "pin +
   * pan"; the effect that had a name and a keyframe budget in the plan and no
   * surface to run on until this page carried a row of images.
   *
   * Depth is stated for the shape of the type, not read: `pan` measures its
   * travel off the window it is inside, because a filmstrip that goes 75% of the
   * way is not a subtler filmstrip, it is two plates the reader never reaches.
   */
  mentorStrip: { kind: 'pin-scrub', effect: 'pan', depth: 3 },
  /**
   * About prose: paragraph by paragraph, staggered as the block scrolls in.
   *
   * `split` rather than `rise` — the mask travels from the leading edge while
   * the lines settle, so the copy reads as being written rather than as having
   * faded up. It is per paragraph, not per line: a browser cannot address a line
   * box, and the paragraph is the unit the writing is authored in anyway.
   */
  prose: { kind: 'batch', effect: 'split', depth: 1 },
  /**
   * The project grid on About: the *cards* assemble, staggered by the batch.
   *
   * This used to read `focus`, and that was a defect rather than a taste
   * question. `focus` is a symmetric scrub curve — down, up, down — and `batch`
   * runs its children over `entry 0% → entry 50%` with `animation-fill-mode:
   * both`. So the curve completed during the entrance and then *held its end
   * keyframe*, which is the dimmed, shrunk one: every card came to rest
   * permanently at 0.9 scale and 55% opacity, and stayed there for as long as
   * the page was open. Anything ending at its start state (`rise`, `slide`,
   * `unmask`) is safe on a ranged trigger; the two symmetric effects, `focus`
   * and `drift`, only ever belong on `scrub`, which runs the whole pass.
   *
   * The pictures still focus — see projectCardCover, which nests a scrub inside
   * each card. That is the composition the effect vocabulary is built for, and it is
   * what the §5.5 audit's "focus d1" was actually asking for.
   */
  projectCards: { kind: 'batch', effect: 'rise', depth: 1 },
  /** And the picture inside each card, on its own continuous pass. */
  projectCardCover: { kind: 'scrub', effect: 'focus', depth: 1 },
  /*
   * Contact had a scene here — `scrub` + `sway`, a card pinned at its top edge
   * turning a fraction of a degree as the page moved under it. It went with the
   * page: the card is now an overlay in the top layer (components/motion/
   * PinnedNote), and an overlay does not move with the document, so a
   * scroll-driven timeline has nothing to say about it. `sway` had no other user
   * and went too, rather than staying as vocabulary nothing speaks.
   */
  /** Footer: rises in at the end of the document. */
  footer: { kind: 'progress', effect: 'rise', depth: 1 },
} as const satisfies Record<string, Scene>;

/** The data attributes triggers.css and effects.css key off. */
interface SceneAttrs {
  'data-scene': SceneKind;
  'data-effect': SceneEffect;
  'data-depth': Depth;
}

/**
 * A scene as a spreadable set of attributes, so it lands on the element that is
 * already there — `<ul {...sceneAttrs(scenes.worksRows)}>` — rather than in a
 * wrapper div that would sit between a grid and its placed children. This is the
 * "<ScrollScene> that does nothing but set attributes" of §5.3, minus the DOM
 * node. It is pure and server-side, so it ships nothing.
 */
export function sceneAttrs(scene: Scene): SceneAttrs {
  return { 'data-scene': scene.kind, 'data-effect': scene.effect, 'data-depth': scene.depth };
}
