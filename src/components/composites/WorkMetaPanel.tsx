import type { ReactNode } from 'react';

import { Prose } from '@/components/primitives/Prose';
import { Text } from '@/components/primitives/Text';
import type { Dictionary, Locale, Work } from '@/lib/types';

import styles from './WorkMetaPanel.module.css';

interface WorkMetaPanelProps {
  work: Work;
  locale: Locale;
  labels: Dictionary['work'];
  statusLabel: string;
}

export function WorkMetaPanel({ work, locale, labels, statusLabel }: WorkMetaPanelProps) {
  return (
    <div className={styles.panel}>
      <Text role="display" as="h1" className={styles.title}>
        {work.title[locale]}
      </Text>

      <dl className={styles.facts}>
        <Fact label={labels.index}>
          <Value>{String(work.index).padStart(3, '0')}</Value>
        </Fact>
        <Fact label={labels.status}>
          <Value>{statusLabel}</Value>
        </Fact>
        <Fact label={labels.year}>
          <Value>{work.year}</Value>
        </Fact>
        <Fact label={labels.discipline}>
          {/* One <dd> each rather than a joined string: a separator would be a
              display literal, and a list reads correctly to a screen reader. */}
          {work.discipline.map((discipline) => (
            <Value key={discipline.en}>{discipline[locale]}</Value>
          ))}
        </Fact>
      </dl>

      <Prose role="body" value={work.summary[locale]} className={styles.summary} />

      {work.credits.length > 0 && (
        <dl className={styles.facts}>
          {work.credits.map((credit) => (
            <Fact key={credit.role.en} label={credit.role[locale]}>
              <Value>{credit.name[locale]}</Value>
            </Fact>
          ))}
        </dl>
      )}
    </div>
  );
}

/** A <div> inside a <dl> is valid, and it is what makes each pair one grid row. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.fact}>
      <Text role="label" as="dt" className={styles.factLabel}>
        {label}
      </Text>
      {children}
    </div>
  );
}

function Value({ children }: { children: ReactNode }) {
  return (
    <Text role="meta" as="dd" className={styles.factValue}>
      {children}
    </Text>
  );
}
