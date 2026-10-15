import { cx as clsx } from '../utils/localModel';
import type { RangePreset } from '../utils/audienceModel';
import e from './emailCampaign.module.css';

export const Presets = ({
  presets,
  from,
  to,
  anyLabel,
  onPick,
}: {
  presets: ReadonlyArray<RangePreset>;
  from: string;
  to: string;
  anyLabel: string;
  onPick: (from: string, to: string) => void;
}) => {
  const now = new Date();
  const picked = presets.findIndex((preset) => {
    const range = preset.range(now);
    return range.from === from && range.to === to;
  });
  const any = !from && !to;

  return (
    <div className={e.presets}>
      <button
        type="button"
        className={clsx(e.preset, any && e.presetActive)}
        aria-pressed={any}
        onClick={() => onPick('', '')}
      >
        {anyLabel}
      </button>
      {presets.map((preset, index) => (
        <button
          key={preset.label}
          type="button"
          className={clsx(e.preset, picked === index && e.presetActive)}
          aria-pressed={picked === index}
          onClick={() => {
            const range = preset.range();
            onPick(range.from, range.to);
          }}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};
