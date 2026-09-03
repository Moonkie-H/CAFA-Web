import type { ReactNode } from 'react';

import { Media } from '@/components/primitives/Media';
import { Text } from '@/components/primitives/Text';
import type { Dictionary, Locale, SiteContent } from '@/lib/types';

import { ContactForm } from './ContactForm';
import styles from './ContactBlock.module.css';

/**
 * The code is drawn at a fixed edge — a QR is square and is scanned, not read,
 * so it has one useful size and no reason to grow with the column. --qr-size is
 * that edge, and it is what `sizes` has to restate in the one syntax that cannot
 * read a token.
 */
const QR_SIZES = '9rem';

interface ContactBlockProps {
  site: SiteContent;
  locale: Locale;
  /** Where the form posts, out of the bundle. Null is a card with no form but
      the reader's own mail client — see ContactForm. */
  endpoint: string | null;
  labels: Dictionary['contact'];
}

/**
 * The contact card: a line about how the atelier answers, where it is, and a box
 * to write in.
 *
 * It is laid out as a landscape sheet rather than a column because it holds two
 * unlike things — addresses, which are read, and a form, which is used — and
 * stacking them made the second one something you had to scroll a card to find.
 * From --bp-md up they sit side by side, the addresses in the narrow column at
 * --note-details and the form taking the rest; below it they stack, which is the
 * only arrangement a phone has room for.
 *
 * The WeChat line is the one that carries more than a value: under the id sits
 * the studio's QR code, where there is one. It is the only optional image in the
 * content and the only one belonging to no record, and it earns the exception
 * because scanning is how that particular address is actually used.
 *
 * The addresses are set small on purpose. They were a --title-role email over
 * three lines of metadata, which made the loudest thing on the card the one
 * thing a reader can already copy off any page of the site; the form is what the
 * card is for now, so the addresses are metadata beside it.
 *
 * This stays a server component. ContactForm is the only client boundary and it
 * holds no copy of its own — every string here is prerendered, including the
 * ones handed across that boundary as props, and the address the form posts to,
 * which is read from the bundle by the layout and passed down rather than
 * imported here: a composite is handed its data and never reaches for it.
 *
 * Where the card sits, how it arrives and how it is moved belong to
 * components/motion/PinnedNote, which is the only thing that renders it.
 */
export function ContactBlock({ site, locale, endpoint, labels }: ContactBlockProps) {
  const { contact } = site;

  return (
    <div className={styles.block}>
      {/* First in the DOM at every width, which is also what lets it be the one
          element that reserves PinnedNote's close mark its corner. */}
      <Text role="index" as="p" className={styles.note}>
        {labels.note}
      </Text>

      <dl className={styles.facts}>
        <Fact label={labels.email}>
          <a href={`mailto:${contact.email}`} className={styles.link}>
            {contact.email}
          </a>
        </Fact>
        <Fact label={labels.address}>{contact.address[locale]}</Fact>
        <Fact label={labels.wechat}>
          {contact.wechat}
          {/* The id on its own asks a reader on a phone to memorise it and type
              it into another application, which is the interaction failing at
              its last step. Optional, so a studio that has not uploaded a code
              gets exactly the line it had before. */}
          {contact.qr !== null && (
            <Media
              image={contact.qr}
              locale={locale}
              sizes={QR_SIZES}
              className={styles.qr}
            />
          )}
        </Fact>
        <Fact label={labels.hours}>{contact.hours[locale]}</Fact>
      </dl>

      <ContactForm endpoint={endpoint} to={contact.email} locale={locale} labels={labels} />
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.fact}>
      <Text role="label" as="dt" className={styles.factLabel}>
        {label}
      </Text>
      <Text role="meta" as="dd" className={styles.factValue}>
        {children}
      </Text>
    </div>
  );
}
