import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  createEmailDocument,
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
          document.appearance !== current.document.appearance;
        const revisions = { ...current.revisions };
        for (const [locale, version] of Object.entries(document.versions)) {
          if (
            sharedChanged ||
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
