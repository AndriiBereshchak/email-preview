export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export interface TextLayout {
  fontSize: number;
  alignment: TextAlignment;
  lineHeight: number;
  spaceAfter: number;
}

export function textBlock(
  root: HTMLElement,
  target: Element,
): HTMLElement | null {
  if (!root.contains(target) || target.closest('figure,.se-component'))
    return null;
  const block = target.closest<HTMLElement>('p,h1,h2,h3,h4,h5,h6');
  return block && root.contains(block) && !block.querySelector('img')
    ? block
    : null;
}

export function readTextLayout(block: HTMLElement): TextLayout {
  const style = block.ownerDocument.defaultView!.getComputedStyle(block);
  const fontSize = parseFloat(style.fontSize) || 16;
  const alignment = style.textAlign;
  return {
    fontSize,
    alignment: ['left', 'center', 'right', 'justify'].includes(alignment)
      ? (alignment as TextAlignment)
      : 'left',
    lineHeight:
      Math.round(
        ((style.lineHeight.endsWith('px')
          ? parseFloat(style.lineHeight) / fontSize
          : parseFloat(style.lineHeight)) || 1.6) * 100,
      ) / 100,
    spaceAfter:
      parseFloat(
        block.style.getPropertyValue('--email-space-bottom') ||
          style.marginBottom,
      ) || 0,
  };
}

export function applyTextLayout(
  root: HTMLElement,
  block: HTMLElement,
  patch: Partial<TextLayout>,
): boolean {
  if (textBlock(root, block) !== block) return false;
  if (
    patch.fontSize !== undefined &&
    (!Number.isFinite(patch.fontSize) || patch.fontSize <= 0)
  )
    return false;
  if (
    patch.lineHeight !== undefined &&
    (!Number.isFinite(patch.lineHeight) || patch.lineHeight <= 0)
  )
    return false;
  if (
    patch.spaceAfter !== undefined &&
    (!Number.isFinite(patch.spaceAfter) || patch.spaceAfter < 0)
  )
    return false;
  if (
    patch.alignment !== undefined &&
    !['left', 'center', 'right', 'justify'].includes(patch.alignment)
  )
    return false;
  if (patch.fontSize !== undefined) {
    block.style.fontSize = `${patch.fontSize}px`;
    block.querySelectorAll<HTMLElement>('*').forEach((child) => {
      child.style.removeProperty('font-size');
      if (child.tagName === 'FONT') child.removeAttribute('size');
    });
  }
  if (patch.alignment !== undefined) block.style.textAlign = patch.alignment;
  if (patch.lineHeight !== undefined) {
    block.style.lineHeight = String(patch.lineHeight);
    block
      .querySelectorAll<HTMLElement>('*')
      .forEach((child) => child.style.removeProperty('line-height'));
  }
  if (patch.spaceAfter !== undefined) {
    if (block.style.getPropertyValue('--email-space-bottom')) {
      block.style.setProperty('--email-space-bottom', `${patch.spaceAfter}px`);
      block.style.padding = `${block.style.getPropertyValue('--email-space-top') || '0px'} var(--email-content-padding, 0px) ${patch.spaceAfter}px`;
    } else block.style.marginBottom = `${patch.spaceAfter}px`;
  }
  return true;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  fontWeight: string;
  fontStyle: string;
}

export function applyTextSelection(
  root: HTMLElement,
  range: Range,
  patch: Partial<TextStyle>,
): Range | null {
  if (
    range.collapsed ||
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  )
    return null;
  if (
    patch.fontSize !== undefined &&
    (!Number.isFinite(patch.fontSize) || patch.fontSize <= 0)
  )
    return null;
  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
  );
  const fragments: { node: Text; start: number; end: number }[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node as Text;
    if (
      !text.parentElement ||
      !textBlock(root, text.parentElement) ||
      !range.intersectsNode(text)
    )
      continue;
    const start = text === range.startContainer ? range.startOffset : 0;
    const end = text === range.endContainer ? range.endOffset : text.length;
    if (end > start) fragments.push({ node: text, start, end });
  }
  const spans: HTMLElement[] = [];
  for (const { node, start, end } of fragments) {
    const fragment = root.ownerDocument.createRange();
    fragment.setStart(node, start);
    fragment.setEnd(node, end);
    const span = root.ownerDocument.createElement('span');
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined)
        span.style[key as 'fontFamily'] =
          key === 'fontSize' ? `${value}px` : String(value);
    }
    fragment.surroundContents(span);

    while (span.parentElement?.tagName === 'SPAN') {
      const parent = span.parentElement;
      const before = parent.cloneNode(false) as HTMLElement;
      const after = parent.cloneNode(false) as HTMLElement;
      while (parent.firstChild && parent.firstChild !== span)
        before.append(parent.firstChild);
      while (span.nextSibling) after.append(span.nextSibling);
      const ownStyle = Array.from(span.style).map((key) => [
        key,
        span.style.getPropertyValue(key),
      ]);
      span.style.cssText = parent.style.cssText;
      ownStyle.forEach(([key, value]) => span.style.setProperty(key, value));
      for (const attribute of Array.from(parent.attributes)) {
        if (attribute.name !== 'style' && !span.hasAttribute(attribute.name))
          span.setAttribute(attribute.name, attribute.value);
      }
      parent.before(
        ...(before.textContent ? [before] : []),
        span,
        ...(after.textContent ? [after] : []),
      );
      parent.remove();
    }
    spans.push(span);
  }
  if (!spans.length) return null;
  const result = root.ownerDocument.createRange();
  result.setStart(spans[0], 0);
  result.setEnd(
    spans[spans.length - 1],
    spans[spans.length - 1].childNodes.length,
  );
  return result;
}

export function selectedTextStyle(range: Range): TextStyle {
  let node = range.startContainer;
  if (node.nodeType === Node.ELEMENT_NODE)
    node = node.childNodes[range.startOffset] || node;
  while (node.firstChild) node = node.firstChild;
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement!;
  const style = element.ownerDocument.defaultView!.getComputedStyle(element);
  return {
    fontFamily: style.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
    fontSize: parseFloat(style.fontSize) || 16,
    color: style.color,
    backgroundColor: style.backgroundColor,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
  };
}

export function selectedTextBlocks(
  root: HTMLElement,
  range: Range,
): HTMLElement[] {
  if (
    range.collapsed ||
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  )
    return [];
  const blocks = new Set<HTMLElement>();
  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
  );
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (!node.textContent || !range.intersectsNode(node)) continue;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end =
      node === range.endContainer ? range.endOffset : node.textContent.length;
    if (end <= start) continue;
    const block = node.parentElement && textBlock(root, node.parentElement);
    if (block) blocks.add(block);
  }
  return [...blocks];
}

export function applyParagraphBackground(blocks: HTMLElement[], value: string) {
  for (const block of blocks) {
    const computed = block.ownerDocument.defaultView!.getComputedStyle(block);

    for (const side of ['Top', 'Bottom'] as const) {
      const key = `--email-space-${side.toLowerCase()}`;
      const saved = block.style.getPropertyValue(key);
      if (value === 'transparent') {
        if (saved) {
          block.style[`margin${side}`] = saved;
          block.style.removeProperty(`padding-${side.toLowerCase()}`);
          block.style.removeProperty(key);
        }
      } else if (!saved) {
        const spacing = computed[`margin${side}`] || '0px';
        block.style.setProperty(key, spacing);
        block.style[`padding${side}`] = spacing;
        block.style[`margin${side}`] = '0px';
      }
    }
    block.style.backgroundColor = value;
    for (const side of ['Left', 'Right'] as const) {
      if (value === 'transparent') {
        block.style.removeProperty(`margin-${side.toLowerCase()}`);
        block.style.removeProperty(`padding-${side.toLowerCase()}`);
      } else {
        block.style[`margin${side}`] =
          'calc(-1 * var(--email-content-padding, 0px))';
        block.style[`padding${side}`] = 'var(--email-content-padding, 0px)';
      }
    }
    if (value === 'transparent') block.style.removeProperty('padding');
    else {
      block.style.padding = `${block.style.getPropertyValue('--email-space-top') || '0px'} var(--email-content-padding, 0px) ${block.style.getPropertyValue('--email-space-bottom') || '0px'}`;
    }
  }
}
