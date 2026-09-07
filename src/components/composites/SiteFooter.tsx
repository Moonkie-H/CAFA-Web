import { Grid } from '@/components/primitives/Grid';
import { Prose } from '@/components/primitives/Prose';
import { scenes, sceneAttrs } from '@/lib/choreography';
import type { Dictionary } from '@/lib/types';

import styles from './SiteFooter.module.css';

interface SiteFooterProps {
  dictionary: Dictionary;
}

export function SiteFooter({ dictionary }: SiteFooterProps) {
  return (
    // Full-bleed for the same reason as the header: the rule above it has to
    // reach the edges of the viewport, not the edges of the grid.
    //
    // One centred line and nothing else. The address and the studio's email are
    // in the Contact card the nav pins over the page, which is the one place
    // they are asked for — repeating them along the bottom of every page was
    // three columns of text doing the work of none.
    <footer className={styles.footer} {...sceneAttrs(scenes.footer)}>
      <Grid className={styles.inner}>
        <Prose role="meta" value={dictionary.footer.note} className={styles.note} />
      </Grid>
    </footer>
  );
}
