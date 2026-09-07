import { getImage } from '@/lib/media';
import type { ImageRef, Locale } from '@/lib/types';

import { MediaFrame } from './MediaFrame';

interface MediaProps {
  image: ImageRef;
  locale: Locale;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** An ImageRef from the content bundle, resolved to its intrinsic dimensions and
    handed on with the frame the studio gave it. */
export function Media({ image, locale, sizes, priority, className }: MediaProps) {
  return (
    <MediaFrame
      entry={getImage(image.src)}
      frame={image.frame}
      alt={image.alt === '' ? '' : image.alt[locale]}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}
