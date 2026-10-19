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
