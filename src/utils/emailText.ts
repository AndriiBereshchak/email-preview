import type { EmailBlockContent } from './emailDocument';
import { escapeHtml, textWithBreaksHtml } from './emailHtml';
import { letterLinkUrl } from './letterLink';

type TextContent = Extract<EmailBlockContent, { type: 'text' }>;
type TextRange = { start: number; end: number };

function boldRanges(content: TextContent): TextRange[] {
  const ranges: TextRange[] = [];
  for (const range of [...(content.bold ?? [])].sort(
    (a, b) => a.start - b.start,
  )) {
    if (
      !Number.isInteger(range.start) ||
      !Number.isInteger(range.end) ||
      range.start < 0 ||
      range.end <= range.start ||
      range.end > content.text.length
    )
      continue;
    const previous = ranges.at(-1);
    if (previous && range.start <= previous.end)
      previous.end = Math.max(previous.end, range.end);
    else ranges.push({ ...range });
  }
  return ranges;
}

export function isEmailTextBold(
  content: TextContent,
  selection: TextRange | null,
): boolean {
  return (
    !!selection &&
    selection.end > selection.start &&
    boldRanges(content).some(
      (range) => range.start <= selection.start && range.end >= selection.end,
    )
  );
}

export function toggleEmailTextBold(
  content: TextContent,
  selection: TextRange,
): TextContent {
  if (
    selection.start < 0 ||
    selection.end > content.text.length ||
    selection.end <= selection.start
  )
    return content;
  const bold = isEmailTextBold(content, selection)
    ? boldRanges(content).flatMap((range) => {
        if (range.end <= selection.start || range.start >= selection.end)
          return [range];
        return [
          ...(range.start < selection.start
            ? [{ start: range.start, end: selection.start }]
            : []),
          ...(range.end > selection.end
            ? [{ start: selection.end, end: range.end }]
            : []),
        ];
      })
    : boldRanges({ ...content, bold: [...(content.bold ?? []), selection] });
  return { ...content, bold };
}

export function emailTextHtml(content: TextContent, color: string): string {
  const bold = boldRanges(content);
  const formatted = (start: number, end: number) => {
    let html = '';
    let cursor = start;
    for (const range of bold) {
      const from = Math.max(start, range.start);
      const to = Math.min(end, range.end);
      if (from >= to) continue;
      html += textWithBreaksHtml(content.text.slice(cursor, from));
      html += `<strong>${textWithBreaksHtml(content.text.slice(from, to))}</strong>`;
      cursor = to;
    }
    return html + textWithBreaksHtml(content.text.slice(cursor, end));
  };
  let html = '';
  let cursor = 0;
  for (const link of [...(content.links ?? [])].sort(
    (a, b) => a.start - b.start,
  )) {
    const href = letterLinkUrl(link.href);
    if (
      !href ||
      !Number.isInteger(link.start) ||
      !Number.isInteger(link.end) ||
      link.start < cursor ||
      link.end <= link.start ||
      link.end > content.text.length
    )
      continue;
    html += formatted(cursor, link.start);
    html += `<a href="${escapeHtml(href)}" style="color:${color};text-decoration:underline;">${formatted(link.start, link.end)}</a>`;
    cursor = link.end;
  }
  return html + formatted(cursor, content.text.length);
}

export function selectEmailText(
  editor: HTMLElement,
  start: number,
  end: number,
) {
  const point = (offset: number): [Node, number] => {
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    );
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const br = node instanceof Element && node.tagName === 'BR';
      if (node.nodeType !== Node.TEXT_NODE && !br) continue;
      const length = br ? 1 : (node.textContent?.length ?? 0);
      if (offset <= length)
        return br
          ? [
              node.parentNode!,
              Array.from(node.parentNode!.childNodes).indexOf(
                node as ChildNode,
              ) + offset,
            ]
          : [node, offset];
      offset -= length;
    }
    return [editor, editor.childNodes.length];
  };
  const range = document.createRange();
  range.setStart(...point(start));
  range.setEnd(...point(end));
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function readEmailText(root: Node): TextContent {
  let text = '';
  const links: NonNullable<TextContent['links']> = [];
  const bold: TextRange[] = [];
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
      return;
    }
    if (node instanceof Element && node.tagName === 'BR') {
      text += '\n';
      return;
    }
    const block =
      node instanceof Element &&
      /^(DIV|P)$/.test(node.tagName) &&
      node !== root;
    if (block && text && !text.endsWith('\n')) text += '\n';
    const start = text.length;
    node.childNodes.forEach(visit);
    if (node instanceof HTMLAnchorElement && text.length > start)
      links.push({
        start,
        end: text.length,
        href: node.getAttribute('href') ?? '',
      });
    if (
      node instanceof Element &&
      /^(STRONG|B)$/.test(node.tagName) &&
      text.length > start
    )
      bold.push({ start, end: text.length });
    if (block && node.nextSibling && !text.endsWith('\n')) text += '\n';
  };
  visit(root);
  return {
    type: 'text',
    text,
    ...(links.length ? { links } : {}),
    ...(bold.length ? { bold: boldRanges({ type: 'text', text, bold }) } : {}),
  };
}
