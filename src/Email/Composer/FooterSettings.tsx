import type { EmailAppearance } from '../../utils/appearanceModel';
import AppearanceColor from './AppearanceColor';
import e from '../emailCampaign.module.css';

export default function FooterSettings({
  value,
  onChange,
}: {
  value: EmailAppearance;
  onChange: (value: EmailAppearance) => void;
}) {
  return (
    <fieldset>
      <legend>Футер письма</legend>
      <label className={e.headerToggle}>
        <input
          type="checkbox"
          checked={value.footerEnabled}
          onChange={(event) =>
            onChange({ ...value, footerEnabled: event.target.checked })
          }
        />
        Показывать футер
      </label>
      {value.footerEnabled && (
        <>
          <AppearanceColor
            label="Фон футера"
            value={value.footerBackground}
            onChange={(footerBackground) =>
              onChange({ ...value, footerBackground })
            }
          />
          <p className={e.fieldHint}>
            Текст вводится прямо в футере макета. Выделите его для оформления.
          </p>
        </>
      )}
    </fieldset>
  );
}
