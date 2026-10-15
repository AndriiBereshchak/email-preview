import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE, normalizeAppearance } from './appearanceModel';
import {
  letterHeaderHtml,
  letterFooterHtml,
  readHeaderLogo,
} from './letterHeader';
import { previewKey, renderLocalPreview } from './localModel';

const logo = 'data:image/png;base64,iVBORw0KGgo=';
const draft = {
  locale: 'uk' as const,
  subject: 'Test',
  preheader: '',
  html: '<p>Letter content</p>',
};
const appearance = {
  ...DEFAULT_APPEARANCE,
  headerEnabled: true,
  headerBackground: '#123456',
  logoSrc: logo,
  logoName: 'logo.png',
};

describe('letter header', () => {
  it('keeps the header absent by default and after resetting appearance', () => {
    expect(letterHeaderHtml(DEFAULT_APPEARANCE)).toBe('');
    expect(renderLocalPreview(draft).html).not.toContain(
      'class="email-header"',
    );
    expect(normalizeAppearance({}).headerEnabled).toBe(false);
  });
  it('uses the same header in the layout and language previews without modifying the letter', () => {
    for (const locale of ['uk', 'ru'] as const) {
      const preview = renderLocalPreview({ ...draft, locale }, appearance);
      const doc = new DOMParser().parseFromString(preview.html, 'text/html');
      const header = doc.querySelector<HTMLElement>('.email-header')!;
      expect(header.outerHTML).toBe(
        new DOMParser().parseFromString(
          letterHeaderHtml(appearance),
          'text/html',
        ).body.innerHTML,
      );
      expect(header.style.backgroundColor).toBe('rgb(18, 52, 86)');
      const image = header.querySelector('img')!;
      expect(image.getAttribute('src')).toBe(logo);
      expect(image.style.height).toBe('auto');
      expect(image.style.maxWidth).toBe('100%');
      expect(
        header.closest('tr')?.nextElementSibling?.querySelector('.email-body')
          ?.innerHTML,
      ).toBe(draft.html);
      expect(preview.text).toBe('Letter content');
    }
  });
  it('changes the review key when the header changes and supports background without a logo', () => {
    expect(previewKey('TRADER', draft, appearance)).not.toBe(
      previewKey('TRADER', draft),
    );
    expect(letterHeaderHtml({ ...appearance, logoSrc: '' })).toContain(
      'background-color:#123456',
    );
    expect(letterHeaderHtml({ ...appearance, logoSrc: '' })).not.toContain(
      '<img',
    );
    expect(letterHeaderHtml({ ...appearance, headerEnabled: false })).toBe('');
  });
  it('rejects unsafe logo sources and invalid background colors', () => {
    for (const logoSrc of [
      'javascript:alert(1)',
      'data:image/svg+xml;base64,AAAA',
      'https://example.test/logo.png',
      'data:image/png;base64,AAA" onerror="alert(1)',
    ]) {
      expect(letterHeaderHtml({ ...appearance, logoSrc })).not.toContain(
        '<img',
      );
    }
    expect(
      normalizeAppearance({
        ...appearance,
        headerBackground: 'red;display:none',
      }).headerBackground,
    ).toBe(DEFAULT_APPEARANCE.headerBackground);
  });
  it('rejects unsupported and oversized uploads before reading them', async () => {
    await expect(
      readHeaderLogo(new File(['svg'], 'logo.svg', { type: 'image/svg+xml' })),
    ).rejects.toThrow('Выберите PNG');
    const file = new File(['image'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 16 * 1024 * 1024 });
    await expect(readHeaderLogo(file)).rejects.toThrow('до 15 МБ');
  });
});

it('renders formatted header text, resized logo and height, and footer in order', () => {
  const a = {
    ...appearance,
    logoWidth: 240,
    headerHeight: 280,
    headerText:
      '<p><span style="font-size:24px;color:#ffffff">Welcome</span></p>',
    footerEnabled: true,
    footerBackground: '#eeeeee',
    footerText: '<p>Thank you</p>',
  };
  const preview = renderLocalPreview(draft, a);
  const doc = new DOMParser().parseFromString(preview.html, 'text/html');
  expect(
    (doc.querySelector('.email-header') as HTMLElement).style.minHeight,
  ).toBe('280px');
  expect(
    (doc.querySelector('.email-header img') as HTMLImageElement).width,
  ).toBe(240);
  expect(
    (doc.querySelector('.email-header span') as HTMLElement).style.fontSize,
  ).toBe('24px');
  expect(doc.querySelector('.email-footer')!.textContent).toBe('Thank you');
  expect(preview.text.indexOf('Welcome')).toBeLessThan(
    preview.text.indexOf('Letter content'),
  );
  expect(preview.text.indexOf('Letter content')).toBeLessThan(
    preview.text.indexOf('Thank you'),
  );
  expect(letterFooterHtml({ ...a, footerEnabled: false })).toBe('');
  expect(previewKey('TRADER', draft, a)).not.toBe(
    previewKey('TRADER', draft, appearance),
  );
  const hidden = renderLocalPreview(draft, {
    ...a,
    headerEnabled: false,
    footerEnabled: false,
  });
  expect(hidden.text).toBe('Letter content');
});
it('bounds resize values and keeps existing content when normalizing', () => {
  const a = normalizeAppearance({
    headerHeight: -100,
    logoWidth: 99999,
    headerText: '<p>Title</p>',
    footerText: '<p>Footer</p>',
  });
  expect(a.headerHeight).toBe(48);
  expect(a.logoWidth).toBe(800);
  expect(a.headerText).toBe('<p>Title</p>');
  expect(a.footerText).toBe('<p>Footer</p>');
});
