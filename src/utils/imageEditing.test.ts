import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adjacentImagePosition,
  alignImage,
  imageUnit,
  moveImage,
  imageLayout,
  setImageLayout,
} from './imageEditing';
import { attachImageDragging } from './imageDragging';
import { renderLocalPreview } from './localModel';
let root: HTMLDivElement;
let image: HTMLImageElement;
beforeEach(() => {
  root = document.createElement('div');
  root.innerHTML =
    '<p>Before</p><div class="se-component"><figure><a href="https://example.test"><img src="data:image/png;base64,AA==" alt="Picture"></a><figcaption>Caption</figcaption></figure></div><p>After</p>';
  image = root.querySelector('img')!;
});
describe('image movement', () => {
  it('moves an image above a paragraph without copying or losing its caption and link', () => {
    const unit = imageUnit(root, image)!;
    expect(moveImage(root, image, root.firstElementChild as HTMLElement)).toBe(
      true,
    );
    expect(root.firstElementChild).toBe(unit);
    expect(root.querySelectorAll('img')).toHaveLength(1);
    expect(image.closest('a')?.href).toBe('https://example.test/');
    expect(unit.textContent).toBe('Caption');
    expect(root.children[1].textContent).toBe('Before');
  });
  it('moves an image to the end and refuses an unchanged position', () => {
    expect(moveImage(root, image, null)).toBe(true);
    expect(root.lastElementChild).toBe(imageUnit(root, image));
    expect(moveImage(root, image, null)).toBe(false);
  });
  it('does not lose surrounding text when moving an inline image', () => {
    root.innerHTML = '<p>Before<img alt="Inline" src="x">After</p><p>End</p>';
    image = root.querySelector('img')!;
    moveImage(root, image, null);
    expect(root.firstElementChild?.textContent).toBe('BeforeAfter');
    expect(root.lastElementChild?.querySelector('img')).toBe(image);
    expect(root.querySelectorAll('img')).toHaveLength(1);
  });
  it('does not move images from another editor or accept invalid destinations', () => {
    const other = document.createElement('p');
    expect(moveImage(root, image, other)).toBe(false);
    expect(moveImage(document.createElement('div'), image, null)).toBe(false);
  });
  it('computes keyboard positions at the first and last boundaries', () => {
    moveImage(root, image, root.firstElementChild as HTMLElement);
    expect(adjacentImagePosition(root, image, 'up')).toBeUndefined();
    moveImage(root, image, adjacentImagePosition(root, image, 'down')!);
    expect(root.children[1]).toBe(imageUnit(root, image));
    moveImage(root, image, null);
    expect(adjacentImagePosition(root, image, 'down')).toBeUndefined();
  });
  it('keeps the resulting image order and editor alignment styles in preview', () => {
    image.setAttribute('data-align', 'center');
    moveImage(root, image, null);
    const preview = renderLocalPreview({
      locale: 'uk',
      subject: 'Test',
      preheader: '',
      html: root.innerHTML,
    });
    const parsed = new DOMParser().parseFromString(preview.html, 'text/html');
    expect(
      parsed
        .querySelector('.email-body')
        ?.lastElementChild?.querySelector('img')
        ?.getAttribute('data-align'),
    ).toBe('center');
    expect(parsed.body.classList.contains('sun-editor-editable')).toBe(true);
    expect(parsed.head.querySelector('style')?.textContent).toContain(
      '__se__float-center',
    );
  });
});

describe('layout image alignment', () => {
  it('keeps link and caption while centering a standalone image', () => {
    expect(alignImage(root, image, 'center')).toBe(true);
    expect(image.style.marginLeft).toBe('auto');
    expect(image.style.marginRight).toBe('auto');
    expect(image.closest('a')).not.toBeNull();
    expect(imageUnit(root, image)?.style.textAlign).toBe('center');
    expect(root.textContent).toContain('Caption');
  });
});

describe('pointer dragging', () => {
  it('shows the insertion marker and moves exactly once after crossing a block', () => {
    document.body.append(root);
    root.getBoundingClientRect = () => ({
      left: 0,
      right: 500,
      top: 0,
      bottom: 400,
      width: 500,
      height: 400,
      x: 0,
      y: 0,
      toJSON() {},
    });
    Array.from(root.children).forEach((element, index) => {
      element.getBoundingClientRect = () => ({
        left: 0,
        right: 500,
        top: index * 100,
        bottom: index * 100 + 80,
        width: 500,
        height: 80,
        x: 0,
        y: index * 100,
        toJSON() {},
      });
    });
    const onMove = vi.fn((img, before) => {
      moveImage(root, img, before);
    });
    const cleanup = attachImageDragging(root, {
      markerClass: 'test-marker',
      onSelect: vi.fn(),
      onMove,
    });
    image.closest('figure')!.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: 50,
        clientY: 150,
      }),
    );
    document.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 50,
        clientY: 300,
      }),
    );
    expect(document.querySelector<HTMLElement>('.test-marker')?.hidden).toBe(
      false,
    );
    document.dispatchEvent(
      new MouseEvent('pointerup', { bubbles: true, clientX: 50, clientY: 300 }),
    );
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(root.lastElementChild).toBe(imageUnit(root, image));
    expect(root.querySelectorAll('img')).toHaveLength(1);
    expect(document.querySelector<HTMLElement>('.test-marker')?.hidden).toBe(
      true,
    );
    cleanup();
    root.remove();
    expect(document.querySelector('.test-marker')).toBeNull();
  });

  it('cancels on Escape, on release outside the editor and after cleanup', () => {
    document.body.append(root);
    root.getBoundingClientRect = () => ({
      left: 0,
      right: 500,
      top: 0,
      bottom: 400,
      width: 500,
      height: 400,
      x: 0,
      y: 0,
      toJSON() {},
    });
    const onMove = vi.fn();
    const cleanup = attachImageDragging(root, {
      markerClass: 'test-marker',
      onSelect: vi.fn(),
      onMove,
    });
    const down = () =>
      image.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 50,
          clientY: 150,
        }),
      );
    const move = () =>
      document.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          clientX: 50,
          clientY: 300,
        }),
      );
    down();
    move();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.dispatchEvent(
      new MouseEvent('pointerup', { clientX: 50, clientY: 300 }),
    );
    down();
    move();
    document.dispatchEvent(
      new MouseEvent('pointerup', { clientX: 600, clientY: 300 }),
    );
    cleanup();
    down();
    move();
    document.dispatchEvent(
      new MouseEvent('pointerup', { clientX: 50, clientY: 300 }),
    );
    expect(onMove).not.toHaveBeenCalled();
    root.remove();
  });
});

describe('image size and spacing', () => {
  it('sets responsive pixel width, automatic height and vertical gaps without losing the link or caption', () => {
    image.setAttribute('width', '1200');
    image.setAttribute('height', '800');
    image.style.height = '800px';
    expect(
      setImageLayout(root, image, {
        width: 300,
        unit: 'px',
        marginTop: 12,
        marginBottom: 24,
      }),
    ).toBe(true);
    expect(image.closest('figure')?.style.width).toBe('300px');
    expect(image.style.height).toBe('auto');
    expect(image.style.maxWidth).toBe('100%');
    expect(image.hasAttribute('height')).toBe(false);
    expect(image.closest('a')?.href).toBe('https://example.test/');
    expect(root.textContent).toContain('Caption');
    expect(imageLayout(root, image)).toEqual({
      width: 300,
      unit: 'px',
      marginTop: 12,
      marginBottom: 24,
    });
    alignImage(root, image, 'right');
    const preview = renderLocalPreview({
      locale: 'uk',
      subject: 'Test',
      preheader: '',
      html: root.innerHTML,
    });
    const doc = new DOMParser().parseFromString(preview.html, 'text/html');
    const saved = doc.querySelector('img')!;
    expect(saved.closest('figure')?.style.width).toBe('300px');
    expect(saved.closest<HTMLElement>('.se-component')?.style.paddingTop).toBe(
      '12px',
    );
    expect(
      saved.closest<HTMLElement>('.se-component')?.style.paddingBottom,
    ).toBe('24px');
  });

  it('keeps percentage width and rejects invalid sizes without changing the image', () => {
    setImageLayout(root, image, {
      width: 50,
      unit: '%',
      marginTop: 0,
      marginBottom: 8,
    });
    expect(imageLayout(root, image).width).toBe(50);
    expect(image.closest('figure')?.style.width).toBe('50%');
    const before = root.innerHTML;
    for (const width of [0, -10, NaN, Infinity]) {
      expect(
        setImageLayout(root, image, {
          width,
          unit: 'px',
          marginTop: 0,
          marginBottom: 0,
        }),
      ).toBe(false);
      expect(root.innerHTML).toBe(before);
    }
    expect(
      setImageLayout(document.createElement('div'), image, {
        width: 100,
        unit: 'px',
        marginTop: 0,
        marginBottom: 0,
      }),
    ).toBe(false);
  });
});
