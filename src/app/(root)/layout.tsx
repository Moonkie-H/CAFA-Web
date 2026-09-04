import type { ReactNode } from 'react';

import { getSite } from '@/lib/content';

import '@/styles/tokens.css';
import '@/styles/fonts.css';
import '@/styles/globals.css';

/**
 * The second root layout. It exists only so `/` — which has no locale segment
 * of its own — has an <html> element; see app/[locale]/layout.tsx for why the
 * two are separate.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={getSite().locales[0]} data-type-scale={getSite().typeScale}>
      <body>{children}</body>
    </html>
  );
}
