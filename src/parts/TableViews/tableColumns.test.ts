import { describe, expect, it } from 'vitest';
import { moveColumn, normalizeLayout } from './tableColumns';
const columns = [
  { key: 'subject', label: 'Рассылка', locked: true },
  { key: 'status', label: 'Статус' },
  { key: 'opened', label: 'Открыли' },
];
describe('column layout', () => {
  it('repairs stale saved layouts and keeps the locked column visible and first', () => {
    expect(
      normalizeLayout(
        {
          order: ['opened', 'obsolete', 'opened', 'subject'],
          hidden: ['subject', 'obsolete', 'status'],
        },
        columns,
      ),
    ).toEqual({ order: ['subject', 'opened', 'status'], hidden: ['status'] });
  });
  it('handles malformed saved data', () => {
    expect(normalizeLayout({ order: 'wrong', hidden: null }, columns)).toEqual(
      normalizeLayout(null, columns),
    );
  });
  it('moves columns without displacing the locked column', () => {
    const layout = normalizeLayout(null, columns);
    expect(moveColumn(layout, 'status', -1, columns)).toBe(layout);
    expect(moveColumn(layout, 'opened', -1, columns).order).toEqual([
      'subject',
      'opened',
      'status',
    ]);
  });
});
