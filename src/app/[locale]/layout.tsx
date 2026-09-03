import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ContactBlock } from '@/components/composites/ContactBlock';
import { SiteFooter } from '@/components/composites/SiteFooter';
import { SiteHeader } from '@/components/composites/SiteHeader';
import { EnterFallback } from '@/components/motion/EnterFallback';
import { NavStage } from '@/components/motion/NavStage';
import { PageTransition } from '@/components/motion/PageTransition';
import { PinnedNote } from '@/components/motion/PinnedNote';
import { ScrollField } from '@/components/motion/ScrollField';
import { ScrollTicks } from '@/components/motion/ScrollTicks';
import { Text } from '@/components/primitives/Text';
import {
  getContactEndpoint,
  getDictionary,
  getNav,
  getPage,
  getSite,
  getWorks,
  requireLocale,
} from '@/lib/content';
import { sectionSegment, type NavContext } from '@/lib/nav-intent';
import { panels, routes } from '@/lib/routes';

import '@/styles/tokens.css';
import '@/styles/fonts.css';
import '@/styles/globals.css';
import '@/styles/motion/index.css';
import styles from './layout.module.css';

/**
 * There is no app/layout.tsx. A root layout cannot read route params, so a
 * single one would have to hardcode <html lang> — wrong on every page of the
 * other locale, and :lang() drives the CJK leading in tokens.css. This file and
 * app/(root)/layout.tsx are therefore two root layouts.
 */
interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return getSite().locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, 'params'>): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const { meta } = getDictionary(locale);
  // The site's default title and description are the front page's own: it is
  // the page at the site's address, so a second copy of them under another name
  // would be two owners for one sentence.
  const home = getPage('home');
  return {
    // Without this Next resolves og:image against localhost at build time.
    metadataBase: new URL(getSite().url),
    title: { default: home.title[locale], template: meta.titleTemplate },
    description: home.description[locale],
  };
}

/**
 * The lookup NavStage classifies against, built from content on the server so
 * the works registry never has to reach the client to answer "which way is one
 * work from another". Locale-independent — the probe locale only shapes paths.
 */
function navContext(): NavContext {
  const site = getSite();
  const probe = site.locales[0];
  return {
    locales: site.locales,
    worksSection: sectionSegment(routes.work(probe, 'x')) ?? '',
    workIndex: Object.fromEntries(getWorks().map((work) => [work.slug, work.index])),
    // The order of the *pages* along the bar, which is what gives `lateral` its
    // direction. A page's name is its section segment, so this needs no
    // parsing — and the contact item is not in it, because it opens a panel
    // over the page you are on rather than being one of them.
    sectionOrder: getNav().map((item) => item.page),
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const locale = requireLocale((await params).locale);
  const site = getSite();
  const dictionary = getDictionary(locale);

  return (
    <html lang={locale}>
      <head>
        {/* Only the Latin face is preloaded: it sets every page. latin-ext and the
            CJK files are left to unicode-range to fetch if a page needs them. */}
        <link
          rel="preload"
          href="/fonts/inter-var-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {/* The first three render nothing. NavStage writes each navigation's
            figure onto <html> before the transition and owns scroll restoration
            (§2); ScrollField publishes scroll velocity and the pointer position
            as custom properties for the effects to read (§4). EnterFallback is
            the one that only ever does anything on a browser that cannot run
            styles/motion/triggers.css — MOTION.md §5.6. ScrollTicks draws
            the column in the margin that says where in the page the reader is,
            on the pages that mark their key points and nowhere else (§5.5) — it
            is here rather than on a page because it is fixed to the viewport,
            and a fixed element inside the page surface would be positioned
            against whichever part of it carries a view-transition-name. */}
        <NavStage context={navContext()} />
        <ScrollField />
        <EnterFallback />
        <ScrollTicks />
        <a href="#main" className={styles.skip}>
          <Text role="label" as="span">
            {dictionary.a11y.skipToContent}
          </Text>
        </a>
        <SiteHeader locale={locale} site={site} nav={getNav()} dictionary={dictionary} />
        {/* tabIndex -1 so following the skip link actually moves focus here.
            Without it the hash changes and focus stays on <body>, and the next
            Tab goes back to the top of the nav. */}
        <main id="main" tabIndex={-1}>
          <PageTransition>{children}</PageTransition>
        </main>
        <SiteFooter dictionary={dictionary} />
        {/* Contact is not a page: it is a card the nav's Contact button pins over
            whichever page you are on. It lives here, outside <main>, because the
            layout is the one thing that outlives a route change — so the card
            survives navigating with it open, and stays where the reader put it. */}
        <PinnedNote
          id={panels.contact}
          label={dictionary.contact.title}
          closeLabel={dictionary.a11y.close}
        >
          <ContactBlock
            site={site}
            locale={locale}
            endpoint={getContactEndpoint()}
            labels={dictionary.contact}
          />
        </PinnedNote>
      </body>
    </html>
  );
}
