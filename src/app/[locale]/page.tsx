import type { Metadata } from 'next';

import { Gallery } from '@/components/composites/Gallery';
import { Recede } from '@/components/motion/Recede';
import { JsonLd } from '@/components/seo/JsonLd';
import { Grid } from '@/components/primitives/Grid';
import { Prose } from '@/components/primitives/Prose';
import { getPage, requireLocale } from '@/lib/content';
import { organisationJsonLd } from '@/lib/json-ld';
import { pageMetadata } from '@/lib/metadata';
import { routes, type LocaleParams } from '@/lib/routes';

import styles from './page.module.css';

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const home = getPage('home');
  return {
    ...pageMetadata({
      locale,
      route: routes.home,
      title: home.title[locale],
      description: home.description[locale],
    }),
    // Absolute: the layout's template would otherwise set the site name twice.
    title: { absolute: home.title[locale] },
  };
}

export default async function HomePage({ params }: LocaleParams) {
  const locale = requireLocale((await params).locale);
  const home = getPage('home');

  return (
    <>
      <JsonLd data={organisationJsonLd(locale)} />
      {/* The statement recedes as it leaves the top rather than simply scrolling
          off, which is the same figure a navigation makes. It is the first thing
          on the site that moves, and it sets the vocabulary for the rest.

          Set in `body`, centred in the empty page, and nothing else on the
          screen. It is prose the studio writes, breaks and formats itself —
          Prose draws each line it typed as its own block, and carries whatever
          it bolded, set larger or pushed off centre — rather than the one
          label-sized line it began as. There is no link to the works index here
          because the nav already carries one on every page including this one. */}
      <Recede>
        <Grid className={styles.above}>
          <Prose role="body" as="h1" value={home.statement[locale]} className={styles.statement} />
        </Grid>
      </Recede>
      {/* Genuinely below the fold — see .above — so these stay lazy and the
          statement is what the page is measured on. */}
      <Gallery images={home.gallery} locale={locale} className={styles.gallery} />
    </>
  );
}
