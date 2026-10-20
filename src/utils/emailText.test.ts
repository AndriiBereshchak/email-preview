import { expect, it } from 'vitest';
import {
  emailTextHtml,
  isEmailTextBold,
  readEmailText,
  selectEmailText,
  toggleEmailTextBold,
} from './emailText';

it('renders only valid non-overlapping text links and escapes their text and URLs', () => {
  const html = emailTextHtml(
    {
      type: 'text',
      text: '<Start>\nMore',
      links: [
        { start: 0, end: 7, href: 'https://example.test/?a=1&b=2' },
        { start: 1, end: 4, href: 'https://example.test/overlap' },
        { start: 8, end: 12, href: 'javascript:alert(1)' },
      ],
    },
    '#123456',
  );
  expect(html).toContain('href="https://example.test/?a=1&amp;b=2"');
  expect(html).toContain('&lt;Start&gt;</a><br>More');
  expect(html.match(/<a /g)).toHaveLength(1);
  expect(html).not.toContain('javascript:');
});

it('reads edited text and keeps link ranges aligned after inserting text before a link', () => {
  const root = document.createElement('p');
  root.innerHTML = 'Before <a href="https://example.test">link</a><br>After';
  expect(readEmailText(root)).toEqual({
    type: 'text',
    text: 'Before link\nAfter',
    links: [{ start: 7, end: 11, href: 'https://example.test' }],
  });
  root.prepend(document.createTextNode('New '));
  const content = readEmailText(root);
  expect(content.links).toEqual([
    { start: 11, end: 15, href: 'https://example.test' },
  ]);
  expect(emailTextHtml(content, '#123456')).toContain('New Before <a');
});

it('round-trips bold phrases across links and line breaks without treating text as HTML', () => {
  const content = {
    type: 'text' as const,
    text: '<Hello> link\nworld',
    bold: [{ start: 2, end: 16 }],
    links: [{ start: 8, end: 12, href: 'https://example.test' }],
  };
  const root = document.createElement('p');
  root.innerHTML = emailTextHtml(content, '#123456');
  expect(root.querySelector('hello')).toBeNull();
  expect(root.querySelector('a strong')?.textContent).toBe('link');
  expect(readEmailText(root)).toEqual(content);
  root.prepend(document.createTextNode('New '));
  const edited = readEmailText(root);
  expect(edited.bold).toEqual([{ start: 6, end: 20 }]);
  expect(edited.links).toEqual([
    { start: 12, end: 16, href: 'https://example.test' },
  ]);
});

it('toggles selected bold text and merges adjacent ranges without changing links', () => {
  const content = {
    type: 'text' as const,
    text: '0123456789',
    links: [{ start: 2, end: 6, href: 'https://example.test' }],
  };
  const bold = toggleEmailTextBold(content, { start: 0, end: 10 });
  expect(isEmailTextBold(bold, { start: 3, end: 7 })).toBe(true);
  const split = toggleEmailTextBold(bold, { start: 3, end: 7 });
  expect(split.bold).toEqual([
    { start: 0, end: 3 },
    { start: 7, end: 10 },
  ]);
  expect(isEmailTextBold(split, { start: 2, end: 8 })).toBe(false);
  const restored = toggleEmailTextBold(split, { start: 3, end: 7 });
  expect(restored.bold).toEqual([{ start: 0, end: 10 }]);
  expect(restored.links).toEqual(content.links);
  expect(toggleEmailTextBold(restored, { start: 0, end: 10 }).bold).toEqual([]);
  expect(toggleEmailTextBold(content, { start: 3, end: 3 })).toBe(content);
});

it('restores the selected phrase across bold nodes, links and line breaks', () => {
  const root = document.createElement('p');
  root.innerHTML =
    'A<strong>bold<br>line</strong><a href="https://example.test">link</a> end';
  document.body.append(root);
  const text = readEmailText(root).text;
  for (const [start, end] of [
    [1, 13],
    [5, 6],
    [6, text.length],
  ]) {
    selectEmailText(root, start, end);
    expect(
      readEmailText(window.getSelection()!.getRangeAt(0).cloneContents()).text,
    ).toBe(text.slice(start, end));
  }
  root.remove();
});
