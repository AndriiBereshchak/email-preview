import { useEffect, useId, useState } from 'react';
import e from '../emailCampaign.module.css';
export default function AppearanceColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const id = useId();
  useEffect(() => setText(value), [value]);
  return (
    <div className={e.field}>
      <label className={e.fieldLabel} htmlFor={id}>
        {label}
      </label>
      <div className={e.appearanceColor}>
        <input
          type="color"
          aria-label={`${label}: палитра`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          id={id}
          className="custom-input"
          value={text}
          maxLength={7}
          onChange={(event) => {
            setText(event.target.value);
            if (/^#[0-9a-f]{6}$/i.test(event.target.value))
              onChange(event.target.value);
          }}
          onBlur={() => setText(value)}
        />
      </div>
    </div>
  );
}
