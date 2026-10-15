import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE, normalizeAppearance } from './appearanceModel';
import { renderLocalPreview } from './localModel';
const letter = {
  locale: 'ru' as const,
  subject: 'Test',
  preheader: 'Preview',
  html: '<p>Text</p><p><a href="https://example.test">Link</a></p>',
};
describe('email appearance', () => {
  it('bounds dimensions and rejects invalid colors and fonts', () => {
    const a = normalizeAppearance({
      ...DEFAULT_APPEARANCE,
      width: 9999,
      padding: -1,
      textColor: 'red;display:none',
      fontFamily: 'Unknown' as 'Arial',
    });
    expect(a.width).toBe(800);
    expect(a.padding).toBe(0);
    expect(a.textColor).toBe(DEFAULT_APPEARANCE.textColor);
    expect(a.fontFamily).toBe('Arial');
  });
  it('uses the same appearance for different language previews without changing the content', () => {
    const a = {
      ...DEFAULT_APPEARANCE,
      background: '#ffeedd',
      textColor: '#123456',
      width: 520,
      padding: 32,
      fontSize: 20,
    };
    for (const locale of ['ru', 'uk'] as const) {
      const preview = renderLocalPreview({ ...letter, locale }, a);
      const doc = new DOMParser().parseFromString(preview.html, 'text/html');
      const body = doc.querySelector<HTMLElement>('.email-body')!;
      expect(body.style.padding).toBe('32px');
      expect(body.style.fontSize).toBe('20px');
      expect(body.style.backgroundColor).toBe('rgb(255, 238, 221)');
      expect(body.innerHTML).toBe(letter.html);
      expect(preview.width).toBe(552);
      expect(doc.querySelector('table')?.style.width).toBe('100%');
      expect(doc.querySelector('table')?.style.tableLayout).toBe('fixed');
      expect(preview.text).toContain('Text');
      expect(doc.querySelector('table[width="520"]')).not.toBeNull();
    }
  });
});
