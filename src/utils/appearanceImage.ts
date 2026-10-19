export async function readAppearanceImage(file: File): Promise<string> {
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

export const normalizeBackgroundImage = (src: unknown): string =>
  typeof src === 'string' &&
  /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(src)
    ? src
    : '';

export function emailImageUrl(value = ''): string {
  if (normalizeBackgroundImage(value)) return value;
  if (/[\s<>"'\\]/.test(value)) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? value
      : '';
  } catch {
    return '';
  }
}
