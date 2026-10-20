import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  createEmailDocument,
  emailBlockContent,
  emailDefaultLocale,
  type EmailDocument,
} from '../utils/emailDocument';

export function useEmailDocument() {
  const [state, setState] = useState(() => ({
    document: createEmailDocument(),
    revisions: { ru: 0 } as Record<string, number>,
  }));
  const setDocument = useCallback<Dispatch<SetStateAction<EmailDocument>>>(
    (update) => {
      setState((current) => {
        const document =
          typeof update === 'function' ? update(current.document) : update;
        if (document === current.document) return current;
        const sharedChanged =
          document.sections !== current.document.sections ||
          document.appearance !== current.document.appearance ||
          emailDefaultLocale(document) !== emailDefaultLocale(current.document);
        const images = document.sections.flatMap((section) =>
          section.columns.flatMap((column) =>
            column.blocks.filter((block) => block.type === 'image'),
          ),
        );
        const revisions = { ...current.revisions };
        for (const [locale, version] of Object.entries(document.versions)) {
          if (
            sharedChanged ||
            images.some((block) => {
              const before = emailBlockContent(
                current.document,
                locale as keyof typeof document.versions,
                block,
              );
              const after = emailBlockContent(
                document,
                locale as keyof typeof document.versions,
                block,
              );
              return before?.type === 'image' && after?.type === 'image'
                ? before.src !== after.src || before.alt !== after.alt
                : before?.type !== after?.type;
            }) ||
            version !==
              current.document.versions[
                locale as keyof typeof document.versions
              ]
          ) {
            revisions[locale] = (revisions[locale] ?? 0) + 1;
          }
        }
        return { document, revisions };
      });
    },
    [],
  );
  return { ...state, setDocument };
}
