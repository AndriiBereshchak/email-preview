import { renderEmailHtml } from './emailHtml';
import {
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  type EmailAppearance,
} from './appearanceModel';
import editorContentsCss from 'suneditor/src/assets/css/suneditor-contents.css?raw';
export type LetterLocale = 'ru' | 'uk' | 'en';
export interface LetterDraft {
  locale: LetterLocale;
  subject: string;
  preheader: string;
  html: string;
}
export interface EmailImage {
  id: string;
  name: string;
  url: string;
  size: number;
  width: number;
  height: number;
}
export interface VersionReach {
  locale: string;
  total: number;
  own: number;
  fallback: Array<{ locale: string; count: number }>;
}
export interface LetterPreviewResult {
  width?: number;
  subject: string;
  html: string;
  text: string;
  notes: string[];
}

export const LETTER_LANGUAGES = [
  { value: 'ru' as const, label: 'Русский' },
  { value: 'uk' as const, label: 'Украинский' },
  { value: 'en' as const, label: 'Английский' },
];
export const cx = (...values: Array<string | false | undefined | null>) =>
  values.filter(Boolean).join(' ');
export const languageName = (locale: string) =>
  LETTER_LANGUAGES.find((item) => item.value === locale)?.label ?? locale;
export const isLetterLocale = (locale: string): locale is LetterLocale =>
  LETTER_LANGUAGES.some((item) => item.value === locale);
export const formatCount = (count: number) => count.toLocaleString('ru-RU');
export const uncoveredLanguages = (
  rows: Array<{ locale: string; count: number }>,
  locales: string[],
) => rows.filter((row) => !locales.includes(row.locale));
export const emptyDraft = (locale: LetterLocale): LetterDraft => ({
  locale,
  subject: '',
  preheader: '',
  html: '',
});

export const draftProblem = (draft: LetterDraft): string | null => {
  if (!draft.subject.trim()) return 'заполните тему';
  const parsed = new DOMParser().parseFromString(draft.html, 'text/html');
  return parsed.body.textContent?.trim() || parsed.querySelector('img')
    ? null
    : 'заполните письмо';
};

export function renderLocalPreview(
  draft: LetterDraft,
  appearance: EmailAppearance = DEFAULT_APPEARANCE,
): LetterPreviewResult {
  const a = normalizeAppearance(appearance);
  const parsed = new DOMParser().parseFromString(draft.html, 'text/html');
  parsed.querySelectorAll('script,style').forEach((node) => node.remove());
  parsed
    .querySelectorAll('p,div,h1,h2,h3,li,tr,br')
    .forEach((node) => node.append('\n'));
  return {
    width: a.width + 32,
    subject: draft.subject,
    text: parsed.body.textContent?.trim() ?? '',
    notes: [],
    html: renderEmailHtml(draft, a, editorContentsCss),
  };
}

export const previewKey = (
  target: string,
  letter: LetterDraft,
  appearance: EmailAppearance = DEFAULT_APPEARANCE,
) =>
  JSON.stringify([
    target,
    letter.locale,
    letter.subject,
    letter.preheader,
    letter.html,
    normalizeAppearance(appearance),
  ]);
