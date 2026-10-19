import { useEffect, useId, useRef, useState } from 'react';
import { readAppearanceImage } from '../../utils/appearanceImage';
import e from '../emailCampaign.module.css';

export default function AppearanceBackgroundImage({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const request = useRef(0);
  const latest = useRef(onChange);
  latest.current = onChange;
  const input = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const upload = async (file: File | undefined) => {
    if (!file) return;
    const current = ++request.current;
    setLoading(true);
    setError('');
    try {
      const src = await readAppearanceImage(file);
      if (current === request.current) latest.current(src);
    } catch (failure) {
      if (current === request.current)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Не удалось загрузить изображение',
        );
    } finally {
      if (current === request.current) setLoading(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <div className={e.field}>
      <label className={e.fieldLabel} htmlFor={id}>
        {label}: изображение
      </label>
      {value && (
        <img className={e.backgroundThumbnail} src={value} alt={label} />
      )}
      <input
        id={id}
        ref={input}
        type="file"
        hidden
        accept=".png,.jpg,.jpeg,.gif,.webp"
        onChange={(event) => {
          upload(event.target.files?.[0]);
        }}
      />
      <button
        type="button"
        className={e.linkBtn}
        disabled={loading}
        onClick={() => input.current?.click()}
      >
        {loading
          ? 'Загружаем…'
          : value
            ? 'Заменить изображение'
            : 'Загрузить изображение'}
      </button>
      {(value || loading) && (
        <button
          type="button"
          className={e.linkBtn}
          onClick={() => {
            request.current++;
            setLoading(false);
            setError('');
            if (input.current) input.current.value = '';
            latest.current('');
          }}
        >
          Убрать изображение
        </button>
      )}
      <p className={e.fieldHint}>
        PNG, JPEG, GIF или WebP до 15 МБ. Изображение заполняет фон; края могут
        обрезаться.
      </p>
      {error && (
        <p className={e.alert} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
