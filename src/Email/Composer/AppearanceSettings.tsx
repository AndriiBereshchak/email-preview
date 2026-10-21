import {
  DEFAULT_APPEARANCE,
  type EmailAppearance,
} from '../../utils/appearanceModel';
import { useState } from 'react';
import { Scan, FileText, Type, Link2, RotateCcw, Info } from 'lucide-react';
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
      <section
        className={e.appearanceGroup}
        role="group"
        aria-label="Цвета и фон"
      >
        <h4 className={e.appearanceTitle}>Цвета и фон</h4>
        <div className={e.appearanceBackground}>
          <AppearanceColor
            label="Вокруг письма"
            icon={<Scan size={16} strokeWidth={1.7} aria-hidden="true" />}
            value={value.pageBackground}
            onChange={(next) => set('pageBackground', next)}
          />
          <AppearanceBackgroundImage
            key={`pageBackground-${resetKey}`}
            label="Вокруг письма"
            compact
            value={value.pageBackgroundImage}
            onChange={(next) => set('pageBackgroundImage', next)}
          />
        </div>
        <div className={e.appearanceBackground}>
          <AppearanceColor
            label="Само письмо"
            icon={<FileText size={16} strokeWidth={1.7} aria-hidden="true" />}
            value={value.background}
            onChange={(next) => set('background', next)}
          />
          <AppearanceBackgroundImage
            key={`background-${resetKey}`}
            label="Само письмо"
            compact
            value={value.backgroundImage}
            onChange={(next) => set('backgroundImage', next)}
          />
        </div>
        <p
          className={`${e.fieldHint} ${e.appearanceHint}`}
          title="Изображение заполняет фон; края могут обрезаться."
        >
          <Info size={14} strokeWidth={1.7} aria-hidden="true" />
          PNG, JPG, GIF, WebP · до 15 МБ
        </p>
      </section>
      <section
        className={e.appearanceGroup}
        role="group"
        aria-label="Текст и ссылки"
      >
        <h4 className={e.appearanceTitle}>Текст и ссылки</h4>
        <AppearanceColor
          label="Текст"
          icon={<Type size={16} strokeWidth={1.7} aria-hidden="true" />}
          value={value.textColor}
          onChange={(next) => set('textColor', next)}
        />
        <AppearanceColor
          label="Ссылки"
          icon={<Link2 size={16} strokeWidth={1.7} aria-hidden="true" />}
          value={value.linkColor}
          onChange={(next) => set('linkColor', next)}
        />
      </section>
      <button
        type="button"
        className={`${e.linkBtn} ${e.appearanceReset}`}
        onClick={() => {
          setResetKey((key) => key + 1);
          onChange({ ...DEFAULT_APPEARANCE });
        }}
      >
        <RotateCcw size={14} strokeWidth={1.7} aria-hidden="true" />
        Сбросить оформление
      </button>
      <p className={e.fieldHint}>Общее для всех языков.</p>
    </div>
  );
}
