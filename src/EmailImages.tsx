import { copy } from './copy';
import { useRef, useState } from 'react';
import { cx, type EmailImage } from './localModel';
import e from './emailCampaign.module.css';

export default function EmailImages({
  onInsert,
}: {
  onInsert: (image: EmailImage) => void;
}) {
  const [images, setImages] = useState<EmailImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files ?? [])) {
        if (
          !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(
            file.type,
          ) ||
          file.size > 15 * 1024 * 1024
        )
          throw new Error('Выберите PNG, JPEG, GIF или WebP до 15 МБ');
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
          reader.readAsDataURL(file);
        });
        const dimensions = await new Promise<{ width: number; height: number }>(
          (resolve, reject) => {
            const image = new Image();
            image.onload = () =>
              resolve({
                width: image.naturalWidth,
                height: image.naturalHeight,
              });
            image.onerror = () =>
              reject(new Error('Не удалось открыть изображение'));
            image.src = url;
          },
        );
        setImages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            url,
            ...dimensions,
          },
        ]);
      }
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Картинка не загружена',
      );
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className={e.imageGallery}>
      <div className={e.imageGalleryHead}>
        <div>
          <span className={e.fieldLabel}>Картинки для писем</span>
          <p className={e.fieldHint}>{copy.imageGalleryHint}</p>
        </div>
        <button
          type="button"
          className={cx(e.btn, e.btnGhost, e.btnSmall)}
          disabled={uploading}
          onClick={() => input.current?.click()}
        >
          {uploading ? 'Загружаем…' : 'Загрузить'}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
          hidden
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>
      {error && (
        <p className={e.alert} role="alert">
          {error}
        </p>
      )}
      {images.length === 0 ? (
        <p className={e.meta}>
          Пока пусто — загрузите первую картинку, и она появится здесь.
        </p>
      ) : (
        <ul className={e.imageGrid}>
          {images.map((image) => (
            <li key={image.id} className={e.imageTile}>
              <img src={image.url} alt={image.name} className={e.imageThumb} />
              <span className={e.imageName} title={image.name}>
                {image.name}
              </span>
              <span className={e.meta}>
                {image.width}×{image.height} · {(image.size / 1024).toFixed(0)}{' '}
                КБ
              </span>
              <div className={e.inlineActions}>
                <button className={e.linkBtn} onClick={() => onInsert(image)}>
                  Вставить
                </button>
                <button
                  className={cx(e.linkBtn, e.dangerLink)}
                  onClick={() => {
                    if (window.confirm(`Убрать «${image.name}» из галереи?`))
                      setImages((current) =>
                        current.filter((item) => item.id !== image.id),
                      );
                  }}
                >
                  Убрать
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
