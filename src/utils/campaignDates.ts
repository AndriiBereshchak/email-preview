export interface DatePeriod {
  from: string;
  to: string;
}
export const EMPTY_PERIOD: DatePeriod = { from: '', to: '' };

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  localDate(new Date(`${value}T12:00:00`)) === value;
export function periodProblem(period: DatePeriod): string | null {
  if ([period.from, period.to].some((value) => value && !validDate(value)))
    return 'Укажите корректную дату';
  return period.from && period.to && period.from > period.to
    ? 'Дата начала должна быть не позже даты окончания'
    : null;
}

export function matchesPeriod(createdAt: string, period: DatePeriod): boolean {
  if (!period.from && !period.to) return true;
  if (periodProblem(period)) return false;
  const date = new Date(createdAt);
  if (!Number.isFinite(date.getTime())) return false;
  const day = localDate(date);
  return (
    (!period.from || day >= period.from) && (!period.to || day <= period.to)
  );
}
