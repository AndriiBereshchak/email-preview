export const copy = {
  letterContentHint:
    'В письмо переносятся заголовки, абзацы, картинки, разделители и ссылки. Итог виден на следующем шаге.',
  imageGalleryHint: 'PNG, JPEG, GIF или WebP до 15 МБ.',
  previewHint:
    'Локальный просмотр HTML и текстовой версии. Серверный шаблон письма не подключён.',
};

export const languagesWord = (count: number) =>
  count === 1 ? 'язык' : count < 5 ? 'языка' : 'языков';
