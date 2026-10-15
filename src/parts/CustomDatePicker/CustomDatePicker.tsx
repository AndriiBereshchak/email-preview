import { useState } from 'react';
import { useDismissDetails } from '../../hooks/useDismissDetails';
import {
  EMPTY_PERIOD,
  periodProblem,
  type DatePeriod,
} from '../../utils/campaignDates';
import s from '../tableControls.module.css';

export default function CustomDatePicker({
  value,
  onChange,
}: {
  value: DatePeriod;
  onChange: (period: DatePeriod) => void;
}) {
  const ref = useDismissDetails();
  const [draft, setDraft] = useState(value);
  const problem = periodProblem(draft);
  const format = (date: string) =>
    date ? date.split('-').reverse().join('.') : '';
  const label =
    value.from && value.to
      ? `${format(value.from)} — ${format(value.to)}`
      : value.from
        ? `С ${format(value.from)}`
        : value.to
          ? `По ${format(value.to)}`
          : 'За всё время';
  const apply = (period: DatePeriod) => {
    setDraft(period);
    onChange(period);
    if (ref.current) ref.current.open = false;
  };
  return (
    <details ref={ref} className={s.control}>
      <summary
        className={s.trigger}
        onClick={() => {
          if (!ref.current?.open) setDraft(value);
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M7 3v4m10-4v4M3 11h18" />
        </svg>
        {label}
      </summary>
      <div className={s.popover}>
        <strong>Период рассылок</strong>
        <label className={s.dateField}>
          С даты
          <input
            type="date"
            value={draft.from}
            onChange={(event) =>
              setDraft({ ...draft, from: event.target.value })
            }
          />
        </label>
        <label className={s.dateField}>
          По дату
          <input
            type="date"
            value={draft.to}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          />
        </label>
        {problem && (
          <p role="alert" className={s.error}>
            {problem}
          </p>
        )}
        <div className={s.actions}>
          <button type="button" onClick={() => apply(EMPTY_PERIOD)}>
            Сбросить
          </button>
          <button
            type="button"
            disabled={Boolean(problem)}
            onClick={() => apply(draft)}
          >
            Применить
          </button>
        </div>
      </div>
    </details>
  );
}
