import { useEffect, useRef, useState } from 'react';
import type { EmailAppearance } from '../../utils/appearanceModel';
import { readHeaderLogo } from '../../utils/letterHeader';
import AppearanceColor from './AppearanceColor';
import e from '../emailCampaign.module.css';

export default function HeaderSettings({
  value,
  onChange,
}: {
  value: EmailAppearance;
  onChange: (value: EmailAppearance) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const request = useRef(0);
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
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      const src = await readHeaderLogo(file);
      if (id === request.current && latest.current.value.headerEnabled)
        latest.current.onChange({
          ...latest.current.value,
          logoSrc: src,
          logoName: file.name,
        });
    } catch (failure) {
      if (id === request.current)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Не удалось загрузить логотип',
        );
    } finally {
      if (id === request.current) setLoading(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <fieldset>
      <legend>Шапка письма</legend>
      <label className={e.headerToggle}>
        <input
          type="checkbox"
          checked={value.headerEnabled}
          onChange={(event) =>
            onChange({ ...value, headerEnabled: event.target.checked })
          }
        />
        Показывать шапку
      </label>
      {value.headerEnabled && (
        <>
          <AppearanceColor
            label="Фон шапки"
            value={value.headerBackground}
            onChange={(headerBackground) =>
              onChange({ ...value, headerBackground })
            }
          />
          <p className={e.fieldHint}>
            Текст вводится прямо в шапке. Выделите его для оформления. Для
            размера логотипа потяните его угол; для высоты шапки — нижний край.
          </p>
          <span className={e.fieldLabel}>Логотип</span>
          {value.logoSrc && (
            <p className={e.headerLogoName} title={value.logoName}>
              {value.logoName}
            </p>
          )}
          <input
            ref={input}
            type="file"
            hidden
            accept=".png,.jpg,.jpeg,.gif,.webp"
            aria-label="Файл логотипа"
            onChange={(event) => {
              void upload(event.target.files?.[0]);
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
              : value.logoSrc
                ? 'Заменить логотип'
                : 'Загрузить логотип'}
          </button>
          {value.logoSrc && (
            <button
              type="button"
              className={e.linkBtn}
              disabled={loading}
              onClick={() => onChange({ ...value, logoSrc: '', logoName: '' })}
            >
              Убрать логотип
            </button>
          )}
          <p className={e.fieldHint}>
            PNG, JPEG, GIF или WebP до 15 МБ. Пропорции сохраняются.
          </p>
          {error && (
            <p className={e.alert} role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}
