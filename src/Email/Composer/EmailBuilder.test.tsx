import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import EmailBuilder from './EmailBuilder';
import { createEmailDocument } from '../../utils/emailDocument';

function inlineText(page: { container: HTMLElement }) {
  const editors = Array.from(
    page.container.querySelectorAll<HTMLElement>('[data-email-text]'),
  );
  return (
    editors.find((node) => node === window.document.activeElement) ??
    editors.at(-1)!
  );
}

function fixture() {
  const document = createEmailDocument(['ru', 'uk']);
  document.sections = [
    {
      id: 'first',
      columns: [
        {
          id: 'left',
          blocks: [
            { id: 'a', type: 'text' },
            { id: 'picture', type: 'image' },
            { id: 'b', type: 'text' },
          ],
        },
        { id: 'right', blocks: [] },
      ],
    },
    {
      id: 'second',
      columns: [{ id: 'last', blocks: [{ id: 'c', type: 'text' }] }],
    },
  ];
  document.versions.ru!.blocks = {
    a: { type: 'text', text: 'Первый' },
    b: { type: 'text', text: 'Второй' },
    c: { type: 'text', text: 'Последний' },
    picture: {
      type: 'image',
      src: 'https://example.test/banner.png',
      alt: 'Баннер',
    },
  };
  document.versions.uk!.blocks = {
    a: { type: 'text', text: 'Перший' },
    picture: {
      type: 'image',
      src: 'https://example.test/uk.png',
      alt: 'Банер',
    },
  };
  return document;
}
function setup(initial = fixture()) {
  let current = initial;
  function Harness() {
    const [document, setDocument] = useState(current);
    current = document;
    return (
      <EmailBuilder document={document} locale="ru" onChange={setDocument} />
    );
  }
  return { ...render(<Harness />), document: () => current };
}
const rect = (left: number, top: number, width: number, height: number) =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {},
  }) as DOMRect;

beforeEach(() => {
  class Pointer extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  vi.stubGlobal('PointerEvent', Pointer);
  class Drag extends MouseEvent {
    dataTransfer: DataTransfer | null;
    constructor(type: string, init: DragEventInit = {}) {
      super(type, init);
      this.dataTransfer = init.dataTransfer ?? null;
    }
  }
  vi.stubGlobal('DragEvent', Drag);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const section = this.closest<HTMLElement>('[data-section-id]');
      const top = section?.dataset.sectionId === 'second' ? 240 : 20;
      const column = this.closest<HTMLElement>('[data-column-id]');
      const siblings = column
        ? (Array.from(column.parentElement!.children).filter(
            (node) => (node as HTMLElement).dataset.columnId,
          ) as HTMLElement[])
        : [];
      const columnIndex = column ? siblings.indexOf(column) : 0;
      const width = column ? parseFloat(column.style.maxWidth) : 560;
      const left =
        180 +
        siblings
          .slice(0, columnIndex)
          .reduce((total, node) => total + parseFloat(node.style.maxWidth), 0);
      if (this.dataset.columnId) return rect(left, top + 16, width, 180);
      if (this.dataset.sectionId) return rect(164, top, 592, 200);
      const block = this.closest<HTMLElement>('[data-block-id]');
      if (block) {
        const blocks = Array.from(column!.querySelectorAll('[data-block-id]'));
        const y = top + 16 + blocks.indexOf(block) * 60;
        const blockWidth = width - 16;
        return rect(
          left + 8,
          y,
          this.tagName === 'IMG'
            ? (blockWidth * parseFloat(this.style.width)) / 100
            : this.hasAttribute('data-email-text')
              ? (blockWidth * (parseFloat(this.style.width) || 100)) / 100
              : this.hasAttribute('data-email-button')
                ? 96
                : blockWidth,
          this.tagName === 'IMG'
            ? (blockWidth * parseFloat(this.style.width)) / 200
            : 60,
        );
      }
      return rect(0, 0, 1000, 700);
    },
  );
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const transfer = () => ({
  setData: vi.fn(),
  effectAllowed: '',
  dropEffect: '',
});

it('drags a whole section after another without changing translations', () => {
  const page = setup();
  const versions = page.document().versions;
  fireEvent.dragStart(
    page.getByRole('button', { name: 'Переместить секцию 1' }),
    { dataTransfer: transfer() },
  );
  const destination = page.container.querySelector(
    '[data-section-id="second"]',
  )!;
  fireEvent.dragOver(destination, { clientY: 430, dataTransfer: transfer() });
  fireEvent.drop(destination);
  expect(page.document().sections.map((section) => section.id)).toEqual([
    'second',
    'first',
  ]);
  expect(page.document().versions).toBe(versions);
});

it('drags a selected block into an empty column and keeps every translation', () => {
  const page = setup();
  const versions = page.document().versions;
  fireEvent.click(
    page.getAllByRole('button', { name: 'Редактировать текст' })[0],
  );
  fireEvent.dragStart(page.getByRole('button', { name: 'Переместить блок' }), {
    dataTransfer: transfer(),
  });
  expect(page.queryByRole('dialog')).toBeNull();
  const destination = page.getByRole('button', {
    name: 'Добавить в колонку 2',
  });
  fireEvent.dragOver(destination, { clientY: 100, dataTransfer: transfer() });
  fireEvent.drop(destination);
  expect(
    page.document().sections[0].columns[0].blocks.map((block) => block.id),
  ).toEqual(['picture', 'b']);
  expect(
    page.document().sections[0].columns[1].blocks.map((block) => block.id),
  ).toEqual(['a']);
  expect(page.document().versions).toBe(versions);
  expect(
    page.container.querySelector('[data-block-id="a"] [data-email-text]'),
  ).toHaveProperty('textContent', 'Первый');
});

it('reorders blocks within a column using the insertion line', () => {
  const page = setup();
  fireEvent.click(
    page.getAllByRole('button', { name: 'Редактировать текст' })[0],
  );
  fireEvent.dragStart(page.getByRole('button', { name: 'Переместить блок' }), {
    dataTransfer: transfer(),
  });
  const destination = page.container.querySelector('[data-block-id="b"]')!;
  fireEvent.dragOver(destination, { clientY: 210, dataTransfer: transfer() });
  fireEvent.drop(destination);
  expect(
    page.document().sections[0].columns[0].blocks.map((block) => block.id),
  ).toEqual(['picture', 'b', 'a']);
});

it('ignores external drops and cancels a drag outside the canvas', () => {
  const page = setup();
  const original = page.document();
  const destination = page.container.querySelector(
    '[data-section-id="second"]',
  )!;
  fireEvent.dragOver(destination, { clientY: 430, dataTransfer: transfer() });
  fireEvent.drop(destination);
  expect(page.document()).toBe(original);
  fireEvent.dragStart(
    page.getByRole('button', { name: 'Переместить секцию 1' }),
    { dataTransfer: transfer() },
  );
  fireEvent.dragOver(destination, { clientY: 430, dataTransfer: transfer() });
  fireEvent.dragEnd(window);
  fireEvent.drop(destination);
  expect(page.document()).toBe(original);
});

it('resizes images with either pointer axis and clamps to the column width', () => {
  const page = setup();
  fireEvent.click(page.getByRole('button', { name: 'Редактировать картинку' }));
  const handle = page.getByRole('button', { name: 'Изменить размер картинки' });
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 400 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 268 });
  fireEvent.pointerUp(handle, { pointerId: 1 });
  const block = page.document().sections[0].columns[0].blocks[1];
  expect(block).toMatchObject({ type: 'image', widthPercent: 50 });
  fireEvent.pointerDown(handle, {
    pointerId: 2,
    button: 0,
    clientX: 200,
    clientY: 100,
  });
  fireEvent.pointerMove(handle, { pointerId: 2, clientX: 200, clientY: 67 });
  fireEvent.pointerUp(handle, { pointerId: 2 });
  expect(page.document().sections[0].columns[0].blocks[1]).toMatchObject({
    widthPercent: 25,
  });
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 200 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 9999 });
  fireEvent.pointerUp(handle, { pointerId: 1 });
  expect(page.document().sections[0].columns[0].blocks[1]).toMatchObject({
    widthPercent: 100,
  });
});

it('restores the previous image size on Escape or pointer cancellation', () => {
  const page = setup();
  fireEvent.click(page.getByRole('button', { name: 'Редактировать картинку' }));
  const handle = page.getByRole('button', { name: 'Изменить размер картинки' });
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 400 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 300 });
  expect(window.document.activeElement).toBe(handle);
  fireEvent.keyDown(window.document.activeElement!, { key: 'Escape' });
  expect(page.document().sections[0].columns[0].blocks[1]).toMatchObject({
    widthPercent: undefined,
  });
  fireEvent.pointerDown(handle, { pointerId: 2, button: 0, clientX: 400 });
  fireEvent.pointerMove(handle, { pointerId: 2, clientX: 300 });
  fireEvent.pointerCancel(handle, { pointerId: 2 });
  expect(page.document().sections[0].columns[0].blocks[1]).toMatchObject({
    widthPercent: undefined,
  });
});

it('resizes only the adjacent columns while preserving their combined weight', () => {
  const page = setup();
  fireEvent.click(
    page.getAllByRole('button', { name: 'Редактировать текст' })[0],
  );
  const handle = page.getByRole('separator', {
    name: 'Изменить ширину колонок 1 и 2',
  });
  const versions = page.document().versions;
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 400 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 540 });
  fireEvent.pointerUp(handle, { pointerId: 1 });
  const [left, right] = page.document().sections[0].columns;
  expect(left.weight).toBeCloseTo(1.5);
  expect(right.weight).toBeCloseTo(0.5);
  expect(page.document().sections[1].columns[0].weight).toBeUndefined();
  expect(page.document().versions).toBe(versions);
  fireEvent.pointerDown(handle, { pointerId: 2, button: 0, clientX: 400 });
  fireEvent.pointerMove(handle, { pointerId: 2, clientX: -9999 });
  fireEvent.pointerUp(handle, { pointerId: 2 });
  expect(page.document().sections[0].columns[0].weight).toBeGreaterThan(0);
  expect(page.document().sections[0].columns[1].weight).toBeGreaterThan(0);
});

it('supports keyboard movement and resizing on the same handles', () => {
  const page = setup();
  fireEvent.keyDown(
    page.getByRole('button', { name: 'Переместить секцию 1' }),
    { key: 'ArrowDown' },
  );
  expect(page.document().sections[0].id).toBe('second');
  fireEvent.click(page.getByRole('button', { name: 'Редактировать картинку' }));
  fireEvent.keyDown(page.getByRole('button', { name: 'Переместить блок' }), {
    key: 'ArrowUp',
  });
  expect(page.document().sections[1].columns[0].blocks[0].id).toBe('picture');
  fireEvent.keyDown(
    page.getByRole('button', { name: 'Изменить размер картинки' }),
    { key: 'ArrowLeft' },
  );
  expect(page.document().sections[1].columns[0].blocks[0]).toMatchObject({
    widthPercent: 98,
  });
});

it('allows dragging the image itself to another column without using a handle', () => {
  const page = setup();
  const versions = page.document().versions;
  const image = page.container.querySelector('[data-block-id="picture"] img')!;
  const started = fireEvent.dragStart(image, { dataTransfer: transfer() });
  expect(started).toBe(true);
  expect(page.queryByRole('dialog')).toBeNull();
  const destination = page.getByRole('button', {
    name: 'Добавить в колонку 2',
  });
  fireEvent.dragOver(destination, {
    clientX: 600,
    clientY: 100,
    dataTransfer: transfer(),
  });
  fireEvent.drop(destination);
  expect(
    page.document().sections[0].columns[1].blocks.map((block) => block.id),
  ).toEqual(['picture']);
  expect(page.document().versions).toBe(versions);
});

it('inserts a chosen block exactly between existing blocks without copying translations', () => {
  const page = setup();
  const versions = page.document().versions;
  expect(page.queryByRole('button', { name: 'Текст' })).toBeNull();
  expect(page.queryByRole('button', { name: '+ Секция' })).toBeNull();
  fireEvent.click(
    page.getByRole('button', { name: 'Добавить перед блоком 3 в колонке 1' }),
  );
  fireEvent.click(page.getByRole('button', { name: 'Кнопка' }));
  const blocks = page.document().sections[0].columns[0].blocks;
  expect(blocks.map((block) => block.type)).toEqual([
    'text',
    'image',
    'button',
    'text',
  ]);
  expect(blocks[3].id).toBe('b');
  expect(page.document().versions).toBe(versions);
  expect(page.queryByRole('dialog', { name: 'Добавить блок' })).toBeNull();
  expect(
    page.getByRole('dialog', { name: 'Настройки блока кнопка' }),
  ).toBeTruthy();
});

it('adds to the clicked empty column regardless of the previously selected block', () => {
  const page = setup();
  fireEvent.click(
    page.getAllByRole('button', { name: 'Редактировать текст' }).at(-1)!,
  );
  fireEvent.click(page.getByRole('button', { name: 'Добавить в колонку 2' }));
  fireEvent.click(page.getByRole('button', { name: 'Текст' }));
  expect(page.document().sections[0].columns[1].blocks).toHaveLength(1);
  expect(
    page.document().sections[1].columns[0].blocks.map((block) => block.id),
  ).toEqual(['c']);
  fireEvent.input(inlineText(page), {
    target: { textContent: 'Новый блок справа' },
  });
  expect(
    page.document().versions.ru!.blocks[
      page.document().sections[0].columns[1].blocks[0].id
    ],
  ).toEqual({ type: 'text', text: 'Новый блок справа' });
});

it('appends only to the explicitly chosen column and cancels insertion without changing the document', () => {
  const page = setup();
  const before = page.document();
  const points = page.getAllByRole('button', {
    name: 'Добавить в конец колонки 1',
  });
  fireEvent.click(points.at(-1)!);
  const menu = page.getByRole('dialog', { name: 'Добавить блок' });
  fireEvent.keyDown(menu, { key: 'Escape' });
  expect(page.queryByRole('dialog')).toBeNull();
  expect(page.document()).toBe(before);
  expect(window.document.activeElement).toBe(points.at(-1));
  fireEvent.click(points.at(-1)!);
  fireEvent.click(page.getByRole('button', { name: 'Картинка' }));
  expect(
    page.document().sections[1].columns[0].blocks.map((block) => block.type),
  ).toEqual(['text', 'image']);
  expect(
    page.document().sections[0].columns[0].blocks.map((block) => block.id),
  ).toEqual(['a', 'picture', 'b']);
});

it('adds sections only at the bottom and appends columns on the right of the chosen section', () => {
  const page = setup();
  fireEvent.click(
    page.getAllByRole('button', { name: 'Редактировать текст' })[0],
  );
  fireEvent.click(page.getByRole('button', { name: 'Настройки секции 1' }));
  fireEvent.click(page.getByText('Колонки', { exact: true }));
  fireEvent.click(page.getByRole('button', { name: '+ Колонка справа' }));
  expect(page.document().sections[0].columns).toHaveLength(3);
  expect(page.document().sections[0].columns[2].blocks).toEqual([]);
  expect(page.document().sections[1].columns).toHaveLength(1);
  fireEvent.click(page.getByRole('button', { name: '+ Добавить секцию' }));
  expect(
    page
      .document()
      .sections.map((section) => section.id)
      .slice(0, 2),
  ).toEqual(['first', 'second']);
  expect(page.document().sections[2].columns).toHaveLength(1);
  expect(page.document().sections[2].columns[0].blocks).toEqual([]);
});

it('keeps drag-and-drop insertion consistent with the new plus between blocks', () => {
  const page = setup();
  fireEvent.click(
    page.getAllByRole('button', { name: 'Редактировать текст' })[0],
  );
  fireEvent.dragStart(page.getByRole('button', { name: 'Переместить блок' }), {
    dataTransfer: transfer(),
  });
  const point = page.getByRole('button', {
    name: 'Добавить перед блоком 3 в колонке 1',
  });
  fireEvent.dragOver(point, {
    clientX: 300,
    clientY: 150,
    dataTransfer: transfer(),
  });
  fireEvent.drop(point);
  expect(
    page.document().sections[0].columns[0].blocks.map((block) => block.id),
  ).toEqual(['picture', 'a', 'b']);
});

it('creates the first section from the empty-state action', () => {
  const page = setup(createEmailDocument());
  expect(
    page.getAllByRole('button', { name: '+ Добавить секцию' }),
  ).toHaveLength(1);
  fireEvent.click(page.getByText('Добавьте первую секцию'));
  expect(page.document().sections).toHaveLength(1);
  expect(page.queryByText('Добавьте первую секцию')).toBeNull();
});

it('deletes the intended section from its own controls and removes its content in all languages', () => {
  const page = setup();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(page.getByRole('button', { name: 'Удалить секцию 1' }));
  expect(page.document().sections).toHaveLength(2);
  confirm.mockReturnValue(true);
  fireEvent.click(page.getByRole('button', { name: 'Удалить секцию 1' }));
  expect(page.document().sections.map((section) => section.id)).toEqual([
    'second',
  ]);
  expect(Object.keys(page.document().versions.ru!.blocks)).toEqual(['c']);
  expect(page.document().versions.uk!.blocks).toEqual({});
  fireEvent.click(page.getByRole('button', { name: 'Удалить секцию 1' }));
  expect(page.document().sections).toEqual([]);
  expect(page.getByText('Добавьте первую секцию')).toBeTruthy();
});

it('opens the columns of the clicked section and deletes only the intended column', () => {
  const page = setup();
  fireEvent.click(page.getByRole('button', { name: 'Настройки секции 2' }));
  expect(page.getByRole('dialog', { name: 'Настройки секции' })).toBeTruthy();
  expect(page.queryByRole('button', { name: 'Удалить колонку 1' })).toBeNull();
  fireEvent.click(page.getByRole('button', { name: 'Настройки секции 1' }));
  fireEvent.click(page.getByText('Колонки', { exact: true }));
  fireEvent.click(page.getByRole('button', { name: 'Удалить колонку 2' }));
  expect(
    page.document().sections[0].columns.map((column) => column.id),
  ).toEqual(['left']);
  expect(
    page.document().sections[1].columns.map((column) => column.id),
  ).toEqual(['last']);
});

it('adds text beside a resized image using the plus in its free space', () => {
  const page = setup();
  fireEvent.click(page.getByRole('button', { name: 'Редактировать картинку' }));
  const resize = page.getByRole('button', { name: 'Изменить размер картинки' });
  fireEvent.pointerDown(resize, { pointerId: 1, button: 0, clientX: 400 });
  fireEvent.pointerMove(resize, { pointerId: 1, clientX: 268 });
  fireEvent.pointerUp(resize, { pointerId: 1 });
  const versions = page.document().versions;
  fireEvent.click(
    page.getByRole('button', { name: 'Добавить справа от картинки' }),
  );
  fireEvent.click(page.getByRole('button', { name: 'Текст' }));
  const blocks = page.document().sections[0].columns[0].blocks;
  expect(blocks.map((block) => block.type)).toEqual([
    'text',
    'image',
    'text',
    'text',
  ]);
  expect(blocks[1].rowId).toBeTruthy();
  expect(blocks[2].rowId).toBe(blocks[1].rowId);
  expect(blocks[1].widthPercent).toBe(50);
  expect(blocks[2].widthPercent).toBe(50);
  expect(page.document().versions).toBe(versions);
});

it('moves an image horizontally to intermediate positions instead of snapping to three alignments', () => {
  const page = setup();
  fireEvent.click(page.getByRole('button', { name: 'Редактировать картинку' }));
  const resize = page.getByRole('button', { name: 'Изменить размер картинки' });
  fireEvent.pointerDown(resize, { pointerId: 1, button: 0, clientX: 400 });
  fireEvent.pointerMove(resize, { pointerId: 1, clientX: 268 });
  fireEvent.pointerUp(resize, { pointerId: 1 });
  const image = () =>
    page.container.querySelector('[data-block-id="picture"] img')!;
  fireEvent.dragStart(image(), { clientX: 220, dataTransfer: transfer() });
  fireEvent.dragOver(
    page.container.querySelector('[data-block-id="picture"]')!,
    { clientX: 252, clientY: 110, dataTransfer: transfer() },
  );
  fireEvent.drop(page.container.querySelector('[data-block-id="picture"]')!);
  const block = page.document().sections[0].columns[0].blocks[1];
  expect(block.type).toBe('image');
  if (block.type === 'image') {
    expect(block.offsetPercent).toBeGreaterThan(0);
    expect(block.offsetPercent).toBeLessThan(100);
  }
  fireEvent.click(page.getByRole('button', { name: 'По центру' }));
  expect(page.document().sections[0].columns[0].blocks[1]).toMatchObject({
    alignment: 'center',
    offsetPercent: undefined,
  });
});

it('moves an image into its own side-add area from either the image or its drag handle', () => {
  const initial = fixture();
  initial.sections[0].columns[0].blocks[1] = {
    id: 'picture',
    type: 'image',
    widthPercent: 40,
  };
  const page = setup(initial);
  const versions = page.document().versions;
  const image = () =>
    page.container.querySelector<HTMLElement>('[data-block-id="picture"] img')!;
  fireEvent.click(image());
  const initialLeft = image().getBoundingClientRect().left;
  fireEvent.dragStart(image(), {
    clientX: initialLeft + 10,
    dataTransfer: transfer(),
  });
  const right = page.getByRole('button', {
    name: 'Добавить справа от картинки',
  });
  fireEvent.dragOver(right, {
    clientX: initialLeft + 110,
    clientY: 110,
    dataTransfer: transfer(),
  });
  fireEvent.drop(right, { dataTransfer: transfer() });
  const moved = page.document().sections[0].columns[0].blocks[1];
  expect(moved.type === 'image' && moved.offsetPercent).toBeCloseTo(
    (100 / (264 * 0.6)) * 100,
    1,
  );
  const handle = page.getByRole('button', { name: 'Переместить блок' });
  fireEvent.dragStart(handle, {
    clientX: initialLeft - 32,
    dataTransfer: transfer(),
  });
  const left = page.getByRole('button', {
    name: 'Добавить справа от картинки',
  });
  fireEvent.dragOver(left, {
    clientX: initialLeft,
    clientY: 110,
    dataTransfer: transfer(),
  });
  fireEvent.drop(left, { dataTransfer: transfer() });
  const returned = page.document().sections[0].columns[0].blocks[1];
  expect(returned.type === 'image' && returned.offsetPercent).toBeCloseTo(
    (32 / (264 * 0.6)) * 100,
    1,
  );
  expect(page.document().versions).toBe(versions);
});

it('moves the actual button horizontally and adds content beside its natural width', () => {
  const initial = fixture();
  initial.sections[0].columns[0].blocks = [{ id: 'cta', type: 'button' }];
  initial.versions.ru!.blocks.cta = {
    type: 'button',
    text: 'Далее',
    href: 'https://example.test',
  };
  const page = setup(initial);
  const button = () =>
    page.container.querySelector<HTMLElement>('[data-email-button]')!;
  expect(button().draggable).toBe(true);
  fireEvent.dragStart(button(), { clientX: 210, dataTransfer: transfer() });
  expect(page.queryByRole('dialog')).toBeNull();
  const freeSpace = page.getByRole('button', {
    name: 'Добавить справа от кнопки',
  });
  fireEvent.dragOver(freeSpace, {
    clientX: 242,
    clientY: 50,
    dataTransfer: transfer(),
  });
  fireEvent.drop(freeSpace, { dataTransfer: transfer() });
  const moved = page.document().sections[0].columns[0].blocks[0];
  expect(moved.type).toBe('button');
  if (moved.type === 'button') expect(moved.insetPercent).toBeGreaterThan(0);
  const versions = page.document().versions;
  fireEvent.click(
    page.getByRole('button', { name: 'Добавить справа от кнопки' }),
  );
  fireEvent.click(page.getByRole('button', { name: 'Текст' }));
  const row = page.document().sections[0].columns[0].blocks;
  expect(row[0].rowId).toBe(row[1].rowId);
  expect(row[0].widthPercent).toBeLessThan(50);
  expect(row[0].widthPercent! + row[1].widthPercent!).toBeCloseTo(100);
  expect(page.document().versions).toBe(versions);
});

it('resizes button width and padding without changing text size, clamps to its cell, and cancels changes', () => {
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect(0, 0, 48, 22),
  });
  const initial = fixture();
  initial.sections[0].columns[0].blocks = [{ id: 'cta', type: 'button' }];
  initial.versions.ru!.blocks.cta = { type: 'button', text: 'Далее', href: '' };
  const page = setup(initial);
  fireEvent.click(page.getByRole('button', { name: 'Редактировать кнопку' }));
  const handle = page.getByRole('button', { name: 'Изменить размер кнопки' });
  const versions = page.document().versions;
  fireEvent.pointerDown(handle, {
    pointerId: 1,
    button: 0,
    clientX: 200,
    clientY: 100,
  });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 260, clientY: 120 });
  fireEvent.pointerUp(handle, { pointerId: 1 });
  expect(page.document().sections[0].columns[0].blocks[0]).toMatchObject({
    buttonWidth: 156,
    paddingY: 22,
  });
  expect(
    page.container.querySelector<HTMLElement>('[data-email-button]')!.style
      .fontSize,
  ).toBe('16px');
  expect(page.document().versions).toBe(versions);
  fireEvent.pointerDown(handle, {
    pointerId: 2,
    button: 0,
    clientX: 200,
    clientY: 100,
  });
  fireEvent.pointerMove(handle, { pointerId: 2, clientX: 9999, clientY: 200 });
  expect(page.document().sections[0].columns[0].blocks[0].type).toBe('button');
  const block = page.document().sections[0].columns[0].blocks[0];
  if (block.type === 'button') expect(block.buttonWidth).toBeLessThan(300);
  fireEvent.pointerCancel(handle, { pointerId: 2 });
  expect(page.document().sections[0].columns[0].blocks[0]).toMatchObject({
    buttonWidth: 156,
    paddingY: 22,
  });
});

it.each(['image', 'button'] as const)(
  'keeps free space beside an unselected %s available for moving existing text',
  (type) => {
    const initial = fixture();
    initial.sections[0].columns[0].blocks[1] =
      type === 'image'
        ? { id: 'picture', type, widthPercent: 40 }
        : { id: 'picture', type };
    if (type === 'button')
      initial.versions.ru!.blocks.picture = { type, text: 'Далее', href: '' };
    const page = setup(initial);
    const name = `Добавить справа от ${type === 'image' ? 'картинки' : 'кнопки'}`;
    expect(page.getByRole('button', { name })).toBeTruthy();
    fireEvent.click(
      page.getAllByRole('button', { name: 'Редактировать текст' })[0],
    );
    fireEvent.dragStart(
      page.getByRole('button', { name: 'Переместить блок' }),
      { dataTransfer: transfer() },
    );
    const area = page.getByRole('button', { name });
    expect(parseFloat(area.style.width)).toBeGreaterThan(48);
    fireEvent.dragOver(area, { dataTransfer: transfer() });
    fireEvent.drop(area, { dataTransfer: transfer() });
    const blocks = page.document().sections[0].columns[0].blocks;
    expect(blocks.map((block) => block.id)).toEqual(['picture', 'a', 'b']);
    expect(blocks[0].rowId).toBeTruthy();
    expect(blocks[1].rowId).toBe(blocks[0].rowId);
    expect(page.document().versions).toBe(initial.versions);
  },
);

it('keeps the editable node while typing and pastes plain text at the caret', () => {
  const page = setup();
  const editor = page.container.querySelector<HTMLElement>(
    '[data-block-id="a"] [data-email-text]',
  )!;
  fireEvent.click(editor);
  editor.focus();
  fireEvent.input(editor, { target: { textContent: 'Hello' } });
  expect(
    page.container.querySelector('[data-block-id="a"] [data-email-text]'),
  ).toBe(editor);
  const selection = window.getSelection()!;
  const range = window.document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  fireEvent.paste(editor, {
    clipboardData: {
      getData: (type: string) =>
        type === 'text/plain' ? '\n<world>' : '<b>world</b>',
    },
  });
  expect(editor.textContent).toBe('Hello\n<world>');
  expect(editor.querySelector('b')).toBeNull();
  expect(page.document().versions.ru!.blocks.a).toEqual({
    type: 'text',
    text: 'Hello\n<world>',
  });
  expect(page.document().versions.uk!.blocks.a).toEqual({
    type: 'text',
    text: 'Перший',
  });
  expect(page.queryByRole('dialog')).toBeNull();
});

it.each(['image', 'button'] as const)(
  'dismisses %s settings outside while preserving fields and resize controls',
  (type) => {
    const initial = fixture();
    if (type === 'button') {
      initial.sections[0].columns[0].blocks[1] = { id: 'picture', type };
      initial.versions.ru!.blocks.picture = { type, text: 'Далее', href: '' };
    }
    const page = setup(initial);
    const label = type === 'image' ? 'картинку' : 'кнопку';
    fireEvent.click(
      page.getByRole('button', { name: `Редактировать ${label}` }),
    );
    const dialog = page.getByRole('dialog');
    fireEvent.pointerDown(dialog.querySelector('input:not([type="file"])')!);
    expect(page.getByRole('dialog')).toBe(dialog);
    fireEvent.pointerDown(
      page.getByRole('button', {
        name: `Изменить размер ${type === 'image' ? 'картинки' : 'кнопки'}`,
      }),
      { button: 1 },
    );
    expect(page.getByRole('dialog')).toBe(dialog);
    fireEvent.pointerDown(window.document.body);
    expect(page.queryByRole('dialog')).toBeNull();
    fireEvent.click(
      page.getByRole('button', { name: `Редактировать ${label}` }),
    );
    expect(page.getByRole('dialog')).toBeTruthy();
    const text = page.getAllByRole('button', {
      name: 'Редактировать текст',
    })[0];
    fireEvent.pointerDown(text);
    fireEvent.click(text);
    expect(page.queryByRole('dialog')).toBeNull();
    expect(window.document.activeElement?.hasAttribute('data-email-text')).toBe(
      true,
    );
  },
);

it('sets a section background with editable text above it and removes only the image', async () => {
  const image = await import('../../utils/appearanceImage');
  const src = 'data:image/png;base64,aGVsbG8=';
  vi.spyOn(image, 'readAppearanceImage').mockResolvedValue(src);
  const page = setup();
  const versions = page.document().versions;
  fireEvent.click(page.getByRole('button', { name: 'Настройки секции 1' }));
  fireEvent.change(page.getByRole('textbox', { name: 'Фон' }), {
    target: { value: '#123456' },
  });
  fireEvent.change(page.getByLabelText('Фон: изображение'), {
    target: {
      files: [
        new File(['background'], 'background.png', { type: 'image/png' }),
      ],
    },
  });
  await page.findByAltText('Фон');
  fireEvent.change(page.getByRole('textbox', { name: 'Текст' }), {
    target: { value: '#ffffff' },
  });
  expect(page.document().sections[0]).toMatchObject({
    background: '#123456',
    backgroundImage: src,
    textColor: '#ffffff',
  });
  expect(page.document().sections[1].backgroundImage).toBeUndefined();
  expect(page.document().versions).toBe(versions);
  const paragraph = page.container.querySelector<HTMLElement>(
    '[data-block-id="a"] [data-email-text]',
  )!;
  expect(paragraph.style.color).toBe('rgb(255, 255, 255)');
  fireEvent.click(page.getByRole('button', { name: 'Убрать изображение' }));
  expect(page.document().sections[0].backgroundImage).toBe('');
  expect(page.document().versions).toBe(versions);
  fireEvent.click(page.getByRole('button', { name: 'Закрыть настройки' }));
  const editor = page.container.querySelector<HTMLElement>(
    '[data-block-id="a"] [data-email-text]',
  )!;
  fireEvent.click(editor);
  fireEvent.input(editor, { target: { textContent: 'Текст на фоне' } });
  expect(page.document().versions.ru!.blocks.a).toEqual({
    type: 'text',
    text: 'Текст на фоне',
  });
  expect(page.document().versions.uk!.blocks.a).toEqual({
    type: 'text',
    text: 'Перший',
  });
});

it('changes only the selected section minimum height and restores it on cancellation', () => {
  const page = setup();
  const versions = page.document().versions;
  const handle = page.getByRole('button', { name: 'Изменить высоту секции 1' });
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 200 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: 280 });
  fireEvent.pointerUp(handle, { pointerId: 1 });
  expect(page.document().sections[0].minHeight).toBe(280);
  expect(page.document().sections[1].minHeight).toBeUndefined();
  expect(page.document().versions).toBe(versions);
  fireEvent.pointerDown(handle, { pointerId: 2, button: 0, clientY: 200 });
  fireEvent.pointerMove(handle, { pointerId: 2, clientY: 320 });
  fireEvent.pointerCancel(handle, { pointerId: 2 });
  expect(page.document().sections[0].minHeight).toBe(280);
});

it('narrows text without changing its contents and allows adding a block in the freed space', () => {
  const page = setup();
  fireEvent.click(
    page.getAllByRole('button', { name: 'Редактировать текст' })[0],
  );
  const versions = page.document().versions;
  const handle = page.getByRole('button', { name: 'Изменить ширину текста' });
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 400 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 268 });
  fireEvent.pointerUp(handle, { pointerId: 1 });
  expect(page.document().sections[0].columns[0].blocks[0].widthPercent).toBe(
    50,
  );
  expect(page.document().versions).toBe(versions);
  fireEvent.click(
    page.getByRole('button', { name: 'Добавить справа от текста' }),
  );
  fireEvent.click(page.getByRole('button', { name: 'Кнопка' }));
  const blocks = page.document().sections[0].columns[0].blocks;
  expect(blocks[0].rowId).toBeTruthy();
  expect(blocks[1].rowId).toBe(blocks[0].rowId);
  expect(blocks[1].type).toBe('button');
  expect(page.document().versions).toBe(versions);
});

it('styles text as a colored heading and links a selected phrase without affecting translations', () => {
  const page = setup();
  const editor = page.container.querySelector<HTMLElement>(
    '[data-block-id="a"] [data-email-text]',
  )!;
  fireEvent.click(editor);
  const range = document.createRange();
  range.selectNodeContents(editor);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  fireEvent.click(page.getByRole('button', { name: 'Настройки текста' }));
  fireEvent.change(page.getByRole('combobox', { name: 'Вид текста' }), {
    target: { value: 'heading' },
  });
  fireEvent.change(page.getByRole('textbox', { name: 'Цвет букв' }), {
    target: { value: '#ff5500' },
  });
  expect(
    page.queryByRole('textbox', { name: 'Адрес ссылки в тексте' }),
  ).toBeNull();
  fireEvent.click(page.getByRole('button', { name: 'Закрыть настройки' }));
  const updatedEditor = page.container.querySelector(
    '[data-block-id="a"] [data-email-text]',
  )!;
  fireEvent.click(updatedEditor);
  range.selectNodeContents(updatedEditor);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  fireEvent.click(
    page.getByRole('button', { name: 'Ссылка для выделенного текста' }),
  );
  expect(page.queryByRole('combobox', { name: 'Вид текста' })).toBeNull();
  fireEvent.change(
    page.getByRole('textbox', { name: 'Адрес ссылки в тексте' }),
    { target: { value: 'https://example.test/details' } },
  );
  fireEvent.click(page.getByRole('button', { name: 'Применить ссылку' }));
  const heading = page.container.querySelector('[data-block-id="a"] h2')!;
  expect((heading as HTMLElement).style.color).toBe('rgb(255, 85, 0)');
  expect(heading.querySelector('a')!.getAttribute('href')).toBe(
    'https://example.test/details',
  );
  expect(page.document().versions.uk!.blocks.a).toEqual({
    type: 'text',
    text: 'Перший',
  });
  fireEvent.click(page.getByRole('button', { name: 'Убрать ссылку' }));
  expect(page.container.querySelector('[data-block-id="a"] a')).toBeNull();
  fireEvent.pointerDown(document.body);
  expect(page.queryByRole('dialog')).toBeNull();
});

it('uses colored outline buttons and section borders from the existing settings', () => {
  const initial = fixture();
  initial.sections[0].columns[0].blocks = [{ id: 'cta', type: 'button' }];
  initial.versions.ru!.blocks.cta = {
    type: 'button',
    text: 'Далее',
    href: 'https://example.test',
  };
  const page = setup(initial);
  fireEvent.click(page.getByRole('button', { name: 'Редактировать кнопку' }));
  const filled = page.container.querySelector<HTMLElement>(
    '[data-email-button]',
  )!;
  const spacing = (node: HTMLElement) =>
    ['top', 'right', 'bottom', 'left'].map((side) => {
      const style = node.style;
      return (
        parseFloat(style.getPropertyValue(`padding-${side}`)) +
        parseFloat(style.getPropertyValue(`border-${side}-width`) || '0')
      );
    });
  const filledSpacing = spacing(filled);
  const textInput = page.getByRole('textbox', { name: 'Текст кнопки' });
  expect(window.document.activeElement).toBe(textInput);
  expect(
    textInput.compareDocumentPosition(
      page.getByRole('combobox', { name: 'Вид кнопки' }),
    ) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  fireEvent.change(page.getByRole('combobox', { name: 'Вид кнопки' }), {
    target: { value: 'outline' },
  });
  fireEvent.change(page.getByRole('textbox', { name: 'Цвет контура кнопки' }), {
    target: { value: '#55ff99' },
  });
  fireEvent.change(page.getByRole('textbox', { name: 'Цвет текста кнопки' }), {
    target: { value: '#ffffff' },
  });
  const button = page.container.querySelector<HTMLElement>(
    '[data-email-button]',
  )!;
  expect(button.style.backgroundColor).toBe('transparent');
  expect(spacing(button)).toEqual(filledSpacing);
  expect(button.style.borderColor).toBe('rgb(85, 255, 153)');
  expect(button.style.color).toBe('rgb(255, 255, 255)');
  fireEvent.click(page.getByRole('button', { name: 'Настройки секции 1' }));
  fireEvent.click(page.getByText('Рамка и углы'));
  fireEvent.click(page.getByRole('checkbox', { name: 'Рамка' }));
  fireEvent.change(page.getByRole('textbox', { name: 'Цвет рамки' }), {
    target: { value: '#55ff99' },
  });
  fireEvent.change(page.getByRole('slider', { name: 'Закругление углов' }), {
    target: { value: '12' },
  });
  expect(page.document().sections[0]).toMatchObject({
    borderColor: '#55ff99',
    borderRadius: 12,
  });
});

it('keeps settings beside the canvas and uses one toolbar for the selected text', () => {
  const page = setup();
  const editor = page.container.querySelector<HTMLElement>(
    '[data-block-id="a"] [data-email-text]',
  )!;
  fireEvent.click(editor);
  const settings = page.getByRole('button', { name: 'Настройки текста' });
  const link = page.getByRole('button', {
    name: 'Ссылка для выделенного текста',
  });
  const remove = page.getByRole('button', { name: 'Удалить блок текст' });
  expect(settings.parentElement).toBe(link.parentElement);
  expect(settings.parentElement).toBe(remove.parentElement);
  fireEvent.click(settings);
  const panel = page.getByRole('dialog', { name: 'Оформление текста' });
  expect(panel.contains(editor)).toBe(false);
  expect(panel.previousElementSibling?.contains(editor)).toBe(true);
  fireEvent.pointerDown(editor);
  expect(page.getByRole('dialog', { name: 'Оформление текста' })).toBe(panel);
  fireEvent.click(editor);
  expect(page.queryByRole('dialog')).toBeNull();
  fireEvent.click(page.getByRole('button', { name: 'Настройки текста' }));
  fireEvent.click(page.getByRole('button', { name: 'Закрыть настройки' }));
  expect(page.queryByRole('dialog')).toBeNull();
});

it.each(['image', 'button', 'section'] as const)(
  'adds a section on the first click while %s settings are open',
  (type) => {
    const initial = fixture();
    if (type === 'button') {
      initial.sections[0].columns[0].blocks[1] = { id: 'picture', type };
      initial.versions.ru!.blocks.picture = { type, text: 'Далее', href: '' };
    }
    const page = setup(initial);
    fireEvent.click(
      page.getByRole('button', {
        name:
          type === 'section'
            ? 'Настройки секции 1'
            : `Редактировать ${type === 'image' ? 'картинку' : 'кнопку'}`,
      }),
    );
    const dialog = page.getByRole('dialog');
    const add = page.getByRole('button', { name: '+ Добавить секцию' });
    fireEvent.pointerDown(add);
    expect(page.getByRole('dialog')).toBe(dialog);
    fireEvent.click(add);
    expect(page.document().sections).toHaveLength(3);
    expect(page.queryByRole('dialog')).toBeNull();
  },
);

it('toggles a selected bold phrase, preserves it while editing, and aligns only its text block', () => {
  const page = setup();
  const editor = page.container.querySelector<HTMLElement>(
    '[data-block-id="a"] [data-email-text]',
  )!;
  fireEvent.click(editor);
  const range = document.createRange();
  range.setStart(editor.firstChild!, 0);
  range.setEnd(editor.firstChild!, 3);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  const bold = page.getByRole('button', { name: 'Жирный текст' });
  const toggle = () => {
    fireEvent.pointerDown(bold);
    fireEvent.click(bold);
  };
  toggle();
  expect(editor.querySelector('strong')?.textContent).toBe('Пер');
  expect(window.getSelection()!.toString()).toBe('Пер');
  expect(bold.getAttribute('aria-pressed')).toBe('true');
  expect(page.document().versions.ru!.blocks.a).toMatchObject({
    bold: [{ start: 0, end: 3 }],
  });
  expect(page.document().versions.uk!.blocks.a).not.toHaveProperty('bold');
  toggle();
  expect(editor.querySelector('strong')).toBeNull();
  toggle();
  editor.prepend(document.createTextNode('До '));
  fireEvent.input(editor);
  expect(page.document().versions.ru!.blocks.a).toMatchObject({
    bold: [{ start: 3, end: 6 }],
  });
  fireEvent.click(page.getByRole('button', { name: 'Настройки текста' }));
  for (const [label, alignment] of [
    ['По центру', 'center'],
    ['Справа', 'right'],
    ['Слева', 'left'],
  ]) {
    fireEvent.click(
      page
        .getByRole('group', { name: 'Выравнивание текста' })
        .querySelectorAll('button')[
        ['Слева', 'По центру', 'Справа'].indexOf(label)
      ],
    );
    expect(page.document().sections[0].columns[0].blocks[0]).toMatchObject({
      alignment,
    });
    const updated = page.container.querySelector<HTMLElement>(
      '[data-block-id="a"] [data-email-text]',
    )!;
    expect(updated.style.textAlign).toBe(alignment);
    expect(updated.querySelector('strong')?.textContent).toBe('Пер');
  }
  expect(page.document().sections[0].columns[0].blocks[2]).not.toHaveProperty(
    'alignment',
  );
});

it('coalesces resize moves per frame and flushes the last move before pointer release', () => {
  let frame!: FrameRequestCallback;
  const request = vi.fn((callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  const cancel = vi.fn();
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  const page = setup();
  fireEvent.click(
    page.getAllByRole('button', { name: 'Редактировать текст' })[0],
  );
  const handle = page.getByRole('button', { name: 'Изменить ширину текста' });
  const width = () =>
    page.document().sections[0].columns[0].blocks[0].widthPercent;
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 400 });
  for (const x of [350, 300, 268])
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: x });
  expect(request).toHaveBeenCalledTimes(1);
  expect(width()).toBeUndefined();
  act(() => frame(0));
  expect(width()).toBe(50);
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 136 });
  expect(request).toHaveBeenCalledTimes(2);
  fireEvent.pointerUp(handle, { pointerId: 1 });
  expect(width()).toBe(1);
  expect(cancel).toHaveBeenCalled();
  act(() => frame(16));
  expect(width()).toBe(1);
});

it('adds third and further blocks at filled row boundaries without changing translations', () => {
  const initial = fixture();
  const row = initial.sections[0].columns[0].blocks;
  row[0] = { ...row[0], rowId: 'filled', widthPercent: 50 };
  row[1] = { ...row[1], rowId: 'filled', widthPercent: 50 };
  const page = setup(initial);
  const versions = page.document().versions;
  const insert = (anchor: string, type: string) => {
    fireEvent.click(
      page.container.querySelector(`[data-block-id="${anchor}"]`)!,
    );
    fireEvent.click(page.getByRole('button', { name: 'Добавить блок в ряд' }));
    fireEvent.click(page.getByRole('button', { name: type }));
  };
  const blocks = () => page.document().sections[0].columns[0].blocks;
  insert('a', 'Текст');
  expect(blocks().map((block) => block.type)).toEqual([
    'text',
    'text',
    'image',
    'text',
  ]);
  expect(blocks()[2].id).toBe('picture');
  insert('a', 'Кнопка');
  expect(blocks()[1].type).toBe('button');
  insert('picture', 'Картинка');
  const filled = blocks().filter((block) => block.rowId === 'filled');
  expect(filled).toHaveLength(5);
  expect(filled[4].type).toBe('image');
  expect(
    filled.reduce((sum, block) => sum + block.widthPercent!, 0),
  ).toBeCloseTo(100);
  expect(page.document().versions).toBe(versions);
  expect(
    page.container.querySelector(
      '[data-beside-anchor="picture"][data-side="left"]',
    ),
  ).toBeNull();
  expect(
    page.queryAllByRole('button', { name: 'Добавить справа от кнопки' }),
  ).toHaveLength(1);
  expect(
    page.getAllByRole('button', { name: 'Добавить блок в ряд' }),
  ).toHaveLength(1);
});

it.each(['text', 'image', 'button'] as const)(
  'shrinks a right-hand %s inside its cell without resizing its neighbor',
  (type) => {
    const initial = fixture();
    initial.sections[0].columns[0].blocks = [
      { id: 'a', type: 'text', rowId: 'pair', widthPercent: 50 },
      { id: 'right-block', type, rowId: 'pair', widthPercent: 50 },
    ];
    initial.versions.ru!.blocks['right-block'] =
      type === 'text'
        ? { type: 'text', text: 'Right text' }
        : type === 'image'
          ? {
              type: 'image',
              src: 'https://example.test/banner.png',
              alt: 'Image',
            }
          : { type: 'button', text: 'Long button text', href: '' };
    const page = setup(initial);
    const before = page.document().sections[0].columns[0].blocks;
    const versions = page.document().versions;
    fireEvent.click(
      page.container.querySelector('[data-block-id="right-block"]')!,
    );
    const handle = page.getByRole('button', {
      name:
        type === 'text'
          ? 'Изменить ширину текста'
          : type === 'image'
            ? 'Изменить размер картинки'
            : 'Изменить размер кнопки',
    });
    fireEvent.pointerDown(handle, {
      pointerId: 1,
      button: 0,
      clientX: 400,
      clientY: 100,
    });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 334, clientY: 100 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    const blocks = page.document().sections[0].columns[0].blocks;
    expect(blocks[0]).toBe(before[0]);
    expect(blocks.map((block) => block.widthPercent)).toEqual([50, 50]);
    if (blocks[1].type === 'button') expect(blocks[1].buttonWidth).toBe(48);
    else expect(blocks[1].contentWidthPercent).toBeCloseTo(75);
    expect(page.document().versions).toBe(versions);
    fireEvent.pointerDown(handle, {
      pointerId: 2,
      button: 0,
      clientX: 400,
      clientY: 100,
    });
    fireEvent.pointerMove(handle, { pointerId: 2, clientX: 450, clientY: 100 });
    fireEvent.pointerCancel(handle, { pointerId: 2 });
    expect(page.document().sections[0].columns[0].blocks).toEqual(blocks);
  },
);

it('drags a text block directly while preserving text editing and horizontal placement', () => {
  const initial = fixture();
  initial.sections[0].columns[0].blocks[0].widthPercent = 50;
  const page = setup(initial);
  const cell = () =>
    page.container.querySelector<HTMLElement>('[data-block-id="a"]')!;
  const editor = () => cell().querySelector<HTMLElement>('[data-email-text]')!;
  const versions = page.document().versions;
  expect(cell().draggable).toBe(true);
  fireEvent.dragStart(cell(), {
    clientX: 200,
    clientY: 60,
    dataTransfer: transfer(),
  });
  fireEvent.dragOver(cell(), {
    clientX: 240,
    clientY: 50,
    dataTransfer: transfer(),
  });
  fireEvent.drop(cell(), { dataTransfer: transfer() });
  const block = page.document().sections[0].columns[0].blocks[0];
  expect(block.type).toBe('text');
  if (block.type === 'text') expect(block.offsetPercent).toBeGreaterThan(0);
  expect(editor().style.marginLeft).not.toBe('');
  expect(page.document().versions).toBe(versions);
  fireEvent.focus(editor());
  fireEvent.click(editor());
  expect(cell().draggable).toBe(false);
  fireEvent.blur(editor());
  expect(cell().draggable).toBe(true);
});

it('uses actual text bounds for drag previews and ignores the empty part of its cell', () => {
  const initial = fixture();
  initial.sections[0].columns[0].blocks[0].widthPercent = 40;
  const page = setup(initial);
  const cell = page.container.querySelector<HTMLElement>(
    '[data-block-id="a"]',
  )!;
  const editor = cell.querySelector<HTMLElement>('[data-email-text]')!;
  const preview = vi.fn();
  const dataTransfer = { ...transfer(), setDragImage: preview };
  const bounds = editor.getBoundingClientRect();
  const before = page.document();
  expect(
    fireEvent.dragStart(cell, {
      clientX: bounds.right + 20,
      clientY: bounds.top + 10,
      dataTransfer,
    }),
  ).toBe(false);
  expect(preview).not.toHaveBeenCalled();
  fireEvent.dragOver(cell, {
    clientX: bounds.right + 40,
    clientY: bounds.top + 10,
    dataTransfer,
  });
  fireEvent.drop(cell, { dataTransfer });
  expect(page.document()).toBe(before);
  fireEvent.dragStart(cell, {
    clientX: bounds.left + 10,
    clientY: bounds.top + 10,
    dataTransfer,
  });
  expect(preview).toHaveBeenCalledWith(editor, 10, 10);
});

it('shows one side insertion point in the free space of a narrowed row block', () => {
  const initial = fixture();
  initial.sections[0].columns[0].blocks = [
    {
      id: 'a',
      type: 'text',
      rowId: 'pair',
      widthPercent: 50,
      contentWidthPercent: 40,
    },
    { id: 'picture', type: 'image', rowId: 'pair', widthPercent: 50 },
  ];
  const page = setup(initial);
  const points = () => page.container.querySelectorAll('[data-beside-anchor]');
  expect(points()).toHaveLength(1);
  const point = page.getByRole('button', { name: 'Добавить справа от текста' });
  expect(point.getAttribute('data-active')).toBeNull();
  fireEvent.click(page.container.querySelector('[data-block-id="a"]')!);
  expect(point.getAttribute('data-active')).not.toBeNull();
  const versions = page.document().versions;
  fireEvent.click(point);
  fireEvent.click(page.getByRole('button', { name: 'Текст' }));
  const row = page.document().sections[0].columns[0].blocks;
  expect(row).toHaveLength(3);
  expect(row[1].type).toBe('text');
  expect(row.every((block) => block.rowId === 'pair')).toBe(true);
  expect(page.document().versions).toBe(versions);
});

it('dismisses a selected text block on outside clicks but preserves its toolbar and settings', () => {
  const page = setup();
  const editor = page.container.querySelector<HTMLElement>(
    '[data-block-id="a"] [data-email-text]',
  )!;
  fireEvent.click(editor);
  editor.focus();
  const toolbar = page.getByRole('group', { name: 'Текст' });
  fireEvent.pointerDown(toolbar);
  expect(
    page.queryByRole('button', { name: 'Изменить ширину текста' }),
  ).not.toBeNull();
  fireEvent.click(page.getByRole('button', { name: 'Настройки текста' }));
  const panel = page.getByRole('dialog', { name: 'Оформление текста' });
  fireEvent.pointerDown(panel);
  expect(
    page.queryByRole('dialog', { name: 'Оформление текста' }),
  ).not.toBeNull();
  fireEvent.pointerDown(page.getByRole('region', { name: 'Секция 1' }));
  expect(
    page.queryByRole('button', { name: 'Изменить ширину текста' }),
  ).toBeNull();
  expect(page.queryByRole('dialog', { name: 'Оформление текста' })).toBeNull();
  expect(window.document.activeElement).not.toBe(editor);
  fireEvent.click(page.container.querySelector('[data-block-id="a"]')!);
  fireEvent.pointerDown(window.document.body);
  expect(page.queryByRole('group', { name: 'Текст' })).toBeNull();
});

it('clears selection when clicking the empty part of the selected text cell', () => {
  const initial = fixture();
  initial.sections[0].columns[0].blocks[0].widthPercent = 40;
  const page = setup(initial);
  const cell = page.container.querySelector<HTMLElement>(
    '[data-block-id="a"]',
  )!;
  const editor = cell.querySelector<HTMLElement>('[data-email-text]')!;
  fireEvent.click(editor);
  const bounds = editor.getBoundingClientRect();
  const point = { clientX: bounds.right + 20, clientY: bounds.top + 10 };
  fireEvent.pointerDown(cell, point);
  fireEvent.click(cell, { ...point, detail: 1 });
  expect(
    page.queryByRole('button', { name: 'Изменить ширину текста' }),
  ).toBeNull();
  expect(window.document.activeElement).not.toBe(editor);
});
