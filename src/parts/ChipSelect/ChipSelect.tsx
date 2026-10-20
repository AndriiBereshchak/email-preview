import { useId } from 'react';
import { useDismissDetails } from '../../hooks/useDismissDetails';
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
  const ref = useDismissDetails();
  const id = useId();
  return (
    <details ref={ref} className={cx('audience-chip', fieldClassName)}>
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
