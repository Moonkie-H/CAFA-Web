import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MediaSequence } from '@/components/composites/MediaSequence';
import { WorkMetaPanel } from '@/components/composites/WorkMetaPanel';
import { WorkPager } from '@/components/composites/WorkPager';
import { WorkRail } from '@/components/composites/WorkRail';
import { StickyColumn } from '@/components/motion/StickyColumn';
import { Grid } from '@/components/primitives/Grid';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  getCoverImage,
  getDictionary,
  getIndexCovers,
  getPublishedWorks,
  getSite,
  getWork,
  getWorkListings,
  getWorkNeighbours,
  requireLocale,
} from '@/lib/content';
import { creativeWorkJsonLd } from '@/lib/json-ld';
import { pageMetadata } from '@/lib/metadata';
import { routes } from '@/lib/routes';

import styles from './page.module.css';

interface WorkParams {
  params: Promise<{ locale: string; slug: string }>;
}

/**
 * The one path this route exports when the registry has no work with a page.
 *
 * `output: export` refuses a dynamic route that prerenders nothing — Next reads
 * an empty `generateStaticParams` as no `generateStaticParams` at all — so a
 * studio that has not added its first work yet, or has just made its last one
 * private, would fail the build rather than publish a site without a works
 * section. That is a legitimate state of the content, so the route answers with
 * one path instead of none.
 *
 * It is not reachable as a work: `content-schema` holds every slug to
 * kebab-case alphanumerics, so nothing the admin can save collides with it, and
 * `getWork` returns undefined for it — which is the `notFound()` below. Nothing
 * links to it, and it disappears from the export the moment a work exists.
 */
const NO_WORKS = '_none';

export function generateStaticParams() {
  const works = getPublishedWorks();
  return getSite().locales.flatMap((locale) =>
    works.length === 0
      ? [{ locale, slug: NO_WORKS }]
      : works.map((work) => ({ locale, slug: work.slug })),
  );
}

export async function generateMetadata({ params }: WorkParams): Promise<Metadata> {
  const { locale: param, slug } = await params;
  const locale = requireLocale(param);
  const work = getWork(slug);
  if (work === undefined) return {};

  return pageMetadata({
    locale,
    route: (of) => routes.work(of, slug),
    title: work.title[locale],
    description: work.summary[locale],
    image: getCoverImage(work),
  });
}

export default async function WorkPage({ params }: WorkParams) {
  const { locale: param, slug } = await params;
  const locale = requireLocale(param);
  const work = getWork(slug);
  if (work === undefined || work.status === 'private') notFound();

  const dictionary = getDictionary(locale);

  return (
    <Grid className={styles.page}>
      <JsonLd data={creativeWorkJsonLd(work, locale, getCoverImage(work))} />
      {/* The three columns of the work itself, in a subgrid so they keep the
          page's tracks while ending where the media column ends. That boundary
          is the point — page.module.css. */}
      <div className={styles.spread}>
        <WorkRail
          locale={locale}
          works={getWorkListings()}
          covers={getIndexCovers()}
          activeSlug={work.slug}
          label={dictionary.a11y.worksRail}
          className={styles.rail}
        />
        <StickyColumn className={styles.meta}>
          <WorkMetaPanel
            work={work}
            locale={locale}
            labels={dictionary.work}
            statusLabel={dictionary.works.status[work.status]}
          />
        </StickyColumn>
        <MediaSequence
          slug={work.slug}
          cover={work.cover}
          media={work.media}
          locale={locale}
          className={styles.media}
        />
      </div>
      <WorkPager
        locale={locale}
        {...getWorkNeighbours(slug)}
        labels={dictionary.work}
        navLabel={dictionary.a11y.workPager}
        className={styles.pager}
      />
    </Grid>
  );
}
