import {
  DEFAULT_APPEARANCE,
  type EmailAppearance,
} from '../../utils/appearanceModel';
import { useState } from 'react';
import AppearanceColor from './AppearanceColor';
import AppearanceBackgroundImage from './AppearanceBackgroundImage';
import e from '../emailCampaign.module.css';
export default function AppearanceSettings({
  value,
  onChange,
}: {
  value: EmailAppearance;
  onChange: (value: EmailAppearance) => void;
}) {
  const [resetKey, setResetKey] = useState(0);
  const set = <K extends keyof EmailAppearance>(
    key: K,
    next: EmailAppearance[K],
  ) => onChange({ ...value, [key]: next });
  return (
    <div className={e.appearanceSettings}>
      <fieldset>
        <legend>Фон и контейнер</legend>
        <AppearanceColor
          label="Фон вокруг письма"
          value={value.pageBackground}
          onChange={(next) => set('pageBackground', next)}
        />
        <AppearanceBackgroundImage
          key={`pageBackground-${resetKey}`}
          label="Фон вокруг письма"
          value={value.pageBackgroundImage}
          onChange={(next) => set('pageBackgroundImage', next)}
        />
        <AppearanceColor
          label="Фон письма"
          value={value.background}
          onChange={(next) => set('background', next)}
        />
        <AppearanceBackgroundImage
          key={`background-${resetKey}`}
          label="Фон письма"
          value={value.backgroundImage}
          onChange={(next) => set('backgroundImage', next)}
        />
      </fieldset>
      <fieldset>
        <legend>Текст и ссылки</legend>
        <AppearanceColor
          label="Цвет текста"
          value={value.textColor}
          onChange={(next) => set('textColor', next)}
        />
        <AppearanceColor
          label="Цвет ссылок"
          value={value.linkColor}
          onChange={(next) => set('linkColor', next)}
        />
      </fieldset>
      <button
        type="button"
        className={e.linkBtn}
        onClick={() => {
          setResetKey((key) => key + 1);
          onChange({ ...DEFAULT_APPEARANCE });
        }}
      >
        Сбросить оформление
      </button>
      <p className={e.fieldHint}>
        Общие стили для всех языков. Форматирование отдельных фрагментов из
        редактора имеет приоритет.
      </p>
    </div>
  );
}
