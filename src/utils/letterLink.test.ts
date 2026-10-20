import { expect, it } from 'vitest';
import { letterButtonCss, letterLinkUrl } from './letterLink';
it('accepts full web and mail addresses and rejects unsafe or incomplete addresses', () => {
  for (const url of [
    'https://example.test',
    'http://example.test',
    'mailto:demo@example.test',
  ])
    expect(letterLinkUrl(url)).toBe(url);
  for (const url of [
    '',
    'javascript:alert(1)',
    'data:text/html,test',
    'example.test',
    'https://',
    'mailto:',
    'mailto:test\nBcc:other',
  ])
    expect(letterLinkUrl(url)).toBeNull();
});

it('keeps the shared button sizing and safe color fallback', () => {
  expect(
    letterButtonCss({ size: 'medium', radius: 4, background: '#123456' }),
  ).toContain('padding:12px 24px');
  expect(
    letterButtonCss({ size: 'medium', radius: 100, background: 'red' }),
  ).toContain('border-radius:48px');
  expect(
    letterButtonCss({ size: 'medium', radius: 4, background: 'red' }),
  ).toContain('background-color:#2e7a55');
});
