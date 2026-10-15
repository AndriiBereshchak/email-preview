export function imageUnit(
  root: HTMLElement,
  image: HTMLImageElement,
): HTMLElement | null {
  if (!root.contains(image)) return null;
  const component = image.closest<HTMLElement>('.se-component');
  if (component && root.contains(component)) return component;
  let block: HTMLElement = image;
  while (block.parentElement && block.parentElement !== root)
    block = block.parentElement;
  if (
    block === image ||
    (block.querySelectorAll('img').length === 1 &&
      !block.textContent?.trim() &&
      !block.querySelector('table,ul,ol'))
  )
    return block;
  return image.closest<HTMLAnchorElement>('a') ?? image;
}

export function topLevelBlock(
  root: HTMLElement,
  node: HTMLElement,
): HTMLElement | null {
  if (!root.contains(node) || node === root) return null;
  let block = node;
  while (block.parentElement && block.parentElement !== root)
    block = block.parentElement;
  return block;
}

export function moveImage(
  root: HTMLElement,
  image: HTMLImageElement,
  before: HTMLElement | null,
): boolean {
  const unit = imageUnit(root, image);
  if (
    !unit ||
    (before && before.parentElement !== root) ||
    before === unit ||
    unit.contains(before)
  )
    return false;
  if (unit.parentElement === root && unit.nextElementSibling === before)
    return false;
  const inline = unit.tagName === 'IMG' || unit.tagName === 'A';
  const moved = inline ? root.ownerDocument.createElement('p') : unit;
  if (inline) moved.append(unit);
  root.insertBefore(moved, before);
  return true;
}

export function adjacentImagePosition(
  root: HTMLElement,
  image: HTMLImageElement,
  direction: 'up' | 'down',
): HTMLElement | null | undefined {
  const block = topLevelBlock(root, image);
  if (!block) return undefined;
  if (direction === 'up')
    return (block.previousElementSibling as HTMLElement | null) ?? undefined;
  const next = block.nextElementSibling;
  return next ? (next.nextElementSibling as HTMLElement | null) : undefined;
}

export function dropPosition(
  root: HTMLElement,
  clientY: number,
  source: HTMLElement,
): HTMLElement | null {
  for (const block of Array.from(root.children) as HTMLElement[]) {
    if (block === source) continue;
    const box = block.getBoundingClientRect();
    if (clientY < box.top + box.height / 2) return block;
  }
  return null;
}

export function alignImage(
  root: HTMLElement,
  image: HTMLImageElement,
  alignment: 'left' | 'center' | 'right',
): boolean {
  const unit = imageUnit(root, image);
  if (!unit) return false;
  image.setAttribute('data-align', alignment);
  image.style.display = 'block';
  image.style.float = 'none';
  image.style.marginLeft = alignment === 'left' ? '0' : 'auto';
  image.style.marginRight = alignment === 'right' ? '0' : 'auto';
  if (unit !== image && unit.tagName !== 'A') {
    for (const name of Array.from(unit.classList))
      if (name.startsWith('__se__float-')) unit.classList.remove(name);
    unit.classList.add('__se__float-none');
    unit.style.display = 'block';
    unit.style.float = 'none';
    unit.style.width = '100%';
    unit.style.textAlign = alignment;
    const figure = image.closest('figure');
    if (figure) {
      figure.style.maxWidth = '100%';
      figure.style.display = 'inline-block';
      figure.style.margin = '0';
    }
  }
  return true;
}

export interface ImageLayout {
  width: number;
  unit: 'px' | '%';
  marginTop: number;
  marginBottom: number;
}

export function imageLayout(
  root: HTMLElement,
  image: HTMLImageElement,
): ImageLayout {
  const unit = imageUnit(root, image);
  const figure = image.closest('figure');
  const width = figure?.style.width || image.style.width;
  return {
    width:
      parseFloat(width) ||
      image.getBoundingClientRect().width ||
      image.naturalWidth ||
      1,
    unit: width.endsWith('%') ? '%' : 'px',
    marginTop: parseFloat(unit?.style.paddingTop ?? '') || 0,
    marginBottom: parseFloat(unit?.style.paddingBottom ?? '') || 0,
  };
}

export function setImageLayout(
  root: HTMLElement,
  image: HTMLImageElement,
  layout: ImageLayout,
): boolean {
  const unit = imageUnit(root, image);
  if (
    !unit ||
    !Number.isFinite(layout.width) ||
    layout.width <= 0 ||
    !Number.isFinite(layout.marginTop) ||
    layout.marginTop < 0 ||
    !Number.isFinite(layout.marginBottom) ||
    layout.marginBottom < 0
  )
    return false;
  const width = `${layout.unit === '%' ? Math.min(100, layout.width) : layout.width}${layout.unit}`;
  const figure = image.closest('figure');
  if (figure && unit !== image) {
    unit.style.width = '100%';
    figure.style.width = width;
    figure.style.maxWidth = '100%';
    figure.style.height = 'auto';
    image.style.width = '100%';
  } else {
    image.style.width = width;
  }
  image.style.maxWidth = '100%';
  image.style.height = 'auto';
  image.removeAttribute('height');
  image.removeAttribute('width');
  image.removeAttribute('data-percentage');
  image.setAttribute('data-proportion', 'true');
  image.setAttribute('data-size', `${image.style.width},auto`);
  unit.style.paddingTop = `${layout.marginTop}px`;
  unit.style.paddingBottom = `${layout.marginBottom}px`;
  return true;
}
