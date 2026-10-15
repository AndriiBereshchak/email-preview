import { useEffect, useId, useState } from 'react';
import e from '../emailCampaign.module.css';
export default function AppearanceNumber({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const id = useId();
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const number = Number(text);
    const next =
      text.trim() && Number.isFinite(number)
        ? Math.min(max, Math.max(min, number))
        : value;
    setText(String(next));
    onChange(next);
  };
  return (
    <div className={e.field}>
      <label className={e.fieldLabel} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="custom-input"
        type="number"
        min={min}
        max={max}
        step={step}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
    </div>
  );
}
