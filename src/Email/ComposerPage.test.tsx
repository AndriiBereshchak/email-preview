// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ComposerPage from './ComposerPage';
import { campaignStore } from '../mocks/campaignStore';
import * as localModel from '../utils/localModel';

vi.mock('./Composer/VersionEditor', () => ({
  default: ({
    initialHtml,
    onChange,
  }: {
    initialHtml: string;
    onChange: (html: string) => void;
  }) => (
    <textarea
      aria-label="HTML письма"
      defaultValue={initialHtml}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const showModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const close = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});
afterAll(() => {
  if (showModal)
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (close) Object.defineProperty(HTMLDialogElement.prototype, 'close', close);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setup() {
  const page = render(
    <MemoryRouter initialEntries={['/admin/distribution/new']}>
      <Routes>
        <Route path="/admin/distribution/new" element={<ComposerPage />} />
        <Route
          path="/admin/distribution/campaign/:id"
          element={<p>Кампания открыта</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(page.getByRole('button', { name: 'Далее: письмо' }));
  const letter = within(page.getByRole('region', { name: 'Письмо' }));
  fireEvent.change(letter.getByPlaceholderText('Тема на языке: русский'), {
    target: { value: 'Тема RU' },
  });
  fireEvent.change(letter.getByRole('textbox', { name: 'HTML письма' }), {
    target: { value: '<p>Привет!</p>' },
  });
  return page;
}

function addUkrainian(page: ReturnType<typeof setup>) {
  const letter = within(page.getByRole('region', { name: 'Письмо' }));
  fireEvent.click(letter.getByRole('button', { name: '+ Добавить язык' }));
  fireEvent.click(letter.getByRole('menuitem', { name: /Украинский/ }));
  fireEvent.change(letter.getByPlaceholderText('Тема на языке: украинский'), {
    target: { value: 'Тема UK' },
  });
}

const launchButton = (page: ReturnType<typeof setup>) =>
  page.getByRole('button', { name: 'Запустить рассылку' }) as HTMLButtonElement;

describe('checks before launching a local campaign', () => {
  it('requires successful previews for all versions and rechecks edits and audience changes', async () => {
    const page = setup();
    addUkrainian(page);
    fireEvent.click(page.getByRole('button', { name: 'Далее: проверка' }));
    await page.findByText('Просмотрено версий: 1 из 2');
    expect(launchButton(page).disabled).toBe(true);
    expect(page.getByText('Откройте предпросмотр каждой версии')).toBeTruthy();
    let review = within(
      page.getByRole('region', { name: 'Проверка и отправка' }),
    );
    fireEvent.click(review.getByRole('tab', { name: /Русский/ }));
    await page.findByText('Просмотрено версий: 2 из 2');
    expect(launchButton(page).disabled).toBe(false);
    expect(page.getByRole('button', { name: /✓ Кому/ })).toBeTruthy();
    expect(page.getByRole('button', { name: /✓ Письмо/ })).toBeTruthy();

    fireEvent.click(review.getByRole('button', { name: 'Назад' }));
    const letter = within(page.getByRole('region', { name: 'Письмо' }));
    fireEvent.click(letter.getByRole('tab', { name: /Украинский/ }));
    fireEvent.change(letter.getByRole('textbox', { name: /Прехедер/ }), {
      target: { value: 'Новый прехедер' },
    });
    fireEvent.change(letter.getByPlaceholderText('Тема на языке: украинский'), {
      target: { value: 'Новая тема UK' },
    });
    fireEvent.change(letter.getByRole('textbox', { name: 'HTML письма' }), {
      target: { value: '<p>Новый текст</p>' },
    });
    // Open RU first; the edited UK must stay unreviewed until selected.
    fireEvent.click(letter.getByRole('tab', { name: /Русский/ }));
    fireEvent.click(page.getByRole('button', { name: 'Далее: проверка' }));
    expect(page.getByText('Просмотрено версий: 1 из 2')).toBeTruthy();
    expect(launchButton(page).disabled).toBe(true);
    review = within(page.getByRole('region', { name: 'Проверка и отправка' }));
    fireEvent.click(review.getByRole('tab', { name: /Украинский/ }));
    await page.findByText('Просмотрено версий: 2 из 2');
    expect(review.getByText('Новая тема UK')).toBeTruthy();

    fireEvent.click(page.getByRole('button', { name: /Кому.*Трейдеры/ }));
    fireEvent.click(page.getByRole('radio', { name: /Партнёрам/ }));
    fireEvent.click(page.getByRole('button', { name: 'Далее: письмо' }));
    fireEvent.click(page.getByRole('button', { name: 'Далее: проверка' }));
    await page.findByText('Просмотрено версий: 1 из 2');
    expect(launchButton(page).disabled).toBe(true);
  });

  it('preserves the preference, conditionally explains it and requires both confirmations', async () => {
    const start = vi.spyOn(campaignStore, 'start').mockReturnValue(999);
    const page = setup();
    fireEvent.click(page.getByRole('button', { name: 'Далее: проверка' }));
    await page.findByText('Просмотрено версий: 1 из 1');
    const preference = page.getByRole('checkbox', {
      name: /Не отправлять тем/,
    });
    fireEvent.click(preference);
    expect((preference as HTMLInputElement).checked).toBe(true);
    fireEvent.click(launchButton(page));
    let dialog = within(page.getByRole('dialog'));
    expect(
      dialog.getByText(
        'Тем, кто полгода не открывал наши письма, не отправим.',
      ),
    ).toBeTruthy();
    const send = dialog.getByRole('button', {
      name: /Отправить до/,
    }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.click(dialog.getByRole('checkbox', { name: /Я проверил/ }));
    expect(send.disabled).toBe(true);
    fireEvent.click(dialog.getByRole('button', { name: 'Отмена' }));
    fireEvent.click(page.getByRole('checkbox', { name: /Не отправлять тем/ }));
    fireEvent.click(launchButton(page));
    dialog = within(page.getByRole('dialog'));
    expect(
      dialog.queryByText(
        'Тем, кто полгода не открывал наши письма, не отправим.',
      ),
    ).toBeNull();
    expect(
      (dialog.getByRole('checkbox', { name: /Я проверил/ }) as HTMLInputElement)
        .checked,
    ).toBe(false);
    fireEvent.click(dialog.getByRole('button', { name: 'Отмена' }));
    fireEvent.click(page.getByRole('checkbox', { name: /Не отправлять тем/ }));
    fireEvent.click(launchButton(page));
    dialog = within(page.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('checkbox', { name: /Я проверил/ }));
    fireEvent.click(
      dialog.getByRole('checkbox', { name: /Да, отправить всем/ }),
    );
    fireEvent.click(dialog.getByRole('button', { name: /Отправить до/ }));
    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        skipUnengaged: true,
        everyoneConfirmed: true,
        expectedRecipients: 24,
      }),
    );
    expect(page.getByText('Кампания открыта')).toBeTruthy();
  });

  it('does not approve a preview that failed to render', async () => {
    vi.spyOn(localModel, 'renderLocalPreview').mockImplementationOnce(() => {
      throw new Error('Не удалось собрать письмо');
    });
    const page = setup();
    fireEvent.click(page.getByRole('button', { name: 'Далее: проверка' }));
    expect(await page.findByRole('alert')).toBeTruthy();
    expect(page.getByText('Просмотрено версий: 0 из 1')).toBeTruthy();
    expect(launchButton(page).disabled).toBe(true);
    fireEvent.click(
      within(
        page.getByRole('region', { name: 'Проверка и отправка' }),
      ).getByRole('button', { name: 'Назад' }),
    );
    fireEvent.click(page.getByRole('button', { name: 'Далее: проверка' }));
    await waitFor(() => expect(launchButton(page).disabled).toBe(false));
  });

  it('keeps a cached successful version visible after another version fails', async () => {
    const page = setup();
    addUkrainian(page);
    fireEvent.click(page.getByRole('button', { name: 'Далее: проверка' }));
    await page.findByText('Просмотрено версий: 1 из 2');
    vi.spyOn(localModel, 'renderLocalPreview').mockImplementationOnce(() => {
      throw new Error('Ошибка RU');
    });
    const review = within(
      page.getByRole('region', { name: 'Проверка и отправка' }),
    );
    fireEvent.click(review.getByRole('tab', { name: /Русский/ }));
    await page.findByRole('alert');
    fireEvent.click(review.getByRole('tab', { name: /Украинский/ }));
    expect(review.queryByRole('alert')).toBeNull();
    expect(review.getByTitle('Предпросмотр письма')).toBeTruthy();
    expect(launchButton(page).disabled).toBe(true);
  });

  it('does not mark a version reviewed after leaving before its preview completes', async () => {
    const page = setup();
    fireEvent.click(page.getByRole('button', { name: 'Далее: проверка' }));
    fireEvent.click(
      within(
        page.getByRole('region', { name: 'Проверка и отправка' }),
      ).getByRole('button', { name: 'Назад' }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      within(
        page.getByRole('complementary', { name: 'Сводка рассылки' }),
      ).getByText(/нужен предпросмотр/),
    ).toBeTruthy();
  });
});
