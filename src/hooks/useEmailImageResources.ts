import { useEffect, useRef } from 'react';
import type { EmailDocument } from '../utils/emailDocument';
import { isLocalEmailImage, releaseEmailImage } from '../utils/appearanceImage';

export function useEmailImageResources(document: EmailDocument) {
  const held = useRef(new Set<string>());
  useEffect(() => {
    const sources = [
      document.appearance.backgroundImage,
      document.appearance.pageBackgroundImage,
    ];
    for (const section of document.sections)
      sources.push(section.backgroundImage ?? '');
    for (const version of Object.values(document.versions)) {
      for (const block of Object.values(version!.blocks))
        if (block.type === 'image') sources.push(block.src);
    }
    const next = new Set(sources.filter(isLocalEmailImage));
    for (const src of held.current) if (!next.has(src)) releaseEmailImage(src);
    held.current = next;
  }, [document]);
  useEffect(
    () => () => {
      for (const src of held.current) releaseEmailImage(src);
    },
    [],
  );
}
