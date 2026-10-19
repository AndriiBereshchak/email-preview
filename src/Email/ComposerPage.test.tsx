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
import { CAMPAIGNS } from '../mocks/campaigns';
import * as documentRenderer from '../utils/renderEmailDocument';

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
  fireEvent.click(page.getByRole('button', { name: 'Далее: оформление' }));
  fireEvent.click(page.getByRole('button', { name: '+ Добавить секцию' }));
  fireEvent.click(page.getByRole('button', { name: 'Текст' }));
  fireEvent.change(page.getByRole('textbox', { name: 'Текст блока' }), {
    target: { value: 'Привет!' },
  });
  fireEvent.click(page.getByRole('button', { name: 'Назад: письмо' }));
  return page;
}

function addUkrainian(page: ReturnType<typeof setup>) {
  const letter = within(page.getByRole('region', { name: 'Письмо' }));
  fireEvent.click(letter.getByRole('button', { name: '+ Добавить язык' }));
  fireEvent.click(letter.getByRole('menuitem', { name: /Украинский/ }));
  fireEvent.change(letter.getByPlaceholderText('Тема на языке: украинский'), {
    target: { value: 'Тема UK' },
  });
  fireEvent.click(page.getByRole('button', { name: 'Далее: оформление' }));
  fireEvent.change(page.getByRole('textbox', { name: 'Текст блока' }), {
    target: { value: 'Привіт!' },
  });
  fireEvent.click(page.getByRole('button', { name: 'Назад: письмо' }));
}

function openReview(page: ReturnType<typeof setup>) {
  const next = page.queryByRole('button', { name: 'Далее: оформление' });
  if (next) fireEvent.click(next);
  fireEvent.click(page.getByRole('button', { name: 'Далее: проверка' }));
}

const launchButton = (page: ReturnType<typeof setup>) =>
  page.getByRole('button', { name: 'Запустить рассылку' }) as HTMLButtonElement;

describe('composer demo checks', () => {
  it('requires successful previews for all versions and rechecks edits and audience changes', async () => {
    const page = setup();
    addUkrainian(page);
    openReview(page);
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
    fireEvent.click(page.getByRole('button', { name: 'Назад: письмо' }));
    const letter = within(page.getByRole('region', { name: 'Письмо' }));
    fireEvent.click(letter.getByRole('tab', { name: /Украинский/ }));
    fireEvent.change(letter.getByRole('textbox', { name: /Прехедер/ }), {
      target: { value: 'Новый прехедер' },
    });
    fireEvent.change(letter.getByPlaceholderText('Тема на языке: украинский'), {
      target: { value: 'Новая тема UK' },
    });
    // Open RU first; the edited UK must stay unreviewed until selected.
    fireEvent.click(letter.getByRole('tab', { name: /Русский/ }));
    openReview(page);
    expect(page.getByText('Просмотрено версий: 1 из 2')).toBeTruthy();
    expect(launchButton(page).disabled).toBe(true);
    review = within(page.getByRole('region', { name: 'Проверка и отправка' }));
    fireEvent.click(review.getByRole('tab', { name: /Украинский/ }));
    await page.findByText('Просмотрено версий: 2 из 2');
    expect(review.getByText('Новая тема UK')).toBeTruthy();

    fireEvent.click(page.getByRole('button', { name: /Кому.*Трейдеры/ }));
    fireEvent.click(page.getByRole('radio', { name: /Партнёрам/ }));
    fireEvent.click(page.getByRole('button', { name: 'Далее: письмо' }));
    openReview(page);
    await page.findByText('Просмотрено версий: 1 из 2');
    expect(launchButton(page).disabled).toBe(true);
  });

  it('preserves the preference and keeps sending unavailable after confirmation', async () => {
    const before = JSON.stringify(CAMPAIGNS);
    const page = setup();
    openReview(page);
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
        'Настройка пропуска неактивных получателей применяется на сервере.',
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
        'Настройка пропуска неактивных получателей применяется на сервере.',
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
    expect(
      (
        dialog.getByRole('button', {
          name: /Отправить до/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      dialog.getByText('Бекенд не подключён: запуск и отправка недоступны.'),
    ).toBeTruthy();
    expect(page.queryByText('Кампания открыта')).toBeNull();
    expect(JSON.stringify(CAMPAIGNS)).toBe(before);
  });

  it('keeps audience mock counts fixed when filters change', () => {
    const page = setup();
    fireEvent.click(page.getByRole('button', { name: /Кому.*Трейдеры/ }));
    fireEvent.click(page.getByRole('checkbox', { name: /Только активные/ }));
    const summary = within(
      page.getByRole('complementary', { name: 'Сводка рассылки' }),
    );
    expect(summary.getByText('до 24')).toBeTruthy();
    expect(page.getByText(/не пересчитываются по фильтрам/)).toBeTruthy();
  });

  it('does not approve a preview that failed to render', async () => {
    vi.spyOn(documentRenderer, 'renderEmailDocument').mockImplementationOnce(
      () => {
        throw new Error('Не удалось собрать письмо');
      },
    );
    const page = setup();
    openReview(page);
    expect(await page.findByRole('alert')).toBeTruthy();
    expect(page.getByText('Просмотрено версий: 0 из 1')).toBeTruthy();
    expect(launchButton(page).disabled).toBe(true);
    fireEvent.click(
      within(
        page.getByRole('region', { name: 'Проверка и отправка' }),
      ).getByRole('button', { name: 'Назад' }),
    );
    openReview(page);
    await waitFor(() => expect(launchButton(page).disabled).toBe(false));
  });

  it('keeps a cached successful version visible after another version fails', async () => {
    const page = setup();
    addUkrainian(page);
    openReview(page);
    await page.findByText('Просмотрено версий: 1 из 2');
    vi.spyOn(documentRenderer, 'renderEmailDocument').mockImplementationOnce(
      () => {
        throw new Error('Ошибка RU');
      },
    );
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
    openReview(page);
    fireEvent.click(
      within(
        page.getByRole('region', { name: 'Проверка и отправка' }),
      ).getByRole('button', { name: 'Назад' }),
    );
    fireEvent.click(page.getByRole('button', { name: 'Назад: письмо' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      within(
        page.getByRole('complementary', { name: 'Сводка рассылки' }),
      ).getByText(/нужен предпросмотр/),
    ).toBeTruthy();
  });
  it('invalidates all language previews when appearance changes', async () => {
    const page = setup();
    addUkrainian(page);
    openReview(page);
    await page.findByText('Просмотрено версий: 1 из 2');
    fireEvent.click(
      within(
        page.getByRole('region', { name: 'Проверка и отправка' }),
      ).getByRole('tab', { name: /Русский/ }),
    );
    await page.findByText('Просмотрено версий: 2 из 2');
    fireEvent.click(page.getByRole('button', { name: 'Назад' }));
    fireEvent.change(page.getByLabelText('Фон письма', { exact: true }), {
      target: { value: '#ffeedd' },
    });
    openReview(page);
    await page.findByText('Просмотрено версий: 1 из 2');
    expect(launchButton(page).disabled).toBe(true);
    const html = page.getByTitle('Предпросмотр письма').getAttribute('srcdoc')!;
    expect(html).toContain('#ffeedd');
  });
});

it('opens the constructor without body text and keeps shared layout with independent translations', async () => {
  const page = render(
    <MemoryRouter>
      <ComposerPage />
    </MemoryRouter>,
  );
  fireEvent.click(page.getByRole('button', { name: 'Далее: письмо' }));
  fireEvent.change(page.getByPlaceholderText('Тема на языке: русский'), {
    target: { value: 'Новый макет' },
  });
  expect(page.queryByRole('textbox', { name: 'HTML письма' })).toBeNull();
  fireEvent.click(page.getByRole('button', { name: 'Далее: оформление' }));
  expect(page.getByText('Начните с текста или картинки')).toBeTruthy();
  fireEvent.click(page.getByRole('button', { name: '+ Добавить секцию' }));
  fireEvent.click(page.getByRole('button', { name: 'Колонки' }));
  fireEvent.click(page.getByRole('button', { name: '+ Колонка' }));
  fireEvent.click(page.getByRole('button', { name: '+ Колонка' }));
  fireEvent.click(page.getByRole('button', { name: 'Закрыть настройки' }));
  const section = within(page.getByRole('region', { name: 'Секция 1' }));
  expect(section.getAllByRole('group', { name: /^Колонка/ })).toHaveLength(3);
  fireEvent.click(
    section.getByRole('button', { name: 'Добавить в колонку 1' }),
  );
  fireEvent.click(page.getByRole('button', { name: 'Текст' }));
  fireEvent.change(page.getByRole('textbox', { name: 'Текст блока' }), {
    target: { value: 'Содержание RU' },
  });
  fireEvent.click(page.getByRole('button', { name: 'Назад: письмо' }));
  const letter = within(page.getByRole('region', { name: 'Письмо' }));
  fireEvent.click(letter.getByRole('button', { name: '+ Добавить язык' }));
  fireEvent.click(letter.getByRole('menuitem', { name: /Украинский/ }));
  fireEvent.change(letter.getByPlaceholderText('Тема на языке: украинский'), {
    target: { value: 'Новий макет' },
  });
  fireEvent.click(page.getByRole('button', { name: 'Далее: оформление' }));
  expect(
    (page.getByRole('textbox', { name: 'Текст блока' }) as HTMLTextAreaElement)
      .value,
  ).toBe('');
  expect(page.queryByRole('alert')).toBeNull();
  fireEvent.change(page.getByRole('textbox', { name: 'Текст блока' }), {
    target: { value: 'Вміст UK' },
  });
  fireEvent.click(page.getByRole('tab', { name: /Русский/ }));
  expect(
    (page.getByRole('textbox', { name: 'Текст блока' }) as HTMLTextAreaElement)
      .value,
  ).toBe('Содержание RU');
  fireEvent.click(page.getByRole('tab', { name: 'На телефоне' }));
  expect(
    page.getByTitle('Письмо на телефоне').getAttribute('srcdoc'),
  ).toContain('Содержание RU');
  fireEvent.click(page.getByRole('button', { name: 'Далее: проверка' }));
  await page.findByText('Просмотрено версий: 1 из 2');
  const html = page.getByTitle('Предпросмотр письма').getAttribute('srcdoc')!;
  expect(html).toContain('Содержание RU');
  expect(html.match(/data-column-id=/g)).toHaveLength(3);
  expect(html).not.toContain('Вміст UK');
});

it('removes deleted block content from every language after confirmation', async () => {
  const page = setup();
  addUkrainian(page);
  fireEvent.click(page.getByRole('button', { name: 'Далее: оформление' }));
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(page.getByRole('button', { name: 'Удалить блок текст' }));
  expect(page.getByRole('textbox', { name: 'Текст блока' })).toBeTruthy();
  confirm.mockReturnValue(true);
  fireEvent.click(page.getByRole('button', { name: 'Удалить блок текст' }));
  expect(page.queryByRole('textbox', { name: 'Текст блока' })).toBeNull();
  fireEvent.click(page.getByRole('tab', { name: /Русский/ }));
  expect(page.queryByRole('textbox', { name: 'Текст блока' })).toBeNull();
  fireEvent.click(page.getByRole('button', { name: 'Далее: проверка' }));
  await page.findByText('Просмотрено версий: 1 из 2');
  expect(launchButton(page).disabled).toBe(true);
  expect(
    page.getByTitle('Предпросмотр письма').getAttribute('srcdoc'),
  ).not.toContain('Привет!');
});

it('renders uploaded images and button links through the connected document model', async () => {
  const image = await import('../utils/appearanceImage');
  const src = 'data:image/png;base64,aGVsbG8=';
  vi.spyOn(image, 'readAppearanceImage').mockResolvedValue(src);
  const page = setup();
  fireEvent.click(page.getByRole('button', { name: 'Далее: оформление' }));
  fireEvent.click(page.getByRole('button', { name: 'Кнопка' }));
  fireEvent.change(page.getByRole('textbox', { name: 'Текст кнопки' }), {
    target: { value: 'Открыть предложение' },
  });
  fireEvent.change(page.getByRole('textbox', { name: 'Ссылка' }), {
    target: { value: 'https://example.test/offer' },
  });
  fireEvent.click(page.getByRole('button', { name: 'Картинка' }));
  fireEvent.change(page.getByLabelText('Картинка для блока'), {
    target: {
      files: [new File(['image'], 'offer.png', { type: 'image/png' })],
    },
  });
  await page.findByRole('textbox', { name: 'Описание картинки' });
  fireEvent.change(page.getByRole('textbox', { name: 'Описание картинки' }), {
    target: { value: 'Наше предложение' },
  });
  fireEvent.click(page.getByRole('button', { name: 'Далее: проверка' }));
  await page.findByText('Просмотрено версий: 1 из 1');
  const html = page.getByTitle('Предпросмотр письма').getAttribute('srcdoc')!;
  expect(html).toContain('Открыть предложение');
  expect(html).toContain('href="https://example.test/offer"');
  expect(html).toContain(src);
  expect(html).toContain('alt="Наше предложение"');
  expect(html.match(/<!doctype html>/g)).toHaveLength(1);
});

it('keeps a pending image upload attached to its original language', async () => {
  const image = await import('../utils/appearanceImage');
  let finish!: (src: string) => void;
  vi.spyOn(image, 'readAppearanceImage').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const page = setup();
  addUkrainian(page);
  fireEvent.click(page.getByRole('button', { name: 'Далее: оформление' }));
  fireEvent.click(page.getByRole('button', { name: 'Картинка' }));
  fireEvent.change(page.getByLabelText('Картинка для блока'), {
    target: {
      files: [new File(['image'], 'offer.png', { type: 'image/png' })],
    },
  });
  fireEvent.click(page.getByRole('tab', { name: /Русский/ }));
  await act(async () => {
    finish('data:image/png;base64,aGVsbG8=');
  });
  expect(
    page
      .getByRole('button', { name: 'Редактировать картинку' })
      .querySelector('img'),
  ).toBeNull();
  fireEvent.click(page.getByRole('tab', { name: /Украинский/ }));
  expect(
    page
      .getByRole('button', { name: 'Редактировать картинку' })
      .querySelector('img')
      ?.getAttribute('src'),
  ).toBe('data:image/png;base64,aGVsbG8=');
});

it('edits real letter content from the compact toolbar and contextual settings', () => {
  const page = render(
    <MemoryRouter>
      <ComposerPage />
    </MemoryRouter>,
  );
  fireEvent.click(page.getByRole('button', { name: 'Далее: письмо' }));
  fireEvent.change(page.getByPlaceholderText('Тема на языке: русский'), {
    target: { value: 'Полотно' },
  });
  fireEvent.click(page.getByRole('button', { name: 'Далее: оформление' }));
  fireEvent.click(page.getByRole('button', { name: 'Текст' }));
  fireEvent.change(page.getByRole('textbox', { name: 'Текст блока' }), {
    target: { value: 'Суцільний лист' },
  });
  fireEvent.click(page.getByRole('button', { name: 'Закрыть настройки' }));
  expect(page.queryByRole('textbox', { name: 'Текст блока' })).toBeNull();
  const block = page.getByRole('button', { name: 'Редактировать текст' });
  expect(block.textContent).toBe('Суцільний лист');
  fireEvent.keyDown(block, { key: 'Enter' });
  expect(
    (page.getByRole('textbox', { name: 'Текст блока' }) as HTMLTextAreaElement)
      .value,
  ).toBe('Суцільний лист');
  fireEvent.keyDown(page.getByRole('textbox', { name: 'Текст блока' }), {
    key: 'Escape',
  });
  expect(page.queryByRole('dialog')).toBeNull();
  fireEvent.click(block);
  expect(
    page.getByRole('dialog', { name: 'Настройки блока текст' }),
  ).toBeTruthy();
});
