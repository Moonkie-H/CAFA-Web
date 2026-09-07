import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHeading } from '@/components/composites/PageHeading';
import { Grid } from '@/components/primitives/Grid';
import { Prose } from '@/components/primitives/Prose';
import { Text } from '@/components/primitives/Text';
import { getDictionary, getSite } from '@/lib/content';
import { routes } from '@/lib/routes';

import styles from './page.module.css';

/**
 * The source of out/404.html, which a static host serves for every unmatched
 * path. It is a route rather than an app/not-found.tsx because that file sits
 * above both root layouts and Next wraps it in a bare <html> with no lang.
 * The segment cannot be called `404` — the exporter writes its own default
 * error page over anything at that path — so scripts/emit-404.mjs renames this
 * route's output afterwards and deletes the directory.
 *
 * Set in the default locale: an unmatched URL has no locale segment to read.
 */
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function NotFoundPage() {
  const locale = getSite().locales[0];
  const { notFound } = getDictionary(locale);

  return (
    <Grid className={styles.page}>
      <PageHeading title={notFound.title} />
      <Prose role="body" value={notFound.body} className={styles.body} />
      <Link href={routes.home(locale)} className={styles.link}>
        <Text role="label" as="span">
          {notFound.home}
        </Text>
      </Link>
    </Grid>
  );
}
