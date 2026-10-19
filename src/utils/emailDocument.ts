import { DEFAULT_APPEARANCE, type EmailAppearance } from './appearanceModel';
import type { LetterLocale } from './localModel';

export type EmailAlignment = 'left' | 'center' | 'right';
export type EmailBlock = (
  | {
      id: string;
      type: 'text';
      alignment?: EmailAlignment;
      variant?: 'body' | 'heading';
    }
  | {
      id: string;
      type: 'image';
      alignment?: EmailAlignment;
      offsetPercent?: number;
    }
  | {
      id: string;
      type: 'button';
      alignment?: EmailAlignment;
      insetPercent?: number;
      buttonWidth?: number;
      paddingY?: number;
      color?: string;
      background?: string;
    }
) & {
  rowId?: string;
  widthPercent?: number;
};

export interface EmailColumn {
  id: string;
  weight?: number;
  blocks: EmailBlock[];
}
export interface EmailSection {
  id: string;
  background?: string;
  backgroundImage?: string;
  borderColor?: string;
  borderRadius?: number;
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  columns: EmailColumn[];
}
export type EmailBlockContent =
  | { type: 'text'; text: string }
  | { type: 'image'; src: string; alt: string; href?: string }
  | { type: 'button'; text: string; href: string };

export interface EmailDocumentVersion {
  subject: string;
  preheader: string;
  blocks: Record<string, EmailBlockContent>;
}
export interface EmailDocument {
  appearance: EmailAppearance;
  sections: EmailSection[];
  versions: Partial<Record<LetterLocale, EmailDocumentVersion>>;
}

export function createEmailDocument(
  locales: LetterLocale[] = ['ru'],
): EmailDocument {
  const versions: EmailDocument['versions'] = {};
  for (const locale of locales)
    versions[locale] = { subject: '', preheader: '', blocks: {} };
  return {
    appearance: { ...DEFAULT_APPEARANCE },
    sections: [],
    versions,
  };
}

export function emptyEmailBlockContent(
  type: EmailBlock['type'],
): EmailBlockContent {
  if (type === 'text') return { type, text: '' };
  if (type === 'image') return { type, src: '', alt: '' };
  return { type, text: '', href: '' };
}
