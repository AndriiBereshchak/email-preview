import {
  fireEvent,
  render,
  screen,
  cleanup,
  act,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AppearanceBackgroundImage from './AppearanceBackgroundImage';
import { readAppearanceImage } from '../../utils/appearanceImage';
vi.mock('../../utils/appearanceImage', () => ({
  readAppearanceImage: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const src = 'data:image/png;base64,aGVsbG8=';
it('uploads, previews and removes a background image', async () => {
  vi.mocked(readAppearanceImage).mockResolvedValue(src);
  const onChange = vi.fn();
  const view = render(
    <AppearanceBackgroundImage
      compact
      label="Фон письма"
      value=""
      onChange={onChange}
    />,
  );
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Фон письма: изображение'), {
      target: { files: [new File(['image'], 'bg.png', { type: 'image/png' })] },
    });
  });
  expect(onChange).toHaveBeenCalledWith(src);
  view.rerender(
    <AppearanceBackgroundImage
      compact
      label="Фон письма"
      value={src}
      onChange={onChange}
    />,
  );
  expect(screen.getByAltText('Фон письма').getAttribute('src')).toBe(src);
  fireEvent.click(screen.getByText('Убрать изображение'));
  expect(onChange).toHaveBeenLastCalledWith('');
});
it('cancels a pending upload when removed', async () => {
  let resolve!: (value: string) => void;
  vi.mocked(readAppearanceImage).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const onChange = vi.fn();
  render(
    <AppearanceBackgroundImage
      label="Фон письма"
      value=""
      onChange={onChange}
    />,
  );
  fireEvent.change(screen.getByLabelText('Фон письма: изображение'), {
    target: { files: [new File(['image'], 'bg.png')] },
  });
  fireEvent.click(screen.getByText('Убрать изображение'));
  await act(async () => {
    resolve(src);
  });
  expect(onChange.mock.calls).toEqual([['']]);
});
it('keeps the current image when upload fails', async () => {
  vi.mocked(readAppearanceImage).mockRejectedValue(
    new Error('Не удалось открыть изображение'),
  );
  const onChange = vi.fn();
  render(
    <AppearanceBackgroundImage
      label="Фон письма"
      value={src}
      onChange={onChange}
    />,
  );
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Фон письма: изображение'), {
      target: { files: [new File(['bad'], 'bg.png')] },
    });
  });
  expect(screen.getByRole('alert').textContent).toContain(
    'Не удалось открыть изображение',
  );
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByAltText('Фон письма').getAttribute('src')).toBe(src);
});
