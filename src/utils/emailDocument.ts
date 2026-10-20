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
      offsetPercent?: number;
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
  contentWidthPercent?: number;
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
  defaultLocale?: LetterLocale;
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
    defaultLocale: locales[0],
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
        const content = emailBlockContent(document, locale, block);
        if (!content || content.type !== block.type) return false;
        return content.type === 'image'
          ? !!emailImageUrl(content.src)
          : !!content.text.trim();
      }),
    ),
  );
  return filled ? null : 'заполните письмо';
}

export function emailDefaultLocale(document: EmailDocument): LetterLocale {
  return document.defaultLocale && document.versions[document.defaultLocale]
    ? document.defaultLocale
    : (Object.keys(document.versions)[0] as LetterLocale);
}

export function emailBlockContent(
  document: EmailDocument,
  locale: LetterLocale,
  block: EmailBlock,
): EmailBlockContent | undefined {
  const own = document.versions[locale]?.blocks[block.id];
  if (block.type !== 'image' || (own?.type === 'image' && own.src)) return own;
  const base =
    document.versions[emailDefaultLocale(document)]?.blocks[block.id];
  if (base?.type !== 'image') return own;
  return { ...base, alt: own?.type === 'image' ? own.alt : base.alt };
}
