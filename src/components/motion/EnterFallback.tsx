'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * The `enter` fallback MOTION.md §5.6 promises and, until now, never actually
 * built: one shared IntersectionObserver that reveals a scene's children once,
 * for a browser that cannot run styles/motion/triggers.css at all — Firefox
 * ships `animation-timeline`, `view-timeline-name` and `timeline-scope` only
 * behind a flag today, not on release, so `@supports (animation-timeline:
 * view())` is false there and every trigger in that file sits inert.
 *
 * It costs nothing where the CSS can run: `CSS.supports` is the same test
 * `@supports` makes, so a browser that passes it never builds the observer.
 * Where it can't, this adds exactly the `data-seen` attribute
 * styles/motion/fallback.css reads and nothing else — no scrub, no pin, no
 * link, same as the plan.
 *
 * `[data-scene='scrub']` (the focus curve on media) is deliberately not a
 * target: its resting state is already the middle of its curve — full opacity,
 * no scale, no blur — so a browser that cannot scrub it is already showing the
 * right picture doing nothing. `pin-scrub` (the About filmstrip) is the other
 * omission, for the same reason from the other direction: its fallback is
 * structural rather than a reveal — MentorStrip.module.css builds the strip only
 * where the pan can run, so a browser without one gets the plates wrapped in
 * flow, and a one-shot reveal has nothing to add to plates that are simply on
 * the page.
 *
 * Mounted once in the locale layout, next to ScrollField and NavStage, and for
 * the same reason those key off `pathname`: a route change swaps the page
 * under this layout without remounting it, so the query has to run again on
 * every path to see what the new page rendered.
 */
const TARGETS = "[data-scene='progress'], [data-scene='batch'] > *, [data-scene='stack'] > *";

export function EnterFallback() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof CSS === 'undefined' || CSS.supports('animation-timeline', 'view()')) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.seen = '';
          observer.unobserve(entry.target);
        }
      },
      // A little before the element is fully seated, roughly the spirit of the
      // native triggers' entry ranges — this is a fallback, not a reproduction.
      { rootMargin: '0px 0px -12% 0px', threshold: 0 },
    );

    for (const target of document.querySelectorAll<HTMLElement>(TARGETS)) {
      if (target.dataset.seen === undefined) observer.observe(target);
    }

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
