import { emailImageUrl } from './appearanceImage';
import type {
  EmailDocument,
  EmailBlock,
  EmailBlockContent,
  EmailSection,
} from './emailDocument';
import {
  normalizeAppearance,
  appearanceColor,
  backgroundImageCss,
} from './appearanceModel';
import { escapeHtml, letterImageHtml, renderEmailHtml } from './emailHtml';
import { letterLinkUrl, letterButtonCss } from './letterLink';
import type { LetterLocale, LetterPreviewResult } from './localModel';

const weight = (value = 1) => (Number.isFinite(value) && value > 0 ? value : 1);
const lines = (value: string): string =>
  escapeHtml(value).replace(/\r\n?|\n/g, '<br>');
const table = (content: string, style = '', attributes = ''): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ${attributes} style="border-collapse:separate;border-spacing:0;width:100%;${escapeHtml(style)}">${content}</table>`;
export function renderEmailDocument(
  document: EmailDocument,
  locale: LetterLocale,
): LetterPreviewResult {
  const version = document.versions[locale];
  if (!version) throw new Error(`Missing email document version: ${locale}`);
  const a = normalizeAppearance(document.appearance);
  const plain: string[] = [];

  const renderBlock = (block: EmailBlock): string => {
    const content: EmailBlockContent | undefined = Object.hasOwn(
      version.blocks,
      block.id,
    )
      ? version.blocks[block.id]
      : undefined;
    if (!content || content.type !== block.type) return '';
    const alignment = block.alignment ?? 'left';
    let html = '';

    if (block.type === 'text' && content.type === 'text') {
      const tag = block.variant === 'heading' ? 'h2' : 'p';
      const style =
        block.variant === 'heading'
          ? 'font-size:24px;line-height:1.3;font-weight:bold;'
          : '';
      html = `<${tag} style="margin:0;color:${a.textColor};${style}">${lines(content.text)}</${tag}>`;
      plain.push(content.text);
    } else if (block.type === 'image' && content.type === 'image') {
      const src = emailImageUrl(content.src);
      const href = letterLinkUrl(content.href ?? '');
      if (!src) return '';
      html = letterImageHtml({ url: src, name: content.alt }, true);
      if (href) html = `<a href="${escapeHtml(href)}">${html}</a>`;
      if (content.alt || href)
        plain.push([content.alt, href].filter(Boolean).join(' — '));
    } else if (block.type === 'button' && content.type === 'button') {
      const href = letterLinkUrl(content.href);
      const label = lines(content.text);
      const buttonCss = letterButtonCss({
        size: 'medium',
        radius: 4,
        background: appearanceColor(block.background, a.linkColor),
      });
      const style = `${buttonCss}color:${appearanceColor(block.color, '#ffffff')};text-decoration:none;font-weight:bold;`;
      html = href
        ? `<a href="${escapeHtml(href)}" style="${style}">${label}</a>`
        : `<span style="${style}">${label}</span>`;
      plain.push([content.text, href].filter(Boolean).join(' — '));
    }
    return `<tr><td align="${alignment}" style="padding:0 0 16px;text-align:${alignment};overflow-wrap:anywhere;">${html}</td></tr>`;
  };

  const availableWidth = Math.max(1, a.width - a.padding * 2);
  const renderSection = (section: EmailSection): string => {
    const maxWeight = section.columns.reduce(
      (max, column) => Math.max(max, weight(column.weight)),
      0,
    );
    const sum = section.columns.reduce(
      (total, column) => total + weight(column.weight) / maxWeight,
      0,
    );
    const borderColor = appearanceColor(section.borderColor);
    const radius = Number.isFinite(section.borderRadius)
      ? Math.max(0, section.borderRadius!)
      : 0;
    const sectionWidth = Math.max(
      1,
      availableWidth - 32 - (borderColor ? 2 : 0),
    );
    const columns = section.columns
      .map((column) => {
        const share = weight(column.weight) / maxWeight / sum;
        const width = sectionWidth * share;
        const rows = column.blocks.map(renderBlock).join('');
        const contents = table(
          rows || '<tr><td></td></tr>',
          `font-size:${a.fontSize}px;line-height:${a.lineHeight};color:${a.textColor};`,
        );
        const inner = table(
          `<tr><td style="padding:0 8px;">${contents}</td></tr>`,
          'table-layout:fixed;',
        );
        return `<!--[if mso]><td width="${width.toFixed(2)}" valign="${section.verticalAlignment ?? 'top'}"><![endif]--><div class="email-column" data-column-id="${escapeHtml(column.id)}" style="display:inline-block;vertical-align:${section.verticalAlignment ?? 'top'};width:100%;max-width:${width.toFixed(4)}px;">${inner}</div><!--[if mso]></td><![endif]-->`;
      })
      .join('');
    const content = `<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${sectionWidth}"><tr><![endif]-->${columns}<!--[if mso]></tr></table><![endif]-->`;
    const style = `${section.background ? `background-color:${appearanceColor(section.background, a.background)};` : ''}${backgroundImageCss(section.backgroundImage ?? '')}${borderColor ? `border:1px solid ${borderColor};` : ''}border-radius:${radius}px;`;
    return `<tr><td style="padding:0 0 16px;">${table(`<tr><td style="padding:16px;font-size:0;text-align:left;">${content}</td></tr>`, style, `data-section-id="${escapeHtml(section.id)}"`)}</td></tr>`;
  };
  const sections = document.sections.map(renderSection).join('');
  const html = renderEmailHtml(
    {
      locale,
      subject: version.subject,
      preheader: version.preheader,
      html: table(sections || '<tr><td></td></tr>', 'table-layout:fixed;'),
    },
    a,
  );
  return {
    subject: version.subject,
    width: a.width + 32,
    html,
    text: plain.filter((value) => value.trim()).join('\n\n'),
    notes: [],
  };
}
