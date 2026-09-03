'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Text } from '@/components/primitives/Text';
import type { Dictionary, Locale } from '@/lib/types';

import styles from './ContactForm.module.css';

interface ContactFormProps {
  /**
   * Where the message goes. The admin's own origin plus its contact path, out
   * of the content bundle — see lib/content — or null for a site whose admin
   * has not been told its own origin, which is the draft path below.
   */
  endpoint: string | null;
  /** The studio's address, out of the content bundle. Only the draft needs it. */
  to: string;
  /** Which language the card is being read in; it decides the subject line. */
  locale: Locale;
  labels: Dictionary['contact'];
}

/** The three field names, written once because they are also the three keys
    read back off the FormData. `website` is the honeypot. */
const FROM = 'from';
const MESSAGE = 'message';
const TRAP = 'website';

/** Where the card is between one press of Send and whatever happens next. */
type Status = 'idle' | 'sending' | 'sent' | 'failed';

/**
 * Two fields and a send, and what Send does is post the message to the studio's
 * admin, which emails it on.
 *
 * It used to compose a `mailto:` and hand the reader a draft, because there was
 * nowhere for a POST to land — CLAUDE.md §1, and it is still true of *this*
 * repository. What changed is on the other side: CAFA-Admin answers
 * `/api/v1/contact`, checks the address, and sends the message to whatever
 * address the published `site.contact.email` names. Which is the address
 * printed two lines above this form, so the two cannot come apart.
 *
 * That endpoint arrives in the content bundle rather than in an environment
 * variable, for the same reason `mediaBase` does: it is a fact about the
 * deployment that a browser needs, so it travels with the content.
 *
 * **This is not the runtime data fetching §1 forbids.** Nothing is read to
 * render this card — every word on it was in the HTML before the browser
 * started. This is a person pressing a button and something being sent, which
 * is the one kind of request a static site has always been able to make.
 *
 * **A message is never silently dropped.** Three things can happen after Send
 * and the card says which: the studio's own refusal, in the words the Worker
 * wrote for whoever typed the message — a malformed address, a domain that
 * receives no mail, too many messages in a minute — which leaves the form as it
 * was so it can be fixed and sent again; a confirmation, which replaces the
 * form so the same message cannot be sent twice by accident; or a failure to
 * reach the admin at all, which offers the `mailto:` draft carrying what was
 * already typed. The last is also what a site with no endpoint does, without
 * the round trip.
 *
 * The `action` on the form is that same draft, and it is the no-script path:
 * a native `method="post"` submission to a `mailto:` hands the fields to the
 * mail client, more crudely. JavaScript intercepts it to post instead.
 *
 * Validation is the browser's on the way out and the Worker's on the way in.
 * `type="email"` and `required` refuse the obvious in the reader's own language
 * for no bytes at all; the Worker then checks the shape properly and asks DNS
 * whether the domain can receive mail before it sends anything. What comes back
 * from that is a sentence, not a code, so this file has none of its own.
 *
 * The labels are real <label> elements wrapping their control, not placeholders:
 * a placeholder is gone the moment there is anything to read it against, and at
 * --c-ink-62 on paper it would be the one piece of type on this card that CLAUDE
 * .md §10 could not clear.
 */
export function ContactForm({ endpoint, to, locale, labels }: ContactFormProps) {
  const [status, setStatus] = useState<Status>('idle');
  /** What the card is telling the reader, in the studio's words or the Worker's. */
  const [said, setSaid] = useState('');
  /** The draft offered after a failure, carrying what was typed. */
  const [draft, setDraft] = useState('');
  /** The live region below, so an answer can be brought into view. */
  const region = useRef<HTMLDivElement>(null);

  /**
   * Bring the answer into view when there is one.
   *
   * On a phone the card is taller than the viewport and scrolls inside itself,
   * so a refusal rendered under the button lands below the fold — the reader
   * presses Send and, as far as they can see, nothing happens. `nearest` is the
   * whole of it: it scrolls the card by the least that makes the line visible,
   * and does nothing at all on a card that already fits, which is every width
   * from --bp-md up.
   */
  useEffect(() => {
    if (said !== '') region.current?.scrollIntoView({ block: 'nearest' });
  }, [said]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The button is disabled in flight, but Enter in a field submits the form
    // without going through it. One message per press of Send.
    if (status === 'sending') return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const from = String(data.get(FROM) ?? '');
    const message = String(data.get(MESSAGE) ?? '');
    const href = draftHref({ to, from, message, subject: labels.subject, sender: labels.from });

    // No endpoint is not an error. It is a site whose admin has not been told
    // its own origin, or a revision published before the endpoint existed, and
    // the answer to it is the one this card gave before there was one.
    if (endpoint === null) {
      window.location.href = href;
      return;
    }

    setStatus('sending');
    setSaid('');

    let answer: Response;
    try {
      answer = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          message,
          // The honeypot, passed on rather than checked here: a bot that fills
          // it is answered with the same 200 a person gets, and it is the
          // Worker that decides that.
          website: String(data.get(TRAP) ?? ''),
          locale,
        }),
      });
    } catch {
      setStatus('failed');
      setSaid(labels.failed);
      setDraft(href);
      return;
    }

    if (answer.ok) {
      setStatus('sent');
      setSaid(labels.sent);
      return;
    }

    const sentence = await refusal(answer);

    // Whose problem it is decides what the card offers. A 400 or a 429 is the
    // sender's to fix and the form stays exactly as they left it; a 5xx is the
    // studio's own configuration, and the draft is the way through it.
    if (answer.status >= 500) {
      setStatus('failed');
      setSaid(sentence ?? labels.failed);
      setDraft(href);
      return;
    }

    setStatus('idle');
    setSaid(sentence ?? labels.failed);
  }

  return (
    <div className={styles.form}>
      {status !== 'sent' && (
        <form
          className={styles.fields}
          onSubmit={onSubmit}
          action={`mailto:${to}`}
          method="post"
          encType="text/plain"
        >
          <label className={styles.field}>
            <Text role="label" as="span" className={styles.label}>
              {labels.from}
            </Text>
            <input
              type="email"
              name={FROM}
              required
              autoComplete="email"
              spellCheck={false}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <Text role="label" as="span" className={styles.label}>
              {labels.message}
            </Text>
            {/* rows is the field's intrinsic height, the way width/height are an
                image's: it holds the card's proportions before a character is typed
                rather than letting the UA's two-row default decide them. */}
            <textarea name={MESSAGE} required rows={4} className={styles.message} />
          </label>

          {/* The honeypot. A person never meets it — it has no size, no tab stop
              and nothing to announce — and a bot that fills every input fills it
              and is answered with a 200 that sends nothing. */}
          <input
            type="text"
            name={TRAP}
            className={styles.trap}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {/* No <Mark>. The highlighter is bounded by a job rather than a surface —
              DESIGN-SYSTEM.md §2 says it marks a label that *goes somewhere*, and
              says to delete it the moment it appears on something that does not.
              Submitting is not navigating, so this takes the other half of §7's
              control vocabulary: the nav's --c-ink-70 to --c-ink over --dur-fast,
              under the same rule the address above it carries. */}
          <button type="submit" className={styles.send} disabled={status === 'sending'}>
            <Text role="label" as="span">
              {status === 'sending' ? labels.sending : labels.send}
            </Text>
          </button>
        </form>
      )}

      {/* In the DOM from the first render, empty, so that what appears in it is
          announced rather than merely drawn. A refusal is what the reader has to
          act on and there is no other way for them to hear it. */}
      <div ref={region} role="status" aria-live="polite" className={styles.said}>
        {said !== '' && (
          <Text role="index" as="p">
            {said}
          </Text>
        )}
        {status === 'failed' && (
          <a href={draft} className={styles.draft}>
            <Text role="label" as="span">
              {labels.draft}
            </Text>
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * The reader's own mail client, opened on what they wrote.
 *
 * The typed address is repeated in the body because the mail client sends as
 * whichever identity it is signed in as, which is not necessarily this one — so
 * without it a reply can go somewhere the reader did not ask for.
 */
function draftHref(fields: {
  to: string;
  from: string;
  message: string;
  subject: string;
  sender: string;
}): string {
  const body = `${fields.message}\n\n${fields.sender}: ${fields.from}`;
  return (
    `mailto:${fields.to}` +
    `?subject=${encodeURIComponent(fields.subject)}` +
    `&body=${encodeURIComponent(body)}`
  );
}

/**
 * The sentence the admin sent back with a refusal, or null where there is none
 * to show.
 *
 * `msg` is written for whoever typed the message — "that does not look like an
 * email address" — which is why it is shown as it stands rather than mapped to
 * copy of ours: the Worker knows what it refused and this card does not. A body
 * that is not the envelope at all is a proxy or an outage answering, and has
 * nothing in it worth putting in front of a reader.
 */
async function refusal(answer: Response): Promise<string | null> {
  let body: unknown;
  try {
    body = await answer.json();
  } catch {
    return null;
  }

  if (typeof body !== 'object' || body === null || !('msg' in body)) return null;
  const { msg } = body;
  return typeof msg === 'string' && msg.trim() !== '' ? msg : null;
}
