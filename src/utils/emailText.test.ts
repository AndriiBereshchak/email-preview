import { expect, it } from 'vitest';
import { emailTextHtml, readEmailText } from './emailText';

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
