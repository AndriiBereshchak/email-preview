import { expect, it } from 'vitest';
import { readAppearanceImage } from './appearanceImage';

it('rejects unsupported and oversized uploads before reading them', async () => {
  await expect(
    readAppearanceImage(
      new File(['svg'], 'background.svg', { type: 'image/svg+xml' }),
    ),
  ).rejects.toThrow('Выберите PNG');
  const file = new File(['image'], 'background.png', { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: 16 * 1024 * 1024 });
  await expect(readAppearanceImage(file)).rejects.toThrow('до 15 МБ');
});
