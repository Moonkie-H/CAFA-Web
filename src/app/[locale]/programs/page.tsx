import type { Metadata } from 'next';

import { PageHeading } from '@/components/composites/PageHeading';
import { ProgramList } from '@/components/composites/ProgramList';
import { partClass } from '@/components/motion/Part';
import { Grid } from '@/components/primitives/Grid';
import { Prose } from '@/components/primitives/Prose';
import { scenes, sceneAttrs } from '@/lib/choreography';
import { cx } from '@/lib/class-names';
import { getPage, getPrograms, requireLocale } from '@/lib/content';
import { pageMetadata } from '@/lib/metadata';
import { routes, type LocaleParams } from '@/lib/routes';

import styles from './page.module.css';

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const page = getPage('programs');
  return pageMetadata({
    locale,
    route: routes.programs,
    title: page.title[locale],
    description: page.description[locale],
  });
}

export default async function ProgramsPage({ params }: LocaleParams) {
  const locale = requireLocale((await params).locale);
  const page = getPage('programs');

  return (
    <Grid>
      <PageHeading title={page.title[locale]} />
      <div className={cx(styles.intro, partClass('intro'))} {...sceneAttrs(scenes.prose)}>
        {page.intro.map((paragraph, at) => (
          // Position is a paragraph's only identity: it has no key of its own,
          // and two of them are allowed to read the same.
          <Prose key={at} role="body" value={paragraph[locale]} />
        ))}
      </div>
      {/* The page's `listing` part: the sheet a lateral navigation exchanges
          against About's grid of projects. Taken at the list rather than at one
          entry, because the entries carry names of their own and unzip inside
          it. MOTION.md §3. */}
      <ProgramList
        programs={getPrograms()}
        locale={locale}
        className={cx(styles.list, partClass('listing'))}
      />
    </Grid>
  );
}
