const localImages = new Map<
  string,
  { file: File; encoded?: Promise<string> }
>();

export function releaseEmailImage(src: string) {
  if (localImages.delete(src)) URL.revokeObjectURL(src);
}

export const isLocalEmailImage = (src: string) => localImages.has(src);

export async function readAppearanceImage(file: File): Promise<string> {
  if (
    !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(
      file.type,
    ) ||
    file.size > 15 * 1024 * 1024
  )
    throw new Error('Выберите PNG, JPEG, GIF или WebP до 15 МБ');
  const src = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        image.onload = image.onerror = null;
        image.src = '';
        resolve();
      };
      image.onerror = () => {
        image.onload = image.onerror = null;
        image.src = '';
        reject(new Error('Не удалось открыть изображение'));
      };
      image.src = src;
    });
    localImages.set(src, { file });
    return src;
  } catch (error) {
    URL.revokeObjectURL(src);
    throw error;
  }
}

export async function embedEmailImages(html: string): Promise<string> {
  for (const [src, image] of localImages) {
    if (!html.includes(src)) continue;
    image.encoded ??= new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(image.file);
    });
    html = html.split(src).join(await image.encoded);
  }
  return html;
}

export const normalizeBackgroundImage = (src: unknown): string =>
  typeof src === 'string' &&
  (isLocalEmailImage(src) ||
    /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(src))
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
