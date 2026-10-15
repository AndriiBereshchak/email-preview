import { beforeEach, describe, expect, it } from 'vitest';
import { letterLinkUrl, linkValue, saveLetterLink } from './letterLink';
import { renderLocalPreview } from './localModel';
let root: HTMLDivElement;
beforeEach(() => {
  root = document.createElement('div');
  root.innerHTML = '<p>Before selected after</p><p>Untouched</p>';
});
const values = (kind: 'link' | 'button' = 'link') => ({
  ...linkValue(null, kind, 'selected', '#2e7a55'),
  url: 'https://example.test/path',
});
describe('letter links and buttons', () => {
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
  it('replaces only the selected words with a colored link', () => {
    const range = document.createRange();
    range.setStart(root.firstChild!.firstChild!, 7);
    range.setEnd(root.firstChild!.firstChild!, 15);
    const anchor = saveLetterLink(
      root,
      { ...values(), color: '#112233', underline: false },
      range,
      null,
    );
    expect(root.firstChild!.textContent).toBe('Before selected after');
    expect(anchor.textContent).toBe('selected');
    expect(anchor.style.textDecoration).toBe('none');
    expect(anchor.style.color).toBe('rgb(17, 34, 51)');
    expect(root.children[1].outerHTML).toBe('<p>Untouched</p>');
  });
  it('adds a separate button, preserves its style in preview and edits without duplicating it', () => {
    const value = {
      ...values('button'),
      size: 'large' as const,
      radius: 0,
      alignment: 'center' as const,
      background: '#123456',
    };
    const button = saveLetterLink(root, value, null, null);
    expect(button.parentElement!.style.textAlign).toBe('center');
    expect(button.style.fontSize).toBe('20px');
    expect(button.style.borderRadius).toBe('0px');
    expect(button.getAttribute('data-email-button')).toBe('true');
    expect(linkValue(button, 'button', '', '#2e7a55').radius).toBe(0);
    saveLetterLink(
      root,
      { ...value, text: 'Changed', url: 'mailto:demo@example.test' },
      null,
      button,
    );
    expect(root.querySelectorAll('a')).toHaveLength(1);
    expect(button.textContent).toBe('Changed');
    const doc = new DOMParser().parseFromString(
      renderLocalPreview({
        locale: 'uk',
        subject: 'Test',
        preheader: '',
        html: root.innerHTML,
      }).html,
      'text/html',
    );
    expect(
      (doc.querySelector('a') as HTMLAnchorElement).style.backgroundColor,
    ).toBe('rgb(18, 52, 86)');
    expect(doc.querySelector('a')!.getAttribute('href')).toBe(
      'mailto:demo@example.test',
    );
  });
  it('rejects multi-paragraph and nested-link selections without changing the content', () => {
    const range = document.createRange();
    range.setStart(root.children[0].firstChild!, 0);
    range.setEnd(root.children[1].firstChild!, 2);
    const before = root.innerHTML;
    expect(() => saveLetterLink(root, values(), range, null)).toThrow(
      'одного абзаца',
    );
    expect(root.innerHTML).toBe(before);
    root.innerHTML =
      '<p>Before <a href="https://example.test">link</a> after</p>';
    range.selectNodeContents(root.firstChild!);
    expect(() => saveLetterLink(root, values(), range, null)).toThrow(
      'без других ссылок',
    );
  });
  it('rejects invalid values before mutating an existing link', () => {
    const anchor = saveLetterLink(root, values(), null, null);
    const before = root.innerHTML;
    expect(() =>
      saveLetterLink(
        root,
        { ...values(), url: 'javascript:alert(1)' },
        null,
        anchor,
      ),
    ).toThrow();
    expect(root.innerHTML).toBe(before);
  });
});

it('keeps emphasis when turning selected rich text into a link', () => {
  root.innerHTML = '<p>Before <strong>selected</strong> after</p>';
  const range = document.createRange();
  range.selectNode(root.querySelector('strong')!);
  const anchor = saveLetterLink(root, values(), range, null);
  expect(anchor.querySelector('strong')?.textContent).toBe('selected');
  expect(root.textContent).toBe('Before selected after');
});
