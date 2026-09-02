import type { Metadata } from 'next';

import { MentorStrip } from '@/components/composites/MentorStrip';
import { PageHeading } from '@/components/composites/PageHeading';
import { ProjectGrid } from '@/components/composites/ProjectGrid';
import { partClass } from '@/components/motion/Part';
import { Grid } from '@/components/primitives/Grid';
import { Text } from '@/components/primitives/Text';
import { scenes, sceneAttrs } from '@/lib/choreography';
import { cx } from '@/lib/class-names';
import { getMentors, getPage, getProjects, requireLocale } from '@/lib/content';
import { pageMetadata } from '@/lib/metadata';
import { routes, type LocaleParams } from '@/lib/routes';

import styles from './page.module.css';

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const page = getPage('about');
  return pageMetadata({
    locale,
    route: routes.about,
    title: page.title[locale],
    description: page.description[locale],
  });
}

export default async function AboutPage({ params }: LocaleParams) {
  const locale = requireLocale((await params).locale);
  const page = getPage('about');

  return (
    // Three blocks rather than one grid, because the middle one is not on the
    // grid: the filmstrip runs edge to edge and pins to the viewport, which a
    // child of a max-width, guttered container cannot do. The home page splits
    // the same way and for the same reason.
    <>
      <Grid>
        <PageHeading title={page.title[locale]} />
        {/* The batch is the honest form of the §5.5 audit's "split by line": a
            browser cannot address a line box from CSS, so the stagger is per
            paragraph, which is the unit the content is actually authored in. */}
        <div className={cx(styles.prose, partClass('intro'))} {...sceneAttrs(scenes.prose)}>
          {page.intro.map((paragraph, at) => (
            <Text key={at} role="body">
              {paragraph[locale]}
            </Text>
          ))}
        </div>
      </Grid>
      {/* The people, read across: a single row of portraits travelling through a
          pinned window, between what the studio says about itself and what it
          has made. MOTION.md §5.2. */}
      <MentorStrip
        mentors={getMentors()}
        locale={locale}
        title={page.mentorsTitle[locale]}
        className={styles.strip}
      />
      <Grid>
        <ProjectGrid
          projects={getProjects()}
          locale={locale}
          heading={page.projectsTitle[locale]}
          className={cx(styles.projects, partClass('listing'))}
        />
      </Grid>
    </>
  );
}
