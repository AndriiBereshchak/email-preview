import {
  DEFAULT_APPEARANCE,
  type EmailAppearance,
} from '../../utils/appearanceModel';
import AppearanceColor from './AppearanceColor';
import e from '../emailCampaign.module.css';
export default function AppearanceSettings({
  value,
  onChange,
}: {
  value: EmailAppearance;
  onChange: (value: EmailAppearance) => void;
}) {
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
        <AppearanceColor
          label="Фон письма"
          value={value.background}
          onChange={(next) => set('background', next)}
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
        onClick={() => onChange({ ...DEFAULT_APPEARANCE })}
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
