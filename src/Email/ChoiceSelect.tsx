import type { Option } from '../utils/audienceModel';

export function ChoiceSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly Option<T>[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="select_wrap select_full">
      <select
        className="custom-input"
        value={value}
        onChange={(event) => {
          const option = options.find(
            (item) => item.value === event.target.value,
          );
          if (option) onChange(option.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
