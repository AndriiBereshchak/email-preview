import {
  DEFAULT_APPEARANCE,
  EMAIL_FONTS,
  type EmailAppearance,
} from '../../utils/appearanceModel';
import FooterSettings from './FooterSettings';
import HeaderSettings from './HeaderSettings';
import AppearanceColor from './AppearanceColor';
import AppearanceNumber from './AppearanceNumber';
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
      <HeaderSettings value={value} onChange={onChange} />
      <FooterSettings value={value} onChange={onChange} />
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
        <AppearanceNumber
          label="Ширина письма, px"
          value={value.width}
          min={320}
          max={800}
          onChange={(next) => set('width', next)}
        />
        <AppearanceNumber
          label="Внутренние отступы, px"
          value={value.padding}
          min={0}
          max={64}
          onChange={(next) => set('padding', next)}
        />
      </fieldset>
      <fieldset>
        <legend>Текст и ссылки</legend>
        <label className={e.field}>
          <span className={e.fieldLabel}>Шрифт</span>
          <select
            className="custom-input"
            value={value.fontFamily}
            onChange={(event) =>
              set(
                'fontFamily',
                event.target.value as EmailAppearance['fontFamily'],
              )
            }
          >
            {EMAIL_FONTS.map((font) => (
              <option key={font}>{font}</option>
            ))}
          </select>
        </label>
        <AppearanceNumber
          label="Размер текста, px"
          value={value.fontSize}
          min={12}
          max={32}
          onChange={(next) => set('fontSize', next)}
        />
        <AppearanceNumber
          label="Межстрочный интервал"
          value={value.lineHeight}
          min={1}
          max={2.5}
          step={0.1}
          onChange={(next) => set('lineHeight', next)}
        />
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
