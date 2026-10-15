export type LinkKind = 'link' | 'button';
export type ButtonSize = 'small' | 'medium' | 'large';
export interface LetterLinkValue {
  kind: LinkKind;
  text: string;
  url: string;
  color: string;
  underline: boolean;
  background: string;
  size: ButtonSize;
  radius: number;
  alignment: 'left' | 'center' | 'right';
}
export function letterLinkUrl(value: string): string | null {
  const url = value.trim();
  if (!/^(https?:\/\/|mailto:)/i.test(url) || /[\r\n]/.test(url)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'mailto:' && !parsed.pathname.trim()) return null;
    return url;
  } catch {
    return null;
  }
}
const hex = (value: string, fallback: string) =>
  /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : (() => {
        const rgb = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        return rgb
          ? '#' +
              rgb
                .slice(1)
                .map((part) => Number(part).toString(16).padStart(2, '0'))
                .join('')
          : fallback;
      })();
export function linkValue(
  anchor: HTMLAnchorElement | null,
  kind: LinkKind,
  text: string,
  linkColor: string,
): LetterLinkValue {
  return {
    kind,
    text:
      anchor?.textContent ||
      text ||
      (kind === 'button' ? 'Подробнее' : 'Ссылка'),
    url: anchor?.getAttribute('href') || '',
    color: hex(
      anchor?.style.color || '',
      kind === 'button' ? '#ffffff' : linkColor,
    ),
    underline: anchor
      ? anchor.style.textDecoration !== 'none'
      : kind === 'link',
    background: hex(anchor?.style.backgroundColor || '', linkColor),
    size: (anchor?.getAttribute('data-button-size') as ButtonSize) || 'medium',
    radius: anchor?.style.borderRadius
      ? parseFloat(anchor.style.borderRadius)
      : 4,
    alignment: (anchor?.parentElement?.style.textAlign ||
      'left') as LetterLinkValue['alignment'],
  };
}
export function saveLetterLink(
  root: HTMLElement,
  value: LetterLinkValue,
  range: Range | null,
  existing: HTMLAnchorElement | null,
): HTMLAnchorElement {
  const url = letterLinkUrl(value.url);
  if (!url || !value.text.trim())
    throw new Error(
      'Укажите текст и полный адрес http://, https:// или mailto:.',
    );
  if (existing && !root.contains(existing))
    throw new Error('Ссылка больше не находится в письме. Выберите её снова.');
  if (
    range &&
    (!root.contains(range.startContainer) || !root.contains(range.endContainer))
  )
    range = null;
  let paragraph: HTMLElement | null = null;
  if (range) {
    const start =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as Element)
        : range.startContainer.parentElement!;
    const end =
      range.endContainer.nodeType === Node.ELEMENT_NODE
        ? (range.endContainer as Element)
        : range.endContainer.parentElement!;
    paragraph = start.closest<HTMLElement>('p,h1,h2,h3,h4,h5,h6');
    if (
      !range.collapsed &&
      (!paragraph ||
        !paragraph.contains(end) ||
        range.cloneContents().querySelector('a,img') ||
        start.closest('a') ||
        end.closest('a'))
    )
      throw new Error(
        'Для вставки выделите текст одного абзаца без других ссылок и картинок.',
      );
  }
  const anchor = existing || root.ownerDocument.createElement('a');
  if (!existing || anchor.textContent !== value.text.trim())
    anchor.textContent = value.text.trim();
  anchor.href = url;
  anchor.style.color = value.color;
  anchor.style.textDecoration =
    value.underline && value.kind === 'link' ? 'underline' : 'none';
  anchor.querySelectorAll<HTMLElement>('*').forEach((child) => {
    child.style.removeProperty('color');
    child.style.removeProperty('text-decoration');
  });
  if (value.kind === 'button') {
    anchor.setAttribute('data-email-button', 'true');
    anchor.setAttribute('data-button-size', value.size);
    anchor.style.display = 'inline-block';
    anchor.style.backgroundColor = value.background;
    anchor.style.borderRadius = `${Math.max(0, Math.min(48, value.radius))}px`;
    const sizes = {
      small: [14, 8, 16],
      medium: [16, 12, 24],
      large: [20, 16, 32],
    };
    const [font, vertical, horizontal] = sizes[value.size] || sizes.medium;
    anchor.style.fontSize = `${font}px`;
    anchor
      .querySelectorAll<HTMLElement>('*')
      .forEach((child) => child.style.removeProperty('font-size'));
    anchor.style.padding = `${vertical}px ${horizontal}px`;
    anchor.style.maxWidth = '100%';
    anchor.style.boxSizing = 'border-box';
    anchor.style.overflowWrap = 'anywhere';
    anchor.style.lineHeight = '1.4';
  }
  if (!existing) {
    if (value.kind === 'link' && range && paragraph) {
      if (range.collapsed && range.startContainer.parentElement?.closest('a'))
        throw new Error('Сначала выберите место вне существующей ссылки.');
      if (range.toString() === value.text.trim())
        anchor.replaceChildren(range.extractContents());
      else range.deleteContents();
      range.insertNode(anchor);
    } else {
      const block = root.ownerDocument.createElement('p');
      block.append(anchor);
      if (range && paragraph) {
        if (!range.collapsed) range.deleteContents();
        paragraph.after(block);
      } else root.append(block);
    }
  }
  anchor.querySelectorAll<HTMLElement>('*').forEach((child) => {
    child.style.removeProperty('color');
    child.style.removeProperty('text-decoration');
  });
  if (value.kind === 'button' && anchor.parentElement)
    anchor.parentElement.style.textAlign = value.alignment;
  return anchor;
}
