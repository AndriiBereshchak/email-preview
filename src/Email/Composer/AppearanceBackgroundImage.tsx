import { useId, useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import { useImageUpload } from '../../hooks/useImageUpload';
import e from '../emailCampaign.module.css';

export default function AppearanceBackgroundImage({
  label,
  value,
  onChange,
  compact = false,
}: {
  compact?: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const { loading, error, upload, cancel } = useImageUpload(onChange);
  return (
    <div className={e.field}>
      {!compact && (
        <label className={e.fieldLabel} htmlFor={id}>
          {label}: изображение
        </label>
      )}
      {value && (
        <img className={e.backgroundThumbnail} src={value} alt={label} />
      )}
      <input
        id={id}
        ref={input}
        type="file"
        aria-label={`${label}: изображение`}
        hidden
        accept=".png,.jpg,.jpeg,.gif,.webp"
        onChange={(event) => {
          upload(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <button
        type="button"
        className={compact ? e.backgroundUpload : e.linkBtn}
        disabled={loading}
        onClick={() => input.current?.click()}
      >
        {compact && (
          <ImagePlus size={16} strokeWidth={1.7} aria-hidden="true" />
        )}
        {loading
          ? 'Загружаем…'
          : value
            ? 'Заменить изображение'
            : compact
              ? 'Добавить изображение'
              : 'Загрузить изображение'}
      </button>
      {(value || loading) && (
        <button
          type="button"
          className={e.linkBtn}
          onClick={() => {
            cancel();
            if (input.current) input.current.value = '';
            onChange('');
          }}
        >
          Убрать изображение
        </button>
      )}
      {!compact && (
        <p className={e.fieldHint}>
          PNG, JPEG, GIF или WebP до 15 МБ. Изображение заполняет фон; края
          могут обрезаться.
        </p>
      )}
      {error && (
        <p className={e.alert} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
