import { useEffect, useRef, useId } from 'react';
import { cx } from '../../utils/localModel';
import type { Option } from '../../utils/audienceModel';

export function ChipSelect({
  fieldClassName,
  options,
  value,
  onChange,
  placeholder,
}: {
  fieldClassName?: string;
  overlay?: boolean;
  options: readonly Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyText?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const id = useId();
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
        ref.current.open = false;
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <details
      ref={ref}
      className={cx('audience-chip', fieldClassName)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && ref.current) {
          ref.current.open = false;
          ref.current.querySelector('summary')?.focus();
        }
      }}
    >
      <summary id={id}>
        {value.length
          ? options
              .filter((option) => value.includes(option.value))
              .map((option) => option.label)
              .join(', ')
          : placeholder}
      </summary>
      <div className="audience-chip-options" role="group" aria-labelledby={id}>
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, option.value]
                    : value.filter((item) => item !== option.value),
                )
              }
            />
            {option.label}
          </label>
        ))}
      </div>
    </details>
  );
}
