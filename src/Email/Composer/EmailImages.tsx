import { toast } from 'react-hot-toast';
import { copy } from '../../utils/copy';
import { useRef, useState } from 'react';
import { cx, type EmailImage } from '../../utils/localModel';
import e from '../emailCampaign.module.css';

const sizeOf = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} МБ`
    : `${Math.max(1, Math.round(bytes / 1024))} КБ`;

export default function EmailImages({
  onInsert,
}: {
  onInsert: (image: EmailImage) => void;
}) {
  const [images, setImages] = useState<EmailImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    setUploading(true);
    try {
      for (const file of Array.from(files ?? [])) {
        try {
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
            reader.onerror = () =>
              reject(new Error('Не удалось прочитать файл'));
            reader.readAsDataURL(file);
          });
          const dimensions = await new Promise<{
            width: number;
            height: number;
          }>((resolve, reject) => {
            const image = new Image();
            image.onload = () =>
              resolve({
                width: image.naturalWidth,
                height: image.naturalHeight,
              });
            image.onerror = () =>
              reject(new Error('Не удалось открыть изображение'));
            image.src = url;
          });
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
          toast.success(`«${file.name}» загружена`);
        } catch (failure) {
          toast.error(
            failure instanceof Error
              ? failure.message
              : `«${file.name}» не загружена`,
          );
        }
      }
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  const handleCopy = async (image: EmailImage) => {
    try {
      await navigator.clipboard.writeText(image.url);
      toast.success('Ссылка скопирована');
    } catch {
      toast.error('Не удалось скопировать ссылку');
    }
  };

  const handleRemove = (image: EmailImage) => {
    if (
      !window.confirm(
        `Убрать «${image.name}» из галереи? В уже отправленных письмах картинка останется.`,
      )
    )
      return;
    setImages((current) => current.filter((item) => item.id !== image.id));
    toast.success('Картинка убрана из галереи');
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
                {image.width}×{image.height} · {sizeOf(image.size)}
              </span>
              <div className={e.inlineActions}>
                <button
                  type="button"
                  className={e.linkBtn}
                  onClick={() => onInsert(image)}
                >
                  Вставить
                </button>
                <button
                  type="button"
                  className={e.linkBtn}
                  onClick={() => void handleCopy(image)}
                >
                  Ссылка
                </button>
                <button
                  type="button"
                  className={cx(e.linkBtn, e.dangerLink)}
                  onClick={() => handleRemove(image)}
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
