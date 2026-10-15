import { describe, expect, it } from 'vitest';
import { EMPTY_PERIOD, matchesPeriod, periodProblem } from './campaignDates';

const local = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0,
) => new Date(year, month - 1, day, hour, minute, second).toISOString();
describe('campaign date period', () => {
  it('includes both boundary days in the local timezone', () => {
    const period = { from: '2026-10-01', to: '2026-10-02' };
    expect(matchesPeriod(local(2026, 10, 1, 0), period)).toBe(true);
    expect(matchesPeriod(local(2026, 10, 2, 23, 59, 59), period)).toBe(true);
    expect(matchesPeriod(local(2026, 9, 30, 23, 59, 59), period)).toBe(false);
    expect(matchesPeriod(local(2026, 10, 3, 0), period)).toBe(false);
  });
  it('supports open bounds and clearing the filter', () => {
    expect(
      matchesPeriod(local(2026, 10, 1, 12), { from: '', to: '2026-10-01' }),
    ).toBe(true);
    expect(
      matchesPeriod(local(2026, 10, 3, 12), { from: '2026-10-01', to: '' }),
    ).toBe(true);
    expect(matchesPeriod(local(2026, 1, 1, 12), EMPTY_PERIOD)).toBe(true);
  });
  it('rejects inverted and impossible dates', () => {
    expect(
      periodProblem({ from: '2026-10-02', to: '2026-10-01' }),
    ).toBeTruthy();
    expect(periodProblem({ from: '2026-02-30', to: '' })).toBeTruthy();
    expect(matchesPeriod('invalid', { from: '2026-10-01', to: '' })).toBe(
      false,
    );
  });
});
