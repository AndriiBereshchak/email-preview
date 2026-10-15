import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import LetterLinkDialog from './LetterLinkDialog';
import { linkValue } from '../../utils/letterLink';
const original = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
});
afterAll(() => {
  if (original)
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', original);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('requires text and a valid address, then saves button appearance', () => {
  const onSave = vi.fn();
  const page = render(
    <LetterLinkDialog
      initial={linkValue(null, 'button', '', '#2e7a55')}
      onSave={onSave}
      onClose={vi.fn()}
    />,
  );
  expect(
    (page.getByRole('button', { name: 'Сохранить' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.change(page.getByLabelText('Адрес'), {
    target: { value: 'javascript:alert(1)' },
  });
  expect(page.getByRole('alert')).toBeTruthy();
  fireEvent.change(page.getByLabelText('Адрес'), {
    target: { value: 'https://example.test' },
  });
  fireEvent.change(page.getByLabelText('Размер кнопки'), {
    target: { value: 'large' },
  });
  fireEvent.change(page.getByLabelText('Выравнивание кнопки'), {
    target: { value: 'center' },
  });
  fireEvent.click(page.getByRole('button', { name: 'Сохранить' }));
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({
      size: 'large',
      alignment: 'center',
      url: 'https://example.test',
    }),
  );
});
it('cancels without applying changes', () => {
  const onSave = vi.fn(),
    onClose = vi.fn();
  const page = render(
    <LetterLinkDialog
      initial={linkValue(null, 'link', 'Link', '#2e7a55')}
      onSave={onSave}
      onClose={onClose}
    />,
  );
  fireEvent.click(page.getByRole('button', { name: 'Отмена' }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(onSave).not.toHaveBeenCalled();
});
