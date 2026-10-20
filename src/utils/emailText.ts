import type { EmailBlockContent } from './emailDocument';
import { escapeHtml, textWithBreaksHtml } from './emailHtml';
import { letterLinkUrl } from './letterLink';

type TextContent = Extract<EmailBlockContent, { type: 'text' }>;

export function emailTextHtml(content: TextContent, color: string): string {
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
    html += textWithBreaksHtml(content.text.slice(cursor, link.start));
    html += `<a href="${escapeHtml(href)}" style="color:${color};text-decoration:underline;">${textWithBreaksHtml(content.text.slice(link.start, link.end))}</a>`;
    cursor = link.end;
  }
  return html + textWithBreaksHtml(content.text.slice(cursor));
}

export function readEmailText(root: Node): TextContent {
  let text = '';
  const links: NonNullable<TextContent['links']> = [];
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
    if (block && node.nextSibling && !text.endsWith('\n')) text += '\n';
  };
  visit(root);
  return { type: 'text', text, ...(links.length ? { links } : {}) };
}
