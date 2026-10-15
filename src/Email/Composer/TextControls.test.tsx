// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type SunEditorCore from 'suneditor/src/lib/core';
import TextControls from './TextControls';

let root: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    {},
  ] as unknown as DOMRectList);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 20,
    right: 500,
    top: 20,
    bottom: 80,
    width: 480,
    height: 60,
  } as DOMRect);
  root = document.createElement('div');
  root.innerHTML =
    '<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>';
  document.body.append(root);
});
afterEach(() => {
  cleanup();
  root.remove();
  document.getSelection()?.removeAllRanges();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function setup() {
  const editor = {
    core: {
      context: { element: { wysiwyg: root } },
      history: { push: vi.fn() },
    },
    getContents: () => root.innerHTML,
  } as unknown as SunEditorCore;
  return render(<TextControls editor={editor} onChange={vi.fn()} />);
}
function selectTwo() {
  const range = document.createRange();
  range.setStart(root.children[0].firstChild!, 0);
  range.setEnd(root.children[1].firstChild!, 6);
  document.getSelection()!.removeAllRanges();
  document.getSelection()!.addRange(range);
  fireEvent(document, new Event('selectionchange'));
}
describe('text selection toolbar', () => {
  it('opens only after selecting text and releasing the pointer', () => {
    const page = setup();
    fireEvent.pointerDown(root.children[0]);
    fireEvent.pointerUp(root.children[0]);
    expect(page.queryByRole('group', { name: 'Оформление текста' })).toBeNull();
    fireEvent.pointerDown(root.children[0]);
    act(selectTwo);
    expect(page.queryByRole('group', { name: 'Оформление текста' })).toBeNull();
    fireEvent.pointerUp(root.children[1]);
    expect(page.getByRole('group', { name: 'Оформление текста' })).toBeTruthy();
    fireEvent.pointerDown(root.children[2]);
    expect(page.queryByRole('group', { name: 'Оформление текста' })).toBeNull();
  });
  it('formats all selected paragraphs and retains the selection while using the panel', () => {
    const page = setup();
    act(selectTwo);
    fireEvent.change(page.getByLabelText('Размер текста блока'), {
      target: { value: '24' },
    });

    const shifted = document.createRange();
    shifted.selectNodeContents(root.children[0]);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(shifted);
    fireEvent(document, new Event('selectionchange'));
    fireEvent.click(page.getByRole('button', { name: 'Текст по центру' }));
    fireEvent.input(page.getByLabelText('Фон абзаца'), {
      target: { value: '#ff0000' },
    });
    expect((root.children[0] as HTMLElement).style.textAlign).toBe('center');
    expect((root.children[1] as HTMLElement).style.textAlign).toBe('center');
    expect((root.children[1] as HTMLElement).style.backgroundColor).toBe(
      'rgb(255, 0, 0)',
    );
    expect(root.children[2].getAttribute('style')).toBeNull();
    fireEvent.change(page.getByLabelText('Размер текста блока'), {
      target: { value: '24' },
    });
    expect(root.children[0].querySelector('span')?.style.fontSize).toBe('24px');
    expect(root.children[1].querySelector('span')?.style.fontSize).toBe('24px');
  });
});
