/**
 * The gate between the content bundle and the rest of the app.
 *
 * The content is fetched from CAFA-Admin at build time and written to
 * `content/bundle.generated.json` by scripts/fetch-content.mjs. That it comes
 * over the wire rather than out of checked-in files changes nothing about what
 * has to be true of it, and it makes this gate matter more rather than less: it
 * is the only thing standing between a database somebody edited this morning
 * and a page that renders `undefined`.
 *
 * JSON costs the compiler its knowledge of the shape — a parsed field is
 * `string` where the app needs `WorkStatus`, and `string[]` where it needs a
 * non-empty tuple. These functions pay that cost back. They run once, at module
 * scope in lib/content, which means `next build` is where a malformed record is
 * caught, with a path to the offending field instead of a blank on a page.
 * Nothing here is a cast: every narrowing is a check that can fail, and failing
 * stops the build — which leaves the previous deploy serving.
 *
 * The pages are four named records rather than a list, and this gate reads them
 * by name for the same reason `parseDictionary` spells its keys out: each has
 * different fields, so a loop would have to accept the union of them and would
 * stop being able to say which one is missing.
 */
import {
  LOCALES,
  type AboutPage,
  type Dictionary,
  type HomePage,
  type ImageRef,
  type Locale,
  type LocalisedText,
  type Mentor,
  type PageText,
  type Program,
  type ProgramsPage,
  type Project,
  type SiteContent,
  type SitePages,
  type Work,
  type WorkStatus,
} from './types';

function fail(at: string, expected: string): never {
  throw new Error(`content: ${at} — expected ${expected}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function object(value: unknown, at: string): Record<string, unknown> {
  if (!isRecord(value)) fail(at, 'an object');
  return value;
}

function array(value: unknown, at: string): unknown[] {
  if (!Array.isArray(value)) fail(at, 'an array');
  return value;
}

function text(value: unknown, at: string): string {
  if (typeof value !== 'string') fail(at, 'a string');
  return value;
}

/** Copy that reaches the page. Blank is a defect, not an empty state. */
function filled(value: unknown, at: string): string {
  const found = text(value, at);
  if (found.trim() === '') fail(at, 'a non-empty string');
  return found;
}

/**
 * A URL something posts to, or null where there is none.
 *
 * Null, absent and empty are one answer — a site whose admin has not been told
 * its own origin, or a revision published before the field existed — and it is
 * not a failure: the card falls back to handing the reader a `mailto:` draft,
 * which is what it did before there was anywhere to post. A value that is
 * present and not a string is a different matter, and fails the build.
 */
function endpoint(value: unknown, at: string): string | null {
  if (value === null || value === undefined) return null;
  const found = text(value, at);
  return found.trim() === '' ? null : found;
}

function whole(value: unknown, at: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) fail(at, 'a whole number');
  return value;
}

/**
 * A hue on the colour circle, or null where there is none to have.
 *
 * Absent and null both read as null, and that is not laxity: a photograph with
 * no chromatic content genuinely has no hue, and neither does one the admin has
 * not measured yet. Both want the same neutral band, so both produce the same
 * value rather than one of them being an error. A hue that is *present and out
 * of range* still fails the build, because that is a bug rather than an absence.
 */
function hue(value: unknown, at: string): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 360) {
    fail(at, 'a hue in [0, 360) or null');
  }
  return value;
}

/**
 * A photograph's version, or null where the admin has none to give.
 *
 * Absent and null are one answer, for the same reason they are one answer for
 * `tint`: a revision published before the admin recorded versions carries no
 * such field, and the honest reading of that is "this photograph has no
 * version", not "this bundle is malformed". It costs the cache-busting on
 * photographs nobody has replaced since, and they get one the next time they
 * are uploaded. A value that is *present and not a string* still fails the
 * build.
 */
function name(value: unknown, at: string): string | null {
  if (value === undefined || value === null) return null;
  return text(value, at);
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A slug is part of a URL forever, so it is checked rather than trusted. */
function slug(value: unknown, at: string): string {
  const found = text(value, at);
  if (!SLUG.test(found)) fail(at, 'a kebab-case slug');
  return found;
}

function each<T>(value: unknown, at: string, read: (item: unknown, at: string) => T): T[] {
  return array(value, at).map((item, position) => read(item, `${at}[${position}]`));
}

/** A list the site would render as a hole if it were empty. */
function some<T>(values: T[], at: string, expected: string): T[] {
  if (values.length === 0) fail(at, expected);
  return values;
}

/**
 * Non-empty, as a value the compiler believes. `locales[0]` is read without a
 * guard all over the app, and under `noUncheckedIndexedAccess` that is only
 * sound if the type says so.
 */
function atLeastOne<T>(values: T[], at: string): [T, ...T[]] {
  const [first, ...rest] = values;
  if (first === undefined) fail(at, 'at least one entry');
  return [first, ...rest];
}

/**
 * Both locales, always. Spelled out rather than looped over LOCALES so that
 * adding a locale is a compile error here — the alternative is a site that
 * builds and renders `undefined` in the new language.
 */
function localised(value: unknown, at: string): LocalisedText {
  const record = object(value, at);
  return { zh: filled(record.zh, `${at}.zh`), en: filled(record.en, `${at}.en`) };
}

/**
 * CLAUDE.md §10: alt is required. The only way to have no alt text is to say
 * so, with an empty string, which is how a decorative image is declared.
 */
function image(value: unknown, at: string): ImageRef {
  const record = object(value, at);
  return {
    src: filled(record.src, `${at}.src`),
    alt: record.alt === '' ? '' : localised(record.alt, `${at}.alt`),
  };
}

const STATUSES: readonly WorkStatus[] = ['completed', 'in-progress', 'private'];

function status(value: unknown, at: string): WorkStatus {
  const found = STATUSES.find((known) => known === value);
  if (found === undefined) fail(at, STATUSES.join(' | '));
  return found;
}

function work(value: unknown, at: string): Work {
  const record = object(value, at);
  const state = status(record.status, `${at}.status`);

  /*
   * A private work is listed in the index and has no page, so it publishes no
   * photographs at all. The admin already drops them when it builds a revision
   * — that is where the rule belongs, at the point the data leaves the database
   * — and dropping them again here means the site cannot hand out a cover URL
   * even if a payload arrives carrying one.
   *
   * This is the only place an empty image src is legal, and it is legal because
   * nothing ever renders it: getPublishedWorks excludes these from the routes,
   * and getIndexCovers excludes them from the hover backdrop.
   */
  const withheld = state === 'private';

  return {
    slug: slug(record.slug, `${at}.slug`),
    index: whole(record.index, `${at}.index`),
    title: localised(record.title, `${at}.title`),
    status: state,
    discipline: each(record.discipline, `${at}.discipline`, localised),
    year: whole(record.year, `${at}.year`),
    summary: localised(record.summary, `${at}.summary`),
    credits: each(record.credits, `${at}.credits`, (item, credit) => {
      const entry = object(item, credit);
      return {
        role: localised(entry.role, `${credit}.role`),
        name: localised(entry.name, `${credit}.name`),
      };
    }),
    cover: withheld ? { src: '', alt: '' } : image(record.cover, `${at}.cover`),
    media: withheld ? [] : each(record.media, `${at}.media`, image),
  };
}

/** Slugs are addresses. Two records answering to one is a page that shadows another. */
function unique(values: readonly string[], at: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) fail(`${at} "${value}"`, 'a slug used once');
    seen.add(value);
  }
}

function parseWorks(value: unknown): Work[] {
  const found = each(value, 'works', work);
  unique(
    found.map((entry) => entry.slug),
    'works',
  );
  return found;
}

function parsePrograms(value: unknown): Program[] {
  return each(value, 'programs', (item, at) => {
    const record = object(item, at);
    return {
      slug: slug(record.slug, `${at}.slug`),
      name: localised(record.name, `${at}.name`),
      audience: localised(record.audience, `${at}.audience`),
      duration: localised(record.duration, `${at}.duration`),
      summary: localised(record.summary, `${at}.summary`),
    };
  });
}

function parseMentors(value: unknown): Mentor[] {
  return each(value, 'mentors', (item, at) => {
    const record = object(item, at);
    return {
      slug: slug(record.slug, `${at}.slug`),
      name: localised(record.name, `${at}.name`),
      discipline: localised(record.discipline, `${at}.discipline`),
      note: localised(record.note, `${at}.note`),
      portrait: image(record.portrait, `${at}.portrait`),
    };
  });
}

/**
 * The projects, in the order they are read across About.
 *
 * No minimum, and that is the one thing worth saying about this function. The
 * collection starts empty — seeding it from the works would reproduce the
 * confusion it exists to end — and an empty one is a shorter About page rather
 * than a malformed bundle, so it is `each` and not `some`. What the page does
 * with that is ProjectGrid's, not this gate's.
 *
 * A project's slug is not a URL segment; it is checked all the same, because it
 * keys the grid and files the photograph, and both want it stable and legible.
 */
function parseProjects(value: unknown): Project[] {
  const found = each(value, 'projects', (item, at) => {
    const record = object(item, at);
    return {
      slug: slug(record.slug, `${at}.slug`),
      title: localised(record.title, `${at}.title`),
      summary: localised(record.summary, `${at}.summary`),
      image: image(record.image, `${at}.image`),
    };
  });
  unique(
    found.map((entry) => entry.slug),
    'projects',
  );
  return found;
}

/** The two lines every page carries. */
function pageText(record: Record<string, unknown>, at: string): PageText {
  return {
    title: localised(record.title, `${at}.title`),
    description: localised(record.description, `${at}.description`),
  };
}

function paragraphs(value: unknown, at: string): LocalisedText[] {
  return some(each(value, at, localised), at, 'at least one paragraph');
}

function parseHome(value: unknown): HomePage {
  const at = 'pages.home';
  const record = object(value, at);
  return {
    ...pageText(record, at),
    statement: localised(record.statement, `${at}.statement`),
    // No minimum. A front page with no photographs is the statement on its own,
    // which is a page the studio is allowed to want.
    gallery: each(record.gallery, `${at}.gallery`, image),
  };
}

function parseProgramsPage(value: unknown): ProgramsPage {
  const at = 'pages.programs';
  const record = object(value, at);
  return { ...pageText(record, at), intro: paragraphs(record.intro, `${at}.intro`) };
}

function parseAbout(value: unknown): AboutPage {
  const at = 'pages.about';
  const record = object(value, at);
  return {
    ...pageText(record, at),
    intro: paragraphs(record.intro, `${at}.intro`),
    mentorsTitle: localised(record.mentorsTitle, `${at}.mentorsTitle`),
    projectsTitle: localised(record.projectsTitle, `${at}.projectsTitle`),
  };
}

function parsePages(value: unknown): SitePages {
  const record = object(value, 'pages');
  return {
    home: parseHome(record.home),
    works: pageText(object(record.works, 'pages.works'), 'pages.works'),
    programs: parseProgramsPage(record.programs),
    about: parseAbout(record.about),
  };
}

function isLocale(value: string): value is (typeof LOCALES)[number] {
  return LOCALES.some((known) => known === value);
}

function parseSite(value: unknown): SiteContent {
  const record = object(value, 'site');
  const contact = object(record.contact, 'site.contact');
  const localeNames = object(record.localeNames, 'site.localeNames');

  const locales = each(record.locales, 'site.locales', (item, at) => {
    const found = text(item, at);
    if (!isLocale(found)) fail(at, LOCALES.join(' | '));
    return found;
  });

  return {
    name: localised(record.name, 'site.name'),
    url: filled(record.url, 'site.url'),
    locales: atLeastOne(locales, 'site.locales'),
    localeNames: {
      zh: filled(localeNames.zh, 'site.localeNames.zh'),
      en: filled(localeNames.en, 'site.localeNames.en'),
    },
    contact: {
      email: filled(contact.email, 'site.contact.email'),
      wechat: filled(contact.wechat, 'site.contact.wechat'),
      address: localised(contact.address, 'site.contact.address'),
      hours: localised(contact.hours, 'site.contact.hours'),
    },
  };
}

function parseDictionary(value: unknown, locale: string): Dictionary {
  const at = `dictionaries/${locale}`;
  const record = object(value, at);

  /** Every leaf in a dictionary is required copy, so they all read the same way. */
  const group = (key: string) => {
    const nested = object(record[key], `${at}.${key}`);
    return (field: string) => filled(nested[field], `${at}.${key}.${field}`);
  };

  const meta = group('meta');
  const a11y = group('a11y');
  const workStatus = object(object(record.works, `${at}.works`).status, `${at}.works.status`);
  const detail = group('work');
  const contact = group('contact');
  const notFound = group('notFound');
  const footer = group('footer');

  return {
    meta: { titleTemplate: meta('titleTemplate') },
    a11y: {
      skipToContent: a11y('skipToContent'),
      primaryNav: a11y('primaryNav'),
      localeSwitch: a11y('localeSwitch'),
      worksList: a11y('worksList'),
      worksRail: a11y('worksRail'),
      workPager: a11y('workPager'),
      close: a11y('close'),
    },
    works: {
      status: {
        completed: filled(workStatus.completed, `${at}.works.status.completed`),
        'in-progress': filled(workStatus['in-progress'], `${at}.works.status.in-progress`),
        private: filled(workStatus.private, `${at}.works.status.private`),
      },
    },
    work: {
      index: detail('index'),
      status: detail('status'),
      year: detail('year'),
      discipline: detail('discipline'),
      credits: detail('credits'),
      previous: detail('previous'),
      next: detail('next'),
    },
    contact: {
      nav: contact('nav'),
      title: contact('title'),
      email: contact('email'),
      wechat: contact('wechat'),
      address: contact('address'),
      hours: contact('hours'),
      note: contact('note'),
      from: contact('from'),
      message: contact('message'),
      subject: contact('subject'),
      send: contact('send'),
      sending: contact('sending'),
      sent: contact('sent'),
      failed: contact('failed'),
      draft: contact('draft'),
    },
    notFound: { title: notFound('title'), body: notFound('body'), home: notFound('home') },
    footer: { note: footer('note') },
  };
}

/** What the admin measured about a photograph when it was uploaded. */
export interface MediaFacts {
  /** Intrinsic size of the original, which is what holds the aspect box open. */
  width: number;
  height: number;
  /**
   * The photograph's dominant hue, or null where it has none — a monochrome
   * image, or one the admin has not measured. Only the works index reads it,
   * to tint the band behind the row under the pointer. DESIGN-SYSTEM.md §7.
   */
  tint: number | null;
  /**
   * A digest of the bytes currently filed under the key, or null for a
   * photograph uploaded before the admin recorded one.
   *
   * An object key does not change when the studio replaces a photograph — that
   * is what keeps the record pointing at it and the bucket free of orphans — so
   * the key alone is not enough to name a URL by. lib/media hangs this off the
   * delivery URL, which is what makes a replacement visible to a reader who has
   * seen the page before.
   */
  version: string | null;
}

/**
 * What was measured, keyed by R2 object key.
 *
 * These are what hold a slot open before a photograph arrives, so a bad number
 * here is layout shift on the live site. Checking them at the same gate as
 * everything else means a malformed one fails `next build` rather than showing
 * up in a field measurement weeks later.
 */
export function parseMedia(value: unknown): Record<string, MediaFacts> {
  const record = object(value, 'media');
  const parsed: Record<string, MediaFacts> = {};

  for (const [key, entry] of Object.entries(record)) {
    const at = `media["${key}"]`;
    const facts = object(entry, at);
    const width = whole(facts.width, `${at}.width`);
    const height = whole(facts.height, `${at}.height`);
    if (width <= 0 || height <= 0) fail(at, 'positive dimensions');
    parsed[key] = {
      width,
      height,
      tint: hue(facts.tint, `${at}.tint`),
      version: name(facts.version, `${at}.version`),
    };
  }

  return parsed;
}

export interface ContentBundle {
  /** The published revision this build came from. 0 for a draft preview. */
  revision: number;
  /**
   * Where the contact card posts a message, or null where it has nowhere to.
   *
   * A fact about the deployment rather than about the content — it is the
   * admin's own origin plus its contact path — and it travels in the bundle for
   * the same reason `mediaBase` does: a browser needs it, and a second
   * environment variable on this side is a second place for it to be wrong.
   */
  contactEndpoint: string | null;
  site: SiteContent;
  pages: SitePages;
  works: Work[];
  programs: Program[];
  mentors: Mentor[];
  projects: Project[];
  dictionaries: Record<Locale, Dictionary>;
}

/**
 * The whole payload, in one gate.
 *
 * Every function this calls can fail, and failing stops `next build` with a
 * path to the offending field — which leaves the previous deploy serving rather
 * than replacing it with a page that renders `undefined`.
 */
export function parseBundle(value: unknown): ContentBundle {
  const record = object(value, 'bundle');
  const dictionaries = object(record.dictionaries, 'bundle.dictionaries');

  return {
    revision: whole(record.revision, 'bundle.revision'),
    contactEndpoint: endpoint(record.contactEndpoint, 'bundle.contactEndpoint'),
    site: parseSite(record.site),
    pages: parsePages(record.pages),
    works: parseWorks(record.works),
    programs: parsePrograms(record.programs),
    mentors: parseMentors(record.mentors),
    projects: parseProjects(record.projects),
    dictionaries: {
      zh: parseDictionary(dictionaries.zh, 'zh'),
      en: parseDictionary(dictionaries.en, 'en'),
    },
  };
}
