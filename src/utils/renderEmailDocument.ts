import { emailBlockContent, emptyEmailBlockContent } from './emailDocument';
import { emailTextHtml } from './emailText';
import { emailBlockRows } from './emailDocumentLayout';
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
import {
  escapeHtml,
  textWithBreaksHtml,
  letterImageHtml,
  renderEmailHtml,
} from './emailHtml';
import { letterLinkUrl, letterButtonCss } from './letterLink';
import type { LetterLocale, LetterPreviewResult } from './localModel';

const weight = (value = 1) => (Number.isFinite(value) && value > 0 ? value : 1);
const table = (content: string, style = '', attributes = ''): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ${attributes} style="border-collapse:separate;border-spacing:0;width:100%;${escapeHtml(style)}">${content}</table>`;
export function renderEmailDocumentContent(
  document: EmailDocument,
  locale: LetterLocale,
  options: { editor?: boolean } = {},
): Pick<LetterPreviewResult, 'html' | 'text'> {
  const version = document.versions[locale];
  if (!version) throw new Error(`Missing email document version: ${locale}`);
  const a = normalizeAppearance(document.appearance);
  const plain: string[] = [];

  const renderBlock = (
    block: EmailBlock,
    section: EmailSection,
    inline = false,
    imageMaxWidth?: number,
  ): string => {
    const content: EmailBlockContent | undefined =
      emailBlockContent(document, locale, block) ??
      (options.editor ? emptyEmailBlockContent(block.type) : undefined);
    if (!content || content.type !== block.type) return '';
    const alignment = block.alignment ?? 'left';
    let html = '';

    if (block.type === 'text' && content.type === 'text') {
      const tag = block.variant === 'heading' ? 'h2' : 'p';
      const style =
        block.variant === 'heading'
          ? 'font-size:24px;line-height:1.3;font-weight:bold;'
          : '';
      const width =
        !inline && Number.isFinite(block.widthPercent)
          ? `width:${Math.max(1, Math.min(100, block.widthPercent!))}%;`
          : '';
      const editable = options.editor
        ? ' data-email-text contenteditable="plaintext-only" tabindex="0" role="textbox" aria-label="Текст письма" aria-multiline="true" data-placeholder="Напишите текст письма…"'
        : '';
      html = `<${tag}${editable} style="margin:0;color:${appearanceColor(block.color, appearanceColor(section.textColor, a.textColor))};text-align:${alignment};${style}${width}">${emailTextHtml(content, a.linkColor)}</${tag}>`;
      plain.push(content.text);
    } else if (block.type === 'image' && content.type === 'image') {
      const src = emailImageUrl(content.src);
      if (!src && !options.editor) return '';
      html = src
        ? letterImageHtml(
            { url: src, name: content.alt },
            true,
            inline ? 100 : block.widthPercent,
            inline ? 'left' : alignment,
            inline ? undefined : block.offsetPercent,
            imageMaxWidth,
          )
        : '<span class="email-editor-placeholder">Нажмите, чтобы загрузить картинку</span>';
      if (content.alt) plain.push(content.alt);
    } else if (block.type === 'button' && content.type === 'button') {
      const href = letterLinkUrl(content.href);
      const label =
        textWithBreaksHtml(content.text) ||
        (options.editor ? 'Текст кнопки' : '');
      const buttonCss = letterButtonCss({
        size: 'medium',
        radius: 4,
        background: appearanceColor(block.background, a.linkColor),
      });
      const dimensions = `${Number.isFinite(block.buttonWidth) ? `width:${Math.max(48, block.buttonWidth!)}px;` : ''}${Number.isFinite(block.paddingY) ? `padding-top:${Math.max(0, block.paddingY!)}px;padding-bottom:${Math.max(0, block.paddingY!)}px;` : ''}`;
      const paddingY = Number.isFinite(block.paddingY)
        ? Math.max(0, block.paddingY!)
        : 12;

      const outline =
        block.variant === 'outline'
          ? `background-color:transparent;border:1px solid ${appearanceColor(block.background, a.linkColor)};padding: ${Math.max(0, paddingY - 1)}px 23px;`
          : '';
      const style = `${buttonCss}${dimensions}${outline}color:${appearanceColor(block.color, block.variant === 'outline' ? appearanceColor(block.background, a.linkColor) : '#ffffff')};text-decoration:none;font-weight:bold;`;
      const draggable = options.editor
        ? ' data-email-button draggable="true"'
        : '';
      html = href
        ? `<a${draggable} href="${escapeHtml(href)}" style="${style}">${label}</a>`
        : `<span${draggable} style="${style}">${label}</span>`;
      plain.push([content.text, href].filter(Boolean).join(' — '));
    }
    const editorAttributes = options.editor
      ? ` data-block-id="${escapeHtml(block.id)}" role="button" tabindex="0" aria-label="${block.type === 'text' ? 'Редактировать текст' : block.type === 'image' ? 'Редактировать картинку' : 'Редактировать кнопку'}"`
      : '';
    const inset =
      block.type === 'button' && !inline && Number.isFinite(block.insetPercent)
        ? Math.max(0, Math.min(99, block.insetPercent!))
        : 0;
    const position = inset ? `padding-left:${inset}%;text-align:left;` : '';
    return `<tr><td${editorAttributes} align="${alignment}" style="padding:0 0 16px;text-align:${alignment};${position}overflow-wrap:anywhere;">${html}</td></tr>`;
  };

  const availableWidth = Math.max(1, a.width - a.padding * 2);
  const renderSection = (
    section: EmailSection,
    sectionIndex: number,
  ): string => {
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
      .map((column, columnIndex) => {
        const share = weight(column.weight) / maxWeight / sum;
        const width = sectionWidth * share;
        const addButton = (beforeId?: string, index?: number) =>
          `<tr><td class="email-editor-add-cell"><button type="button" class="${beforeId ? 'email-editor-insert' : 'email-editor-add'}" data-add-column-id="${escapeHtml(column.id)}"${beforeId ? ` data-before-block-id="${escapeHtml(beforeId)}"` : ''} aria-label="${beforeId ? `Добавить перед блоком ${index! + 1} в колонке ${columnIndex + 1}` : `Добавить в конец колонки ${columnIndex + 1}`}">${beforeId ? '+' : '＋ Добавить блок'}</button></td></tr>`;
        const rows = emailBlockRows(column.blocks)
          .map((row) => {
            const firstIndex = column.blocks.indexOf(row[0]);
            const insert = options.editor
              ? addButton(row[0].id, firstIndex)
              : '';
            if (row.length === 1) return insert + renderBlock(row[0], section);
            const total = row.reduce(
              (sum, block) => sum + (block.widthPercent ?? 1),
              0,
            );
            const cells = row
              .map((block) => {
                const blockShare = (block.widthPercent ?? 1) / total;
                const imageWidth = options.editor
                  ? undefined
                  : Math.max(1, (width - 16) * blockShare - 8);
                return `<td class="email-inline-cell" width="${(blockShare * 100).toFixed(4)}%" valign="top" style="vertical-align:top;padding:0 4px;width:${(blockShare * 100).toFixed(4)}%;">${table(renderBlock(block, section, true, imageWidth), 'table-layout:fixed;')}</td>`;
              })
              .join('');
            return (
              insert +
              `<tr><td>${table(`<tr>${cells}</tr>`, 'table-layout:fixed;', `data-row-id="${escapeHtml(row[0].rowId!)}"`)}</td></tr>`
            );
          })
          .join('');
        const contents = table(
          options.editor
            ? column.blocks.length
              ? rows + addButton()
              : `<tr><td data-empty-column="${escapeHtml(column.id)}" data-add-column-id="${escapeHtml(column.id)}" role="button" tabindex="0" aria-label="Добавить в колонку ${columnIndex + 1}"><span class="email-editor-empty">＋ Добавить блок</span></td></tr>`
            : rows || '<tr><td></td></tr>',
          `font-size:${a.fontSize}px;line-height:${a.lineHeight};color:${a.textColor};`,
        );
        const inner = table(
          `<tr><td style="padding:0 8px;">${contents}</td></tr>`,
          'table-layout:fixed;',
        );
        return `<!--[if mso]><td width="${width.toFixed(2)}" valign="top"><![endif]--><div class="email-column" data-column-id="${escapeHtml(column.id)}"${options.editor ? ` role="group" aria-label="Колонка ${columnIndex + 1}"` : ''} style="display:inline-block;vertical-align:top;width:${options.editor ? `${(share * 100).toFixed(4)}%` : '100%'};max-width:${width.toFixed(4)}px;">${inner}</div><!--[if mso]></td><![endif]-->`;
      })
      .join('');
    const content = `<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${sectionWidth}"><tr><![endif]-->${columns}<!--[if mso]></tr></table><![endif]-->`;
    const height = Number.isFinite(section.minHeight)
      ? `height:${Math.max(0, Math.round(section.minHeight!))}px;`
      : '';
    const style = `${height}${section.background ? `background-color:${appearanceColor(section.background, a.background)};` : ''}${backgroundImageCss(section.backgroundImage ?? '')}${borderColor ? `border:1px solid ${borderColor};` : ''}border-radius:${radius}px;`;
    return `<tr><td${options.editor ? ` role="region" aria-label="Секция ${sectionIndex + 1}"` : ''} style="padding:0 0 16px;">${table(`<tr><td valign="top" style="padding:16px;font-size:0;text-align:left;vertical-align:top;">${content}</td></tr>`, style, `data-section-id="${escapeHtml(section.id)}"`)}</td></tr>`;
  };
  const sections = document.sections.map(renderSection).join('');
  return {
    html: table(sections || '<tr><td></td></tr>', 'table-layout:fixed;'),
    text: plain.filter((value) => value.trim()).join('\n\n'),
  };
}

export function renderEmailDocument(
  document: EmailDocument,
  locale: LetterLocale,
): LetterPreviewResult {
  const version = document.versions[locale];
  if (!version) throw new Error(`Missing email document version: ${locale}`);
  const content = renderEmailDocumentContent(document, locale);
  return {
    subject: version.subject,
    width: normalizeAppearance(document.appearance).width + 32,
    html: renderEmailHtml(
      {
        locale,
        subject: version.subject,
        preheader: version.preheader,
        html: content.html,
      },
      document.appearance,
    ),
    text: content.text,
    notes: [],
  };
}
