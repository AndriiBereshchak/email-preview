import { DEFAULT_APPEARANCE, type EmailAppearance } from './appearanceModel';
import type { LetterLocale } from './localModel';
import { emailImageUrl } from './appearanceImage';

export type EmailAlignment = 'left' | 'center' | 'right';
export type EmailBlock = (
  | {
      id: string;
      type: 'text';
      alignment?: EmailAlignment;
      color?: string;
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
      variant?: 'filled' | 'outline';
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
  textColor?: string;
  minHeight?: number;
  borderColor?: string;
  borderRadius?: number;
  columns: EmailColumn[];
}
export type EmailBlockContent =
  | {
      type: 'text';
      text: string;
      links?: { start: number; end: number; href: string }[];
      bold?: { start: number; end: number }[];
    }
  | { type: 'image'; src: string; alt: string }
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

export function emailVersionProblem(
  document: EmailDocument,
  locale: LetterLocale,
): string | null {
  const version = document.versions[locale];
  if (!version?.subject.trim()) return 'заполните тему';
  const filled = document.sections.some((section) =>
    section.columns.some((column) =>
      column.blocks.some((block) => {
        const content = version.blocks[block.id];
        if (!content || content.type !== block.type) return false;
        return content.type === 'image'
          ? !!emailImageUrl(content.src)
          : !!content.text.trim();
      }),
    ),
  );
  return filled ? null : 'заполните письмо';
}
