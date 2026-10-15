import { dropPosition, imageUnit } from './imageEditing';

interface Options {
  markerClass: string;
  onSelect: (image: HTMLImageElement | null) => void;
  onMove: (
    image: HTMLImageElement,
    before: HTMLElement | null,
    alignment?: 'left' | 'center' | 'right',
  ) => void;
}

export function attachImageDragging(root: HTMLElement, options: Options) {
  const doc = root.ownerDocument;
  const marker = doc.createElement('div');
  marker.className = options.markerClass;
  marker.setAttribute('aria-hidden', 'true');
  marker.hidden = true;
  doc.body.append(marker);
  let pending: {
    image: HTMLImageElement;
    x: number;
    y: number;
    moving: boolean;
  } | null = null;
  let suppressClick = false;
  const end = () => {
    pending = null;
    marker.hidden = true;
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    suppressClick = false;
    const target = event.target;
    const image =
      target instanceof Element
        ? (target.closest<HTMLImageElement>('img') ??
          target
            .closest('.se-component')
            ?.querySelector<HTMLImageElement>('img') ??
          null)
        : null;
    options.onSelect(image);
    if (!image || !root.contains(image)) return;
    pending = { image, x: event.clientX, y: event.clientY, moving: false };

    event.preventDefault();
    event.stopPropagation();
  };
  const move = (event: PointerEvent) => {
    if (!pending || !root.contains(pending.image)) return end();
    if (
      !pending.moving &&
      Math.hypot(event.clientX - pending.x, event.clientY - pending.y) < 6
    )
      return;
    pending.moving = true;
    event.preventDefault();
    const box = root.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    ) {
      marker.hidden = true;
      return;
    }

    if (event.clientY < box.top + 30) root.scrollTop -= 12;
    if (event.clientY > box.bottom - 30) root.scrollTop += 12;
    const before = dropPosition(
      root,
      event.clientY,
      imageUnit(root, pending.image)!,
    );
    const last = root.lastElementChild?.getBoundingClientRect();
    const y = before
      ? before.getBoundingClientRect().top
      : (last?.bottom ?? box.top);
    marker.hidden = false;
    marker.style.cssText = `left:${box.left}px;top:${Math.min(box.bottom, Math.max(box.top, y))}px;width:${box.width}px`;
  };
  const up = (event: PointerEvent) => {
    if (pending?.moving) {
      const box = root.getBoundingClientRect();
      suppressClick = true;
      if (
        root.contains(pending.image) &&
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom
      ) {
        options.onMove(
          pending.image,
          dropPosition(root, event.clientY, imageUnit(root, pending.image)!),
          event.clientX < box.left + box.width / 3
            ? 'left'
            : event.clientX > box.right - box.width / 3
              ? 'right'
              : 'center',
        );
      }
    }
    end();
  };
  const click = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest('a')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if (suppressClick) {
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClick = false;
    }
  };
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      suppressClick = Boolean(pending?.moving);
      end();
    }
  };
  root.addEventListener('pointerdown', down, true);
  root.addEventListener('click', click, true);
  doc.addEventListener('pointermove', move, { passive: false });
  doc.addEventListener('pointerup', up);
  doc.addEventListener('pointercancel', end);
  doc.addEventListener('keydown', key);
  return () => {
    root.removeEventListener('pointerdown', down, true);
    root.removeEventListener('click', click, true);
    doc.removeEventListener('pointermove', move);
    doc.removeEventListener('pointerup', up);
    doc.removeEventListener('pointercancel', end);
    doc.removeEventListener('keydown', key);
    marker.remove();
  };
}
