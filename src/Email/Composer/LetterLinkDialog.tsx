import { useState } from 'react';
import CustomModal from '../../parts/CustomModal/CustomModal';
import { Field } from '../Field';
import AppearanceColor from './AppearanceColor';
import { letterLinkUrl, type LetterLinkValue } from '../../utils/letterLink';
import e from '../emailCampaign.module.css';

export default function LetterLinkDialog({
  initial,
  onSave,
  onClose,
}: {
  initial: LetterLinkValue;
  onSave: (value: LetterLinkValue) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');
  const set = <K extends keyof LetterLinkValue>(
    key: K,
    next: LetterLinkValue[K],
  ) => setValue((current) => ({ ...current, [key]: next }));
  const valid = Boolean(value.text.trim() && letterLinkUrl(value.url));
  return (
    <CustomModal
      isOpen
      title={value.kind === 'button' ? 'Кнопка' : 'Ссылка'}
      onClose={onClose}
      maxWidth="480px"
    >
      <form
        className={e.confirm}
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;
          try {
            onSave(value);
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : 'Не удалось сохранить ссылку',
            );
          }
        }}
      >
        <Field label="Текст">
          <input
            className="custom-input"
            autoFocus
            value={value.text}
            onChange={(event) => set('text', event.target.value)}
          />
        </Field>
        <Field label="Адрес">
          <input
            className="custom-input"
            value={value.url}
            placeholder="https://example.com"
            aria-invalid={Boolean(value.url && !letterLinkUrl(value.url))}
            onChange={(event) => set('url', event.target.value)}
          />
        </Field>
        {value.url && !letterLinkUrl(value.url) && (
          <p className={e.alert} role="alert">
            Укажите полный адрес http://, https:// или mailto:.
          </p>
        )}
        <AppearanceColor
          label="Цвет текста"
          value={value.color}
          onChange={(next) => set('color', next)}
        />
        {value.kind === 'link' ? (
          <label>
            <input
              type="checkbox"
              checked={value.underline}
              onChange={(event) => set('underline', event.target.checked)}
            />{' '}
            Подчёркивание
          </label>
        ) : (
          <>
            <AppearanceColor
              label="Фон кнопки"
              value={value.background}
              onChange={(next) => set('background', next)}
            />
            <Field label="Размер кнопки">
              <select
                className="custom-input"
                value={value.size}
                onChange={(event) =>
                  set('size', event.target.value as LetterLinkValue['size'])
                }
              >
                <option value="small">Маленькая</option>
                <option value="medium">Средняя</option>
                <option value="large">Большая</option>
              </select>
            </Field>
            <Field label="Заокругление, px">
              <input
                className="custom-input"
                type="number"
                min={0}
                max={48}
                value={value.radius}
                onChange={(event) =>
                  set(
                    'radius',
                    Math.max(0, Math.min(48, Number(event.target.value))),
                  )
                }
              />
            </Field>
            <Field label="Выравнивание кнопки">
              <select
                className="custom-input"
                value={value.alignment}
                onChange={(event) =>
                  set(
                    'alignment',
                    event.target.value as LetterLinkValue['alignment'],
                  )
                }
              >
                <option value="left">Слева</option>
                <option value="center">По центру</option>
                <option value="right">Справа</option>
              </select>
            </Field>
          </>
        )}
        {error && (
          <p className={e.alert} role="alert">
            {error}
          </p>
        )}
        <div className={e.confirmActions}>
          <button type="button" className={e.btn} onClick={onClose}>
            Отмена
          </button>
          <button
            type="submit"
            className={`${e.btn} ${e.btnPrimary}`}
            disabled={!valid}
          >
            Сохранить
          </button>
        </div>
      </form>
    </CustomModal>
  );
}
