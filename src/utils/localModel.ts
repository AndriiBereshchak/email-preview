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
  subject: string;
  html: string;
  text: string;
  blocks: number;
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

export function renderLocalPreview(draft: LetterDraft): LetterPreviewResult {
  const parsed = new DOMParser().parseFromString(draft.html, 'text/html');
  parsed.querySelectorAll('script,style').forEach((node) => node.remove());
  const blocks = parsed.querySelectorAll('h1,h2,h3,p,img,hr').length;
  parsed
    .querySelectorAll('p,div,h1,h2,h3,li,tr,br')
    .forEach((node) => node.append('\n'));
  return {
    subject: draft.subject,
    text: parsed.body.textContent?.trim() ?? '',
    blocks,
    html: `<!doctype html><html lang="${draft.locale}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>body{margin:0;padding:24px;font:16px/1.6 Arial,sans-serif;color:#20252b;overflow-wrap:anywhere}img{max-width:100%;height:auto}a{color:#2e7a55}table{max-width:100%}</style></head><body><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(draft.preheader)}</div>${draft.html}</body></html>`,
  };
}
