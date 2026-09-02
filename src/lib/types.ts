/**
 * The locales, as data. `Locale` derives from it so the runtime list and the
 * compile-time union cannot drift: adding one is a single edit here.
 */
export const LOCALES = ['zh', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/** Every user-visible string in the content bundle is this shape. Never a bare string. */
export type LocalisedText = Record<Locale, string>;

/**
 * A reference to a photograph in the bucket. Intrinsic dimensions are not
 * repeated here: the admin measures them when the file is uploaded and the
 * content bundle carries them, so a content record can never disagree with the
 * file. lib/media.ts is what hands them to Media.
 */
export interface ImageRef {
  /** The R2 object key, e.g. "works/edible-house/01.jpg" */
  src: string;
  /**
   * REQUIRED. Empty string only for decorative images, and that must be
   * deliberate. `src` is empty only for a private work, whose cover the admin
   * withholds — see parseWorks.
   */
  alt: LocalisedText | '';
}

export type WorkStatus = 'completed' | 'in-progress' | 'private';

export interface Work {
  slug: string; // URL segment, kebab-case, stable forever
  index: number; // the ium-style running number shown in the list
  title: LocalisedText;
  status: WorkStatus;
  discipline: LocalisedText[]; // "Architecture", "Spatial Illustration"
  year: number;
  summary: LocalisedText;
  credits: { role: LocalisedText; name: LocalisedText }[];
  cover: ImageRef; // shown on hover in the index; also the LCP on detail
  media: ImageRef[]; // the scrolling right column, in order
}

/**
 * What a listing row needs, and nothing else: the works index and the rail both
 * render exactly these fields.
 *
 * It exists because both of those are client components, so every field handed
 * to them is serialised into the page's flight payload whether it is read or
 * not. The whole registry is ~17 KB of JSON, most of it summaries, credits and
 * media arrays that a row never shows — and a work's detail page would carry
 * every *other* work's prose for the sake of a column of numbers. A `Pick`
 * rather than a second hand-written interface, so a field renamed on `Work`
 * cannot quietly stop being sent.
 */
export type WorkListing = Pick<
  Work,
  'slug' | 'index' | 'title' | 'status' | 'discipline' | 'year' | 'cover'
>;

export interface Program {
  slug: string; // stable key; programmes have no page of their own
  name: LocalisedText;
  audience: LocalisedText;
  duration: LocalisedText;
  summary: LocalisedText;
}

export interface Mentor {
  slug: string;
  name: LocalisedText;
  discipline: LocalisedText;
  note: LocalisedText; // exactly one line
  portrait: ImageRef;
}

/**
 * A project: a picture, a name, and a line or two about it.
 *
 * The smallest record in the bundle, and its smallness is the point. About used
 * to end on a grid of the *works*, drawn from the works registry under a heading
 * that called them projects — so the studio could neither put anything under
 * that heading that was not a work, nor keep a work off it. Two unlike things
 * shared one collection because they looked alike on the day the page was drawn.
 *
 * What a project is not, it is not on purpose. No status: a work is completed,
 * in progress or private because the index says so beside its number, and
 * nothing on About says anything of the kind. No year, no disciplines, no
 * credits — those are the columns of the works index, and the index is where
 * they are read. And no page, so no route: a card is not a link, and `slug` is a
 * stable key for ordering and for filing the photograph under, the way a
 * programme's is. Nothing resolves a project by it.
 */
export interface Project {
  slug: string;
  title: LocalisedText;
  /** The line or two under the picture. */
  summary: LocalisedText;
  image: ImageRef;
}

/**
 * The four pages the site has.
 *
 * **The set is code, and so is the composition of each one.** Every page here
 * is a route file with its own layout, its own choreography and its own view
 * transitions — the front page's statement holding a screen on its own, the
 * mentors read across a pinned window, the programmes stacking one at a time.
 * A fifth page is therefore a design and the motion that goes with it, not a
 * row somebody adds on a Tuesday; the admin edits the words on these four and
 * cannot invent a page nothing has been drawn for.
 *
 * What the pages do *not* carry is the collections they show. The works index
 * is the works, the programme list is the programmes, the band of portraits is
 * the mentors, the grid at the foot of About is the projects — a page names a
 * collection rather than holding one, so adding a work changes three pages and
 * touches nothing here.
 */
export const PAGE_KEYS = ['home', 'works', 'programs', 'about'] as const;

export type PageKey = (typeof PAGE_KEYS)[number];

/** The three pages the nav bar carries, in the order it carries them. */
export const NAV_PAGES = ['works', 'programs', 'about'] as const;

export type NavPage = (typeof NAV_PAGES)[number];

/** What every page carries: the words that name it to a reader and to a crawler. */
export interface PageText {
  /**
   * The page's own title — its `h1`, its document title, and its word in the
   * navigation bar, all three. A page called one thing in the bar and another
   * at the top of itself is a page the reader has to reconcile.
   */
  title: LocalisedText;
  /** The meta description. */
  description: LocalisedText;
}

/** The front page: one line, and the studio's photographs under it. */
export interface HomePage extends PageText {
  statement: LocalisedText;
  /** The plates below the statement, in order. May be empty. */
  gallery: readonly ImageRef[];
}

/** Programmes: the paragraphs above the list, which is the programmes. */
export interface ProgramsPage extends PageText {
  intro: readonly LocalisedText[];
}

/**
 * About: the prose, then the people, then the projects.
 *
 * `projectsTitle` used to head a second drawing of the works index. It heads the
 * projects now, which are records of their own; the heading did not have to
 * change, because it was always the honest name for what it labelled.
 */
export interface AboutPage extends PageText {
  intro: readonly LocalisedText[];
  mentorsTitle: LocalisedText;
  projectsTitle: LocalisedText;
}

export interface SitePages {
  home: HomePage;
  /** The index of works needs nothing but the words that title the page. */
  works: PageText;
  programs: ProgramsPage;
  about: AboutPage;
}

/**
 * One item of the nav bar.
 *
 * The bar is the three inner pages, in the order this file lists them, each
 * labelled by its own title — so nothing holds a second list of words that
 * could disagree with the first, and a page cannot be in the bar under one name
 * and at the top of itself under another. The Contact item is not here: it
 * opens a panel over the page you are on rather than leading to one, so it
 * belongs to the chrome and its label is in the dictionary.
 */
export interface NavItem {
  page: NavPage;
  label: LocalisedText;
}

/**
 * The site itself: the parts of it that are not a page.
 *
 * `locales` and `url` belong to the deployment and are stamped into the bundle
 * by the admin rather than edited in it.
 */
export interface SiteContent {
  name: LocalisedText;
  /** Origin for canonical URLs, hreflang and og:image. Change this on deploy. */
  url: string;
  /** Non-empty, and order matters: the first entry is the default served at `/`. */
  locales: readonly [Locale, ...Locale[]];
  localeNames: Record<Locale, string>;
  contact: {
    email: string;
    wechat: string;
    address: LocalisedText;
    hours: LocalisedText;
  };
}

/**
 * UI copy — the strings that belong to the *interface* rather than to a page.
 * One object per locale, both typed as this, so a key that exists in zh and not
 * in en is a build error rather than a blank on the page.
 *
 * What is not here is as deliberate as what is. A page's title, its prose and
 * the words over its parts are on `SitePages`, because they belong to that page;
 * these are the words that appear on every page and belong to none — the pager
 * on a work, the labels a screen reader hears, the contact card, the footer. A
 * key here exists because a *component* reads it by name, which is why the set
 * is fixed and the admin only ever edits values.
 */
export interface Dictionary {
  /** How an inner page's document title is composed. `%s` is its own title. */
  meta: { titleTemplate: string };
  a11y: {
    skipToContent: string;
    primaryNav: string;
    localeSwitch: string;
    worksList: string;
    worksRail: string;
    workPager: string;
    /** The close mark on the contact card is drawn, so this is its only name. */
    close: string;
  };
  /** The three words for a work's state, read by the index and by a work page. */
  works: { status: Record<WorkStatus, string> };
  work: {
    index: string;
    status: string;
    year: string;
    discipline: string;
    credits: string;
    previous: string;
    next: string;
  };
  /** No `description`: contact is a card, not a page, so it fills no <meta>. */
  contact: {
    /** The word in the nav bar that opens the card. The one nav label that is
        copy rather than a page, because the card is not a page. */
    nav: string;
    title: string;
    email: string;
    wechat: string;
    address: string;
    hours: string;
    note: string;
    /** The message form. `from` and `message` name the two fields; `subject` is
        the line the reader's mail client opens with, so it is copy too. */
    from: string;
    message: string;
    subject: string;
    send: string;
  };
  notFound: { title: string; body: string; home: string };
  footer: { note: string };
}
