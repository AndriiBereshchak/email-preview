import {
  DEFAULT_APPEARANCE,
  appearanceBodyCss,
  backgroundImageCss,
  normalizeAppearance,
  type EmailAppearance,
} from './appearanceModel';
import type { EmailImage, LetterDraft } from './localModel';

export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );

export const textWithBreaksHtml = (value: string): string =>
  escapeHtml(value).replace(/\r\n?|\n/g, '<br>');

export function letterImageHtml(
  image: Pick<EmailImage, 'url' | 'name'>,
  fullWidth = false,
  widthPercent = 100,
  alignment: 'left' | 'center' | 'right' = 'left',
  offsetPercent?: number,
  maxWidth?: number,
): string {
  const width = Number.isFinite(widthPercent)
    ? Math.max(1, Math.min(100, widthPercent))
    : 100;
  const imageAlignment =
    alignment === 'right'
      ? 'right'
      : alignment === 'center'
        ? 'center'
        : 'left';
  const offset =
    offsetPercent !== undefined && Number.isFinite(offsetPercent)
      ? Math.max(0, Math.min(100, offsetPercent))
      : undefined;
  const margin =
    offset !== undefined
      ? `margin-left:${(((100 - width) * offset) / 100).toFixed(4)}%;margin-right:0;`
      : imageAlignment === 'right'
        ? 'margin-left:auto;margin-right:0;'
        : imageAlignment === 'center'
          ? 'margin-left:auto;margin-right:auto;'
          : '';
  return `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.name)}"${fullWidth ? ` width="${width}%" align="${imageAlignment}"` : ''} style="${fullWidth ? `display:block;border:0;width:${width}%;${margin}` : ''}max-width:${Number.isFinite(maxWidth) ? `${Math.max(1, maxWidth!)}px` : '100%'};height:auto;">`;
}

export function renderEmailHtml(
  draft: LetterDraft,
  appearance: EmailAppearance = DEFAULT_APPEARANCE,
  contentCss = '',
): string {
  const a = normalizeAppearance(appearance);
  const editorClass = contentCss ? ' sun-editor-editable' : '';
  return `<!doctype html><html lang="${draft.locale}"><head><meta charset="UTF-8"><title>${escapeHtml(draft.subject)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>${contentCss}body.email-page{margin:0;padding:16px;background-color:${a.pageBackground};${backgroundImageCss(a.pageBackgroundImage)}} .email-body{${appearanceBodyCss(a)}}.email-body a:not([style*="color"]){color:${a.linkColor}}.email-page .email-shell>tbody>tr,.email-page .email-sheet>tbody>tr{border:0}figure{max-width:100%}img{max-width:100%;height:auto}table{max-width:100%}@media only screen and (max-width:600px){.email-column,.email-inline-cell{display:block!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;}}</style></head><body class="email-page${editorClass}"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(draft.preheader)}</div><table class="email-shell" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed!important;border:0;border-collapse:collapse"><tr><td align="center" style="padding:0;border:0"><!--[if mso]><table role="presentation" width="${a.width}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]--><table class="email-sheet" role="presentation" width="${a.width}" cellpadding="0" cellspacing="0" style="border:0;border-collapse:collapse;table-layout:fixed!important;width:100%;max-width:${a.width}px;background:${a.background}"><tr><td class="email-body${editorClass}" style="border:0;${appearanceBodyCss(a)}">${draft.html}</td></tr></table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
}
