import {
  DEFAULT_APPEARANCE,
  appearanceBodyCss,
  backgroundImageCss,
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

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
export const letterImageHtml = (image: EmailImage) =>
  `<p><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.name)}" style="max-width:100%;height:auto"></p>`;
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
    html: `<!doctype html><html lang="${draft.locale}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>${editorContentsCss}body.sun-editor-editable{margin:0;padding:16px;background-color:${a.pageBackground};${backgroundImageCss(a.pageBackgroundImage)}} .email-body{${appearanceBodyCss(a)}}.email-body a:not([style*="color"]){color:${a.linkColor}}.sun-editor-editable .email-shell>tbody>tr,.sun-editor-editable .email-sheet>tbody>tr{border:0}figure{max-width:100%}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body class="sun-editor-editable"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(draft.preheader)}</div><table class="email-shell" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed!important;border:0;border-collapse:collapse"><tr><td align="center" style="padding:0;border:0"><table class="email-sheet" role="presentation" width="${a.width}" cellpadding="0" cellspacing="0" style="border:0;border-collapse:collapse;table-layout:fixed!important;width:100%;max-width:${a.width}px;background:${a.background}"><tr><td class="sun-editor-editable email-body" style="border:0;${appearanceBodyCss(a)}">${draft.html}</td></tr></table></td></tr></table></body></html>`,
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
