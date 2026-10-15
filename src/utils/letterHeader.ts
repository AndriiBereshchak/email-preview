import { normalizeAppearance, type EmailAppearance } from './appearanceModel';

export function letterHeaderHtml(appearance: EmailAppearance): string {
  const a = normalizeAppearance(appearance);
  if (!a.headerEnabled) return '';
  const logo = a.logoSrc
    ? `<img src="${a.logoSrc}" alt="Логотип" width="${a.logoWidth}" style="display:block;width:${a.logoWidth}px;max-width:100%;height:auto;border:0">`
    : '';
  return `<div class="email-header" style="box-sizing:border-box;background-color:${a.headerBackground};padding:${a.padding}px;min-height:${a.headerHeight}px;font-family:${a.fontFamily};font-size:${a.fontSize}px;line-height:${a.lineHeight};color:#ffffff;overflow-wrap:anywhere">${logo}${a.headerText}</div>`;
}

export async function readHeaderLogo(file: File): Promise<string> {
  if (
    !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(
      file.type,
    ) ||
    file.size > 15 * 1024 * 1024
  )
    throw new Error('Выберите PNG, JPEG, GIF или WebP до 15 МБ');
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Не удалось открыть изображение'));
    image.src = src;
  });
  return src;
}

export function letterFooterHtml(appearance: EmailAppearance): string {
  const a = normalizeAppearance(appearance);
  return a.footerEnabled
    ? `<div class="email-footer" style="box-sizing:border-box;padding:${a.padding}px;background-color:${a.footerBackground};font-family:${a.fontFamily};font-size:${a.fontSize}px;line-height:${a.lineHeight};color:${a.textColor};overflow-wrap:anywhere">${a.footerText}</div>`
    : '';
}
