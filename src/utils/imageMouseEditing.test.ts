// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachImageMouseEditing } from './imageMouseEditing';

let root: HTMLDivElement;
let image: HTMLImageElement;
let destroy: () => void;
const onChange = vi.fn();
const onBeforeChange = vi.fn();
const onHistory = vi.fn();
const box = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  left: x,
  top: y,
  right: x + width,
  bottom: y + height,
  width,
  height,
  toJSON() {},
});
const pointer = (target: EventTarget, type: string, x: number, y: number) =>
  target.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  root = document.createElement('div');
  root.style.padding = '0px';
  root.innerHTML =
    '<div class="se-component"><figure style="width:300px"><img src="x" style="width:100%;height:auto"></figure></div>';
  image = root.querySelector('img')!;
  document.body.append(root);
  Object.defineProperty(root, 'clientWidth', { value: 600 });
  root.getClientRects = () => [box(0, 0, 600, 500)] as unknown as DOMRectList;
  root.getBoundingClientRect = () => box(0, 0, 600, 500);
  image.getBoundingClientRect = () => box(20, 30, 300, 200);
  const editing = attachImageMouseEditing(root, {
    overlayClass: 'selection',
    cornerClass: 'corner',
    spacingClass: 'spacing',
    menuClass: 'image-menu',
    onBeforeChange,
    onChange,
    onHistory,
    onAlign: vi.fn(),
    canHistory: () => true,
  });
  destroy = editing.destroy;
  editing.select(image);
});
afterEach(() => {
  destroy();
  root.remove();
  vi.unstubAllGlobals();
});

describe('direct image editing', () => {
  it('resizes proportionally with a corner and records one completed gesture', () => {
    const corner = document.querySelector('[data-handle="se"]')!;
    pointer(corner, 'pointerdown', 320, 230);
    pointer(document, 'pointermove', 260, 190);
    pointer(document, 'pointerup', 260, 190);
    expect(image.closest('figure')?.style.width).toBe('240px');
    expect(image.style.height).toBe('auto');
    expect(onBeforeChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledOnce();
    expect(root.querySelector('.selection')).toBeNull();
  });
  it('changes vertical gaps with mouse handles and cancels an unfinished resize', () => {
    pointer(
      document.querySelector('[data-handle="top"]')!,
      'pointerdown',
      100,
      30,
    );
    pointer(document, 'pointermove', 100, 10);
    pointer(document, 'pointerup', 100, 10);
    expect(image.closest<HTMLElement>('.se-component')?.style.paddingTop).toBe(
      '20px',
    );
    pointer(
      document.querySelector('[data-handle="bottom"]')!,
      'pointerdown',
      100,
      230,
    );
    pointer(document, 'pointermove', 100, 260);
    pointer(document, 'pointerup', 100, 260);
    expect(
      image.closest<HTMLElement>('.se-component')?.style.paddingBottom,
    ).toBe('30px');
    pointer(
      document.querySelector('[data-handle="se"]')!,
      'pointerdown',
      320,
      230,
    );
    pointer(document, 'pointermove', 260, 190);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    pointer(document, 'pointerup', 260, 190);
    expect(image.closest('figure')?.style.width).toBe('300px');
    expect(onChange).toHaveBeenCalledTimes(2);
  });
  it('provides history in the mouse context menu and removes all editing handles on cleanup', () => {
    image.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );
    const menu = document.querySelector<HTMLElement>('.image-menu')!;
    expect(menu.hidden).toBe(false);
    const undo = Array.from(menu.querySelectorAll('button')).find(
      (el) => el.textContent === 'Отменить',
    )!;
    undo.click();
    expect(onHistory).toHaveBeenCalledWith('undo');
    expect(menu.hidden).toBe(true);
    destroy();
    destroy = () => {};
    expect(document.querySelector('.selection')).toBeNull();
    expect(document.querySelector('.image-menu')).toBeNull();
  });
});
