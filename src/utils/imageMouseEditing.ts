import { imageLayout, setImageLayout, type ImageLayout } from './imageEditing';

type Gesture = 'nw' | 'ne' | 'sw' | 'se' | 'top' | 'bottom';
interface Options {
  overlayClass: string;
  cornerClass: string;
  spacingClass: string;
  menuClass: string;
  onBeforeChange: () => void;
  onChange: () => void;
  onAlign: (
    image: HTMLImageElement,
    alignment: 'left' | 'center' | 'right',
  ) => void;
  onHistory: (action: 'undo' | 'redo') => void;
  canHistory: (action: 'undo' | 'redo') => boolean;
}

export function attachImageMouseEditing(root: HTMLElement, options: Options) {
  const doc = root.ownerDocument;
  const win = doc.defaultView!;
  const overlay = doc.createElement('div');
  overlay.className = options.overlayClass;
  overlay.setAttribute('role', 'group');
  overlay.setAttribute('aria-label', 'Размер и отступы картинки');
  overlay.hidden = true;
  const menu = doc.createElement('div');
  menu.className = options.menuClass;
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  doc.body.append(overlay, menu);
  let selected: HTMLImageElement | null = null;
  let gesture: {
    image: HTMLImageElement;
    kind: Gesture;
    x: number;
    y: number;
    width: number;
    height: number;
    layout: ImageLayout;
    changed: boolean;
  } | null = null;

  const update = () => {
    if (
      !selected ||
      !root.contains(selected) ||
      !root.getClientRects().length
    ) {
      overlay.hidden = true;
      menu.hidden = true;
      return;
    }
    const box = selected.getBoundingClientRect();
    const area = root.getBoundingClientRect();
    overlay.hidden = box.bottom < area.top || box.top > area.bottom;
    overlay.style.left = `${box.left}px`;
    overlay.style.top = `${box.top}px`;
    overlay.style.width = `${box.width}px`;
    overlay.style.height = `${box.height}px`;
    const layout = imageLayout(root, selected);
    for (const kind of ['top', 'bottom'] as const) {
      const handle = overlay.querySelector<HTMLButtonElement>(
        `[data-handle="${kind}"]`,
      )!;
      const gap = kind === 'top' ? layout.marginTop : layout.marginBottom;
      handle.textContent = `${kind === 'top' ? '↕ Сверху' : '↕ Снизу'} ${Math.round(gap)} px`;
    }
  };
  const select = (image: HTMLImageElement | null) => {
    selected = image;
    menu.hidden = true;
    update();
  };
  for (const kind of ['nw', 'ne', 'sw', 'se', 'top', 'bottom'] as const) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.dataset.handle = kind;
    button.className =
      kind === 'top' || kind === 'bottom'
        ? options.spacingClass
        : options.cornerClass;
    const labels = {
      nw: 'левый верхний',
      ne: 'правый верхний',
      sw: 'левый нижний',
      se: 'правый нижний',
    };
    button.setAttribute(
      'aria-label',
      kind === 'top'
        ? 'Отступ сверху'
        : kind === 'bottom'
          ? 'Отступ снизу'
          : `Изменить размер: ${labels[kind]} угол`,
    );
    button.title =
      kind === 'top' || kind === 'bottom'
        ? 'Потяните, чтобы изменить отступ'
        : 'Потяните за угол — пропорции сохраняются';
    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !selected) return;
      event.preventDefault();
      event.stopPropagation();
      menu.hidden = true;
      const box = selected.getBoundingClientRect();
      options.onBeforeChange();
      gesture = {
        image: selected,
        kind,
        x: event.clientX,
        y: event.clientY,
        width: box.width,
        height: box.height,
        layout: imageLayout(root, selected),
        changed: false,
      };
    });
    overlay.append(button);
  }
  const move = (event: PointerEvent) => {
    if (!gesture) return;
    if (!root.contains(gesture.image)) return cancel();
    event.preventDefault();
    const { kind, layout, image, x, y, width, height } = gesture;
    const next = { ...layout };
    if (kind === 'top')
      next.marginTop = Math.max(
        0,
        Math.round(layout.marginTop + y - event.clientY),
      );
    else if (kind === 'bottom')
      next.marginBottom = Math.max(
        0,
        Math.round(layout.marginBottom + event.clientY - y),
      );
    else {
      const dx = (event.clientX - x) * (kind.endsWith('e') ? 1 : -1);
      const dy = (event.clientY - y) * (kind.startsWith('s') ? 1 : -1);
      const scale =
        1 + (dx * width + dy * height) / (width * width + height * height || 1);
      const style = win.getComputedStyle(root);
      const available =
        root.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      next.width = Math.max(
        1,
        Math.min(available || width, Math.round(width * scale)),
      );
      next.unit = 'px';
    }
    setImageLayout(root, image, next);
    gesture.changed = true;
    update();
  };
  const up = () => {
    if (!gesture) return;
    const changed = gesture.changed;
    gesture = null;
    if (changed) options.onChange();
    update();
  };
  const cancel = () => {
    if (!gesture) return;
    setImageLayout(root, gesture.image, gesture.layout);
    gesture = null;
    update();
  };
  const context = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target instanceof Element ? event.target : null;
    const image = target?.closest('img') as HTMLImageElement | null;
    if (image && root.contains(image)) select(image);
    menu.replaceChildren();
    const add = (label: string, disabled: boolean, action: () => void) => {
      const button = doc.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.textContent = label;
      button.disabled = disabled;
      button.addEventListener('click', () => {
        action();
        menu.hidden = true;
        update();
      });
      menu.append(button);
    };
    for (const [alignment, label] of [
      ['left', 'Слева'],
      ['center', 'По центру'],
      ['right', 'Справа'],
    ] as const) {
      add(label, !selected, () => {
        if (selected) options.onAlign(selected, alignment);
      });
    }
    add('Отменить', !options.canHistory('undo'), () => {
      options.onHistory('undo');
      select(null);
    });
    add('Повторить', !options.canHistory('redo'), () => {
      options.onHistory('redo');
      select(null);
    });
    menu.hidden = false;
    const box = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(event.clientX, win.innerWidth - box.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(event.clientY, win.innerHeight - box.height - 8))}px`;
  };
  const dismiss = (event: PointerEvent) => {
    if (!(event.target instanceof Node) || menu.contains(event.target)) return;
    menu.hidden = true;
    if (!root.contains(event.target) && !overlay.contains(event.target))
      select(null);
  };
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      cancel();
      menu.hidden = true;
    }
  };
  const observer = new ResizeObserver(update);
  observer.observe(root);
  const mutations = new MutationObserver(update);
  mutations.observe(root, { childList: true, subtree: true, attributes: true });
  doc.addEventListener('pointermove', move, { passive: false });
  doc.addEventListener('pointerup', up);
  doc.addEventListener('pointercancel', cancel);
  doc.addEventListener('pointerdown', dismiss);
  doc.addEventListener('keydown', key);
  doc.addEventListener('scroll', update, true);
  win.addEventListener('resize', update);
  root.addEventListener('contextmenu', context);
  overlay.addEventListener('contextmenu', context);
  return {
    select,
    destroy() {
      cancel();
      observer.disconnect();
      mutations.disconnect();
      doc.removeEventListener('pointermove', move);
      doc.removeEventListener('pointerup', up);
      doc.removeEventListener('pointercancel', cancel);
      doc.removeEventListener('pointerdown', dismiss);
      doc.removeEventListener('keydown', key);
      doc.removeEventListener('scroll', update, true);
      win.removeEventListener('resize', update);
      root.removeEventListener('contextmenu', context);
      overlay.removeEventListener('contextmenu', context);
      overlay.remove();
      menu.remove();
    },
  };
}
